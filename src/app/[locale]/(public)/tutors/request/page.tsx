import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { PageHero } from "@/components/layout/page-hero";
import { ScopedIntl } from "@/components/scoped-intl";
import { TutorRequestForm } from "@/components/forms/tutors-forms";
import { SafetyBox } from "@/components/jobs/cards";
import { TUTOR_LEVELS, TUTOR_MODES, isCatalogKey, isOneOf } from "@/lib/jobs-catalog";
import { getAreas } from "@/server/queries/public";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";

// Reads filters from the URL, so it must render on every request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tutors" });
  return { title: t("requestTitle"), description: t("requestSubtitle"), alternates: alternates(locale, "/tutors/request") };
}

export default async function RequestTutorPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const [t, areas] = await Promise.all([getTranslations("tutors"), getAreas()]);
  // Carry the filters the visitor already chose on /tutors into the form.
  const defaults = {
    subject: isCatalogKey(sp.subject) ? sp.subject : undefined,
    level: isOneOf(TUTOR_LEVELS, sp.level) ? sp.level : undefined,
    mode: isOneOf(TUTOR_MODES, sp.mode) ? sp.mode : undefined,
    areaId: areas.some((a) => a.id === sp.area) ? sp.area : undefined,
  };
  return (
    <>
      <PageHero title={t("requestTitle")} subtitle={t("requestSubtitle")} />
      <Container className="grid max-w-5xl gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ScopedIntl namespaces={["tutors", "form", "catalog"]}>
          <TutorRequestForm areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))} defaults={defaults} />
        </ScopedIntl>
        <SafetyBox ns="tutors" className="lg:self-start" />
      </Container>
    </>
  );
}
