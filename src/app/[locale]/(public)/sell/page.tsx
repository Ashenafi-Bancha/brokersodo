import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { PageHero } from "@/components/layout/page-hero";
import { SellForm } from "@/components/forms/sell-form";
import { getAreas, getCategories } from "@/server/queries/public";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { ScopedIntl } from "@/components/scoped-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sell" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/sell") };
}

export default async function SellPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, loc, categories, areas] = await Promise.all([getTranslations("sell"), getLocale(), getCategories(), getAreas()]);
  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Container className="max-w-3xl py-10">
        <ScopedIntl namespaces={["sell", "form"]}>
          <SellForm
            categories={categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, name: localized(c, "name", loc), icon: c.icon, fields: c.fields }))}
            areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", loc) }))}
          />
        </ScopedIntl>
      </Container>
    </>
  );
}
