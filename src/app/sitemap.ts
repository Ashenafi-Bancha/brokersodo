import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localePath } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";
import { getAreas, getCategories, getSitemapListings } from "@/server/queries/public";

export const revalidate = 3600;

/** All public pages, categories, category+area landing pages and published listings — in every locale. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, areas, listings] = await Promise.all([getCategories(), getAreas(), getSitemapListings()]);
  const entry = (path: string, opts: Partial<MetadataRoute.Sitemap[number]> = {}): MetadataRoute.Sitemap[number] => ({
    url: siteUrl(localePath(routing.defaultLocale, path)),
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, siteUrl(localePath(l, path))])) },
    ...opts,
  });

  const staticPages = ["/", "/listings", "/sell", "/wanted", "/contact", "/about", "/faq", "/how-it-works", "/terms", "/privacy"].map((p) =>
    entry(p, { changeFrequency: p === "/" || p === "/listings" ? "daily" : "monthly", priority: p === "/" ? 1 : p === "/listings" ? 0.9 : 0.5 }),
  );
  const cats = categories.filter((c) => c.count > 0 || !c.parentId).map((c) => entry(`/c/${c.slug}`, { changeFrequency: "daily", priority: 0.8 }));
  const catAreas = categories
    .filter((c) => c.count > 0)
    .flatMap((c) => areas.map((a) => entry(`/c/${c.slug}?area=${a.slug}`, { changeFrequency: "weekly", priority: 0.5 })));
  const items = listings.map((l) => entry(`/listings/${l.slug}`, { lastModified: l.updatedAt, changeFrequency: "weekly", priority: 0.7 }));
  return [...staticPages, ...cats, ...catAreas, ...items];
}
