import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { PageHero } from "@/components/layout/page-hero";
import { FaqList } from "@/components/home/faq-list";
import { getFaqs } from "@/server/queries/public";
import { alternates, jsonLdScript } from "@/lib/seo";
import { localized } from "@/lib/utils";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/faq") };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, faqs] = await Promise.all([getTranslations("faq"), getFaqs()]);
  const items = faqs.map((f) => ({ id: f.id, q: localized(f, "question", locale), a: localized(f, "answer", locale) }));
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Container className="max-w-3xl py-10">
        <FaqList items={items} />
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(ld)} />
    </>
  );
}
