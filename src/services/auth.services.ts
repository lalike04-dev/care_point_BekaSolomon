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
import { safeUserSelect } from "../controllers/auth.controllers.js";

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