"use client";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { CategoryMegaMenu, type NavCategory } from "./header-controls";
import { cn } from "@/lib/utils";

const linkClass = (active: boolean) =>
  cn(
    "inline-flex min-h-10 items-center rounded-btn px-3 text-[15px] font-semibold whitespace-nowrap transition-colors hover:bg-bg-2",
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

/** Desktop navigation row with the site's main pages. */
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
    <nav aria-label={t("mainNav")} className="mx-auto hidden h-12 max-w-7xl items-center gap-0.5 px-6 lg:flex lg:px-8">
      {page("/", t("home"))}
      <CategoryMegaMenu categories={categories} />
      <DealLink deal="sale" label={t("buy")} />
      <DealLink deal="rent" label={t("rent")} />
      {page("/wanted", t("wanted"))}
      {page("/how-it-works", t("howItWorks"))}
      {page("/about", t("about"))}
      {page("/faq", t("faq"))}
      {page("/contact", t("contact"))}
    </nav>
  );
}
