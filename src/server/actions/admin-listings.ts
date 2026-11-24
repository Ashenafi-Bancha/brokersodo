"use server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { listingFormSchema, statusChangeSchema } from "@/lib/validators/admin";
import { parseAttributeSchema, validateAttributes } from "@/lib/validators/attribute-schema";
import { listingSlug, nextRefCode } from "@/lib/ref-code";
import { sanitizeRichText } from "@/lib/sanitize";
import { getStorage, storeImage, UploadError, type StoredImage } from "@/lib/storage";
import { adminAction, logActivity, revalidatePublic, type ActionResult } from "./_helpers";

const STAFF = ["ADMIN", "BROKER"] as const;

/** Create or update a listing (images, attributes, private owner info included). */
export async function saveListingAction(id: string | null, input: unknown): Promise<ActionResult<{ id: string; refCode: string }>> {
  return adminAction([...STAFF], async (session) => {
    const parsed = listingFormSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }
    const d = parsed.data;
    const category = await db.category.findUnique({ where: { id: d.categoryId }, select: { id: true, refPrefix: true, attributeSchema: true } });
    if (!category) return { ok: false, error: "Category not found", fieldErrors: { categoryId: ["Choose a category"] } };

    const attrs = validateAttributes(parseAttributeSchema(category.attributeSchema), d.attributes);
    if (!attrs.ok) {
      const fe: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(attrs.errors)) if (v) fe[`attributes.${k}`] = v;
      return { ok: false, error: "Some details don't match this category's fields.", fieldErrors: fe };
    }

    if (d.assignedBrokerId) {
      const b = await db.user.findFirst({ where: { id: d.assignedBrokerId, isActive: true }, select: { id: true } });
      if (!b) return { ok: false, error: "Assigned broker not found", fieldErrors: { assignedBrokerId: ["Choose an active staff member"] } };
    }

    let images = d.images.map((img, i) => ({ ...img, sortOrder: i }));
    // Converting a submission: copy its photos into the listings folder so they're independent.
    if (!id && d.fromSubmissionId) {
      const storage = getStorage();
      images = await Promise.all(
        images.map(async (img) => {
          if (!img.url.includes("/submissions/")) return img;
          const copied = await storage.copy({ url: img.url, publicId: img.publicId ?? null, width: img.width, height: img.height, blurData: img.blurData }, "listings").catch(() => null);
          return copied ? { ...img, url: copied.url, publicId: copied.publicId, width: copied.width, height: copied.height } : img;
        }),
      );
    }
    if (images.length && !images.some((i) => i.isCover)) images[0].isCover = true;

    const base = {
      titleEn: d.titleEn,
      titleAm: d.titleAm,
      descriptionEn: sanitizeRichText(d.descriptionEn),
      descriptionAm: d.descriptionAm ? sanitizeRichText(d.descriptionAm) : null,
      videoUrl: d.videoUrl,
      categoryId: d.categoryId,
      dealType: d.dealType,
      rentPeriod: d.dealType === "RENT" ? d.rentPeriod : null,
      price: d.priceOnRequest ? null : d.price,
      priceOnRequest: d.priceOnRequest,
      isNegotiable: d.isNegotiable,
      condition: d.condition || null,
      areaId: d.areaId,
      addressHint: d.addressHint,
      lat: d.lat,
      lng: d.lng,
      attributes: attrs.data as Prisma.InputJsonValue,
      isVerified: d.isVerified,
      isInspected: d.isInspected,
      featured: d.featured,
      featuredUntil: d.featured ? d.featuredUntil : null,
      assignedBrokerId: d.assignedBrokerId,
      ownerName: d.ownerName,
      ownerPhone: d.ownerPhone,
      ownerNotes: d.ownerNotes,
    } satisfies Prisma.ListingUncheckedUpdateInput;

    const imageRows = (listingId: string) =>
      images.map((img) => ({
        listingId,
        url: img.url,
        publicId: img.publicId ?? null,
        width: img.width,
        height: img.height,
        alt: img.alt ?? null,
        sortOrder: img.sortOrder,
        isCover: img.isCover,
        blurData: img.blurData ?? null,
      }));

    if (!id) {
      const created = await db.$transaction(async (tx) => {
        const refCode = await nextRefCode(tx, category.refPrefix);
        const listing = await tx.listing.create({
          data: {
            ...base,
            refCode,
            slug: listingSlug(d.titleEn, refCode),
            status: d.status,
            publishedAt: d.status === "PUBLISHED" ? new Date() : null,
          },
          select: { id: true, refCode: true },
        });
        if (images.length) await tx.listingImage.createMany({ data: imageRows(listing.id) });
        if (d.fromSubmissionId) {
          await tx.propertySubmission.update({
            where: { id: d.fromSubmissionId },
            data: { status: "APPROVED", linkedListingId: listing.id },
          });
        }
        return listing;
      });
      await logActivity(session, "create", "Listing", created.id, `Created ${created.refCode} “${d.titleEn}”${d.fromSubmissionId ? " from a submission" : ""}`);
      revalidatePublic();
      return { ok: true, data: created, message: `Listing ${created.refCode} created` };
    }

    const existing = await db.listing.findUnique({ where: { id }, select: { id: true, refCode: true, status: true, publishedAt: true, images: { select: { id: true, publicId: true, url: true } } } });
    if (!existing) return { ok: false, error: "Listing not found" };
    const keepUrls = new Set(images.map((i) => i.url));
    const removed = existing.images.filter((i) => !keepUrls.has(i.url));

    await db.$transaction(async (tx) => {
      await tx.listing.update({
        where: { id },
        data: {
          ...base,
          slug: listingSlug(d.titleEn, existing.refCode),
          status: d.status,
          publishedAt: d.status === "PUBLISHED" && !existing.publishedAt ? new Date() : undefined,
        },
      });
      await tx.listingImage.deleteMany({ where: { listingId: id } });
      if (images.length) await tx.listingImage.createMany({ data: imageRows(id) });
    });
    // Delete files only after the DB commit, and only if no other listing uses them.
    for (const r of removed) {
      if (!r.publicId) continue;
      const stillUsed = await db.listingImage.count({ where: { publicId: r.publicId } });
      if (!stillUsed) await getStorage().remove(r.publicId);
    }
    await logActivity(session, "update", "Listing", id, `Updated ${existing.refCode} “${d.titleEn}”`);
    revalidatePublic();
    return { ok: true, data: { id, refCode: existing.refCode }, message: "Listing saved" };
  });
}

