import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BadgeCheck, Briefcase, CalendarCheck, Eye, GraduationCap, Handshake, Megaphone, PhoneCall, Quote, Search, Send, Star, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/misc";
import { CategoryIcon } from "@/components/layout/brand";
import { HeroSearch } from "@/components/home/hero-search";
import { Carousel } from "@/components/home/carousel";
import { Counter } from "@/components/home/stats-band";
import { FaqList } from "@/components/home/faq-list";
import { ListingCard, ListingGrid } from "@/components/listings/listing-card";
import { JobCard, TutorCard } from "@/components/jobs/cards";
import { getFeaturedTutors, getJobCounts, getLatestJobs, getTutorCount } from "@/server/queries/jobs";
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
  const [t, th, tj, tt, settings, categories, areas, featured, latest, rentals, vehicles, sold, stats, testimonials, faqs, jobs, jobCounts, tutors, tutorCount] = await Promise.all([
    getTranslations("home"),
    getTranslations("hero"),
    getTranslations("jobs"),
    getTranslations("tutors"),
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
    getLatestJobs(4),
    getJobCounts(),
    getFeaturedTutors(4),
    getTutorCount(),
  ]);
  const topCats = categories.filter((c) => !c.parentId);
  const heroTitle = localized(settings, "heroTitle", locale);
  const heroSubtitle = localized(settings, "heroSubtitle", locale) || th("subtitle");

  const buyerSteps = [Search, PhoneCall, Eye, Handshake];
  const sellerSteps = [Send, BadgeCheck, Megaphone, Wallet];

  return (
    <>
      {/* 1. Hero */}
      <section className="border-b border-line bg-bg">
        <Container className="grid items-center gap-10 py-7 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:py-16">
          <div className="min-w-0">
            <h1 className="bs-rise font-brand text-[clamp(2.15rem,4.5vw,3.5rem)] leading-[1.08] text-fg">
              {heroTitle ? (
                heroTitle
              ) : (
                <>
                  {/* Phones: a short two-line headline. Larger screens: the full one. */}
                  <span className="sm:hidden">
                    {th("mobileTitle")} <span className="block text-primary">{th("mobileTitleHighlight")}</span>
                  </span>
                  <span className="hidden sm:inline">
                    {th("title")} <span className="block text-primary">{th("titleHighlight")}</span>
                  </span>
                </>
              )}
            </h1>
            {/* An admin-set subtitle is used everywhere; otherwise phones get the short line. */}
            {localized(settings, "heroSubtitle", locale) ? (
              <p className="mt-3 max-w-xl text-base leading-relaxed text-fg-2 sm:mt-5 sm:text-lg">{heroSubtitle}</p>
            ) : (
              <>
                <p className="bs-rise mt-3 text-base leading-relaxed text-fg-2 [--d:80ms] sm:hidden">{th("mobileSubtitle")}</p>
                <p className="bs-rise mt-5 hidden max-w-xl text-lg leading-relaxed text-fg-2 [--d:80ms] sm:block">{heroSubtitle}</p>
              </>
            )}
            <div className="bs-rise mt-5 [--d:160ms] sm:mt-7">
              <ScopedIntl namespaces={["hero"]}>
                <HeroSearch
                  categories={topCats.map((c) => ({ slug: c.slug, name: localized(c, "name", locale) }))}
                  areas={areas.map((a) => ({ slug: a.slug, name: localized(a, "name", locale) }))}
                />
              </ScopedIntl>
            </div>
            <p className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-fg-2">
              <span>{th("alsoOn")}</span>
              <Link prefetch={false} href="/jobs" className="inline-flex min-h-9 items-center gap-1.5 rounded-pill bg-navy-900 px-3 text-white hover:bg-navy-700 dark:bg-white dark:text-navy-900">
                <Briefcase className="size-4" aria-hidden /> {th("jobsLink")}
              </Link>
              <Link prefetch={false} href="/tutors" className="inline-flex min-h-9 items-center gap-1.5 rounded-pill bg-yellow-500 px-3 text-navy-900 hover:bg-yellow-400">
                <GraduationCap className="size-4" aria-hidden /> {th("tutorsLink")}
              </Link>
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-fg-2">
              {(["trust1", "trust2", "trust3"] as const).map((k) => (
                <li key={k} className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="size-4 text-sold" aria-hidden /> {th(k)}
                </li>
              ))}
            </ul>
          </div>
          <ul className="bs-fade-in hidden grid-cols-2 gap-3 [--d:200ms] lg:grid">
            {(
              [
                ["phone-1.webp", "tileSmall", "/c/electronics", "mt-8"],
                ["bajaj-1.webp", "tileVehicles", "/c/motorbikes-bajaj", ""],
                ["house-1.webp", "tileHomes", "/c/houses", "mt-8"],
                ["land-1.webp", "tileLand", "/c/land", ""],
              ] as const
            ).map(([img, label, href, offset]) => (
              <li key={img} className={offset}>
                <Link prefetch={false} href={href} className="group relative block aspect-[4/3] overflow-hidden rounded-card shadow-card">
                  <Image src={`/placeholders/${img}`} alt="" fill sizes="240px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-900/85 to-transparent px-3 pt-8 pb-2.5 text-sm font-bold text-white">{th(label)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
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
                data-reveal
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

      {/* 2b. Jobs & tutors */}
      <section className="border-y border-line bg-bg-2 py-14 sm:py-20">
        <Container className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="min-w-0">
            <SectionHeading title={tj("homeTitle")} subtitle={tj("homeSubtitle")} action={<ViewAll href="/jobs" label={tj("viewAll")} />} />
            {jobs.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3">
                {jobs.map((j) => (
                  <li key={j.id}>
                    <JobCard job={j} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyBand icon={<Briefcase className="size-7" />} title={tj("emptyTitle")} body={tj("emptyBody")} />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link prefetch={false} href="/jobs/post">
                  {tj("postJob")}
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link prefetch={false} href="/jobs/talent-pool">
                  {tj("joinPool")}
                </Link>
              </Button>
              {jobCounts.graduate > 0 && (
                <Button asChild size="sm" variant="ghost">
                  <Link prefetch={false} href="/jobs?for=GRADUATE">
                    {tj("forGraduates")} ({jobCounts.graduate})
                  </Link>
                </Button>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <SectionHeading title={tt("homeTitle")} subtitle={tt("homeSubtitle")} action={tutorCount > 0 ? <ViewAll href="/tutors" label={tt("viewAll")} /> : undefined} />
            {tutors.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tutors.map((tu) => (
                  <li key={tu.id}>
                    <TutorCard tutor={tu} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyBand icon={<GraduationCap className="size-7" />} title={tt("emptyTitle")} body={tt("emptyBody")} />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link prefetch={false} href="/tutors/request">
                  {tt("requestTutor")}
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link prefetch={false} href="/tutors/join">
                  {tt("becomeTutor")}
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

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
        {latest.length > 0 && (
          <Container className="py-14 sm:py-20">
            <SectionHeading title={t("latestTitle")} subtitle={t("latestSubtitle")} action={<ViewAll href="/listings?sort=newest" />} />
            <ListingGrid listings={latest} />
          </Container>
        )}

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
                <div key={key} data-reveal className="rounded-card bg-surface p-6 shadow-card sm:p-8">
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
        {stats.listings + stats.deals + stats.clients + stats.years > 0 && (
          <section className="relative overflow-hidden border-y border-line bg-bg py-14 text-fg">
            <div aria-hidden className="absolute inset-0 bg-pattern" />
            <Container className="relative">
              <h2 className="sr-only">{t("statsTitle")}</h2>
              <dl className="flex flex-wrap justify-center gap-x-16 gap-y-8 text-center lg:gap-x-24">
                {(
                  [
                    ["listings", stats.listings, ""],
                    ["deals", stats.deals, "+"],
                    ["clients", stats.clients, "+"],
                    ["years", stats.years, ""],
                  ] as const
                )
                  .filter(([, v]) => v > 0)
                  .map(([k, v, suffix]) => (
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
        )}

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
          <div data-reveal className="relative overflow-hidden rounded-card bg-red-500 p-8 text-white shadow-pop sm:p-10">
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
          <div data-reveal className="relative overflow-hidden rounded-card bg-yellow-100 p-8 text-navy-900 shadow-card [--reveal-delay:100ms] sm:p-10">
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

function EmptyBand({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-4 rounded-card bg-surface p-5 shadow-card">
      <span className="grid size-12 shrink-0 place-items-center rounded-btn bg-yellow-100 text-navy-900 dark:bg-navy-700 dark:text-white">{icon}</span>
      <div>
        <p className="font-bold text-fg">{title}</p>
        <p className="mt-1 text-sm text-fg-2">{body}</p>
      </div>
    </div>
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
