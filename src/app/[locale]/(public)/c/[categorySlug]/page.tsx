import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrowseView } from "@/components/listings/browse-view";
import { parseListingParams, type RawParams } from "@/lib/listing-params";
import { alternates, jsonLdScript } from "@/lib/seo";
import { localized, siteUrl } from "@/lib/utils";
import { getAreas, getCategoryBySlug } from "@/server/queries/public";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; categorySlug: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, categorySlug } = await params;
  const cat = await getCategoryBySlug(categorySlug);
  if (!cat) return {};
  const raw = await searchParams;
  const sp = parseListingParams(raw);
  const t = await getTranslations({ locale, namespace: "browse" });
  const name = localized(cat, "name", locale);
  const area = sp.area ? (await getAreas()).find((a) => a.slug === sp.area) : undefined;
  const title = area ? t("metaTitleArea", { category: name, area: localized(area, "name", locale) }) : t("metaTitle", { category: name });
  // /c/vehicles and /c/vehicles?area=… are SEO landing pages; other filter combos are noindex.
  const onlyArea = Object.keys(raw).every((k) => k === "area");
  return {
    title,
    description: localized(cat, "description", locale) || title,
    alternates: alternates(locale, `/c/${cat.slug}${area && onlyArea ? `?area=${area.slug}` : ""}`),
    robots: onlyArea ? undefined : { index: false, follow: true },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, categorySlug } = await params;
  setRequestLocale(locale);
  const cat = await getCategoryBySlug(categorySlug);
  if (!cat) notFound();
  const name = localized(cat, "name", locale);
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "BrokerSodo", item: siteUrl("/") },
      { "@type": "ListItem", position: 2, name, item: siteUrl(`/c/${cat.slug}`) },
    ],
  };
  return (
    <>
      <BrowseView params={parseListingParams(await searchParams)} category={cat} basePath={`/c/${cat.slug}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(crumbs)} />
    </>
  );
}
