import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Store } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { FilterBar } from "@/components/jobs/filter-bar";
import { Pager } from "@/components/jobs/cards";
import { StoreCard } from "@/components/stores/store-card";
import { STORE_TYPES } from "@/lib/stores";
import { alternates, localePath } from "@/lib/seo";
import { cn, localized } from "@/lib/utils";
import { getStoreCount, getStoreTypeCounts, parseStoreFilters, searchStores } from "@/server/queries/stores";
import { getAreas } from "@/server/queries/public";

type SP = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "stores" });
  const f = parseStoreFilters(await searchParams);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: alternates(locale, "/stores"),
    robots: f.q || f.area || (f.page ?? 1) > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function StoresPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const f = parseStoreFilters(await searchParams);
  const [t, tb, areas, result, total, counts] = await Promise.all([getTranslations("stores"), getTranslations("browse"), getAreas(), searchStores(f), getStoreCount(), getStoreTypeCounts()]);
  const keep = { q: f.q, type: f.type, area: f.area };
  const chip = (type?: string) => {
    const q = new URLSearchParams(Object.entries({ q: f.q, area: f.area, type }).filter((e): e is [string, string] => !!e[1]));
    return q.toString() ? `/stores?${q}` : "/stores";
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-bg">
        <div aria-hidden className="absolute inset-0 bg-pattern" />
        <Container className="relative grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-pill bg-yellow-100 px-3 py-1 text-sm font-bold text-navy-900">
              <Store className="size-4" aria-hidden /> {t("resultCount", { count: total })}
            </p>
            <h1 className="mt-3 max-w-3xl font-brand text-h2 text-fg">{t("title")}</h1>
            <p className="mt-3 max-w-2xl text-lg text-fg-2">{t("subtitle")}</p>
          </div>
          <Button asChild size="lg">
            <Link prefetch={false} href="/account/store">
              {t("openStore")} <ArrowRight />
            </Link>
          </Button>
        </Container>
        <div aria-hidden className="relative h-2 bg-brand-gradient" />
      </section>

      <Container className="py-8 sm:py-10">
        <nav aria-label={t("filterType")} className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-2">
            <li>
              <Link prefetch={false} href={chip()} aria-current={!f.type ? "page" : undefined} className={cn("inline-flex min-h-10 items-center rounded-pill px-4 text-sm font-bold", !f.type ? "bg-red-500 text-white" : "bg-surface text-fg shadow-card")}>
                {t("allTypes")}
              </Link>
            </li>
            {STORE_TYPES.filter((s) => counts[s] > 0 || s === f.type).map((s) => (
              <li key={s}>
                <Link prefetch={false} href={chip(s)} aria-current={f.type === s ? "page" : undefined} className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-pill px-4 text-sm font-bold", f.type === s ? "bg-red-500 text-white" : "bg-surface text-fg shadow-card")}>
                  {t(`type.${s}` as "type.SHOP")} <span className="opacity-70">{counts[s]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <FilterBar
          action={localePath(locale, "/stores")}
          clearHref="/stores"
          submitLabel={t("search")}
          clearLabel={t("clear")}
          keep={{ type: f.type }}
          search={{ name: "q", label: t("searchLabel"), placeholder: t("searchPlaceholder"), value: f.q }}
          fields={[{ name: "area", label: t("filterArea"), anyLabel: t("anyArea"), value: f.area, options: areas.map((a) => ({ value: a.slug, label: localized(a, "name", locale) })) }]}
        />
        <h2 className="mt-8 mb-4 font-semibold text-fg-2" aria-live="polite">
          {t("resultCount", { count: result.total })}
        </h2>
        {result.items.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((s) => (
              <li key={s.id}>
                <StoreCard store={s} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card bg-surface p-8 text-center shadow-card">
            <Store className="mx-auto size-12 text-line-strong" aria-hidden />
            <p className="mt-3 text-xl font-bold text-fg">{total === 0 ? t("emptyTitle") : t("noResultsTitle")}</p>
            <p className="mx-auto mt-2 max-w-md text-fg-2">{total === 0 ? t("emptyBody") : t("noResultsBody")}</p>
            <Button asChild className="mt-5">
              <Link prefetch={false} href="/account/store">
                {t("openStore")}
              </Link>
            </Button>
          </div>
        )}
        <Pager basePath="/stores" params={keep} page={result.page} pageCount={result.pageCount} label={tb("pageOf", { page: result.page, total: result.pageCount })} />
      </Container>
    </>
  );
}
