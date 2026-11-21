"use server";
import { db } from "@/lib/db";
import { clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { storeImage, UploadError, type StoredImage } from "@/lib/storage";
import { contactSchema, inquirySchema, submissionSchema, wantedSchema } from "@/lib/validators/public-forms";
import { parseAttributeSchema, validateAttributes } from "@/lib/validators/attribute-schema";
import type { Prisma } from "@prisma/client";

/** Error codes are message keys under `form.errors` so the client can translate them. */
export type PublicActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: "invalid" | "rateLimited" | "generic" | string; fieldErrors?: Record<string, string[] | undefined> };

function fieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "_");
    (out[k] ??= []).push(i.message);
  }
  return out;
}

async function limited(kind: string, limit: number, windowSec: number) {
  const fp = await clientFingerprint();
  return !(await rateLimit(`${kind}:${fp}`, limit, windowSec)).ok;
}

/** Silently "succeed" for bots that fill the honeypot (don't tell them they were caught). */
const botOk = { ok: true as const };

export async function createInquiryAction(input: unknown): Promise<PublicActionResult<{ ref?: string }>> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  if (parsed.data.website) return botOk;
  if (await limited("inquiry", 6, 60 * 10)) return { ok: false, error: "rateLimited" };
  try {
    let ref: string | undefined;
    let listingId: string | null = null;
    let brokerId: string | null = null;
    if (parsed.data.listingId) {
      const l = await db.listing.findFirst({
        where: { id: parsed.data.listingId, status: { in: ["PUBLISHED", "RESERVED", "SOLD", "RENTED"] } },
        select: { id: true, refCode: true, assignedBrokerId: true },
      });
      if (l) {
        listingId = l.id;
        ref = l.refCode;
        brokerId = l.assignedBrokerId;
      }
    }
    await db.inquiry.create({
      data: {
        listingId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        message: parsed.data.message || null,
        preferredContact: parsed.data.preferredContact,
        source: parsed.data.source,
        assignedBrokerId: brokerId,
      },
    });
    return { ok: true, data: { ref } };
  } catch (e) {
    console.error("[inquiry]", e);
    return { ok: false, error: "generic" };
  }
}

export async function createContactMessageAction(input: unknown): Promise<PublicActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  if (parsed.data.website) return botOk;
  if (await limited("contact", 5, 60 * 10)) return { ok: false, error: "rateLimited" };
  try {
    await db.inquiry.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        message: parsed.data.message,
        preferredContact: parsed.data.preferredContact,
        source: "contact",
      },
    });
    return { ok: true };
  } catch (e) {
    console.error("[contact]", e);
    return { ok: false, error: "generic" };
  }
}

export async function createWantedAction(input: unknown): Promise<PublicActionResult> {
  const parsed = wantedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  if (parsed.data.website) return botOk;
  if (await limited("wanted", 4, 60 * 30)) return { ok: false, error: "rateLimited" };
  const d = parsed.data;
  try {
    const [cat, area] = await Promise.all([
      d.categoryId ? db.category.findUnique({ where: { id: d.categoryId }, select: { id: true } }) : null,
      d.areaId ? db.area.findUnique({ where: { id: d.areaId }, select: { id: true } }) : null,
    ]);
    await db.wantedRequest.create({
      data: {
        name: d.name,
        phone: d.phone,
        categoryId: cat?.id ?? null,
        dealType: d.dealType,
        description: d.description,
        budgetMin: d.budgetMin,
        budgetMax: d.budgetMax,
        areaId: area?.id ?? null,
      },
    });
    return { ok: true };
  } catch (e) {
    console.error("[wanted]", e);
    return { ok: false, error: "generic" };
  }
}

/** Step 3 of /sell: upload one (already client-compressed) photo. */
export async function uploadSubmissionPhotoAction(formData: FormData): Promise<PublicActionResult<StoredImage>> {
  if (await limited("upload", 30, 60 * 30)) return { ok: false, error: "rateLimited" };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "invalid" };
  try {
    const stored = await storeImage(file, "submissions");
    return { ok: true, data: stored };
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, error: e.message };
    console.error("[upload]", e);
    return { ok: false, error: "generic" };
  }
}

export async function createSubmissionAction(input: unknown): Promise<PublicActionResult> {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  if (parsed.data.website) return botOk;
  if (await limited("submission", 4, 60 * 30)) return { ok: false, error: "rateLimited" };
  const d = parsed.data;
  try {
    const cat = await db.category.findFirst({ where: { id: d.categoryId, isActive: true }, select: { id: true, attributeSchema: true } });
    if (!cat) return { ok: false, error: "invalid", fieldErrors: { categoryId: ["category.required"] } };
    // Public submissions: keep only values that match the schema (don't enforce "required").
    const fields = parseAttributeSchema(cat.attributeSchema).map((f) => ({ ...f, required: false }));
    const attrs = validateAttributes(fields, d.attributes);
    const area = d.areaId ? await db.area.findUnique({ where: { id: d.areaId }, select: { id: true } }) : null;
    // Only accept photos our storage produced (Cloudinary or local uploads).
    const photos = d.photos.filter((p) => p.url.startsWith("/uploads/") || p.url.startsWith("https://res.cloudinary.com/"));
    await db.propertySubmission.create({
      data: {
        name: d.name,
        phone: d.phone,
        categoryId: cat.id,
        dealType: d.dealType,
        rentPeriod: d.rentPeriod,
        title: d.title,
        details: d.details || null,
        attributes: (attrs.ok ? attrs.data : {}) as Prisma.InputJsonValue,
        expectedPrice: d.expectedPrice,
        areaId: area?.id ?? null,
        photos: photos as unknown as Prisma.InputJsonValue,
      },
    });
    return { ok: true };
  } catch (e) {
    console.error("[submission]", e);
    return { ok: false, error: "generic" };
  }
}
