import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { CategoryIcon } from "@/components/layout/brand";
import { ListingGrid } from "./listing-card";
import { ActiveChips, FilterSidebar, MobileFilterButton, SortSelect, ViewToggle, type Chip } from "./filters";
import { activeFilterCount, buildQuery, type ParsedParams } from "@/lib/listing-params";
import { fieldLabel, formatAttributeValue } from "@/lib/validators/attribute-schema";
import { formatETB } from "@/lib/format";
import { localized } from "@/lib/utils";
import { getAreas, getCategories, searchListings, type PublicCategory } from "@/server/queries/public";
import { ScopedIntl } from "@/components/scoped-intl";

/** Shared by /listings and /c/[categorySlug]. */
export async function BrowseView({ params, category, basePath }: { params: ParsedParams; category?: PublicCategory | null; basePath: string }) {
  const [t, tl, locale, categories, areas] = await Promise.all([
    getTranslations("browse"),
    getTranslations("listing"),
    getLocale(),
    getCategories(),
    getAreas(),
  ]);
  const cat = category ?? (params.cat ? categories.find((c) => c.slug === params.cat) : undefined);
  const area = params.area ? areas.find((a) => a.slug === params.area) : undefined;
  const fields = cat?.fields ?? [];

  const result = await searchListings({
    q: params.q,
    categoryId: cat?.id,
    dealType: params.deal === "rent" ? "RENT" : params.deal === "sale" ? "SALE" : undefined,
    minPrice: params.min,
    maxPrice: params.max,
    areaId: area?.id,
    condition: params.cond?.toUpperCase() as "NEW" | "USED" | "REFURBISHED" | undefined,
    verified: params.verified,
    attrs: params.attrs,
    sort: params.sort,
    page: params.page,
    pageSize: 16,
  });

  const catName = cat ? localized(cat, "name", locale) : null;
  const areaName = area ? localized(area, "name", locale) : null;
  const heading = params.q ? t("searchFor", { q: params.q }) : catName ? (areaName ? t("metaTitleArea", { category: catName, area: areaName }) : t("metaTitle", { category: catName })) : t("title");

  // Active filter chips
  const chips: Chip[] = [];
  if (params.q) chips.push({ key: "q", label: `“${params.q}”`, remove: { q: undefined } });
  if (!category && cat) chips.push({ key: "cat", label: catName!, remove: { cat: undefined, attrs: {} } });
  if (params.deal) chips.push({ key: "deal", label: params.deal === "rent" ? t("rent") : t("buy"), remove: { deal: undefined } });
  if (params.min != null) chips.push({ key: "min", label: `≥ ${formatETB(params.min)}`, remove: { min: undefined } });
  if (params.max != null) chips.push({ key: "max", label: `≤ ${formatETB(params.max)}`, remove: { max: undefined } });
  if (areaName) chips.push({ key: "area", label: areaName, remove: { area: undefined } });
  if (params.cond) chips.push({ key: "cond", label: tl(`condition.${params.cond.toUpperCase() as "NEW"}`), remove: { cond: undefined } });
  if (params.verified) chips.push({ key: "verified", label: t("verifiedOnly"), remove: { verified: undefined } });
  for (const [k, v] of Object.entries(params.attrs)) {
    const baseKey = k.replace(/_(min|max)$/, "");
    const f = fields.find((x) => x.key === baseKey);
    if (!f) continue;
    const rest = { ...params.attrs };
    delete rest[k];
    const bound = k.endsWith("_min") ? "≥ " : k.endsWith("_max") ? "≤ " : "";
    const val = f.type === "boolean" ? "" : bound ? `${bound}${v}` : formatAttributeValue(f, v, locale);
    chips.push({ key: `f_${k}`, label: val ? `${fieldLabel(f, locale)}: ${val}` : fieldLabel(f, locale), remove: { attrs: rest } });
  }

  const filterProps = {
    params,
    categories: categories.filter((c) => !c.parentId).map((c) => ({ slug: c.slug, name: localized(c, "name", locale) })),
    areas: areas.map((a) => ({ slug: a.slug, name: localized(a, "name", locale) })),
    categorySlug: category?.slug,
    fields,
    total: result.total,
  };

  return (
    <ScopedIntl namespaces={["browse"]}>
      <section className="border-b border-line bg-bg-2">
        <Container className="flex items-center gap-4 py-8">
          {cat && (
            <span className="hidden size-16 shrink-0 place-items-center rounded-[18px] bg-yellow-500 sm:grid">
              <CategoryIcon icon={cat.icon} tone="navy" className="size-10" />
            </span>
          )}
          <div>
            <h1 className="font-brand text-h2 text-fg">{heading}</h1>
            <p className="mt-1 text-muted" aria-live="polite">
              {t("results", { count: result.total })}
              {cat && locale === "en" && cat.descriptionEn ? ` · ${cat.descriptionEn}` : ""}
            </p>
          </div>
        </Container>
      </section>

      <Container className="grid gap-8 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block" aria-label={t("filters")}>
          <div className="sticky top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-card bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-lg font-bold text-fg">{t("filters")}</h2>
            <FilterSidebar {...filterProps} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <MobileFilterButton {...filterProps} activeCount={activeFilterCount(params)} />
            <div className="ml-auto flex items-center gap-2">
              <SortSelect params={params} hasQuery={!!params.q} />
              <ViewToggle params={params} />
            </div>
          </div>
          <div className="mb-5">
            <ActiveChips params={params} chips={chips} />
          </div>

          <h2 className="sr-only">{t("results", { count: result.total })}</h2>
          {result.items.length === 0 ? (
            <div className="flex flex-col items-center rounded-card bg-surface px-6 py-16 text-center shadow-card">
              <SearchX className="size-12 text-muted" aria-hidden />
              <h2 className="mt-4 text-xl font-bold text-fg">{t("emptyTitle")}</h2>
              <p className="mt-2 max-w-sm text-muted">{t("emptyBody")}</p>
              <Button asChild className="mt-6">
                <Link href="/wanted">{t("emptyCta")}</Link>
              </Button>
            </div>
          ) : (
            <>
              <ListingGrid listings={result.items} layout={params.view} priorityCount={2} />
              {result.pageCount > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
                  {params.page > 1 ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${basePath}${buildQuery(params, { page: params.page - 1 })}`} rel="prev">
                        <ChevronLeft /> {t("prev")}
                      </Link>
                    </Button>
                  ) : (
                    <span className="w-24" />
                  )}
                  <span className="text-sm font-semibold text-muted">{t("pageOf", { page: params.page, total: result.pageCount })}</span>
                  {params.page < result.pageCount ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${basePath}${buildQuery(params, { page: params.page + 1 })}`} rel="next">
                        {t("next")} <ChevronRight />
                      </Link>
                    </Button>
                  ) : (
                    <span className="w-24" />
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </Container>
    </ScopedIntl>
  );
}
