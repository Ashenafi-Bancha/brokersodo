import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, UserRoundSearch, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { FilterBar } from "@/components/jobs/filter-bar";
import { HowSteps, Pager, SafetyBox, TalentCard } from "@/components/jobs/cards";
import { EDUCATION_LEVELS, SEEKER_TYPES } from "@/lib/jobs-catalog";
import { getActiveValues } from "@/lib/catalog";
import { alternates, localePath } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { getTalentCount, parseTalentFilters, searchTalent } from "@/server/queries/jobs";
import { getAreas } from "@/server/queries/public";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Reads filters from the URL, so it must render on every request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "talent" });
  const f = parseTalentFilters(await searchParams);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: alternates(locale, "/talent"),
    robots: f.q || f.type || f.education || f.area || (f.page ?? 1) > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function TalentPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const f = parseTalentFilters(await searchParams);
  const [t, tc, tb, areas, result, total] = await Promise.all([
    getTranslations("talent"),
    getTranslations("catalog"),
    getTranslations("browse"),
    getAreas(),
    searchTalent(f),
    getTalentCount(),
  ]);
  const keep = { q: f.q, sector: f.sector, type: f.type, education: f.education, area: f.area };

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-bg">
        <div aria-hidden className="absolute inset-0 bg-pattern" />
        <Container className="relative grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-pill bg-yellow-100 px-3 py-1 text-sm font-bold text-navy-900">
              <UsersRound className="size-4" aria-hidden /> {t("resultCount", { count: total })}
            </p>
            <h1 className="mt-3 max-w-3xl font-brand text-h2 text-fg">{t("title")}</h1>
            <p className="mt-3 max-w-2xl text-lg text-fg-2">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:flex-col">
            <Button asChild size="lg">
              <Link prefetch={false} href="/jobs/post">
                {t("postJob")} <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link prefetch={false} href="/jobs/talent-pool">
                {t("createProfile")}
              </Link>
            </Button>
          </div>
        </Container>
        <div aria-hidden className="relative h-2 bg-brand-gradient" />
      </section>

      <Container className="py-8 sm:py-10">
        <FilterBar
          action={localePath(locale, "/talent")}
          clearHref="/talent"
          submitLabel={t("search")}
          clearLabel={t("clear")}
          search={{ name: "q", label: t("searchLabel"), placeholder: t("searchPlaceholder"), value: f.q }}
          fields={[
            { name: "sector", label: t("filterSector"), anyLabel: t("anySector"), value: f.sector, options: (await getActiveValues("sector")).map((s) => ({ value: s, label: tc(`sector.${s}` as "sector.OTHER") })) },
            { name: "type", label: t("filterType"), anyLabel: t("anyType"), value: f.type, options: SEEKER_TYPES.map((s) => ({ value: s, label: tc(`audience.${s}` as "audience.ANY") })) },
            { name: "education", label: t("filterEducation"), anyLabel: t("anyEducation"), value: f.education, options: EDUCATION_LEVELS.map((s) => ({ value: s, label: tc(`education.${s}` as "education.NONE") })) },
            { name: "area", label: t("filterArea"), anyLabel: t("anyArea"), value: f.area, options: areas.map((a) => ({ value: a.slug, label: localized(a, "name", locale) })) },
          ]}
        />

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <h2 className="mb-4 font-semibold text-fg-2" aria-live="polite">
              {t("resultCount", { count: result.total })}
            </h2>
            {result.items.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {result.items.map((p) => (
                  <li key={p.id}>
                    <TalentCard talent={p} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-card bg-surface p-8 text-center shadow-card">
                <UserRoundSearch className="mx-auto size-12 text-line-strong" aria-hidden />
                <p className="mt-3 text-xl font-bold text-fg">{total === 0 ? t("emptyTitle") : t("noResultsTitle")}</p>
                <p className="mx-auto mt-2 max-w-md text-fg-2">{total === 0 ? t("emptyBody") : t("noResultsBody")}</p>
                <Button asChild className="mt-5">
                  <Link prefetch={false} href="/jobs/post">
                    {t("postJob")}
                  </Link>
                </Button>
              </div>
            )}
            <Pager basePath="/talent" params={keep} page={result.page} pageCount={result.pageCount} label={tb("pageOf", { page: result.page, total: result.pageCount })} />
          </div>
          <aside className="flex flex-col gap-4">
            <div className="rounded-card bg-red-500 p-5 text-white shadow-pop">
              <h2 className="text-lg font-bold">{t("ctaTitle")}</h2>
              <p className="mt-1 text-sm text-white">{t("ctaBody")}</p>
              <Button asChild variant="highlight" className="mt-4">
                <Link prefetch={false} href="/jobs/talent-pool">
                  {t("createProfile")} <ArrowRight />
                </Link>
              </Button>
            </div>
            <SafetyBox ns="jobs" />
          </aside>
        </div>

        <div className="mt-12">
          <HowSteps ns="talent" />
        </div>
      </Container>
    </>
  );
}
