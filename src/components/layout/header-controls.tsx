"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Menu, Search } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "./brand";
import { cn } from "@/lib/utils";

export type NavCategory = { id: string; slug: string; name: string; icon: string; count: number };

// The drawer (and its dialog library) is only downloaded when someone opens it.
const MobileMenuSheet = dynamic(() => import("./mobile-menu-sheet").then((m) => m.MobileMenuSheet), { ssr: false });

export function LanguageSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const t = useTranslations("nav");
  const qs = search.toString();
  return (
    <div role="group" aria-label={t("language")} className={cn("inline-flex rounded-pill bg-bg-2 p-1", className)}>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { locale: l })}
          className={cn(
            "min-h-8 cursor-pointer rounded-pill px-3 text-[13px] font-bold transition-colors",
            l === locale ? "bg-red-500 text-white" : "text-muted hover:text-fg",
          )}
        >
          {compact ? LOCALE_LABELS[l].short : LOCALE_LABELS[l].long}
        </button>
      ))}
    </div>
  );
}

/** Desktop mega-menu of categories (disclosure pattern, no menu library). */
export function CategoryMegaMenu({ categories }: { categories: NavCategory[] }) {
  const t = useTranslations("nav");
  const tc = useTranslations("home");
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="category-menu"
        onClick={() => setOpen((o) => !o)}
        className={cn("inline-flex min-h-9 cursor-pointer items-center gap-0.5 rounded-sm px-2 text-sm font-semibold whitespace-nowrap text-fg hover:bg-bg-2", open && "bg-bg-2")}
      >
        {t("categories")}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      <div
        id="category-menu"
        hidden={!open}
        className="absolute top-full left-0 z-50 mt-2.5 w-[min(720px,92vw)] rounded-card bg-surface p-3 shadow-pop"
      >
        <ul className="grid grid-cols-2 gap-1 md:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-btn p-3 hover:bg-bg-2">
                <span className="grid size-11 shrink-0 place-items-center rounded-btn bg-yellow-100 dark:bg-navy-700">
                  <CategoryIcon icon={c.icon} className="size-7" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-fg">{c.name}</span>
                  <span className="block text-xs text-muted">{tc("listingsCount", { count: c.count })}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/listings" onClick={() => setOpen(false)} className="mt-1 block rounded-btn bg-bg-2 p-3 text-center text-sm font-bold text-primary hover:bg-line">
          {t("allListings")} →
        </Link>
      </div>
    </div>
  );
}

export function HeaderSearch({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const id = React.useId();
  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/listings?q=${encodeURIComponent(q.trim())}` : "/listings");
      }}
    >
      <label htmlFor={id} className="sr-only">
        {t("search")}
      </label>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="min-h-10 w-full rounded-pill border-[1.5px] border-line bg-bg-2 pr-3 pl-9 text-sm text-fg outline-none placeholder:text-muted focus:border-[var(--input-focus)] focus:bg-bg"
      />
    </form>
  );
}

export function MobileMenu({ categories, phoneHref }: { categories: NavCategory[]; phoneHref: string }) {
  const t = useTranslations("nav");
  const [open, setOpen] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("menu")}
        aria-expanded={open}
        className="xl:hidden"
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <Menu />
      </Button>
      {loaded && <MobileMenuSheet open={open} onOpenChange={setOpen} categories={categories} phoneHref={phoneHref} />}
    </>
  );
}
