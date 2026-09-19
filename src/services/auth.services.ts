import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import type {
  loginSchema,
  registrationSchema,
} from "../schemas/auth.schema.js";
import { signAccessToken } from "../utils/auth.utils.js";
import { hashPassword, checkHash } from "../utils/auth.utils.js";
import {
  buildRefreshCredential,
  createRefreshSecret,
  digestRefreshSecret,
  equalDigest,
  parseRefreshCredential,
  REFRESH_COOKIE_NAME,
  REFRESH_TTL_MS,
  refreshCookieBaseOptions,
  refreshCookieOptions,
} from "../utils/auth.utils.js";
import { safeUserSelect, RefreshOutcome } from "../controllers/auth.controllers.js";

export async function registration(email:string, passwordhash:string, name:string, roleId:string){
 return await prisma.user.create({
            data:{
                email:email,
                passwordHash:passwordhash,
                name:name,
                roleId:roleId
            },
            select:safeUserSelect
        })
}

export async function login(email:string,password:string):Promise<any>{
   const user= await prisma.user.findUnique({
    where:{email:email},
    select:{
      id: true,
      email:true,
      passwordHash:true,
      name:true,
      roleId:true,
      createdAt:true
    }
  })
 

  if(!user||user==null){
    return {message:"User must be registered first!"}
}

if(user.passwordHash){
  const passwordHash=user.passwordHash
  const verifiedpassword= await checkHash(password, passwordHash)
  if(!verifiedpassword){
    return {message:"Email or Password Mismatched!"}
  }
  const sessionId = randomUUID();
  const refreshSecret = createRefreshSecret();
  const refreshDigest = digestRefreshSecret(refreshSecret);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  const session = await prisma.session.create({
    data: {
      id: sessionId,
      userid: user.id,
      currentRefreshDigest: refreshDigest,
      expiresAt:expiresAt
    },
  });
  const Matchrole=await prisma.role.findUnique({
    where:{id:user.roleId}
  })
  if(Matchrole==null){
    return {message:"Role doesnt match!"}
  }
  const principal = {
    userId: user.id,
    sessionId: session.id,
    role: Matchrole.name,
  };

  const accessToken = signAccessToken(principal);
  const refreshCredential = buildRefreshCredential(
    session.id,
    refreshSecret,
  );

  return refreshCredential && accessToken && user && Matchrole.name

}
}


export async function refresh(parsed:any){
  return  await prisma.$transaction(async (tx): Promise<RefreshOutcome>  => {
    const session = await tx.session.findUnique({
      where: { id: parsed.sessionId },
      include: { user: true },
    });

    const now = new Date();

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now
    ) {
      return { kind: "invalid" };
    }

    const candidateDigest = digestRefreshSecret(parsed.secret);

    if (!equalDigest(candidateDigest, session.currentRefreshDigest)) {
      await tx.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });

      return { kind: "reused" };
    }

    const nextSecret = createRefreshSecret();
    const nextDigest = digestRefreshSecret(nextSecret);

    const updated = await tx.session.updateMany({
      where: {
        id: session.id,
        currentRefreshDigest: session.currentRefreshDigest,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { currentRefreshDigest: nextDigest },
    });

    if (updated.count !== 1) {
      return { kind: "conflict" };
    }
    const rolematch=await prisma.role.findFirst({
      where:{id:session.user.roleId}
    })
    if(!rolematch){
      return { kind: "invalid"};
    }
    const accessToken = signAccessToken({
      userId: session.user.id,
      sessionId: session.id,
      role: rolematch.name,
    });

    return {
      kind: "ok",
      credential: buildRefreshCredential(session.id, nextSecret),
      expiresAt: session.expiresAt,
      accessToken,
    };
  });
}


export async function logout(parsed:any){
  const session = await prisma.session.findUnique({
      where: { id: parsed.sessionId },
    });

    if (session && !session.revokedAt) {
      const candidate = digestRefreshSecret(parsed.secret);

      if (equalDigest(candidate, session.currentRefreshDigest)) {
        await prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
      }
    }
}


export async function logoutall(principal:any){
  return await prisma.session.updateMany({
    where: {
      userId: principal.userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}