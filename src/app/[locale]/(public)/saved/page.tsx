import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { PageHero } from "@/components/layout/page-hero";
import { SavedView } from "@/components/listings/saved-view";
import { ScopedIntl } from "@/components/scoped-intl";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "saved" });
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function SavedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("saved");
  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Container className="py-10">
        <ScopedIntl namespaces={["saved"]}>
          <SavedView />
        </ScopedIntl>
      </Container>
    </>
  );
}
