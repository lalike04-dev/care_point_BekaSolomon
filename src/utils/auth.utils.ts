import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "../config/env.js";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import {ACCESS_AUDIENCE,ACCESS_ISSUER,AuthPrincipal, verifiedAccessPayloadSchema} from "../schemas/auth.schema.js"


const bcrypt_options={
    saltRounds:12
} as const 

export const REFRESH_COOKIE_NAME = "refresh_token";
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const refreshCookieBaseOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/auth/refresh",
};

export const refreshCookieOptions = {
  ...refreshCookieBaseOptions,
  maxAge: REFRESH_TTL_MS,
};

export function createRefreshSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function digestRefreshSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function buildRefreshCredential(
  sessionId: string,
  secret: string,
): string {
  return `${sessionId}.${secret}`;
}

export function parseRefreshCredential(value: string | undefined) {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  return { sessionId: parts[0], secret: parts[1] };
}

export function equalDigest(candidate: string, stored: string): boolean {
  const left = Buffer.from(candidate, "hex");
  const right = Buffer.from(stored, "hex");

  return left.length === right.length && timingSafeEqual(left, right);
}


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