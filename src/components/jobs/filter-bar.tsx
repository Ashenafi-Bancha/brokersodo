import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

export type FilterField = { name: string; label: string; anyLabel: string; value?: string; options: { value: string; label: string }[] };

/**
 * Plain GET form: works without JavaScript, the URL is shareable, and it costs
 * nothing to load on slow phones.
 */
export function FilterBar({
  action,
  clearHref,
  fields,
  keep,
  search,
  submitLabel,
  clearLabel,
  className,
}: {
  action: string;
  clearHref: string;
  fields: FilterField[];
  keep?: Record<string, string | undefined>;
  search?: { name: string; label: string; placeholder: string; value?: string };
  submitLabel: string;
  clearLabel: string;
  className?: string;
}) {
  const active = fields.some((f) => f.value) || !!search?.value;
  return (
    <form action={action} method="get" role="search" className={cn("rounded-card bg-surface p-4 shadow-card sm:p-5", className)}>
      {keep && Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {search && (
        <label className="mb-3 block">
          <span className="sr-only">{search.label}</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              name={search.name}
              defaultValue={search.value}
              placeholder={search.placeholder}
              aria-label={search.label}
              className="min-h-12 w-full rounded-btn border-[1.5px] border-line-strong bg-bg pr-3 pl-11 text-base text-fg outline-none placeholder:text-muted/70 focus:border-[var(--input-focus)] focus:shadow-[0_0_0_3px_var(--color-yellow-100)]"
            />
          </span>
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))_auto]" style={{ "--n": fields.length } as React.CSSProperties}>
        {fields.map((f) => (
          <label key={f.name} className="flex flex-col gap-1 text-sm font-semibold text-fg">
            {f.label}
            <Select name={f.name} defaultValue={f.value ?? ""}>
              <option value="">{f.anyLabel}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
        ))}
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" className="flex-1 lg:flex-none">
            <Search /> {submitLabel}
          </Button>
        </div>
      </div>
      {active && (
        <Link prefetch={false} href={clearHref} className="mt-3 inline-block text-sm font-bold text-primary hover:underline">
          {clearLabel}
        </Link>
      )}
    </form>
  );
}
