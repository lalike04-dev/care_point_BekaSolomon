import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.url(),
  JWT_ACCESS_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);