export async function uploadListingImageAction(formData: FormData): Promise<ActionResult<StoredImage>> {
  return adminAction([...STAFF], async () => {
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "No file received" };
    try {
      return { ok: true, data: await storeImage(file, "listings") };
    } catch (e) {
      if (e instanceof UploadError) return { ok: false, error: e.message };
      throw e;
    }
  });
}

/** Quick + bulk actions: publish, reserve, sold, rented, archive, draft, feature, verify… */
export async function changeListingStatusAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  return adminAction([...STAFF], async (session) => {
    const { ids, action, date } = statusChangeSchema.parse(input);
    const when = date ?? new Date();
    let data: Prisma.ListingUpdateManyMutationInput;
    switch (action) {
      case "publish":
        data = { status: "PUBLISHED", soldAt: null };
        break;
      case "reserve":
        data = { status: "RESERVED" };
        break;
      case "sold":
        data = { status: "SOLD", soldAt: when, featured: false };
        break;
      case "rented":
        data = { status: "RENTED", soldAt: when, featured: false };
        break;
      case "archive":
        data = { status: "ARCHIVED", featured: false };
        break;
      case "draft":
        data = { status: "DRAFT" };
        break;
      case "feature":
        data = { featured: true };
        break;
      case "unfeature":
        data = { featured: false, featuredUntil: null };
        break;
      case "verify":
        data = { isVerified: true };
        break;
      case "unverify":
        data = { isVerified: false };
        break;
    }
    const res = await db.listing.updateMany({ where: { id: { in: ids } }, data });
    if (action === "publish") {
      await db.listing.updateMany({ where: { id: { in: ids }, publishedAt: null }, data: { publishedAt: new Date() } });
    }
    const refs = await db.listing.findMany({ where: { id: { in: ids } }, select: { refCode: true }, take: 10 });
    await logActivity(session, action, "Listing", ids.length === 1 ? ids[0] : null, `${action} → ${refs.map((r) => r.refCode).join(", ")}${ids.length > 10 ? "…" : ""}`, { ids });
    revalidatePublic();
    return { ok: true, data: { count: res.count }, message: `${res.count} listing${res.count === 1 ? "" : "s"} updated` };
  });
}

