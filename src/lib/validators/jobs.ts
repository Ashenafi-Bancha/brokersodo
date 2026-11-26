import { z } from "zod";
import { honeypotSchema, nameSchema, optionalString, phoneSchema, priceSchema } from "./common";
import {
  EDUCATION_LEVELS,
  JOB_AUDIENCES,
  JOB_SECTORS,
  JOB_TYPES,
  LANGUAGES,
  SALARY_PERIODS,
  SEEKER_TYPES,
  TUTOR_LEVELS,
  TUTOR_MODES,
  TUTOR_SUBJECTS,
  WORK_MODES,
  dateFromDeadline,
} from "@/lib/jobs-catalog";

const choice = <T extends readonly [string, ...string[]]>(list: T) => z.enum(list, { errorMap: () => ({ message: "required" }) });

/** Whole number typed in a text field ("3", "") with an upper limit. */
const smallInt = (max: number, fallback: number | null = 0) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v, ctx) => {
      if (v === undefined || v === null || v === "") return fallback;
      const n = typeof v === "number" ? v : Number(String(v).trim());
      if (!Number.isInteger(n) || n < 0 || n > max) {
        ctx.addIssue({ code: "custom", message: "number.invalid" });
        return z.NEVER;
      }
      return n;
    });

const consent = z.boolean().refine((v) => v === true, "consent.required");
const text = (min: number, max: number, key: string) => z.string().trim().min(min, `${key}.min`).max(max, `${key}.max`);

/** Comma-separated skills typed in one field; split into a list with splitSkills() when saving. */
const skillsList = z.string().trim().max(600, "description.max").optional().nullable();

/** Optional choices from a fixed list (may be empty). */
const pickAny = <T extends readonly [string, ...string[]]>(list: T, max: number) =>
  z.array(z.enum(list)).max(max).optional().default([]).transform((v) => [...new Set(v)]);

/** Optional https link (portfolio, LinkedIn, GitHub). */
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(withScheme);
      if (!u.hostname.includes(".")) throw new Error("host");
      return u.toString();
    } catch {
      ctx.addIssue({ code: "custom", message: "url.invalid" });
      return z.NEVER;
    }
  });

/** YYYY-MM-DD between today and 6 months ahead, or empty. */
const deadlineSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      ctx.addIssue({ code: "custom", message: "deadline.invalid" });
      return z.NEVER;
    }
    const today = dateFromDeadline(new Date());
    const max = dateFromDeadline(new Date(Date.now() + 183 * 86_400_000));
    if (v < today || v > max) {
      ctx.addIssue({ code: "custom", message: "deadline.invalid" });
      return z.NEVER;
    }
    return v;
  });

const salaryRange = <T extends { salaryMin: number | null; salaryMax: number | null }>(v: T) =>
  v.salaryMin == null || v.salaryMax == null || v.salaryMin <= v.salaryMax;

/* ---------------- Public forms ---------------- */

export const jobPostSchema = z
  .object({
    title: text(4, 120, "title"),
    employerName: text(2, 120, "employer"),
    showEmployer: z.boolean().default(true),
    sector: choice(JOB_SECTORS),
    jobType: choice(JOB_TYPES),
    audience: choice(JOB_AUDIENCES),
    education: choice(EDUCATION_LEVELS),
    minExperience: smallInt(40),
    vacancies: smallInt(500, 1),
    salaryMin: priceSchema,
    salaryMax: priceSchema,
    salaryPeriod: choice(SALARY_PERIODS),
    areaId: optionalString(40),
    description: text(30, 5000, "description"),
    requirements: z.string().trim().max(3000, "description.max").optional().default(""),
    responsibilities: z.string().trim().max(3000, "description.max").optional().default(""),
    skills: skillsList,
    workMode: choice(WORK_MODES),
    deadline: deadlineSchema,
    contactName: nameSchema,
    contactPhone: phoneSchema,
    consent,
    website: honeypotSchema,
  })
  .refine(salaryRange, { path: ["salaryMax"], message: "budget.range" });
export type JobPostInput = z.input<typeof jobPostSchema>;

export const applicationSchema = z.object({
  jobId: z.string().min(1).max(40),
  name: nameSchema,
  phone: phoneSchema,
  education: choice(EDUCATION_LEVELS),
  field: optionalString(120),
  experience: smallInt(40),
  skills: optionalString(500),
  message: optionalString(1500),
  consent,
  website: honeypotSchema,
});
export type ApplicationInput = z.input<typeof applicationSchema>;

export const seekerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  seekerType: choice(SEEKER_TYPES),
  profession: text(2, 120, "profession"),
  sector: choice(JOB_SECTORS),
  education: choice(EDUCATION_LEVELS),
  field: optionalString(120),
  graduationYear: smallInt(2100, null).refine((v) => v == null || (v >= 1980 && v <= new Date().getFullYear() + 1), "number.invalid"),
  experience: smallInt(40),
  skills: optionalString(500),
  about: optionalString(1000),
  languages: pickAny(LANGUAGES, 5),
  certifications: optionalString(800),
  projects: optionalString(1500),
  portfolioUrl: optionalUrl,
  availability: optionalString(200),
  /** true = list on Find Talent (first name only, contact through BrokerSodo) */
  makePublic: z.boolean().optional().default(false),
  areaId: optionalString(40),
  consent,
  website: honeypotSchema,
});
export type SeekerInput = z.input<typeof seekerSchema>;

const pickSome = <T extends readonly [string, ...string[]]>(list: T, max: number) =>
  z.array(z.enum(list)).min(1, "choose.one").max(max).transform((v) => [...new Set(v)]);

