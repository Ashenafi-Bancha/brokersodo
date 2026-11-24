import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { PageHero } from "@/components/layout/page-hero";
import { ScopedIntl } from "@/components/scoped-intl";
import { JobPostForm } from "@/components/forms/jobs-forms";
import { HowSteps } from "@/components/jobs/cards";
import { getAreas } from "@/server/queries/public";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "jobs" });
  return { title: t("postTitle"), description: t("postSubtitle"), alternates: alternates(locale, "/jobs/post") };
}

export default async function PostJobPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, areas] = await Promise.all([getTranslations("jobs"), getAreas()]);
  return (
    <>
      <PageHero title={t("postTitle")} subtitle={t("postSubtitle")} />
      <Container className="max-w-3xl py-10">
        <ScopedIntl namespaces={["jobs", "form", "catalog"]}>
          <JobPostForm areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))} />
        </ScopedIntl>
      </Container>
      <Container className="pb-6">
        <HowSteps ns="jobs" />
      </Container>
    </>
  );
}
