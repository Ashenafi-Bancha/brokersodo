import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, Eye, MapPin, Phone, ShieldAlert, ShieldCheck, Star, Search as SearchIcon, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { TelegramIcon, WhatsAppIcon } from "@/components/layout/icons";
import { Gallery } from "@/components/listings/gallery";
import { Price } from "@/components/listings/price";
import { FavoriteButton } from "@/components/listings/favorite-button";
import { LazyInquiryForm } from "@/components/listings/lazy-inquiry-form";
import { MobileContactBar, RefCode, ShareButtons, ViewTracker } from "@/components/listings/detail-client";
import { ListingGrid } from "@/components/listings/listing-card";
import { StaticMap } from "@/components/listings/map-lazy";
import { getListingBySlug, getSimilarListings, getSiteSettings } from "@/server/queries/public";
import { telLink, telegramLink, whatsappLink } from "@/lib/contact";
import { formatDate } from "@/lib/format";
import { isStoredVariant } from "@/lib/image";
import { alternates, jsonLdScript, localePath } from "@/lib/seo";
import { sanitizeRichText, stripHtml } from "@/lib/sanitize";
import { localized, siteUrl } from "@/lib/utils";
import { fieldLabel, formatAttributeValue, parseAttributeSchema } from "@/lib/validators/attribute-schema";
import { ScopedIntl } from "@/components/scoped-intl";

