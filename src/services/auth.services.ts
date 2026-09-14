import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import {ACCESS_AUDIENCE,ACCESS_ISSUER,AuthPrincipal, verifiedAccessPayloadSchema} from "../schemas/auth.schema.js"

const bcrypt_options={
    saltRounds:12
} as const 
export async function hashPassword(password:string): Promise<string>{
    const hashed= await bcrypt.hash(password, bcrypt_options.saltRounds)

    return hashed;
}

export async function checkHash(password:string,hashed:string): Promise<boolean>{
   try { const matches= await bcrypt.compare(password,hashed)

    return matches}
    catch {
        return false
    }
}

export function signAccessToken(principal: AuthPrincipal): string {
  return jwt.sign(
    {
      sid: principal.sessionId,
      role: principal.role,
    },
    env.JWT_ACCESS_SECRET,
    {
      algorithm: "HS256",
      subject: principal.userId,
      issuer: ACCESS_ISSUER,
      audience: ACCESS_AUDIENCE,
      jwtid: randomUUID(),
      expiresIn: "15m",
    },
  );
}

export function verifyAccessToken(token: string): AuthPrincipal {
  const untrustedPayload: string | JwtPayload = jwt.verify(
    token,
    env.JWT_ACCESS_SECRET,
    {
      algorithms: ["HS256"],
      issuer: ACCESS_ISSUER,
      audience: ACCESS_AUDIENCE,
    },
  );

  if (typeof untrustedPayload === "string") {
    throw new Error("Unexpected JWT payload");
  }

  const payload = verifiedAccessPayloadSchema.parse(untrustedPayload);

  return {
    userId: payload.sub,
    sessionId: payload.sid,
    role: payload.role,
  };
}