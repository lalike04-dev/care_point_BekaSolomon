// Registration Schemas
import {z} from 'zod';

export const emailschema=z.email("Enter a valid email address").trim().transform((email)=>email.toLowerCase())

export const passwordschema=z.string().min(8,"Enter atleast 8 chracters!").max(255,"Password cannot exceed 255 characters!")

export const nameschema=z.string().min(2).max(50)

export const phoneschema=z.number().nonnegative("Phone cannot be a negative number!")

export const roleidschema=z.enum(['1','2','3'])

export const registrationschema=z.object({
    body:z.object({email:emailschema,
    password:passwordschema,
    name:nameschema,
    phone:phoneschema,
    roleid:roleidschema})
})

export const loginschema=z.object({
    body:z.object({name:nameschema,
    email:emailschema})
})

export type registrationSchema=z.infer<typeof registrationschema>["body"]
export type loginSchema=z.infer<typeof loginschema>["body"]

export const ACCESS_ISSUER = "carepoint-auth-api";
export const ACCESS_AUDIENCE = "carepoint-api";

export const verifiedAccessPayloadSchema = z.object({
  sub: z.uuid(),
  sid: z.uuid(),
  role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]),
  iss: z.literal(ACCESS_ISSUER),
  aud: z.union([
    z.literal(ACCESS_AUDIENCE),
    z.array(z.string()).refine((values) => values.includes(ACCESS_AUDIENCE)),
  ]),
  iat: z.number(),
  exp: z.number(),
  jti: z.uuid(),
});

export interface AuthPrincipal {
  userId: string;
  sessionId: string;
  role: "PATIENT" | "ADMIN" | "DOCTOR";
}

