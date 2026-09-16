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