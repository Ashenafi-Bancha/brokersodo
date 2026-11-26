import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Briefcase, GraduationCap, Users, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { FilterBar } from "@/components/jobs/filter-bar";
import { HowSteps, JobCard, Pager, SafetyBox } from "@/components/jobs/cards";
import { EDUCATION_LEVELS, JOB_SECTORS, JOB_TYPES } from "@/lib/jobs-catalog";
import { alternates, localePath } from "@/lib/seo";
import { cn, localized } from "@/lib/utils";
import { getJobCounts, parseJobFilters, searchJobs } from "@/server/queries/jobs";
import { getAreas } from "@/server/queries/public";

type SP = Promise<Record<string, string | string[] | undefined>>;

// Reads filters from the URL, so it must render on every request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "jobs" });
  const f = parseJobFilters(await searchParams);
  const filtered = f.q || f.type || f.education || f.area || (f.page ?? 1) > 1;
  // Sector and audience pages are worth indexing; free-text searches are not.
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: alternates(locale, "/jobs"),
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function JobsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const f = parseJobFilters(await searchParams);
  const [t, tc, tb, areas, result, counts] = await Promise.all([
    getTranslations("jobs"),
    getTranslations("catalog"),
    getTranslations("browse"),
    getAreas(),
    searchJobs(f),
    getJobCounts(),
  ]);
  const base = localePath(locale, "/jobs");
  const keep = { q: f.q, sector: f.sector, type: f.type, area: f.area, education: f.education };
  const tabs = [
    { key: undefined, label: t("forAll"), count: counts.open, Icon: Users },
    { key: "GRADUATE", label: t("forGraduates"), count: counts.graduate, Icon: GraduationCap },
    { key: "SKILLED", label: t("forSkilled"), count: counts.skilled, Icon: Wrench },
  ];
  const hrefWith = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...keep, for: f.audience, ...extra })) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/jobs?${s}` : "/jobs";
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-bg">
        <div aria-hidden className="absolute inset-0 bg-pattern" />
        <Container className="relative py-10 sm:py-14">
          <p className="inline-flex items-center gap-2 rounded-pill bg-yellow-100 px-3 py-1 text-sm font-bold text-navy-900 dark:bg-navy-700 dark:text-white">
            <Briefcase className="size-4" aria-hidden /> {t("resultCount", { count: counts.open })}
          </p>
          <h1 className="mt-3 max-w-3xl font-brand text-h2 text-fg">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-lg text-fg-2">{t("subtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link prefetch={false} href="/jobs/post">
                {t("postJob")} <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link prefetch={false} href="/jobs/talent-pool">
                {t("joinPool")}
              </Link>
            </Button>
          </div>
        </Container>
        <div aria-hidden className="relative h-2 bg-brand-gradient" />
      </section>

      <Container className="py-8 sm:py-10">
        <nav aria-label={t("audienceLabel")} className="-mx-4 mb-5 overflow-x-auto px-4">
          <ul className="flex min-w-max gap-2">
            {tabs.map(({ key, label, count, Icon }) => {
              const on = f.audience === key;
              return (
                <li key={label}>
                  <Link
                    prefetch={false}
                    href={hrefWith({ for: key, page: undefined })}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-pill border-2 px-4 font-bold whitespace-nowrap",
                      on ? "border-red-500 bg-red-500 text-white" : "border-line text-fg hover:border-fg",
                    )}
                  >
                    <Icon className="size-4" aria-hidden /> {label}
                    <span className={cn("rounded-pill px-2 text-xs", on ? "bg-white/20" : "bg-bg-2")}>{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <FilterBar
          action={base}
          clearHref={f.audience ? `/jobs?for=${f.audience}` : "/jobs"}
          keep={{ for: f.audience }}
          search={{ name: "q", label: t("searchLabel"), placeholder: t("searchPlaceholder"), value: f.q }}
          submitLabel={t("search")}
          clearLabel={t("clear")}
          fields={[
            { name: "sector", label: t("filterSector"), anyLabel: t("anySector"), value: f.sector, options: JOB_SECTORS.map((s) => ({ value: s, label: tc(`sector.${s}` as "sector.OTHER") })) },
            { name: "type", label: t("filterType"), anyLabel: t("anyType"), value: f.type, options: JOB_TYPES.map((s) => ({ value: s, label: tc(`jobType.${s}` as "jobType.FULL_TIME") })) },
            { name: "education", label: t("filterEducation"), anyLabel: t("anyEducation"), value: f.education, options: EDUCATION_LEVELS.map((s) => ({ value: s, label: tc(`education.${s}` as "education.NONE") })) },
            { name: "area", label: t("filterArea"), anyLabel: t("anyArea"), value: f.area, options: areas.map((a) => ({ value: a.slug, label: localized(a, "name", locale) })) },
          ]}
        />

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <p className="mb-4 font-semibold text-fg-2" aria-live="polite">
              {t("resultCount", { count: result.total })}
            </p>
            {result.items.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {result.items.map((j) => (
                  <li key={j.id}>
                    <JobCard job={j} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-card bg-surface p-8 text-center shadow-card">
                <Briefcase className="mx-auto size-12 text-line-strong" aria-hidden />
                <p className="mt-3 text-xl font-bold text-fg">{counts.open === 0 ? t("emptyTitle") : t("noResultsTitle")}</p>
                <p className="mx-auto mt-2 max-w-md text-fg-2">{counts.open === 0 ? t("emptyBody") : t("noResultsBody")}</p>
                <Button asChild className="mt-5">
                  <Link prefetch={false} href="/jobs/talent-pool">
                    {t("joinPool")}
                  </Link>
                </Button>
              </div>
            )}
            <Pager basePath="/jobs" params={{ ...keep, for: f.audience }} page={result.page} pageCount={result.pageCount} label={tb("pageOf", { page: result.page, total: result.pageCount })} />
          </div>

          <aside className="flex flex-col gap-4">
            {(
              [
                ["graduatesCard", "graduatesBody", "/jobs/talent-pool?type=GRADUATE", t("joinPool"), GraduationCap, "bg-blue-500 text-white"],
                ["skilledCard", "skilledBody", "/jobs/talent-pool?type=SKILLED", t("joinPool"), Wrench, "bg-yellow-500 text-navy-900"],
                ["employersCard", "employersBody", "/jobs/post", t("postJob"), Briefcase, "bg-red-500 text-white"],
              ] as const
            ).map(([title, body, href, cta, Icon, chip]) => (
              <div key={title} className="rounded-card bg-surface p-5 shadow-card">
                <span className={`grid size-11 place-items-center rounded-btn ${chip}`}>
                  <Icon className="size-6" aria-hidden />
                </span>
                <h2 className="mt-3 text-lg font-bold text-fg">{t(title)}</h2>
                <p className="mt-1 text-sm text-fg-2">{t(body)}</p>
                <Link prefetch={false} href={href} className="mt-3 inline-flex items-center gap-1 font-bold text-primary hover:underline">
                  {cta} <ArrowRight className="size-4" />
                </Link>
              </div>
            ))}
            <SafetyBox ns="jobs" />
          </aside>
        </div>

        {Object.keys(counts.bySector).length > 0 && !f.sector && (
          <section className="mt-12">
            <h2 className="mb-4 font-brand text-h3 text-fg">{t("sectionsTitle")}</h2>
            <ul className="flex flex-wrap gap-2">
              {JOB_SECTORS.filter((s) => counts.bySector[s]).map((s) => (
                <li key={s}>
                  <Link prefetch={false} href={`/jobs?sector=${s}`} className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-surface px-4 text-sm font-semibold text-fg shadow-card hover:text-primary">
                    {tc(`sector.${s}` as "sector.OTHER")} <span className="rounded-pill bg-bg-2 px-2 text-xs">{counts.bySector[s]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12">
          <HowSteps ns="jobs" />
        </div>
      </Container>
    </>
  );
}
