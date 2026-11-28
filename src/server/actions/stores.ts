"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getMember } from "@/lib/member-auth";
import { rateLimit } from "@/lib/rate-limit";
import { listingSlug, nextRefCode } from "@/lib/ref-code";
import { normalizeEthiopianPhone } from "@/lib/format";
import { storeImage as storeImageFile, trustedPhoto, UploadError, type StoredImage } from "@/lib/storage";
import { MAX_STORE_ITEMS, storeImage } from "@/lib/stores";
import { storeItemSchema, storeSchema } from "@/lib/validators/stores";
import type { PublicActionResult } from "./public";

/**
 * A member's own business store. Every action re-reads the member from the session and
 * only touches their store. New stores wait for staff; items can be edited any time.
 */

function fieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "_")] ??= []).push(i.message);
  return out;
}

/** Only images our storage produced (never a URL typed by the browser). */
function trusted(img: unknown): Prisma.InputJsonValue | null {
  const i = storeImage(img);
  if (!i) return null;
  const t = trustedPhoto(i);
  return t ? ({ url: t.url, publicId: t.publicId ?? null, width: t.width, height: t.height, blurData: t.blurData ?? null } as Prisma.InputJsonValue) : null;
}

const refresh = (slug?: string) => {
  revalidatePath("/[locale]/account", "layout");
  revalidatePath("/[locale]/stores", "page");
  if (slug) revalidatePath(`/[locale]/stores/${slug}`, "page");
};

/** Store photos (logo, cover, item pictures), compressed in the browser first. */
export async function uploadStoreImageAction(formData: FormData): Promise<PublicActionResult<StoredImage>> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  if (!(await rateLimit(`store-upload:${me.id}`, 80, 60 * 60)).ok) return { ok: false, error: "rateLimited" };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "invalid" };
  try {
    return { ok: true, data: await storeImageFile(file, "stores") };
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, error: e.message };
    console.error("[store upload]", e);
    return { ok: false, error: "generic" };
  }
}

export async function saveMyStoreAction(input: unknown): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (!(await rateLimit(`store-save:${me.id}`, 40, 60 * 60)).ok) return { ok: false, error: "rateLimited" };
  const whatsapp = d.whatsapp ? normalizeEthiopianPhone(d.whatsapp) : null;
  if (d.whatsapp && !whatsapp) return { ok: false, error: "invalid", fieldErrors: { whatsapp: ["phone.invalid"] } };
  const areaId = d.areaId ? ((await db.area.findFirst({ where: { id: d.areaId, isActive: true }, select: { id: true } }))?.id ?? null) : null;
  const data = {
    name: d.name,
    type: d.type,
    tagline: d.tagline,
    description: d.description,
    phone: d.phone,
    telegram: d.telegram,
    whatsapp,
    areaId,
    address: d.address,
    openingHours: d.openingHours,
    logo: trusted(d.logo) ?? undefined,
    cover: trusted(d.cover) ?? undefined,
  };
  const existing = await db.store.findUnique({ where: { memberId: me.id }, select: { id: true, slug: true, name: true, status: true } });
  if (existing) {
    // A new business name is checked again; other edits stay live.
    const recheck = existing.status === "ACTIVE" && existing.name !== d.name;
    await db.store.update({
      where: { id: existing.id },
      // A removed photo is stored as SQL NULL.
      data: { ...data, logo: trusted(d.logo) ?? Prisma.DbNull, cover: trusted(d.cover) ?? Prisma.DbNull, ...(recheck ? { status: "PENDING" } : {}) },
    });
    refresh(existing.slug);
  } else {
    await db.$transaction(async (tx) => {
      const refCode = await nextRefCode(tx, "S");
      await tx.store.create({ data: { ...data, memberId: me.id, refCode, slug: listingSlug(d.name, refCode) } });
    });
    refresh();
  }
  return { ok: true };
}

async function myStore(memberId: string) {
  return db.store.findUnique({ where: { memberId }, select: { id: true, slug: true } });
}

export async function saveMyStoreItemAction(input: unknown): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const store = await myStore(me.id);
  if (!store) return { ok: false, error: "noStore" };
  const parsed = storeItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (!(await rateLimit(`store-item:${me.id}`, 300, 60 * 60)).ok) return { ok: false, error: "rateLimited" };
  const data = {
    section: d.section,
    name: d.name,
    description: d.description,
    price: d.price,
    priceNote: d.priceNote,
    image: trusted(d.image) ?? Prisma.DbNull,
    isSpecial: d.isSpecial,
    isAvailable: d.isAvailable,
    sortOrder: d.sortOrder,
  };
  if (d.id) {
    const r = await db.storeItem.updateMany({ where: { id: d.id, storeId: store.id }, data });
    if (r.count === 0) return { ok: false, error: "generic" };
  } else {
    if ((await db.storeItem.count({ where: { storeId: store.id } })) >= MAX_STORE_ITEMS) return { ok: false, error: "tooManyItems" };
    await db.storeItem.create({ data: { ...data, storeId: store.id } });
  }
  refresh(store.slug);
  return { ok: true };
}

export async function deleteMyStoreItemAction(id: string): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const store = await myStore(me.id);
  if (!store) return { ok: false, error: "noStore" };
  await db.storeItem.deleteMany({ where: { id: String(id).slice(0, 40), storeId: store.id } });
  refresh(store.slug);
  return { ok: true };
}
