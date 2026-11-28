import { z } from "zod";
import { CATALOG_KEY } from "@/lib/jobs-catalog";
import { honeypotSchema, nameSchema, optionalString, phoneSchema } from "./common";

/** 8+ characters with at least one letter and one number; bcrypt reads at most 72 bytes. */
export const passwordSchema = z
  .string()
  .min(8, "password.min")
  .max(72, "password.max")
  .refine((v) => /[A-Za-zሀ-፿]/.test(v) && /\d/.test(v), "password.weak");

export const signUpSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirm: z.string(),
    terms: z.boolean().refine((v) => v === true, "consent.required"),
    website: honeypotSchema,
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "password.mismatch" });
export type SignUpInput = z.input<typeof signUpSchema>;

export const signInSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "password.required").max(72, "password.max"),
});
export type SignInInput = z.input<typeof signInSchema>;

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "password.required").max(72),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "password.mismatch" });
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

export const accountNameSchema = z.object({ name: nameSchema });

export const companySchema = z.object({
  name: z.string().trim().min(2, "employer.min").max(120, "employer.max"),
  sector: z.string().regex(CATALOG_KEY, "required"),
  about: optionalString(1500),
  website: optionalString(200),
  areaId: optionalString(40),
});
export type CompanyInput = z.input<typeof companySchema>;

/** What an employer may set on an applicant from their dashboard. */
export const EMPLOYER_APPLICANT_STATUSES = ["REVIEWING", "SHORTLISTED", "INTERVIEW", "HIRED", "REJECTED"] as const;
