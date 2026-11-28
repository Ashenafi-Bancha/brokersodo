import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HandHelping, MapPin, Search } from "lucide-react";
import { Container } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { PageHero } from "@/components/layout/page-hero";
import { CategoryIcon } from "@/components/layout/brand";
import { WantedForm, WantedResponseForm } from "@/components/forms/simple-forms";
import { getAreas, getCategories, getPublicWanted } from "@/server/queries/public";
import { alternates } from "@/lib/seo";
import { formatETB, relativeTime } from "@/lib/format";
import { localized } from "@/lib/utils";
import { ScopedIntl } from "@/components/scoped-intl";

export const revalidate = 120;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "wanted" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/wanted") };
}

export default async function WantedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tl, categories, areas, wanted] = await Promise.all([getTranslations("wanted"), getTranslations("listing"), getCategories(), getAreas(), getPublicWanted()]);
  const budget = (min: number | null, max: number | null) =>
    min != null && max != null ? `${formatETB(min, { suffix: false })} – ${formatETB(max)}` : max != null ? t("budgetUpTo", { amount: formatETB(max) }) : min != null ? t("budgetFrom", { amount: formatETB(min) }) : null;

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Container className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section aria-labelledby="board-title" className="min-w-0">
          <h2 id="board-title" className="flex items-center gap-2 font-brand text-h3 text-fg">
            <Search className="size-6 text-primary" aria-hidden /> {t("boardTitle")}
          </h2>
          <p className="mt-1 mb-4 text-fg-2">{t("boardSubtitle")}</p>
          {wanted.length === 0 ? (
            <p className="rounded-card bg-surface p-6 text-fg-2 shadow-card">{t("boardEmpty")}</p>
          ) : (
            <ScopedIntl namespaces={["wanted", "form"]}>
              <ul className="flex flex-col gap-4">
                {wanted.map((w) => {
                  const b = budget(w.budgetMin, w.budgetMax);
                  return (
                    <li key={w.id} className="rounded-card bg-surface p-5 shadow-card">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={w.dealType === "RENT" ? "rent" : "sale"}>{w.dealType === "RENT" ? tl("rent") : t("toBuy")}</Badge>
                        {w.category && (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg">
                            <CategoryIcon icon={w.category.icon} className="size-5" /> {localized(w.category, "name", locale)}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-muted">{relativeTime(w.createdAt, locale)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-fg">{w.description}</p>
                      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-2">
                        {b && <span className="font-bold text-primary">{b}</span>}
                        {w.area && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-4" aria-hidden /> {localized(w.area, "name", locale)}
                          </span>
                        )}
                      </p>
                      <details className="mt-3 rounded-btn bg-bg-2 p-3">
                        <summary className="flex cursor-pointer items-center gap-2 font-bold text-primary">
                          <HandHelping className="size-5" aria-hidden /> {t("haveThis")}
                        </summary>
                        <p className="mt-2 text-sm text-fg-2">{t("haveThisIntro")}</p>
                        <WantedResponseForm wantedId={w.id} />
                      </details>
                    </li>
                  );
                })}
              </ul>
            </ScopedIntl>
          )}
        </section>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-3 font-brand text-h3 text-fg">{t("postTitle")}</h2>
          <ScopedIntl namespaces={["wanted", "form", "sell", "browse"]}>
            <WantedForm
              categories={categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, name: localized(c, "name", locale) }))}
              areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))}
            />
          </ScopedIntl>
          <p className="mt-3 text-xs text-muted">{t("publicNote")}</p>
        </aside>
      </Container>
    </>
  );
}
