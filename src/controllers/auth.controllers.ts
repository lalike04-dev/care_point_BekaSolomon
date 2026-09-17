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