import {Router} from "express"
import { rateLimit } from "express-rate-limit";
import {Login,Registrtion,Refresh, Logout} from "../controllers/auth.controllers.js"

export const router=Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts; try again later" },
});

router.post('/auth/register',loginLimiter, Registrtion)
router.post('/auth/login', loginLimiter, Login)
router.post('/auth/refresh',Refresh)
router.post('/auth/logout',Logout)