import "server-only";
import { db } from "@/lib/db";
import { parseAttributeSchema } from "@/lib/validators/attribute-schema";
import type { ListingFormInput } from "@/lib/validators/admin";
import type { ListingFormOptions } from "@/components/admin/listing-form";

/** Staff-only queries. Callers must have passed requireStaff(). */

export async function getListingFormOptions(): Promise<ListingFormOptions> {
  const [categories, areas, staff] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true, refPrefix: true, attributeSchema: true } }),
    db.area.findMany({ orderBy: [{ sortOrder: "asc" }], select: { id: true, nameEn: true } }),
    db.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
  ]);
  return {
    categories: categories.map((c) => ({ id: c.id, name: c.nameEn, refPrefix: c.refPrefix, fields: parseAttributeSchema(c.attributeSchema) })),
    areas: areas.map((a) => ({ id: a.id, name: a.nameEn })),
    staff,
  };
}

export async function getAdminListingRows() {
  const rows = await db.listing.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5000,
    select: {
      id: true,
      refCode: true,
      slug: true,
      titleEn: true,
      status: true,
      dealType: true,
      rentPeriod: true,
      price: true,
      priceOnRequest: true,
      featured: true,
      isVerified: true,
      viewCount: true,
      updatedAt: true,
      publishedAt: true,
      category: { select: { nameEn: true } },
      area: { select: { nameEn: true } },
      assignedBroker: { select: { id: true, name: true } },
      images: { where: { isCover: true }, take: 1, select: { url: true } },
      _count: { select: { inquiries: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    refCode: r.refCode,
    slug: r.slug,
    title: r.titleEn,
    status: r.status,
    dealType: r.dealType,
    rentPeriod: r.rentPeriod,
    price: r.price,
    priceOnRequest: r.priceOnRequest,
    featured: r.featured,
    isVerified: r.isVerified,
    views: r.viewCount,
    inquiries: r._count.inquiries,
    updatedAt: r.updatedAt.toISOString(),
    category: r.category.nameEn,
    area: r.area?.nameEn ?? "",
    broker: r.assignedBroker?.name ?? "",
    brokerId: r.assignedBroker?.id ?? "",
    thumb: r.images[0]?.url ?? null,
  }));
}
export type AdminListingRow = Awaited<ReturnType<typeof getAdminListingRows>>[number];

export async function getListingForEdit(id: string) {
  return db.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      category: { select: { nameEn: true, slug: true, attributeSchema: true, icon: true } },
      area: { select: { nameEn: true, slug: true } },
      inquiries: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, name: true, phone: true, status: true, createdAt: true } },
    },
  });
}
export type ListingForEdit = NonNullable<Awaited<ReturnType<typeof getListingForEdit>>>;

export function toFormInput(l: ListingForEdit): ListingFormInput {
  return {
    titleEn: l.titleEn,
    titleAm: l.titleAm ?? "",
    descriptionEn: l.descriptionEn,
    descriptionAm: l.descriptionAm ?? "",
    videoUrl: l.videoUrl ?? "",
    videoFile: l.videoFile ?? "",
    categoryId: l.categoryId,
    dealType: l.dealType,
    rentPeriod: l.rentPeriod ?? "MONTH",
    price: l.price != null ? String(l.price) : "",
    isNegotiable: l.isNegotiable,
    priceOnRequest: l.priceOnRequest,
    condition: l.condition ?? "",
    areaId: l.areaId ?? "",
    addressHint: l.addressHint ?? "",
    lat: l.lat,
    lng: l.lng,
    attributes: (l.attributes ?? {}) as Record<string, unknown>,
    status: l.status,
    isVerified: l.isVerified,
    isInspected: l.isInspected,
    featured: l.featured,
    featuredUntil: l.featuredUntil ? l.featuredUntil.toISOString().slice(0, 10) : "",
    assignedBrokerId: l.assignedBrokerId ?? "",
    ownerName: l.ownerName ?? "",
    ownerPhone: l.ownerPhone ?? "",
    ownerNotes: l.ownerNotes ?? "",
    images: l.images.map((i) => ({ url: i.url, publicId: i.publicId, width: i.width, height: i.height, alt: i.alt ?? "", blurData: i.blurData, isCover: i.isCover })),
  };
}

export const emptyListingInput = (assignedBrokerId?: string): ListingFormInput => ({
  titleEn: "",
  titleAm: "",
  descriptionEn: "",
  descriptionAm: "",
  videoUrl: "",
  videoFile: "",
  categoryId: "",
  dealType: "SALE",
  rentPeriod: "MONTH",
  price: "",
  isNegotiable: false,
  priceOnRequest: false,
  condition: "",
  areaId: "",
  addressHint: "",
  lat: null,
  lng: null,
  attributes: {},
  status: "DRAFT",
  isVerified: false,
  isInspected: false,
  featured: false,
  featuredUntil: "",
  assignedBrokerId: assignedBrokerId ?? "",
  ownerName: "",
  ownerPhone: "",
  ownerNotes: "",
  images: [],
});
