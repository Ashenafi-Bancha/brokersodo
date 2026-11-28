import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localePath } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";
import { getAreas, getCategories, getSitemapListings } from "@/server/queries/public";
import { getSitemapJobsAndTutors } from "@/server/queries/jobs";
import { catalogSlug } from "@/lib/jobs-catalog";
import { getActiveValues } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/** All public pages, categories, category+area landing pages and published listings — in every locale. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, areas, listings, extra] = await Promise.all([getCategories(), getAreas(), getSitemapListings(), getSitemapJobsAndTutors()]);
  const entry = (path: string, opts: Partial<MetadataRoute.Sitemap[number]> = {}): MetadataRoute.Sitemap[number] => ({
    url: siteUrl(localePath(routing.defaultLocale, path)),
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, siteUrl(localePath(l, path))])) },
    ...opts,
  });

  const staticPages = ["/", "/listings", "/sell", "/wanted", "/contact", "/about", "/faq", "/how-it-works", "/terms", "/privacy", "/jobs", "/jobs/post", "/jobs/talent-pool", "/tutors", "/tutors/request", "/tutors/join", "/talent"].map((p) =>
    entry(p, { changeFrequency: p === "/" || p === "/listings" || p === "/jobs" || p === "/tutors" ? "daily" : "monthly", priority: p === "/" ? 1 : p === "/listings" || p === "/jobs" ? 0.9 : p === "/tutors" ? 0.8 : 0.5 }),
  );
  const cats = categories.filter((c) => c.count > 0 || !c.parentId).map((c) => entry(`/c/${c.slug}`, { changeFrequency: "daily", priority: 0.8 }));
  const catAreas = categories
    .filter((c) => c.count > 0)
    .flatMap((c) => areas.map((a) => entry(`/c/${c.slug}?area=${a.slug}`, { changeFrequency: "weekly", priority: 0.5 })));
  const items = listings.map((l) => entry(`/listings/${l.slug}`, { lastModified: l.updatedAt, changeFrequency: "weekly", priority: 0.7 }));
  const jobs = extra.jobs.map((j) => entry(`/jobs/${j.slug}`, { lastModified: j.updatedAt, changeFrequency: "daily", priority: 0.7 }));
  const tutors = extra.tutors.map((t) => entry(`/tutors/${t.slug}`, { lastModified: t.updatedAt, changeFrequency: "weekly", priority: 0.6 }));
  const talent = extra.talent.map((p) => entry(`/talent/${p.slug}`, { lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.5 }));
  // Service category pages ("IT jobs", "Maths tutors"); one each, no thin combinations.
  const sectorPages = (await getActiveValues("sector")).map((s) => entry(`/jobs/category/${catalogSlug(s)}`, { changeFrequency: "daily", priority: 0.6 }));
  const subjectPages = (await getActiveValues("subject")).filter((s) => s !== "ALL_SUBJECTS").map((s) => entry(`/tutors/subject/${catalogSlug(s)}`, { changeFrequency: "weekly", priority: 0.6 }));
  return [...staticPages, ...cats, ...catAreas, ...items, ...jobs, ...tutors, ...talent, ...sectorPages, ...subjectPages];
}
