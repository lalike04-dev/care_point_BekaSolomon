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
import { registration, login, refresh, logout, logoutall } from "../services/auth.services.js";


export type RefreshOutcome =
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
        res.status(201).json({message:"User Registered Successfully!"})
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
  const refreshcredential=await login(email, password)

  if(refreshcredential?.message=="User must be registered first!"){
    res.status(400).json(refreshcredential)
  }

  res.cookie(
    REFRESH_COOKIE_NAME,
    refreshcredential.refreshCredential,
    refreshCookieOptions,
  );

  return res.status(200).json({
    message: "Login successful",
    accessToken:refreshcredential.accessToken,
    user: {
      id: refreshcredential.user.id,
      email: refreshcredential.user.email,
      role: refreshcredential.Matchrole.name,
      createdAt:refreshcredential.user.createdAt,
    },
  });
}



export async function Refresh(req:Request,res:Response){
  const parsed = parseRefreshCredential(
    req.cookies?.[REFRESH_COOKIE_NAME],
  );
  if (!parsed) {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieBaseOptions);
    return res.status(401).json({ message: "Refresh session required" });
  }

  const outcome: RefreshOutcome = await refresh(parsed)

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



export async function Logout(req: Request, res: Response) {
  const parsed = parseRefreshCredential(
    req.cookies?.[REFRESH_COOKIE_NAME],
  );

  if (parsed) {
    try{const loggedout=await logout(parsed)}

    catch(error){
      console.error(error)
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieBaseOptions);
  return res.status(200).json({ message: "Logged out" });
}



export async function LogoutAll(req: Request, res: Response) {
  const principal = req.auth!;
  const loggedout=await logoutall(principal)

  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieBaseOptions);
  return res.status(200).json({ message: "Logged out on all devices" });
}
