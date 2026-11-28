import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { attributeWhere, keywordSearchIds, orderByFor, type ListingFilters, type SortKey } from "@/lib/search";
import { parseAttributeSchema } from "@/lib/validators/attribute-schema";
import {
  BROWSABLE_STATUSES,
  PUBLIC_STATUSES,
  publicListingCardSelect,
  publicListingDetailSelect,
  type PublicListingCard,
} from "./selects";

/* ---------------- Site settings ---------------- */

export const getSiteSettings = cache(async () => {
  const s = await db.siteSettings.findUnique({ where: { id: "site" } });
  return s ?? (await db.siteSettings.create({ data: { id: "site" } }));
});
export type SiteSettingsData = Awaited<ReturnType<typeof getSiteSettings>>;

/* ---------------- Taxonomy ---------------- */

export const getCategories = cache(async () => {
  const [cats, counts] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameAm: true,
        icon: true,
        image: true,
        descriptionEn: true,
        descriptionAm: true,
        parentId: true,
        attributeSchema: true,
      },
    }),
    db.listing.groupBy({
      by: ["categoryId"],
      where: { status: { in: [...BROWSABLE_STATUSES] } },
      _count: { _all: true },
    }),
  ]);
  const countMap = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  return cats.map((c) => ({ ...c, fields: parseAttributeSchema(c.attributeSchema), count: countMap.get(c.id) ?? 0 }));
});
export type PublicCategory = Awaited<ReturnType<typeof getCategories>>[number];

export const getCategoryBySlug = cache(async (slug: string) => {
  const cats = await getCategories();
  return cats.find((c) => c.slug === slug) ?? null;
});

export const getAreas = cache(async () =>
  db.area.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    select: { id: true, slug: true, nameEn: true, nameAm: true, city: true },
  }),
);
export type PublicArea = Awaited<ReturnType<typeof getAreas>>[number];

/* ---------------- Listings ---------------- */

