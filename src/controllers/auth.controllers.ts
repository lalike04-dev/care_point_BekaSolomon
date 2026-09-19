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
import { registration } from "../services/auth.services.js";


type RefreshOutcome =
  | { kind: "ok"; credential: string; expiresAt: Date; accessToken: string }
  | { kind: "invalid" }
  | { kind: "reused" }
  | { kind: "conflict" };

export const safeUserSelect={
id: true,
email:true,
name:true,
phone:true,
roleId:true,
createdAt:true,
updatedAt:true
} satisfies Prisma.UserSelect

export async function Registrtion(req:Request,res:Response){
    const { email, password, name, roleId }= req.body
    const passwordhash= await hashPassword(password);

    try{
        registration(email,passwordhash,name,roleId);
        res.status(201).json({message:"User"})
    }
    catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"){
        return res.status(409).json({
        message: "An account with that email already exists",
      })
      }
      throw error;
      
    }
}

export async function Login(req:Request,res:Response){
  const { email, password } = req.body

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
    return {message:"User doesnt exist!"}
}
 if(user.passwordHash){
  const {passwordHash}=user
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

  res.cookie(
    REFRESH_COOKIE_NAME,
    refreshCredential,
    refreshCookieOptions,
  );

  return res.status(200).json({
    message: "Login successful",
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: Matchrole.name,
      createdAt:user.createdAt,
    },
  });
}
}


export async function Refresh(req:Request,res:Response){
  const parsed = parseRefreshCredential(
    req.cookies?.[REFRESH_COOKIE_NAME],
  );
  if (!parsed) {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieBaseOptions);
    return res.status(401).json({ message: "Refresh session required" });
  }

  const outcome: RefreshOutcome = await prisma.$transaction(async (tx): Promise<RefreshOutcome>  => {
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

  if (outcome.kind === "conflict") {
    return res.status(409).json({
      message: "Refresh already used; retry with the newest credential",
    });
  }

  if (outcome.kind === "invalid" || outcome.kind === "reused") {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieBaseOptions);
    return res.status(401).json({
      message:
        outcome.kind === "reused"
          ? "Refresh credential reuse detected; session revoked"
          : "Invalid or expired refresh session",
    });
  }

  const remainingMs = Math.max(
    0,
    outcome.expiresAt.getTime() - Date.now(),
  );

  res.cookie(REFRESH_COOKIE_NAME, outcome.credential, {
    ...refreshCookieOptions,
    maxAge: remainingMs,
  });

  return res.status(200).json({
    accessToken: outcome.accessToken,
  });
}

export async function logout(req: Request, res: Response) {
  const parsed = parseRefreshCredential(
    req.cookies?.[REFRESH_COOKIE_NAME],
  );

  if (parsed) {
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

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieBaseOptions);
  return res.status(200).json({ message: "Logged out" });
}

export async function logoutAll(req: Request, res: Response) {
  const principal = req.auth!;

  await prisma.session.updateMany({
    where: {
      userId: principal.userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieBaseOptions);
  return res.status(200).json({ message: "Logged out on all devices" });
}
