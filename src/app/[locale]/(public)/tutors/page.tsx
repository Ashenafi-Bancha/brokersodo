import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { FilterBar } from "@/components/jobs/filter-bar";
import { HowSteps, Pager, SafetyBox, TutorCard } from "@/components/jobs/cards";
import { TUTOR_LEVELS, TUTOR_MODES, TUTOR_SUBJECTS } from "@/lib/jobs-catalog";
import { alternates, localePath } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { getTutorCount, parseTutorFilters, searchTutors } from "@/server/queries/jobs";
import { getAreas } from "@/server/queries/public";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Reads filters from the URL, so it must render on every request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tutors" });
  const f = parseTutorFilters(await searchParams);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: alternates(locale, "/tutors"),
    robots: f.level || f.mode || f.area || (f.page ?? 1) > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function TutorsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const f = parseTutorFilters(await searchParams);
  const [t, tc, tb, areas, result, total] = await Promise.all([
    getTranslations("tutors"),
    getTranslations("catalog"),
    getTranslations("browse"),
    getAreas(),
    searchTutors(f),
    getTutorCount(),
  ]);
  const keep = { subject: f.subject, level: f.level, mode: f.mode, area: f.area };
  const area = f.area ? areas.find((a) => a.slug === f.area) : undefined;
  const requestHref = `/tutors/request?${new URLSearchParams(
    Object.entries({ subject: f.subject, level: f.level, mode: f.mode, area: area?.id }).filter((e): e is [string, string] => !!e[1]),
  ).toString()}`;

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-bg">
        <div aria-hidden className="absolute inset-0 bg-pattern" />
        <Container className="relative grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-pill bg-yellow-100 px-3 py-1 text-sm font-bold text-navy-900 dark:bg-navy-700 dark:text-white">
              <GraduationCap className="size-4" aria-hidden /> {t("resultCount", { count: total })}
            </p>
            <h1 className="mt-3 max-w-3xl font-brand text-h2 text-fg">{t("title")}</h1>
            <p className="mt-3 max-w-2xl text-lg text-fg-2">{t("subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:flex-col">
            <Button asChild size="lg">
              <Link prefetch={false} href="/tutors/request">
                {t("requestTutor")} <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link prefetch={false} href="/tutors/join">
                {t("becomeTutor")}
              </Link>
            </Button>
          </div>
        </Container>
        <div aria-hidden className="relative h-2 bg-brand-gradient" />
      </section>

      <Container className="py-8 sm:py-10">
        <FilterBar
          action={localePath(locale, "/tutors")}
          clearHref="/tutors"
          submitLabel={t("search")}
          clearLabel={t("clear")}
          fields={[
            { name: "subject", label: t("filterSubject"), anyLabel: t("anySubject"), value: f.subject, options: TUTOR_SUBJECTS.filter((s) => s !== "ALL_SUBJECTS").map((s) => ({ value: s, label: tc(`subject.${s}` as "subject.MATHS") })) },
            { name: "level", label: t("filterLevel"), anyLabel: t("anyLevel"), value: f.level, options: TUTOR_LEVELS.map((s) => ({ value: s, label: tc(`level.${s}` as "level.KG") })) },
            { name: "mode", label: t("filterMode"), anyLabel: t("anyMode"), value: f.mode, options: TUTOR_MODES.map((s) => ({ value: s, label: tc(`mode.${s}` as "mode.HOME") })) },
            { name: "area", label: t("filterArea"), anyLabel: t("anyArea"), value: f.area, options: areas.map((a) => ({ value: a.slug, label: localized(a, "name", locale) })) },
          ]}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="mb-4 font-semibold text-fg-2" aria-live="polite">
              {t("resultCount", { count: result.total })}
            </p>
            {result.items.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {result.items.map((tu) => (
                  <li key={tu.id}>
                    <TutorCard tutor={tu} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-card bg-surface p-8 text-center shadow-card">
                <BookOpen className="mx-auto size-12 text-line-strong" aria-hidden />
                <p className="mt-3 text-xl font-bold text-fg">{total === 0 ? t("emptyTitle") : t("noResultsTitle")}</p>
                <p className="mx-auto mt-2 max-w-md text-fg-2">{total === 0 ? t("emptyBody") : t("noResultsBody")}</p>
                <Button asChild className="mt-5">
                  <Link prefetch={false} href={requestHref}>
                    {t("requestTutor")}
                  </Link>
                </Button>
              </div>
            )}
            <Pager basePath="/tutors" params={keep} page={result.page} pageCount={result.pageCount} label={tb("pageOf", { page: result.page, total: result.pageCount })} />
          </div>
          <aside className="flex flex-col gap-4">
            <div className="rounded-card bg-red-500 p-5 text-white shadow-pop">
              <h2 className="text-lg font-bold">{t("requestTitle")}</h2>
              <p className="mt-1 text-sm text-red-50">{t("requestSubtitle")}</p>
              <Button asChild variant="highlight" className="mt-4">
                <Link prefetch={false} href={requestHref}>
                  {t("requestTutor")} <ArrowRight />
                </Link>
              </Button>
            </div>
            <SafetyBox ns="tutors" />
          </aside>
        </div>

        <div className="mt-12">
          <HowSteps ns="tutors" />
        </div>
      </Container>
    </>
  );
}
