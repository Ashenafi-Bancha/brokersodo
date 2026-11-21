import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BadgeCheck, CalendarCheck, Eye, Handshake, Megaphone, PhoneCall, Quote, Search, Send, Star, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/misc";
import { CategoryIcon } from "@/components/layout/brand";
import { HeroSearch } from "@/components/home/hero-search";
import { Carousel } from "@/components/home/carousel";
import { Counter } from "@/components/home/stats-band";
import { FaqList } from "@/components/home/faq-list";
import { ListingCard, ListingGrid } from "@/components/listings/listing-card";
import {
  getAreas,
  getCategories,
  getFaqs,
  getFeaturedListings,
  getLatestListings,
  getListingsByCategorySlugs,
  getRecentlySold,
  getSiteSettings,
  getStats,
  getTestimonials,
} from "@/server/queries/public";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { ScopedIntl } from "@/components/scoped-intl";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternates(locale, "/") };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tm = await getTranslations("meta");
  const [t, th, settings, categories, areas, featured, latest, rentals, vehicles, sold, stats, testimonials, faqs] = await Promise.all([
    getTranslations("home"),
    getTranslations("hero"),
    getSiteSettings(),
    getCategories(),
    getAreas(),
    getFeaturedListings(8),
    getLatestListings(8),
    getListingsByCategorySlugs(["house-rent"], 6, "RENT"),
    getListingsByCategorySlugs(["vehicles", "motorbikes-bajaj"], 6),
    getRecentlySold(6),
    getStats(),
    getTestimonials(),
    getFaqs(4),
  ]);
  const topCats = categories.filter((c) => !c.parentId);
  const heroTitle = localized(settings, "heroTitle", locale);
  const heroSubtitle = localized(settings, "heroSubtitle", locale) || th("subtitle");

  const buyerSteps = [Search, PhoneCall, Eye, Handshake];
  const sellerSteps = [Send, BadgeCheck, Megaphone, Wallet];

  return (
    <>
      {/* 1. Hero */}
      <section className="relative isolate overflow-hidden bg-bg text-fg">
        <div aria-hidden className="absolute inset-0 -z-10 bg-pattern" />
        <div aria-hidden className="absolute -top-40 -right-40 -z-10 size-[520px] rounded-full bg-red-500/10 blur-3xl" />
        <div aria-hidden className="absolute -bottom-48 -left-32 -z-10 size-[460px] rounded-full bg-yellow-500/15 blur-3xl" />
        <Container className="flex flex-col items-start gap-6 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <span className="inline-flex items-center gap-2 rounded-pill bg-brand-gradient px-3 py-1.5 font-brand text-[13px] text-navy-900 uppercase">
            {tm("tagline")}
          </span>
          <h1 className="max-w-3xl font-brand text-h1">
            {heroTitle ? (
              heroTitle
            ) : (
              <>
                {th("title")} <span className="text-primary">{th("titleHighlight")}</span>
              </>
            )}
          </h1>
          <p className="max-w-2xl text-lg text-fg-2 sm:text-xl">{heroSubtitle}</p>
          <ScopedIntl namespaces={["hero"]}>
            <HeroSearch
              categories={topCats.map((c) => ({ slug: c.slug, name: localized(c, "name", locale) }))}
              areas={areas.map((a) => ({ slug: a.slug, name: localized(a, "name", locale) }))}
            />
          </ScopedIntl>
          <div className="flex flex-wrap gap-2">
            {topCats.slice(0, 5).map((c) => (
              <Link
                prefetch={false}
                key={c.id}
                href={`/c/${c.slug}`}
                className="inline-flex min-h-9 items-center rounded-pill border-[1.5px] border-line-strong bg-bg px-4 text-sm font-semibold text-fg hover:border-yellow-500 hover:bg-yellow-500 hover:text-navy-900"
              >
                {localized(c, "name", locale)}
              </Link>
            ))}
          </div>
        </Container>
        <div aria-hidden className="h-2 bg-brand-gradient" />
      </section>

      {/* 2. Categories */}
      <Container className="py-14 sm:py-20">
        <SectionHeading title={t("categoriesTitle")} subtitle={t("categoriesSubtitle")} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {topCats.map((c) => (
            <li key={c.id}>
              <Link
                prefetch={false}
                href={`/c/${c.slug}`}
                className="group flex h-full flex-col items-center gap-3 rounded-card bg-surface p-5 text-center shadow-card transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-pop"
              >
                <span className="grid size-16 place-items-center rounded-[18px] bg-yellow-100 transition-colors group-hover:bg-yellow-500 dark:bg-navy-700">
                  <CategoryIcon icon={c.icon} className="size-10" />
                </span>
                <span className="font-bold text-fg">{localized(c, "name", locale)}</span>
                <span className="text-xs font-medium text-muted">{t("listingsCount", { count: c.count })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      <div className="cv-auto">
        {/* 3. Featured */}
        {featured.length > 0 && (
          <section className="bg-bg-2 py-14 sm:py-20">
            <Container>
              <SectionHeading
                title={
                  <span className="inline-flex items-center gap-2">
                    <Star className="size-7 fill-yellow-500 text-yellow-500" /> {t("featuredTitle")}
                  </span>
                }
                subtitle={t("featuredSubtitle")}
              />
              <Carousel label={t("featuredTitle")}>
                {featured.map((l) => (
                  <ListingCard key={l.id} listing={l} className="w-full" />
                ))}
              </Carousel>
            </Container>
          </section>
        )}

        {/* 4. Latest */}
        <Container className="py-14 sm:py-20">
          <SectionHeading title={t("latestTitle")} subtitle={t("latestSubtitle")} action={<ViewAll href="/listings?sort=newest" />} />
          <ListingGrid listings={latest} />
        </Container>

        {/* 5. Rentals */}
        {rentals.length > 0 && (
          <Container className="pb-14 sm:pb-20">
            <SectionHeading title={t("rentalsTitle")} subtitle={t("rentalsSubtitle")} action={<ViewAll href="/c/house-rent" />} />
            <Carousel label={t("rentalsTitle")}>
              {rentals.map((l) => (
                <ListingCard key={l.id} listing={l} className="w-full" />
              ))}
            </Carousel>
          </Container>
        )}

        {/* 6. Vehicles */}
        {vehicles.length > 0 && (
          <Container className="pb-14 sm:pb-20">
            <SectionHeading title={t("vehiclesTitle")} subtitle={t("vehiclesSubtitle")} action={<ViewAll href="/c/vehicles" />} />
            <Carousel label={t("vehiclesTitle")}>
              {vehicles.map((l) => (
                <ListingCard key={l.id} listing={l} className="w-full" />
              ))}
            </Carousel>
          </Container>
        )}

        {/* 7. How it works */}
        <section className="bg-bg-2 py-14 sm:py-20">
          <Container>
            <SectionHeading title={t("howTitle")} subtitle={t("howSubtitle")} />
            <div className="grid gap-6 lg:grid-cols-2">
              {(
                [
                  ["forBuyers", "buyerSteps", buyerSteps, "bg-red-500 text-white"],
                  ["forSellers", "sellerSteps", sellerSteps, "bg-yellow-500 text-navy-900"],
                ] as const
              ).map(([label, key, icons, chip]) => (
                <div key={key} className="rounded-card bg-surface p-6 shadow-card sm:p-8">
                  <h3 className="mb-6 font-brand text-h3 text-fg">{t(label)}</h3>
                  <ol className="grid gap-5 sm:grid-cols-2">
                    {icons.map((Icon, i) => (
                      <li key={i} className="flex gap-4">
                        <span className={`grid size-12 shrink-0 place-items-center rounded-btn ${chip}`}>
                          <Icon className="size-6" />
                        </span>
                        <div>
                          <p className="font-bold text-fg">
                            <span className="mr-1 font-brand text-primary">{i + 1}.</span>
                            {t(`${key}.${i + 1}.title` as "buyerSteps.1.title")}
                          </p>
                          <p className="mt-0.5 text-sm text-muted">{t(`${key}.${i + 1}.body` as "buyerSteps.1.body")}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* 8. Stats band */}
        <section className="relative overflow-hidden border-y border-line bg-bg py-14 text-fg">
          <div aria-hidden className="absolute inset-0 bg-pattern" />
          <Container className="relative">
            <h2 className="sr-only">{t("statsTitle")}</h2>
            <dl className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
              {(
                [
                  ["listings", stats.listings, ""],
                  ["deals", stats.deals, "+"],
                  ["clients", stats.clients, "+"],
                  ["years", stats.years, ""],
                ] as const
              ).map(([k, v, suffix]) => (
                <div key={k}>
                  <dd className="font-brand text-[44px] leading-none text-primary sm:text-[56px]">
                    <Counter value={v} suffix={suffix} />
                  </dd>
                  <dt className="mt-2 text-sm font-semibold text-fg-2">{t(`stats.${k}`)}</dt>
                </div>
              ))}
            </dl>
          </Container>
        </section>

        {/* 9. Recently sold */}
        {sold.length > 0 && (
          <Container className="py-14 sm:py-20">
            <SectionHeading title={t("soldTitle")} subtitle={t("soldSubtitle")} />
            <Carousel label={t("soldTitle")}>
              {sold.map((l) => (
                <ListingCard key={l.id} listing={l} className="w-full" />
              ))}
            </Carousel>
          </Container>
        )}

        {/* 10. Testimonials */}
        {testimonials.length > 0 && (
          <section className="bg-bg-2 py-14 sm:py-20">
            <Container>
              <SectionHeading title={t("testimonialsTitle")} />
              <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {testimonials.slice(0, 4).map((tm) => (
                  <li key={tm.id} className="flex flex-col rounded-card bg-surface p-6 shadow-card">
                    <Quote className="size-8 text-yellow-500" aria-hidden />
                    <blockquote className="mt-3 flex-1 leading-relaxed text-fg-2">{localized(tm, "quote", locale)}</blockquote>
                    <div className="mt-5 flex items-center gap-1" role="img" aria-label={`${tm.rating}/5`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`size-4 ${i < tm.rating ? "fill-yellow-500 text-yellow-500" : "text-line-strong"}`} aria-hidden />
                      ))}
                    </div>
                    <p className="mt-2 font-bold text-fg">{tm.name}</p>
                    {tm.role && <p className="text-sm text-muted">{tm.role}</p>}
                  </li>
                ))}
              </ul>
            </Container>
          </section>
        )}

        {/* 11. CTA banners */}
        <Container className="grid gap-5 py-14 sm:py-20 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-card bg-red-500 p-8 text-white shadow-pop sm:p-10">
            <div aria-hidden className="absolute inset-0 bg-pattern-dark opacity-40" />
            <div className="relative">
              <h2 className="font-brand text-h3">{t("ctaSellTitle")}</h2>
              <p className="mt-3 max-w-md text-red-50">{t("ctaSellBody")}</p>
              <Button asChild variant="highlight" className="mt-6">
                <Link prefetch={false} href="/sell">
                  {t("ctaSellButton")} <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-card bg-yellow-100 p-8 text-navy-900 shadow-card sm:p-10">
            <div aria-hidden className="absolute inset-0 bg-[url(/brand/patterns/pattern-light.svg)] bg-[length:140px]" />
            <div className="relative">
              <h2 className="font-brand text-h3">{t("ctaWantedTitle")}</h2>
              <p className="mt-3 max-w-md text-navy-700">{t("ctaWantedBody")}</p>
              <Button asChild className="mt-6 bg-red-500 text-white hover:bg-red-600">
                <Link prefetch={false} href="/wanted">
                  <CalendarCheck /> {t("ctaWantedButton")}
                </Link>
              </Button>
            </div>
          </div>
        </Container>

        {/* 12. FAQ preview */}
        {faqs.length > 0 && (
          <Container className="pb-6">
            <SectionHeading title={t("faqTitle")} action={<ViewAll href="/faq" label={t("faqMore")} />} />
            <FaqList items={faqs.map((f) => ({ id: f.id, q: localized(f, "question", locale), a: localized(f, "answer", locale) }))} />
          </Container>
        )}
      </div>
    </>
  );
}

async function ViewAll({ href, label }: { href: string; label?: string }) {
  const t = await getTranslations("nav");
  return (
    <Link prefetch={false} href={href} className="inline-flex items-center gap-1 font-bold whitespace-nowrap text-primary hover:underline">
      {label ?? t("viewAll")} <ArrowRight className="size-4" />
    </Link>
  );
}
