import type { AuthPrincipal } from "../schemas/auth.schema.ts";

declare global {
  namespace Express {
    interface Request {
      user?: AuthPrincipal;
    }
  }
}

export {};