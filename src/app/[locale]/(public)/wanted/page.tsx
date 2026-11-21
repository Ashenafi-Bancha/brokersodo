import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { PageHero } from "@/components/layout/page-hero";
import { WantedForm } from "@/components/forms/simple-forms";
import { getAreas, getCategories } from "@/server/queries/public";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { ScopedIntl } from "@/components/scoped-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "wanted" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/wanted") };
}

export default async function WantedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, categories, areas] = await Promise.all([getTranslations("wanted"), getCategories(), getAreas()]);
  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Container className="max-w-3xl py-10">
        <ScopedIntl namespaces={["wanted", "form", "sell", "browse"]}>
          <WantedForm
            categories={categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, name: localized(c, "name", locale) }))}
            areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))}
          />
        </ScopedIntl>
      </Container>
    </>
  );
}
