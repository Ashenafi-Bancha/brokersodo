import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JOB_SECTORS, fromCatalogSlug } from "@/lib/jobs-catalog";
import { alternates } from "@/lib/seo";
import JobsPage from "../../page";

type Props = { params: Promise<{ locale: string; sector: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = "force-dynamic";

/** "Accounting & finance jobs in Wolaita Sodo": the jobs board with one sector chosen. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, sector: slug } = await params;
  const sector = fromCatalogSlug(JOB_SECTORS, slug);
  if (!sector) return {};
  const [t, tc] = await Promise.all([getTranslations({ locale, namespace: "jobs" }), getTranslations({ locale, namespace: "catalog" })]);
  const name = tc(`sector.${sector}` as "sector.OTHER");
  return {
    title: t("sectorTitle", { sector: name }),
    description: t("sectorDescription", { sector: name }),
    alternates: alternates(locale, `/jobs/category/${slug}`),
  };
}

export default async function JobSectorPage({ params, searchParams }: Props) {
  const { locale, sector: slug } = await params;
  const sector = fromCatalogSlug(JOB_SECTORS, slug);
  if (!sector) notFound();
  const sp = await searchParams;
  return JobsPage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ ...sp, sector }) });
}
