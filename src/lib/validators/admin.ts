import { z } from "zod";
import { attributeSchemaSchema } from "./attribute-schema";
import {
  CONDITIONS,
  DEAL_TYPES,
  INQUIRY_STATUSES,
  LISTING_STATUSES,
  RENT_PERIODS,
  WANTED_STATUSES,
  optionalString,
  priceSchema,
} from "./common";
import { normalizeEthiopianPhone } from "@/lib/format";

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = normalizeEthiopianPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Ethiopian mobile number" });
      return z.NEVER;
    }
    return n;
  });

const optionalFloat = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === null || v === undefined ? null : Number(v)))
  .refine((v) => v === null || Number.isFinite(v), "Invalid number");

const optionalDate = z
  .union([z.string(), z.date()])
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(v) : null))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), "Invalid date");

export const listingImageInputSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1),
  publicId: z.string().optional().nullable(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().max(200).optional().nullable(),
  blurData: z.string().max(4000).optional().nullable(),
  isCover: z.boolean().default(false),
});
export type ListingImageInput = z.infer<typeof listingImageInputSchema>;

export const listingFormSchema = z
  .object({
    titleEn: z.string().trim().min(4, "Title is too short").max(140),
    titleAm: optionalString(140),
    descriptionEn: z.string().max(20000).default(""),
    descriptionAm: z.string().max(20000).optional().nullable(),
    videoUrl: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => v || null)
      .refine((v) => !v || /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(v), "Must be a YouTube link"),
    categoryId: z.string().min(1, "Choose a category"),
    dealType: z.enum(DEAL_TYPES),
    rentPeriod: z.enum(RENT_PERIODS).optional().nullable(),
    price: priceSchema,
    isNegotiable: z.boolean().default(false),
    priceOnRequest: z.boolean().default(false),
    condition: z.enum(CONDITIONS).optional().nullable().or(z.literal("").transform(() => null)),
    areaId: optionalString(40),
    addressHint: optionalString(160),
    lat: optionalFloat,
    lng: optionalFloat,
    attributes: z.record(z.unknown()).default({}),
    status: z.enum(LISTING_STATUSES).default("DRAFT"),
    isVerified: z.boolean().default(false),
    isInspected: z.boolean().default(false),
    featured: z.boolean().default(false),
    featuredUntil: optionalDate,
    assignedBrokerId: optionalString(40),
    ownerName: optionalString(120),
    ownerPhone: optionalPhone,
    ownerNotes: optionalString(2000),
    images: z.array(listingImageInputSchema).max(30).default([]),
    fromSubmissionId: optionalString(40),
  })
  .superRefine((v, ctx) => {
    if (v.dealType === "RENT" && !v.rentPeriod)
      ctx.addIssue({ code: "custom", path: ["rentPeriod"], message: "Choose a rent period" });
    if (!v.priceOnRequest && (v.price === null || v.price === undefined))
      ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a price or tick 'Price on request'" });
    if ((v.lat === null) !== (v.lng === null))
      ctx.addIssue({ code: "custom", path: ["lat"], message: "Set both latitude and longitude" });
  });
export type ListingFormInput = z.input<typeof listingFormSchema>;
export type ListingFormData = z.output<typeof listingFormSchema>;

export const statusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  action: z.enum(["publish", "reserve", "sold", "rented", "archive", "draft", "feature", "unfeature", "verify", "unverify"]),
  date: optionalDate,
});

export const categoryFormSchema = z.object({
  nameEn: z.string().trim().min(2).max(60),
  nameAm: optionalString(60),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only"),
  refPrefix: z
    .string()
    .trim()
    .min(1)
    .max(3)
    .regex(/^[A-Z]+$/, "Capital letters only"),
  icon: z.string().trim().min(1).max(30),
  image: optionalString(500),
  descriptionEn: optionalString(500),
  descriptionAm: optionalString(500),
  isActive: z.boolean().default(true),
  parentId: optionalString(40),
  attributeSchema: attributeSchemaSchema,
});
export type CategoryFormInput = z.input<typeof categoryFormSchema>;

