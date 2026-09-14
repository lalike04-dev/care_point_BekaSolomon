import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "../config/env.js";

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

