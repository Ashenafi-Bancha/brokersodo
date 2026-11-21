import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { PageHero } from "./page-hero";
import { getPage } from "@/server/queries/public";
import { sanitizeRichText } from "@/lib/sanitize";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";

type FallbackKey = { ns: "about" | "legal"; key: "title" | "termsTitle" | "privacyTitle" };

/** Builds metadata + page for a CMS Page (About, Terms, Privacy) managed in Admin → Content. */
export function cmsRoute(slug: string, fb: FallbackKey) {
  async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const [t, page] = await Promise.all([getTranslations({ locale, namespace: fb.ns }), getPage(slug)]);
    return {
      title: page ? localized(page, "title", locale) : t(fb.key as never),
      alternates: alternates(locale, `/${slug}`),
    };
  }

  async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const [t, page] = await Promise.all([getTranslations(fb.ns), getPage(slug)]);
    if (!page) notFound();
    const html = sanitizeRichText(localized(page, "body", locale));
    return (
      <>
        <PageHero title={localized(page, "title", locale) || t(fb.key as never)} />
        <Container className="max-w-3xl py-10">
          <article className="prose-bs rounded-card bg-surface p-6 text-[17px] shadow-card sm:p-10" dangerouslySetInnerHTML={{ __html: html }} />
        </Container>
      </>
    );
  }

  return { generateMetadata, Page };
}