export const tutorSchema = z.object({
  fullName: nameSchema,
  phone: phoneSchema,
  subjects: pickSome(TUTOR_SUBJECTS, 6),
  levels: pickSome(TUTOR_LEVELS, 6),
  modes: pickSome(TUTOR_MODES, 3),
  education: choice(EDUCATION_LEVELS),
  field: optionalString(120),
  experienceYears: smallInt(50),
  bio: text(30, 1500, "description"),
  availability: optionalString(200),
  hourlyRate: priceSchema,
  monthlyRate: priceSchema,
  languages: pickAny(LANGUAGES, 5),
  areaId: optionalString(40),
  consent,
  website: honeypotSchema,
});
export type TutorInput = z.input<typeof tutorSchema>;

export const tutorRequestSchema = z.object({
  tutorId: optionalString(40),
  name: nameSchema,
  phone: phoneSchema,
  subject: choice(TUTOR_SUBJECTS),
  level: choice(TUTOR_LEVELS),
  mode: choice(TUTOR_MODES),
  areaId: optionalString(40),
  schedule: optionalString(200),
  budget: priceSchema,
  message: optionalString(1000),
  website: honeypotSchema,
});
export type TutorRequestInput = z.input<typeof tutorRequestSchema>;

export const tutorReviewSchema = z.object({
  tutorId: z.string().min(1).max(40),
  name: nameSchema,
  phone: phoneSchema,
  rating: z.coerce.number().int().min(1, "rating.required").max(5, "rating.required"),
  comment: text(10, 1000, "review"),
  consent,
  website: honeypotSchema,
});
export type TutorReviewInput = z.input<typeof tutorReviewSchema>;

export const talentRequestSchema = z.object({
  seekerId: z.string().min(1).max(40),
  employerName: text(2, 120, "employer"),
  contactName: nameSchema,
  phone: phoneSchema,
  message: optionalString(1000),
  website: honeypotSchema,
});
export type TalentRequestInput = z.input<typeof talentRequestSchema>;

/* ---------------- Admin ---------------- */

export const JOB_STATUSES = ["PENDING", "UNDER_REVIEW", "PUBLISHED", "CLOSED", "REJECTED"] as const;
export const APPLICATION_STATUSES = ["NEW", "REVIEWING", "SHORTLISTED", "CONTACTED", "INTERVIEW", "HIRED", "REJECTED", "WITHDRAWN"] as const;
export const SEEKER_STATUSES = ["NEW", "ACTIVE", "PLACED", "ARCHIVED"] as const;
export const TUTOR_STATUSES = ["PENDING", "ACTIVE", "HIDDEN", "REJECTED"] as const;
export const TUTOR_REQUEST_STATUSES = ["NEW", "CONTACTED", "MATCHED", "COMPLETED", "CANCELLED", "CLOSED"] as const;
export const TALENT_REQUEST_STATUSES = ["NEW", "CONTACTED", "CONNECTED", "CLOSED"] as const;
export const REVIEW_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export const adminJobSchema = z
  .object({
    id: z.string().max(40).optional().nullable(),
    title: text(4, 120, "title"),
    employerName: text(2, 120, "employer"),
    showEmployer: z.boolean(),
    employerVerified: z.boolean(),
    featured: z.boolean(),
    sector: choice(JOB_SECTORS),
    jobType: choice(JOB_TYPES),
    audience: choice(JOB_AUDIENCES),
    education: choice(EDUCATION_LEVELS),
    minExperience: smallInt(40),
    vacancies: smallInt(500, 1),
    salaryMin: priceSchema,
    salaryMax: priceSchema,
    salaryPeriod: choice(SALARY_PERIODS),
    areaId: optionalString(40),
    description: text(30, 5000, "description"),
    requirements: z.string().trim().max(3000).default(""),
    responsibilities: z.string().trim().max(3000).default(""),
    skills: skillsList,
    workMode: choice(WORK_MODES),
    howToApply: optionalString(500),
    deadline: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional().nullable(),
    contactName: nameSchema,
    contactPhone: phoneSchema,
    staffNotes: optionalString(5000),
    status: z.enum(JOB_STATUSES),
  })
  .refine(salaryRange, { path: ["salaryMax"], message: "Max salary must be more than min" });

export const adminTutorSchema = z.object({
  id: z.string().max(40).optional().nullable(),
  displayName: text(2, 40, "name"),
  fullName: nameSchema,
  phone: phoneSchema,
  subjects: pickSome(TUTOR_SUBJECTS, 12),
  levels: pickSome(TUTOR_LEVELS, 6),
  modes: pickSome(TUTOR_MODES, 3),
  education: choice(EDUCATION_LEVELS),
  field: optionalString(120),
  experienceYears: smallInt(50),
  bio: text(30, 1500, "description"),
  availability: optionalString(200),
  hourlyRate: priceSchema,
  monthlyRate: priceSchema,
  languages: pickAny(LANGUAGES, 5),
  areaId: optionalString(40),
  isVerified: z.boolean(),
  featured: z.boolean(),
  staffNotes: optionalString(5000),
  status: z.enum(TUTOR_STATUSES),
});

export const inboxUpdateSchema = z.object({
  id: z.string().min(1).max(40),
  status: z.string().max(20),
  notes: z.string().max(5000).optional().nullable(),
  tutorId: z.string().max(40).optional().nullable(),
});

/** Staff edit of a talent profile's public side. */
export const adminTalentSchema = z.object({
  id: z.string().min(1).max(40),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
  displayName: text(2, 40, "name"),
  profession: text(2, 120, "profession"),
  skills: optionalString(500),
  about: optionalString(1000),
  languages: pickAny(LANGUAGES, 5),
  certifications: optionalString(800),
  projects: optionalString(1500),
  portfolioUrl: optionalUrl,
  availability: optionalString(200),
  isVerified: z.boolean(),
});
