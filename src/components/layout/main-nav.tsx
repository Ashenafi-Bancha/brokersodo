"use client";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { CategoryMegaMenu, type NavCategory } from "./header-controls";
import { cn } from "@/lib/utils";

const linkClass = (active: boolean) =>
  cn(
    "inline-flex min-h-9 items-center rounded-sm px-2 text-sm font-semibold whitespace-nowrap transition-colors hover:bg-bg-2",
    active ? "bg-red-50 text-primary dark:bg-navy-700" : "text-fg",
  );

function DealLinkInner({ deal, label }: { deal: "sale" | "rent"; label: string }) {
  const pathname = usePathname();
  const current = useSearchParams().get("deal");
  const active = pathname === "/listings" && current === deal;
  return (
    <Link href={`/listings?deal=${deal}`} aria-current={active ? "page" : undefined} className={linkClass(active)}>
      {label}
    </Link>
  );
}

/** Keeps the link in the server-rendered HTML; the active state is added in the browser. */
function DealLink(props: { deal: "sale" | "rent"; label: string }) {
  return (
    <Suspense
      fallback={
        <Link href={`/listings?deal=${props.deal}`} className={linkClass(false)}>
          {props.label}
        </Link>
      }
    >
      <DealLinkInner {...props} />
    </Suspense>
  );
}

/** Desktop navigation, shown in the same row as the logo and search bar. */
export function MainNav({ categories }: { categories: NavCategory[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const page = (href: string, label: string) => {
    const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link key={href} href={href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
        {label}
      </Link>
    );
  };
  return (
    <nav aria-label={t("mainNav")} className="hidden shrink-0 items-center xl:flex">
      {page("/", t("home"))}
      <CategoryMegaMenu categories={categories} />
      <DealLink deal="sale" label={t("buy")} />
      <DealLink deal="rent" label={t("rent")} />
      {page("/jobs", t("jobs"))}
      {page("/tutors", t("tutors"))}
      {page("/wanted", t("wanted"))}
      {page("/about", t("about"))}
      {page("/contact", t("contact"))}
    </nav>
  );
}