export const areaFormSchema = z.object({
  nameEn: z.string().trim().min(2).max(60),
  nameAm: optionalString(60),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only"),
  city: z.string().trim().min(2).max(60).default("Wolaita Sodo"),
  isActive: z.boolean().default(true),
});
export type AreaFormInput = z.input<typeof areaFormSchema>;

export const reorderSchema = z.object({ ids: z.array(z.string()).min(1).max(500) });

export const inquiryUpdateSchema = z.object({
  id: z.string(),
  status: z.enum(INQUIRY_STATUSES).optional(),
  assignedBrokerId: z.string().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const wantedUpdateSchema = z.object({
  id: z.string(),
  status: z.enum(WANTED_STATUSES).optional(),
  notes: z.string().max(5000).nullable().optional(),
  matchListingIds: z.array(z.string()).max(50).optional(),
});

export const rejectSubmissionSchema = z.object({
  id: z.string(),
  reason: z.string().trim().min(3, "Give a short reason").max(1000),
});

export const testimonialSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: optionalString(80),
  quoteEn: z.string().trim().min(5).max(800),
  quoteAm: optionalString(800),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  avatar: optionalString(500),
  isActive: z.boolean().default(true),
});
export type TestimonialInput = z.input<typeof testimonialSchema>;

export const faqSchema = z.object({
  questionEn: z.string().trim().min(5).max(300),
  questionAm: optionalString(300),
  answerEn: z.string().trim().min(5).max(3000),
  answerAm: optionalString(3000),
  isActive: z.boolean().default(true),
});
export type FaqInput = z.input<typeof faqSchema>;

export const pageSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  titleEn: z.string().trim().min(2).max(120),
  titleAm: optionalString(120),
  bodyEn: z.string().max(50000).default(""),
  bodyAm: z.string().max(50000).optional().nullable(),
  isActive: z.boolean().default(true),
});
export type PageInput = z.input<typeof pageSchema>;

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => v || null)
  .refine((v) => !v || /^https?:\/\//.test(v), "Must start with https://");
const optionalInt = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => (v === "" || v === null || v === undefined ? null : Math.round(Number(v))))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Must be a positive number");

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(80),
  taglineEn: optionalString(160),
  taglineAm: optionalString(160),
  phonePrimary: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = normalizeEthiopianPhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Enter a valid Ethiopian mobile number" });
        return z.NEVER;
      }
      return n;
    }),
  phoneSecondary: optionalPhone,
  telegramUsername: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, ""))
    .pipe(z.string().regex(/^[A-Za-z0-9_]{4,32}$/, "Telegram username: 4–32 letters, numbers or _")),
  telegramChannel: optionalString(80),
  whatsappNumber: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = normalizeEthiopianPhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Enter a valid Ethiopian mobile number" });
        return z.NEVER;
      }
      return n;
    }),
  email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => v || null)
    .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email"),
  addressEn: optionalString(200),
  addressAm: optionalString(200),
  mapLat: z.coerce.number().min(-90).max(90),
  mapLng: z.coerce.number().min(-180).max(180),
  hoursEn: optionalString(200),
  hoursAm: optionalString(200),
  facebookUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  instagramUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  heroTitleEn: optionalString(120),
  heroTitleAm: optionalString(120),
  heroSubtitleEn: optionalString(240),
  heroSubtitleAm: optionalString(240),
  statListings: optionalInt,
  statDeals: optionalInt,
  statClients: optionalInt,
  statYears: optionalInt,
  seoTitle: optionalString(70),
  seoDescription: optionalString(170),
});
export type SettingsInput = z.input<typeof settingsSchema>;

export const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  phone: optionalPhone,
  role: z.enum(["ADMIN", "BROKER"]),
  password: z.string().min(10, "At least 10 characters").max(200),
});
export type UserCreateInput = z.input<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2).max(80),
  phone: optionalPhone,
  role: z.enum(["ADMIN", "BROKER"]),
  isActive: z.boolean(),
  password: z
    .string()
    .max(200)
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || v.length >= 10, "At least 10 characters"),
});
export type UserUpdateInput = z.input<typeof userUpdateSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter your email"),
  password: z.string().min(1, "Enter your password").max(200),
});
