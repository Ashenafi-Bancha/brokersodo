import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { STORE_TYPES, isStoreType } from "@/lib/stores";

/** Public store fields. The owner's account is never selected here. */
const publicStoreSelect = {
  id: true,
  refCode: true,
  slug: true,
  name: true,
  type: true,
  tagline: true,
  description: true,
  phone: true,
  telegram: true,
  whatsapp: true,
  address: true,
  openingHours: true,
  logo: true,
  cover: true,
  featured: true,
  publishedAt: true,
  updatedAt: true,
  area: { select: { slug: true, nameEn: true, nameAm: true } },
  _count: { select: { items: { where: { isAvailable: true } } } },
} satisfies Prisma.StoreSelect;
export type PublicStore = Prisma.StoreGetPayload<{ select: typeof publicStoreSelect }>;

export type StoreFilters = { q?: string; type?: string; area?: string; page?: number };

export function parseStoreFilters(sp: Record<string, string | string[] | undefined>): StoreFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : undefined);
  const page = Number(one("page"));
  return {
    q: one("q")?.slice(0, 80) || undefined,
    type: isStoreType(one("type")) ? one("type") : undefined,
    area: one("area")?.slice(0, 60) || undefined,
    page: Number.isInteger(page) && page > 1 ? Math.min(page, 500) : 1,
  };
}

export const STORES_PAGE_SIZE = 24;

export async function searchStores(f: StoreFilters) {
  const and: Prisma.StoreWhereInput[] = [{ status: "ACTIVE" }];
  if (f.type) and.push({ type: f.type });
  if (f.area) and.push({ area: { slug: f.area } });
  if (f.q) {
    const q = f.q;
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { tagline: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { items: { some: { name: { contains: q, mode: "insensitive" }, isAvailable: true } } },
      ],
    });
  }
  const where: Prisma.StoreWhereInput = { AND: and };
  const page = f.page ?? 1;
  const [items, total] = await Promise.all([
    db.store.findMany({ where, select: publicStoreSelect, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], skip: (page - 1) * STORES_PAGE_SIZE, take: STORES_PAGE_SIZE }),
    db.store.count({ where }),
  ]);
  return { items, total, page, pageCount: Math.ceil(total / STORES_PAGE_SIZE) };
}

export const getStoreBySlug = cache(async (slug: string) =>
  db.store.findFirst({
    where: { slug, status: "ACTIVE" },
    select: {
      ...publicStoreSelect,
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, section: true, name: true, description: true, price: true, priceNote: true, image: true, isSpecial: true, isAvailable: true },
      },
    },
  }),
);

export const getStoreCount = cache(async () => db.store.count({ where: { status: "ACTIVE" } }));

export async function getFeaturedStores(limit = 4) {
  return db.store.findMany({ where: { status: "ACTIVE" }, select: publicStoreSelect, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: limit });
}

/** Counts per type, for the filter chips. */
export const getStoreTypeCounts = cache(async () => {
  const rows = await db.store.groupBy({ by: ["type"], where: { status: "ACTIVE" }, _count: { _all: true } });
  return Object.fromEntries(STORE_TYPES.map((t) => [t, rows.find((r) => r.type === t)?._count._all ?? 0])) as Record<string, number>;
});

export async function getSitemapStores() {
  return db.store.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true }, take: 20000 });
}
