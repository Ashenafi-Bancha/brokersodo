import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Phone, Search, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getCategories, getSiteSettings } from "@/server/queries/public";
import { telLink } from "@/lib/contact";
import { localized } from "@/lib/utils";
import { Logo } from "./brand";
import { HeaderSearch, LanguageSwitcher, MobileMenu, type NavCategory } from "./header-controls";
import { MainNav } from "./main-nav";

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
    <header className="bs-header sticky top-0 z-40 border-b border-line bg-bg">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-4 sm:px-6 xl:gap-3">
        <Suspense fallback={<span className="size-10 xl:hidden" />}>
          <MobileMenu categories={navCats} phoneHref={phoneHref} />
        </Suspense>
        <Link href="/" aria-label="BrokerSodo — home" className="mr-auto shrink-0 lg:mr-0">
          <Logo className="h-9 sm:h-10" priority />
        </Link>

        <MainNav categories={navCats} />

        <HeaderSearch className="hidden min-w-0 flex-1 lg:block" />

        <div className="flex shrink-0 items-center gap-1 xl:gap-1.5">
          <Button asChild variant="ghost" size="icon-sm" className="lg:hidden" aria-label={t("search")}>
            <Link href="/listings">
              <Search />
            </Link>
          </Button>
          <Suspense fallback={null}>
            <LanguageSwitcher compact className="hidden sm:inline-flex" />
          </Suspense>
          <Button asChild variant="secondary" size="sm" className="hidden 2xl:inline-flex">
            <a href={phoneHref}>
              <Phone /> {t("call")}
            </a>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" aria-label={t("account")} title={t("account")}>
            <Link href="/account">
              <UserRound />
            </Link>
          </Button>
          <Button asChild variant="primary" size="sm" className="hidden sm:inline-flex">
            <Link href="/sell">{t("sellWithUs")}</Link>
          </Button>
          <Button asChild variant="call" size="icon-sm" className="2xl:hidden" aria-label={t("call")}>
            <a href={phoneHref}>
              <Phone />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