export type SearchResult = {
  items: PublicListingCard[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export async function searchListings(filters: ListingFilters): Promise<SearchResult> {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 24, 1), 60);
  const page = Math.max(filters.page ?? 1, 1);
  const sort: SortKey = filters.sort ?? (filters.q ? "relevance" : "newest");

  const and: Prisma.ListingWhereInput[] = [{ status: { in: [...BROWSABLE_STATUSES] } }];
  if (filters.categoryId) {
    and.push({ OR: [{ categoryId: filters.categoryId }, { category: { parentId: filters.categoryId } }] });
    const cat = await db.category.findUnique({ where: { id: filters.categoryId }, select: { attributeSchema: true } });
    if (cat) and.push(...attributeWhere(parseAttributeSchema(cat.attributeSchema), filters.attrs));
  }
  if (filters.dealType) and.push({ dealType: filters.dealType });
  if (filters.areaId) and.push({ areaId: filters.areaId });
  if (filters.condition) and.push({ condition: filters.condition });
  if (filters.verified) and.push({ isVerified: true });
  if (filters.minPrice != null) and.push({ price: { gte: filters.minPrice } });
  if (filters.maxPrice != null) and.push({ price: { lte: filters.maxPrice } });

  let rankedIds: string[] | null = null;
  if (filters.q?.trim()) {
    rankedIds = await keywordSearchIds(filters.q, BROWSABLE_STATUSES);
    if (rankedIds.length === 0) return { items: [], total: 0, page, pageSize, pageCount: 0 };
    and.push({ id: { in: rankedIds } });
  }
  const where: Prisma.ListingWhereInput = { AND: and };

  if (rankedIds && sort === "relevance") {
    // Keep FTS ranking order: filter the ranked IDs, then page in memory.
    const matching = await db.listing.findMany({ where, select: { id: true } });
    const ok = new Set(matching.map((m) => m.id));
    const ordered = rankedIds.filter((id) => ok.has(id));
    const pageIds = ordered.slice((page - 1) * pageSize, page * pageSize);
    const rows = await db.listing.findMany({ where: { id: { in: pageIds } }, select: publicListingCardSelect });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const items = pageIds.map((id) => byId.get(id)).filter(Boolean) as PublicListingCard[];
    return { items, total: ordered.length, page, pageSize, pageCount: Math.ceil(ordered.length / pageSize) };
  }

  const [items, total] = await Promise.all([
    db.listing.findMany({
      where,
      select: publicListingCardSelect,
      orderBy: orderByFor(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.listing.count({ where }),
  ]);
  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export const getListingBySlug = cache(async (slug: string) =>
  db.listing.findFirst({
    where: { slug, status: { in: [...PUBLIC_STATUSES] } },
    select: publicListingDetailSelect,
  }),
);

export async function getFeaturedListings(limit = 10) {
  return db.listing.findMany({
    where: {
      status: "PUBLISHED",
      featured: true,
      OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }],
    },
    select: publicListingCardSelect,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export async function getLatestListings(limit = 8, where: Prisma.ListingWhereInput = {}) {
  return db.listing.findMany({
    where: { status: { in: [...BROWSABLE_STATUSES] }, ...where },
    select: publicListingCardSelect,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export async function getListingsByCategorySlugs(slugs: string[], limit = 8, dealType?: "SALE" | "RENT") {
  return getLatestListings(limit, {
    category: { slug: { in: slugs } },
    ...(dealType ? { dealType } : {}),
  });
}

export async function getRecentlySold(limit = 10) {
  return db.listing.findMany({
    where: { status: { in: ["SOLD", "RENTED"] } },
    select: publicListingCardSelect,
    orderBy: [{ soldAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    take: limit,
  });
}

export async function getSimilarListings(listing: { id: string; categoryId: string; price: number | null; dealType: "SALE" | "RENT" }, limit = 4) {
  const base: Prisma.ListingWhereInput = {
    id: { not: listing.id },
    categoryId: listing.categoryId,
    dealType: listing.dealType,
    status: { in: [...BROWSABLE_STATUSES] },
  };
  if (listing.price) {
    const near = await db.listing.findMany({
      where: { ...base, price: { gte: Math.round(listing.price * 0.6), lte: Math.round(listing.price * 1.5) } },
      select: publicListingCardSelect,
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
    if (near.length >= limit) return near;
    const more = await db.listing.findMany({
      where: { ...base, id: { notIn: [listing.id, ...near.map((n) => n.id)] } },
      select: publicListingCardSelect,
      orderBy: { publishedAt: "desc" },
      take: limit - near.length,
    });
    return [...near, ...more];
  }
  return db.listing.findMany({ where: base, select: publicListingCardSelect, orderBy: { publishedAt: "desc" }, take: limit });
}

/** Saved / recently viewed (IDs come from localStorage). */
export async function getListingsByIds(ids: string[]) {
  const clean = ids.filter((i) => /^[a-z0-9]{10,40}$/i.test(i)).slice(0, 60);
  if (clean.length === 0) return [];
  const rows = await db.listing.findMany({
    where: { id: { in: clean }, status: { in: [...PUBLIC_STATUSES] } },
    select: publicListingCardSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return clean.map((id) => byId.get(id)).filter(Boolean) as PublicListingCard[];
}

/* ---------------- Content ---------------- */

export const getTestimonials = cache(async () =>
  db.testimonial.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 12 }),
);

export const getFaqs = cache(async (limit?: number) =>
  db.faq.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: limit }),
);

export const getPage = cache(async (slug: string) => db.page.findFirst({ where: { slug, isActive: true } }));

export const getStats = cache(async () => {
  const [settings, listings, deals] = await Promise.all([
    getSiteSettings(),
    db.listing.count({ where: { status: { in: [...BROWSABLE_STATUSES] } } }),
    db.listing.count({ where: { status: { in: ["SOLD", "RENTED"] } } }),
  ]);
  return {
    listings: settings.statListings ?? listings,
    deals: settings.statDeals ?? deals,
    clients: settings.statClients ?? 0,
    years: settings.statYears ?? 0,
  };
});

/** For sitemap.xml */
export async function getSitemapListings() {
  return db.listing.findMany({
    where: { status: { in: [...PUBLIC_STATUSES] } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 45000,
  });
}

/** Open wanted requests staff chose to show publicly. Never selects the name or phone. */
export async function getPublicWanted(limit = 30) {
  return db.wantedRequest.findMany({
    where: { isPublic: true, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      dealType: true,
      description: true,
      budgetMin: true,
      budgetMax: true,
      createdAt: true,
      category: { select: { nameEn: true, nameAm: true, icon: true } },
      area: { select: { nameEn: true, nameAm: true } },
    },
  });
}