export async function duplicateListingAction(id: string): Promise<ActionResult<{ id: string }>> {
  return adminAction([...STAFF], async (session) => {
    const src = await db.listing.findUnique({ where: { id }, include: { images: true, category: { select: { refPrefix: true } } } });
    if (!src) return { ok: false, error: "Listing not found" };
    const copy = await db.$transaction(async (tx) => {
      const refCode = await nextRefCode(tx, src.category.refPrefix);
      return tx.listing.create({
        data: {
          refCode,
          slug: listingSlug(`${src.titleEn} copy`, refCode),
          titleEn: `${src.titleEn} (copy)`,
          titleAm: src.titleAm,
          descriptionEn: src.descriptionEn,
          descriptionAm: src.descriptionAm,
          videoUrl: src.videoUrl,
          categoryId: src.categoryId,
          dealType: src.dealType,
          rentPeriod: src.rentPeriod,
          price: src.price,
          isNegotiable: src.isNegotiable,
          priceOnRequest: src.priceOnRequest,
          condition: src.condition,
          areaId: src.areaId,
          addressHint: src.addressHint,
          lat: src.lat,
          lng: src.lng,
          attributes: src.attributes as Prisma.InputJsonValue,
          status: "DRAFT",
          assignedBrokerId: src.assignedBrokerId,
          ownerName: src.ownerName,
          ownerPhone: src.ownerPhone,
          ownerNotes: src.ownerNotes,
          images: {
            create: src.images.map((i) => ({ url: i.url, publicId: i.publicId, width: i.width, height: i.height, alt: i.alt, sortOrder: i.sortOrder, isCover: i.isCover, blurData: i.blurData })),
          },
        },
        select: { id: true, refCode: true },
      });
    });
    await logActivity(session, "duplicate", "Listing", copy.id, `Duplicated ${src.refCode} → ${copy.refCode}`);
    return { ok: true, data: { id: copy.id }, message: `Draft ${copy.refCode} created` };
  });
}

/** Admin only: permanently delete (brokers archive instead). */
export async function deleteListingAction(id: string): Promise<ActionResult<{ count: number }>> {
  return deleteListingsAction([id]);
}

/** Admin only: permanently delete one or more listings and any photos no other listing uses. */
export async function deleteListingsAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  return adminAction(["ADMIN"], async (session) => {
    const ids = z.array(z.string().min(1).max(40)).min(1).max(500).parse(input);
    const rows = await db.listing.findMany({ where: { id: { in: ids } }, select: { id: true, refCode: true, images: { select: { publicId: true } } } });
    if (rows.length === 0) return { ok: false, error: "Listing not found" };
    await db.listing.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    const publicIds = [...new Set(rows.flatMap((r) => r.images.map((i) => i.publicId)).filter((p): p is string => !!p))];
    for (const pid of publicIds) {
      // Duplicated listings can share photos: only remove files nothing points at any more.
      if (!(await db.listingImage.count({ where: { publicId: pid } }))) await getStorage().remove(pid).catch((e) => console.error("[delete photo]", e));
    }
    const refs = rows.map((r) => r.refCode);
    await logActivity(session, "delete", "Listing", rows.length === 1 ? rows[0].id : null, `Deleted ${refs.slice(0, 10).join(", ")}${refs.length > 10 ? "…" : ""}`, { ids: rows.map((r) => r.id) });
    revalidatePublic();
    return { ok: true, data: { count: rows.length }, message: rows.length === 1 ? `${refs[0]} deleted` : `${rows.length} listings deleted` };
  });
}
