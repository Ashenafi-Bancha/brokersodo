import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AttributeField } from "@/lib/validators/attribute-schema";

/**
 * Listing search abstraction.
 * - Structured filters → Prisma `where`
 * - Keywords → Postgres full-text search (tsvector) + pg_trgm fuzzy match on titles/ref codes
 * Swap the implementation (e.g. Meilisearch) here without touching pages.
 */

export const SORTS = ["relevance", "newest", "price_asc", "price_desc", "views"] as const;
export type SortKey = (typeof SORTS)[number];

export type ListingFilters = {
  q?: string;
  categoryId?: string;
  dealType?: "SALE" | "RENT";
  minPrice?: number;
  maxPrice?: number;
  areaId?: string;
  condition?: "NEW" | "USED" | "REFURBISHED";
  verified?: boolean;
  attrs?: Record<string, string>; // raw `f_*` params
  sort?: SortKey;
  page?: number;
  pageSize?: number;
};

const MAX_KEYWORD_HITS = 500;

/** Ranked listing IDs matching a free-text query (FTS + fuzzy + ref code). */
export async function keywordSearchIds(q: string, statuses: readonly string[]): Promise<string[]> {
  const query = q.trim().slice(0, 100);
  if (!query) return [];
  const refLike = `${query.toUpperCase().replace(/[%_]/g, "")}%`;
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM (
      SELECT l.id,
        ts_rank(l."searchVector", websearch_to_tsquery('english', unaccent(${query}))) * 2
        + ts_rank(l."searchVector", plainto_tsquery('simple', ${query}))
        + GREATEST(similarity(l."titleEn", ${query}), similarity(coalesce(l."titleAm", ''), ${query}))
        + CASE WHEN l."refCode" ILIKE ${refLike} THEN 5 ELSE 0 END AS rank
      FROM "Listing" l
      WHERE l.status::text = ANY(${statuses as string[]})
        AND (
          l."searchVector" @@ websearch_to_tsquery('english', unaccent(${query}))
          OR l."searchVector" @@ plainto_tsquery('simple', ${query})
          OR l."titleEn" % ${query}
          OR coalesce(l."titleAm", '') % ${query}
          OR l."titleEn" ILIKE ${"%" + query.replace(/[%_]/g, "") + "%"}
          OR l."refCode" ILIKE ${refLike}
        )
    ) ranked
    ORDER BY rank DESC
    LIMIT ${MAX_KEYWORD_HITS}`;
  return rows.map((r) => r.id);
}

/** Turn `f_*` URL params into JSON-path filters, validated against the category schema. */
export function attributeWhere(fields: AttributeField[], attrs: Record<string, string> = {}): Prisma.ListingWhereInput[] {
  const and: Prisma.ListingWhereInput[] = [];
  for (const f of fields) {
    if (!f.filterable) continue;
    if (f.type === "number" || f.type === "year") {
      const min = Number(attrs[`${f.key}_min`]);
      const max = Number(attrs[`${f.key}_max`]);
      if (attrs[`${f.key}_min`] && Number.isFinite(min)) and.push({ attributes: { path: [f.key], gte: min } });
      if (attrs[`${f.key}_max`] && Number.isFinite(max)) and.push({ attributes: { path: [f.key], lte: max } });
    } else if (f.type === "boolean") {
      if (attrs[f.key] === "1") and.push({ attributes: { path: [f.key], equals: true } });
    } else if (f.type === "select") {
      const v = attrs[f.key];
      if (v && f.options?.some((o) => o.value === v)) and.push({ attributes: { path: [f.key], equals: v } });
    } else if (f.type === "text") {
      const v = attrs[f.key]?.trim();
      if (v) and.push({ attributes: { path: [f.key], string_contains: v } });
    }
  }
  return and;
}

export function orderByFor(sort: SortKey): Prisma.ListingOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: { sort: "asc", nulls: "last" } }, { publishedAt: "desc" }];
    case "price_desc":
      return [{ price: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }];
    case "views":
      return [{ viewCount: "desc" }, { publishedAt: "desc" }];
    default:
      return [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
  }
}
