import { z } from "zod";
import { normalizeEthiopianPhone, parsePrice } from "@/lib/format";

export const DEAL_TYPES = ["SALE", "RENT"] as const;
export const RENT_PERIODS = ["DAY", "MONTH", "YEAR"] as const;
export const CONDITIONS = ["NEW", "USED", "REFURBISHED"] as const;
export const CONTACT_METHODS = ["CALL", "TELEGRAM", "WHATSAPP"] as const;
export const LISTING_STATUSES = ["DRAFT", "PUBLISHED", "UNDER_NEGOTIATION", "RESERVED", "SOLD", "RENTED", "ARCHIVED"] as const;
export const INQUIRY_STATUSES = [
  "NEW",
  "CONTACTED",
  "VIEWING_SCHEDULED",
  "NEGOTIATING",
  "CLOSED_WON",
  "CLOSED_LOST",
] as const;
export const SUBMISSION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const WANTED_STATUSES = ["OPEN", "MATCHED", "CLOSED"] as const;

/** Ethiopian mobile, normalised to +2519…/+2517… */
export const phoneSchema = z
  .string({ required_error: "phone.required" })
  .trim()
  .min(1, "phone.required")
  .transform((v, ctx) => {
    const n = normalizeEthiopianPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "phone.invalid" });
      return z.NEVER;
    }
    return n;
  });

export const nameSchema = z.string().trim().min(2, "name.min").max(80, "name.max");

/** Accepts numbers or strings like "1,200,000" / "250k". */
export const priceSchema = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (v === undefined || v === null || v === "") return null;
    const p = parsePrice(v);
    if (p === null || p < 0 || p > 100_000_000_000) {
      ctx.addIssue({ code: "custom", message: "price.invalid" });
      return z.NEVER;
    }
    return p;
  });

/** Honeypot: must stay empty. Bots fill every field. */
export const honeypotSchema = z.string().max(0).optional().or(z.literal(""));

export const optionalString = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const idSchema = z.string().min(1).max(40);