export const revalidate = 600;
export const dynamicParams = true;
export function generateStaticParams() {
  return []; // rendered on first request, then cached (ISR); revalidated on admin edits
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const l = await getListingBySlug(slug);
  if (!l) return {};
  const title = `${localized(l, "title", locale)} · ${l.refCode}`;
  const description = stripHtml(localized(l, "description", locale), 160) || title;
  return {
    title,
    description,
    alternates: alternates(locale, `/listings/${l.slug}`),
    openGraph: { type: "website", title, description, url: siteUrl(localePath(locale, `/listings/${l.slug}`)) },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const [t, tn, settings, similar] = await Promise.all([
    getTranslations("listing"),
    getTranslations("nav"),
    getSiteSettings(),
    getSimilarListings({ id: listing.id, categoryId: listing.categoryId, price: listing.price, dealType: listing.dealType }),
  ]);

  const title = localized(listing, "title", locale);
  const url = siteUrl(localePath(locale, `/listings/${listing.slug}`));
  const closed = listing.status === "SOLD" || listing.status === "RENTED";
  const reserved = listing.status === "RESERVED";
  const fields = parseAttributeSchema(listing.category.attributeSchema);
  const attrs = (listing.attributes ?? {}) as Record<string, unknown>;
  const specs = fields
    .map((f) => ({ label: fieldLabel(f, locale), value: formatAttributeValue(f, attrs[f.key], locale) }))
    .filter((s) => s.value);
  if (listing.condition) specs.unshift({ label: t("condition.label"), value: t(`condition.${listing.condition}`) });
  const categoryName = localized(listing.category, "name", locale);
  const areaName = listing.area ? localized(listing.area, "name", locale) : null;
  const description = sanitizeRichText(localized(listing, "description", locale));
  const waText = t("whatsappMessage", { title, ref: listing.refCode, url });
  const tel = telLink(settings.phonePrimary);
  const tg = telegramLink(settings.telegramUsername, waText);
  const wa = whatsappLink(settings.whatsappNumber, waText);
  const featuredActive = listing.featured && (!listing.featuredUntil || new Date(listing.featuredUntil) > new Date());

  const images = listing.images.map((i) => {
    const src = i.url;
    return { id: i.id, url: src, width: i.width, height: i.height, alt: i.alt, blurData: i.blurData, watermark: !isStoredVariant(src) };
  });

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    sku: listing.refCode,
    description: stripHtml(listing.descriptionEn, 500),
    image: images.slice(0, 5).map((i) => (i.url.startsWith("http") ? i.url : siteUrl(i.url))),
    category: listing.category.nameEn,
    ...(listing.price && !listing.priceOnRequest
      ? {
          offers: {
            "@type": "Offer",
            price: listing.price,
            priceCurrency: "ETB",
            url,
            availability: closed ? "https://schema.org/SoldOut" : reserved ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
            itemCondition: listing.condition === "NEW" ? "https://schema.org/NewCondition" : listing.condition === "REFURBISHED" ? "https://schema.org/RefurbishedCondition" : listing.condition === "USED" ? "https://schema.org/UsedCondition" : undefined,
            seller: { "@id": `${siteUrl()}/#org` },
          },
        }
      : {}),
  };
  const crumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "BrokerSodo", item: siteUrl(localePath(locale, "/")) },
      { "@type": "ListItem", position: 2, name: categoryName, item: siteUrl(localePath(locale, `/c/${listing.category.slug}`)) },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };

  return (
    <>
      <ViewTracker id={listing.id} />
      <Container className="pt-5 pb-32 lg:pb-12">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
            <li>
              <Link href="/" className="hover:text-fg">
                {tn("home")}
              </Link>
            </li>
            <ChevronRight className="size-3.5" aria-hidden />
            <li>
              <Link href={`/c/${listing.category.slug}`} className="hover:text-fg">
                {categoryName}
              </Link>
            </li>
            <ChevronRight className="size-3.5" aria-hidden />
            <li aria-current="page" className="max-w-[50vw] truncate font-medium text-fg">
              {title}
            </li>
          </ol>
        </nav>

        {(closed || reserved) && (
          <div role="status" className={`mb-5 flex items-start gap-3 rounded-card p-4 ${closed ? "bg-[#DCFCE7] text-sold dark:bg-sold/20 dark:text-[#86efac]" : "border-2 border-amber-500 bg-reserved-bg text-reserved dark:bg-amber-900/40 dark:text-amber-200"}`}>
            <span className="font-brand text-lg">{closed ? (listing.status === "RENTED" ? t("rented") : t("sold")) : t("reserved")}</span>
            <p className="text-sm font-medium">{closed ? t("mutedNotice") : t("reservedNotice")}</p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-8">
            <Gallery images={images} title={title} muted={closed} />

            <header className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={listing.dealType === "RENT" ? "rent" : "sale"}>{listing.dealType === "RENT" ? t("rent") : t("sale")}</Badge>
                {featuredActive && (
                  <Badge variant="featured">
                    <Star className="size-3 fill-current" /> {t("featured")}
                  </Badge>
                )}
                {listing.isVerified && (
                  <Badge variant="verified">
                    <ShieldCheck className="size-3" /> {t("verifiedLong")}
                  </Badge>
                )}
                {listing.isInspected && (
                  <Badge variant="inspected">
                    <SearchIcon className="size-3" /> {t("inspected")}
                  </Badge>
                )}
                {listing.isNegotiable && !closed && <Badge variant="negotiable">{t("negotiable")}</Badge>}
              </div>
              <h1 className="text-2xl font-extrabold text-fg sm:text-3xl">{title}</h1>
              <Price listing={listing} size="lg" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                <RefCode code={listing.refCode} />
                {areaName && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4" /> {areaName}
                  </span>
                )}
                {listing.publishedAt && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-4" /> {formatDate(listing.publishedAt, locale)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-4" /> {t("views", { count: listing.viewCount })}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {!closed && <FavoriteButton id={listing.id} withLabel />}
                <ShareButtons url={url} title={title} />
              </div>
            </header>

            {specs.length > 0 && (
              <section aria-labelledby="specs">
                <h2 id="specs" className="mb-3 text-xl font-bold text-fg">
                  {t("specs")}
                </h2>
                <dl className="grid overflow-hidden rounded-card bg-surface shadow-card sm:grid-cols-2">
                  {specs.map((s, i) => (
                    <div key={i} className="flex justify-between gap-4 border-b border-line px-5 py-3.5 text-sm sm:odd:border-r">
                      <dt className="text-muted">{s.label}</dt>
                      <dd className="text-right font-semibold text-fg">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {description && (
              <section aria-labelledby="desc">
                <h2 id="desc" className="mb-3 text-xl font-bold text-fg">
                  {t("description")}
                </h2>
                <div className="prose-bs rounded-card bg-surface p-5 shadow-card sm:p-6" dangerouslySetInnerHTML={{ __html: description }} />
              </section>
            )}

            {listing.videoUrl && <YouTube url={listing.videoUrl} title={`${t("video")} — ${title}`} />}

            {listing.lat != null && listing.lng != null && (
              <section aria-labelledby="loc">
                <h2 id="loc" className="mb-3 text-xl font-bold text-fg">
                  {t("location")}
                </h2>
                <div className="h-72 overflow-hidden rounded-card shadow-card">
                  <StaticMap lat={listing.lat} lng={listing.lng} radius={600} zoom={14} />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {listing.addressHint ? `${listing.addressHint}. ` : ""}
                  {t("locationNote")}
                </p>
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <div className="space-y-5 lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-card bg-surface shadow-card">
                <div aria-hidden className="h-2 bg-brand-gradient" />
                <div className="space-y-4 p-5">
                  <div>
                    <h2 className="text-lg font-bold text-fg">{t("contactTitle")}</h2>
                    <p className="text-sm text-muted">{t("contactSubtitle", { ref: listing.refCode })}</p>
                  </div>
                  <div className="grid gap-2">
                    <Button asChild variant="call" block>
                      <a href={tel}>
                        <Phone /> {t("callBrokerSodo")}
                      </a>
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button asChild variant="telegram">
                        <a href={tg} target="_blank" rel="noopener noreferrer">
                          <TelegramIcon /> {t("telegram")}
                        </a>
                      </Button>
                      <Button asChild variant="whatsapp">
                        <a href={wa} target="_blank" rel="noopener noreferrer">
                          <WhatsAppIcon /> {t("whatsapp")}
                        </a>
                      </Button>
                    </div>
                  </div>
                  {listing.assignedBroker?.name && (
                    <p className="text-xs text-muted">
                      {t("handledBy")}: <span className="font-semibold text-fg-2">{listing.assignedBroker.name}</span> · BrokerSodo
                    </p>
                  )}
                </div>
              </div>

              <div id="inquiry" className="rounded-card bg-surface p-5 shadow-card">
                <h2 className="mb-4 text-lg font-bold text-fg">{t("sendInquiry")}</h2>
                <ScopedIntl namespaces={["form", "inquiry"]}>
                  <LazyInquiryForm listingId={listing.id} refCode={listing.refCode} />
                </ScopedIntl>
              </div>

              <div className="rounded-card border-2 border-yellow-500 bg-yellow-50 p-5 dark:bg-navy-800">
                <h2 className="flex items-center gap-2 font-bold text-fg">
                  <ShieldAlert className="size-5 text-amber-600" /> {t("safetyTitle")}
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-fg-2">
                  {(["1", "2", "3", "4"] as const).map((k) => (
                    <li key={k} className="flex gap-2">
                      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-500" />
                      {t(`safety.${k}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-14" aria-labelledby="similar">
            <h2 id="similar" className="mb-6 font-brand text-h3 text-fg">
              {t("similar")}
            </h2>
            <ListingGrid listings={similar} />
          </section>
        )}
      </Container>

      {!closed && <MobileContactBar tel={tel} telegram={tg} whatsapp={wa} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(productLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(crumbsLd)} />
    </>
  );
}

function YouTube({ url, title }: { url: string; title: string }) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  if (!m) return null;
  return (
    <section>
      <div className="aspect-video overflow-hidden rounded-card bg-navy-900 shadow-card">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${m[1]}`}
          title={title}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="size-full"
        />
      </div>
    </section>
  );
}
