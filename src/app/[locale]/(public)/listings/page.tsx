import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrowseView } from "@/components/listings/browse-view";
import { parseListingParams, type RawParams } from "@/lib/listing-params";
import { alternates } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = parseListingParams(await searchParams);
  const t = await getTranslations({ locale, namespace: "browse" });
  const filtered = Object.keys(await searchParams).length > 0;
  return {
    title: sp.q ? t("searchFor", { q: sp.q }) : t("title"),
    alternates: alternates(locale, "/listings"),
    // Index the canonical list only; filtered combinations are noindex,follow.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function ListingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BrowseView params={parseListingParams(await searchParams)} basePath="/listings" />;
}
