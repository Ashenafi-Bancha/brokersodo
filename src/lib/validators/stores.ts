import { z } from "zod";
import { STORE_TYPES } from "@/lib/stores";
import { optionalString, phoneSchema, priceSchema } from "./common";

const imageSchema = z
  .object({
    url: z.string().max(400),
    publicId: z.string().max(200).optional().nullable(),
    width: z.number().int().positive().max(10000),
    height: z.number().int().positive().max(10000),
    blurData: z.string().max(4000).optional().nullable(),
  })
  .nullable()
  .optional();

/** Telegram username like "@mycafe" or "mycafe". */
const telegram = z
  .string()
  .trim()
  .max(40)
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const u = v.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "");
    if (!/^[A-Za-z0-9_]{4,32}$/.test(u)) {
      ctx.addIssue({ code: "custom", message: "telegram.invalid" });
      return z.NEVER;
    }
    return u;
  });

export const storeSchema = z.object({
  name: z.string().trim().min(2, "name.min").max(80, "name.max"),
  type: z.enum(STORE_TYPES, { errorMap: () => ({ message: "required" }) }),
  tagline: optionalString(120),
  description: z.string().trim().max(3000, "description.max").optional().default(""),
  phone: phoneSchema,
  telegram,
  whatsapp: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => v || null),
  areaId: optionalString(40),
  address: optionalString(200),
  openingHours: optionalString(200),
  logo: imageSchema,
  cover: imageSchema,
});
export type StoreInput = z.input<typeof storeSchema>;

export const storeItemSchema = z.object({
  id: z.string().max(40).optional().nullable(),
  section: z.string().trim().max(60).optional().default(""),
  name: z.string().trim().min(1, "title.min").max(120, "title.max"),
  description: optionalString(600),
  price: priceSchema,
  priceNote: optionalString(40),
  image: imageSchema,
  isSpecial: z.boolean().optional().default(false),
  isAvailable: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).max(100000).optional().default(0),
});
export type StoreItemInput = z.input<typeof storeItemSchema>;

export const STORE_STATUSES = ["PENDING", "ACTIVE", "HIDDEN", "REJECTED"] as const;
