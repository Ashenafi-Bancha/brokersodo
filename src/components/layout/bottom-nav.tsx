"use client";
import { useTranslations } from "next-intl";
import { Briefcase, GraduationCap, Home, Plus, Search } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Mobile bottom navigation (brand kit .bs-bottom-nav) — Sell is the red centre button. */
export function BottomNav() {
  const t = useTranslations("bottomNav");
  const pathname = usePathname();
  const is = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));
  const item = "flex min-h-11 flex-col items-center justify-end gap-1 text-[12px] font-semibold";
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-end bg-bg px-1.5 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,27,61,.08)] md:hidden dark:shadow-[0_-4px_20px_rgba(0,0,0,.35)]"
    >
      <Link href="/" aria-current={is("/") ? "page" : undefined} className={cn(item, is("/") ? "text-primary" : "text-muted")}>
        <Home className="size-[22px]" />
        {t("home")}
      </Link>
      <Link
        href="/listings"
        aria-current={is("/listings") || is("/c/") ? "page" : undefined}
        className={cn(item, is("/listings") || is("/c/") ? "text-primary" : "text-muted")}
      >
        <Search className="size-[22px]" />
        {t("search")}
      </Link>
      <Link href="/sell" aria-current={is("/sell") ? "page" : undefined} className={cn(item, is("/sell") ? "text-primary" : "text-muted")}>
        <span className="-mt-7 grid size-[54px] place-items-center rounded-full border-4 border-bg bg-red-500 text-white shadow-pop">
          <Plus className="size-6" strokeWidth={2.8} />
        </span>
        {t("sell")}
      </Link>
      <Link href="/jobs" aria-current={is("/jobs") ? "page" : undefined} className={cn(item, is("/jobs") ? "text-primary" : "text-muted")}>
        <Briefcase className="size-[22px]" />
        {t("jobs")}
      </Link>
      <Link
        href="/tutors"
        aria-current={is("/tutors") ? "page" : undefined}
        className={cn(item, is("/tutors") ? "text-primary" : "text-muted")}
      >
        <GraduationCap className="size-[22px]" />
        {t("tutors")}
      </Link>
    </nav>
  );
}
