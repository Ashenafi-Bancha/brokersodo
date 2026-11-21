import { z } from "zod";
import {
  CONTACT_METHODS,
  DEAL_TYPES,
  RENT_PERIODS,
  honeypotSchema,
  nameSchema,
  optionalString,
  phoneSchema,
  priceSchema,
} from "./common";

/** Shared by the client form (React Hook Form) and the server action. */
export const inquirySchema = z.object({
  listingId: z.string().max(40).optional().nullable(),
  name: nameSchema,
  phone: phoneSchema,
  message: z.string().trim().max(1000, "message.max").optional().default(""),
  preferredContact: z.enum(CONTACT_METHODS).default("CALL"),
  source: z.enum(["listing", "contact", "home"]).default("listing"),
  website: honeypotSchema,
});
export type InquiryInput = z.input<typeof inquirySchema>;

export const submissionPhotoSchema = z.object({
  url: z.string().url().or(z.string().startsWith("/")),
  publicId: z.string().max(200).optional().nullable(),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
});

export const submissionSchema = z
  .object({
    categoryId: z.string().min(1, "category.required").max(40),
    dealType: z.enum(DEAL_TYPES),
    rentPeriod: z.enum(RENT_PERIODS).optional().nullable(),
    title: z.string().trim().min(4, "title.min").max(120, "title.max"),
    details: z.string().trim().max(3000).optional().default(""),
    attributes: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
    expectedPrice: priceSchema,
    areaId: optionalString(40),
    photos: z.array(submissionPhotoSchema).max(10, "photos.max").default([]),
    name: nameSchema,
    phone: phoneSchema,
    website: honeypotSchema,
  })
  .transform((v) => ({ ...v, rentPeriod: v.dealType === "RENT" ? (v.rentPeriod ?? "MONTH") : null }));
export type SubmissionInput = z.input<typeof submissionSchema>;

export const wantedSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    categoryId: optionalString(40),
    dealType: z.enum(DEAL_TYPES),
    description: z.string().trim().min(10, "description.min").max(1500, "description.max"),
    budgetMin: priceSchema,
    budgetMax: priceSchema,
    areaId: optionalString(40),
    website: honeypotSchema,
  })
  .refine((v) => v.budgetMin == null || v.budgetMax == null || v.budgetMin <= v.budgetMax, {
    path: ["budgetMax"],
    message: "budget.range",
  });
export type WantedInput = z.input<typeof wantedSchema>;

export const contactSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  message: z.string().trim().min(5, "message.min").max(1500, "message.max"),
  preferredContact: z.enum(CONTACT_METHODS).default("CALL"),
  website: honeypotSchema,
});
export type ContactInput = z.input<typeof contactSchema>;
