import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Phone, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getCategories, getSiteSettings } from "@/server/queries/public";
import { telLink } from "@/lib/contact";
import { localized } from "@/lib/utils";
import { Logo } from "./brand";
import {
  CategoryMegaMenu,
  HeaderSearch,
  LanguageSwitcher,
  MobileMenu,
  ThemeToggle,
  type NavCategory,
} from "./header-controls";

export async function SiteHeader() {
  const [t, locale, categories, settings] = await Promise.all([
    getTranslations("nav"),
    getLocale(),
    getCategories(),
    getSiteSettings(),
  ]);
  const navCats: NavCategory[] = categories
    .filter((c) => !c.parentId)
    .map((c) => ({ id: c.id, slug: c.slug, icon: c.icon, count: c.count, name: localized(c, "name", locale) }));
  const phoneHref = telLink(settings.phonePrimary);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg lg:bg-bg/85 lg:backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:h-[72px] lg:gap-4 lg:px-8">
        <Suspense fallback={<span className="size-10 lg:hidden" />}>
          <MobileMenu categories={navCats} phoneHref={phoneHref} />
        </Suspense>
        <Link href="/" aria-label="BrokerSodo — home" className="mr-auto shrink-0 lg:mr-0">
          <Logo className="h-9 sm:h-10 lg:h-11" priority />
        </Link>

        <nav aria-label={t("mainNav")} className="ml-4 hidden items-center gap-1 lg:flex">
          <CategoryMegaMenu categories={navCats} />
          <Link href="/listings" className="inline-flex min-h-10 items-center rounded-btn px-3 font-semibold hover:bg-bg-2">
            {t("buy")}
          </Link>
          <Link href="/listings?deal=rent" className="inline-flex min-h-10 items-center rounded-btn px-3 font-semibold hover:bg-bg-2">
            {t("rent")}
          </Link>
          <Link href="/wanted" className="inline-flex min-h-10 items-center rounded-btn px-3 font-semibold hover:bg-bg-2">
            {t("wanted")}
          </Link>
        </nav>

        <HeaderSearch className="mx-2 hidden max-w-xs flex-1 xl:block" />

        <div className="flex items-center gap-1 lg:ml-auto lg:gap-2">
          <Button asChild variant="ghost" size="icon-sm" className="xl:hidden" aria-label={t("search")}>
            <Link href="/listings">
              <Search />
            </Link>
          </Button>
          <Suspense fallback={null}>
            <LanguageSwitcher compact className="hidden sm:inline-flex" />
          </Suspense>
          <ThemeToggle className="hidden sm:inline-flex" />
          <Button asChild variant="secondary" size="sm" className="hidden xl:inline-flex">
            <a href={phoneHref}>
              <Phone /> {t("call")}
            </a>
          </Button>
          <Button asChild variant="primary" size="sm" className="hidden sm:inline-flex">
            <Link href="/sell">{t("sellWithUs")}</Link>
          </Button>
          <Button asChild variant="call" size="icon-sm" className="xl:hidden" aria-label={t("call")}>
            <a href={phoneHref}>
              <Phone />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
