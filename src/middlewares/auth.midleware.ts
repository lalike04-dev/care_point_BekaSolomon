import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/auth.utils.js";
import type { AuthPrincipal } from "../schemas/auth.schema.js";

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.header("authorization");

  if (!authorization) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    return res.status(401).json({ message: "Invalid authorization header" });
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired access token",
    });
  }
}

