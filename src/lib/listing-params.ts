/**
 * Browse filter state lives in the URL (shareable, SEO-friendly, back button works).
 *   q, deal=sale|rent, min, max, area=<slug>, cond=new|used|refurbished,
 *   verified=1, sort, page, view=grid|list, cat=<slug> (on /listings only),
 *   f_<key> / f_<key>_min / f_<key>_max for category attribute filters.
 */
export type RawParams = Record<string, string | string[] | undefined>;

export const SORT_KEYS = ["relevance", "newest", "price_asc", "price_desc", "views"] as const;
export type SortKeyParam = (typeof SORT_KEYS)[number];

export type ParsedParams = {
  q?: string;
  deal?: "sale" | "rent";
  min?: number;
  max?: number;
  area?: string;
  cond?: "new" | "used" | "refurbished";
  verified?: boolean;
  sort?: SortKeyParam;
  page: number;
  view: "grid" | "list";
  cat?: string;
  attrs: Record<string, string>;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const num = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v.replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
};

export function parseListingParams(sp: RawParams): ParsedParams {
  const deal = first(sp.deal);
  const cond = first(sp.cond);
  const sort = first(sp.sort);
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const val = first(v);
    if (k.startsWith("f_") && val && /^[a-zA-Z0-9_]{1,60}$/.test(k.slice(2))) attrs[k.slice(2)] = val.slice(0, 100);
  }
  const slug = (v?: string) => (v && /^[a-z0-9-]{1,80}$/.test(v) ? v : undefined);
  return {
    q: first(sp.q)?.slice(0, 100),
    deal: deal === "sale" || deal === "rent" ? deal : undefined,
    min: num(first(sp.min)),
    max: num(first(sp.max)),
    area: slug(first(sp.area)),
    cond: cond === "new" || cond === "used" || cond === "refurbished" ? cond : undefined,
    verified: first(sp.verified) === "1",
    sort: (SORT_KEYS as readonly string[]).includes(sort ?? "") ? (sort as SortKeyParam) : undefined,
    page: Math.min(Math.max(num(first(sp.page)) ?? 1, 1), 500),
    view: first(sp.view) === "list" ? "list" : "grid",
    cat: slug(first(sp.cat)),
    attrs,
  };
}

/** Serialise back to a query string (drops defaults/empties). */
export function buildQuery(p: Partial<ParsedParams>, overrides: Partial<ParsedParams> = {}): string {
  const m = { ...p, ...overrides };
  const qs = new URLSearchParams();
  if (m.q) qs.set("q", m.q);
  if (m.cat) qs.set("cat", m.cat);
  if (m.deal) qs.set("deal", m.deal);
  if (m.min != null) qs.set("min", String(m.min));
  if (m.max != null) qs.set("max", String(m.max));
  if (m.area) qs.set("area", m.area);
  if (m.cond) qs.set("cond", m.cond);
  if (m.verified) qs.set("verified", "1");
  for (const [k, v] of Object.entries(m.attrs ?? {})) if (v) qs.set(`f_${k}`, v);
  if (m.sort) qs.set("sort", m.sort);
  if (m.view === "list") qs.set("view", "list");
  if (m.page && m.page > 1) qs.set("page", String(m.page));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/** Count of user-applied filters (for the mobile "Filters (3)" button). */
export function activeFilterCount(p: ParsedParams): number {
  return (
    [p.deal, p.min, p.max, p.area, p.cond, p.verified || undefined, p.cat].filter((v) => v !== undefined && v !== "").length +
    Object.keys(p.attrs).length
  );
}
