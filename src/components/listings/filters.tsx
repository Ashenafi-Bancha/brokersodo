"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select } from "@/components/ui/form-controls";
import { buildQuery, type ParsedParams } from "@/lib/listing-params";
import { fieldLabel, type AttributeField } from "@/lib/validators/attribute-schema";
import { cn } from "@/lib/utils";

type Opt = { slug: string; name: string };

export type FiltersProps = {
  params: ParsedParams;
  categories: Opt[];
  areas: Opt[];
  /** Fixed category (on /c/[slug]); category select hidden. */
  categorySlug?: string;
  fields: AttributeField[];
  total: number;
};

function useNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = React.useTransition();
  const go = (p: Partial<ParsedParams>) => start(() => router.push(`${pathname}${buildQuery(p)}`, { scroll: false }));
  return { go, pending };
}

/** The filter form — used in the desktop sidebar and the mobile bottom sheet. */
export function FilterForm({
  params,
  categories,
  areas,
  categorySlug,
  fields,
  onDone,
  onApply,
}: FiltersProps & { onDone?: () => void; onApply?: (next: Partial<ParsedParams>) => void }) {
  const px = onDone ? "m" : "d"; // unique ids: sidebar vs mobile sheet are both in the DOM
  const t = useTranslations("browse");
  const tl = useTranslations("listing");
  const locale = useLocale();
  const { go } = useNavigate();
  const [draft, setDraft] = React.useState<ParsedParams>(params);
  // Re-sync only when the URL really changes, so a choice made while the sheet mounts isn't wiped.
  const paramsKey = buildQuery(params);
  const syncedKey = React.useRef(paramsKey);
  React.useEffect(() => {
    if (syncedKey.current === paramsKey) return;
    syncedKey.current = paramsKey;
    setDraft(params);
  }, [paramsKey, params]);
  const filterable = fields.filter((f) => f.filterable);

  const apply = (next: ParsedParams) => {
    // The mobile sheet unmounts on close, so its parent (which stays mounted) owns the navigation.
    (onApply ?? go)({ ...next, page: 1 });
    onDone?.();
  };
  const set = (patch: Partial<ParsedParams>, immediate = true) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (immediate && !onDone) apply(next);
  };
  const setAttr = (key: string, value: string, immediate = true) => {
    const attrs = { ...draft.attrs };
    if (value) attrs[key] = value;
    else delete attrs[key];
    set({ attrs }, immediate);
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        apply(draft);
      }}
    >
      {!categorySlug && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${px}-cat`}>{t("category")}</Label>
          <Select id={`${px}-cat`} value={draft.cat ?? ""} onChange={(e) => set({ cat: e.target.value || undefined, attrs: {} })}>
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold text-fg">{t("deal")}</legend>
        <div className="grid grid-cols-3 gap-1 rounded-pill bg-bg-2 p-1">
          {([undefined, "sale", "rent"] as const).map((d) => (
            <button
              key={d ?? "any"}
              type="button"
              aria-pressed={draft.deal === d}
              onClick={() => set({ deal: d })}
              className={cn(
                "min-h-10 cursor-pointer rounded-pill text-sm font-bold transition-colors",
                draft.deal === d ? "bg-navy-900 text-white dark:bg-yellow-500 dark:text-navy-900" : "text-muted hover:text-fg",
              )}
            >
              {d === "sale" ? t("buy") : d === "rent" ? t("rent") : t("any")}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-fg">{t("price")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            aria-label={`${t("price")} ${t("min")}`}
            placeholder={t("min")}
            value={draft.min ?? ""}
            onChange={(e) => set({ min: e.target.value ? Number(e.target.value) : undefined }, false)}
            onBlur={() => !onDone && apply(draft)}
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            aria-label={`${t("price")} ${t("max")}`}
            placeholder={t("max")}
            value={draft.max ?? ""}
            onChange={(e) => set({ max: e.target.value ? Number(e.target.value) : undefined }, false)}
            onBlur={() => !onDone && apply(draft)}
          />
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${px}-area`}>{t("area")}</Label>
        <Select id={`${px}-area`} value={draft.area ?? ""} onChange={(e) => set({ area: e.target.value || undefined })}>
          <option value="">{t("anyArea")}</option>
          {areas.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${px}-cond`}>{t("condition")}</Label>
        <Select id={`${px}-cond`} value={draft.cond ?? ""} onChange={(e) => set({ cond: (e.target.value || undefined) as ParsedParams["cond"] })}>
          <option value="">{t("anyCondition")}</option>
          <option value="new">{tl("condition.NEW")}</option>
          <option value="used">{tl("condition.USED")}</option>
          <option value="refurbished">{tl("condition.REFURBISHED")}</option>
        </Select>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold text-fg">
        <Checkbox checked={!!draft.verified} onChange={(e) => set({ verified: e.target.checked || undefined })} />
        {t("verifiedOnly")}
      </label>

      {filterable.length > 0 && (
        <div className="flex flex-col gap-5 border-t border-line pt-5">
          {filterable.map((f) => {
            const label = fieldLabel(f, locale);
            if (f.type === "number" || f.type === "year") {
              return (
                <fieldset key={f.key}>
                  <legend className="mb-1.5 text-sm font-semibold text-fg">
                    {label}
                    {f.unit ? ` (${f.unit})` : ""}
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["min", "max"] as const).map((b) => (
                      <Input
                        key={b}
                        type="number"
                        inputMode="numeric"
                        aria-label={`${label} ${t(b)}`}
                        placeholder={t(b)}
                        value={draft.attrs[`${f.key}_${b}`] ?? ""}
                        onChange={(e) => setAttr(`${f.key}_${b}`, e.target.value, false)}
                        onBlur={() => !onDone && apply(draft)}
                      />
                    ))}
                  </div>
                </fieldset>
              );
            }
            if (f.type === "boolean") {
              return (
                <label key={f.key} className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold text-fg">
                  <Checkbox checked={draft.attrs[f.key] === "1"} onChange={(e) => setAttr(f.key, e.target.checked ? "1" : "")} />
                  {label}
                </label>
              );
            }
            if (f.type === "select") {
              return (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <Label htmlFor={`${px}-f-${f.key}`}>{label}</Label>
                  <Select id={`${px}-f-${f.key}`} value={draft.attrs[f.key] ?? ""} onChange={(e) => setAttr(f.key, e.target.value)}>
                    <option value="">{t("any")}</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {(locale === "am" && o.labelAm) || o.labelEn}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {onDone ? (
        <div className="sticky bottom-0 -mx-5 grid grid-cols-2 gap-2 border-t border-line bg-surface px-5 pt-3 pb-1">
          <Button
            variant="outline"
            onClick={() => apply({ page: 1, view: params.view, q: params.q, sort: params.sort, attrs: {} })}
          >
            {t("clearAll")}
          </Button>
          <Button type="submit">{t("showResults")}</Button>
        </div>
      ) : (
        <Button type="submit" variant="secondary" className="sr-only focus:not-sr-only">
          {t("showResults")}
        </Button>
      )}
    </form>
  );
}

export function FilterSidebar(props: FiltersProps) {
  return <FilterForm {...props} />;
}

const FilterSheet = dynamic(() => import("./filter-sheet").then((m) => m.FilterSheet), { ssr: false });

export function MobileFilterButton({ activeCount, ...props }: FiltersProps & { activeCount: number }) {
  const t = useTranslations("browse");
  const [open, setOpen] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const { go } = useNavigate();
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="lg:hidden"
        aria-expanded={open}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <SlidersHorizontal /> {t("filters")}
        {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-red-500 text-[11px] text-white">{activeCount}</span>}
      </Button>
      {loaded && <FilterSheet {...props} open={open} onOpenChange={setOpen} onApply={go} />}
    </>
  );
}

export function SortSelect({ params, hasQuery }: { params: ParsedParams; hasQuery: boolean }) {
  const t = useTranslations("browse");
  const { go, pending } = useNavigate();
  const value = params.sort ?? (hasQuery ? "relevance" : "newest");
  const options = (["relevance", "newest", "price_asc", "price_desc", "views"] as const).filter((s) => s !== "relevance" || hasQuery);
  return (
    <label className={cn("flex items-center gap-2", pending && "opacity-60")}>
      <span className="hidden text-sm font-semibold text-muted sm:inline">{t("sort")}</span>
      <span className="sr-only sm:hidden">{t("sort")}</span>
      <Select
        value={value}
        onChange={(e) => go({ ...params, sort: e.target.value as ParsedParams["sort"], page: 1 })}
        className="min-h-10 py-0 text-sm"
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {t(`sorts.${s}`)}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function ViewToggle({ params }: { params: ParsedParams }) {
  const t = useTranslations("browse");
  const { go } = useNavigate();
  return (
    <div className="hidden rounded-btn bg-bg-2 p-1 sm:flex" role="group" aria-label={`${t("gridView")} / ${t("listView")}`}>
      {(["grid", "list"] as const).map((v) => {
        const Icon = v === "grid" ? LayoutGrid : List;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={params.view === v}
            aria-label={v === "grid" ? t("gridView") : t("listView")}
            onClick={() => go({ ...params, view: v })}
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-sm",
              params.view === v ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

export type Chip = { key: string; label: string; remove: Partial<ParsedParams> };

export function ActiveChips({ params, chips }: { params: ParsedParams; chips: Chip[] }) {
  const t = useTranslations("browse");
  const { go } = useNavigate();
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => go({ ...params, ...c.remove, page: 1 })}
          aria-label={t("removeFilter", { label: c.label })}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-pill bg-yellow-500 px-3.5 text-sm font-semibold text-navy-900 hover:bg-yellow-400"
        >
          {c.label} <X className="size-3.5" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => go({ page: 1, view: params.view, q: params.q, sort: params.sort, attrs: {} })}
        className="min-h-9 cursor-pointer px-2 text-sm font-bold text-primary hover:underline"
      >
        {t("clearAll")}
      </button>
    </div>
  );
}
