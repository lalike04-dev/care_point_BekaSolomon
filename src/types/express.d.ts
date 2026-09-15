import type { AuthPrincipal } from "../utils/access-token";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPrincipal;
    }
  }
}

export {};