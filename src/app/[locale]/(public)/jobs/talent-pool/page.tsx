import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { PageHero } from "@/components/layout/page-hero";
import { ScopedIntl } from "@/components/scoped-intl";
import { SeekerForm } from "@/components/forms/jobs-forms";
import { SafetyBox } from "@/components/jobs/cards";
import { getAreas } from "@/server/queries/public";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";

// Reads filters from the URL, so it must render on every request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "jobs" });
  return { title: t("seekerTitle"), description: t("seekerSubtitle"), alternates: alternates(locale, "/jobs/talent-pool") };
}

export default async function TalentPoolPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ type?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { type } = await searchParams;
  const [t, areas] = await Promise.all([getTranslations("jobs"), getAreas()]);
  return (
    <>
      <PageHero title={t("seekerTitle")} subtitle={t("seekerSubtitle")} />
      <Container className="grid max-w-5xl gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ScopedIntl namespaces={["jobs", "form", "catalog"]}>
          <SeekerForm areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))} defaultType={type === "SKILLED" ? "SKILLED" : "GRADUATE"} />
        </ScopedIntl>
        <SafetyBox ns="jobs" className="lg:self-start" />
      </Container>
    </>
  );
}
