import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { PageHero } from "@/components/layout/page-hero";
import { ScopedIntl } from "@/components/scoped-intl";
import { TutorJoinForm } from "@/components/forms/tutors-forms";
import { getAreas } from "@/server/queries/public";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tutors" });
  return { title: t("joinTitle"), description: t("joinSubtitle"), alternates: alternates(locale, "/tutors/join") };
}

export default async function JoinTutorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, areas] = await Promise.all([getTranslations("tutors"), getAreas()]);
  return (
    <>
      <PageHero title={t("joinTitle")} subtitle={t("joinSubtitle")} />
      <Container className="max-w-3xl py-10">
        <ScopedIntl namespaces={["tutors", "form", "catalog"]}>
          <TutorJoinForm areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))} />
        </ScopedIntl>
      </Container>
    </>
  );
}
