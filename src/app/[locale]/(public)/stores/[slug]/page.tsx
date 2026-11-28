import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Clock, MapPin, Phone, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { TelegramIcon, WhatsAppIcon } from "@/components/layout/icons";
import { StoreLogo } from "@/components/stores/store-card";
import { telLink, telegramLink, whatsappLink } from "@/lib/contact";
import { formatETB, formatPhoneDisplay } from "@/lib/format";
import { alternates, jsonLdScript } from "@/lib/seo";
import { MENU_TYPES, storeImage } from "@/lib/stores";
import { cn, localized, siteUrl } from "@/lib/utils";
import { getStoreBySlug } from "@/server/queries/stores";

export const revalidate = 300;

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const s = await getStoreBySlug(slug);
  if (!s) return {};
  const t = await getTranslations({ locale, namespace: "stores" });
  const type = t(`type.${s.type}` as "type.SHOP");
  const cover = storeImage(s.cover);
  return {
    title: `${s.name} · ${type}`,
    description: (s.tagline || s.description || `${s.name} — ${type}, Wolaita Sodo`).slice(0, 160),
    alternates: alternates(locale, `/stores/${s.slug}`),
    openGraph: cover ? { images: [{ url: cover.url, width: cover.width, height: cover.height }] } : undefined,
  };
}

const SCHEMA_TYPE: Record<string, string> = {
  RESTAURANT: "Restaurant",
  CAFE: "CafeOrCoffeeShop",
  LOUNGE: "BarOrPub",
  HOTEL: "Hotel",
  SALON_WOMEN: "BeautySalon",
  SALON_MEN: "HairSalon",
  SALON_UNISEX: "HairSalon",
  SPA: "DaySpa",
  PHARMACY: "Pharmacy",
  SUPERMARKET: "GroceryStore",
  ELECTRONICS: "ElectronicsStore",
  FASHION: "ClothingStore",
};

export default async function StorePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const s = await getStoreBySlug(slug);
  if (!s) notFound();
  const t = await getTranslations("stores");
  const cover = storeImage(s.cover);
  const area = s.area ? localized(s.area, "name", locale) : null;
  const items = s.items.filter((i) => i.isAvailable);
  const specials = items.filter((i) => i.isSpecial);
  const sections = new Map<string, typeof items>();
  for (const i of items) {
    const key = i.section.trim() || t("otherSection");
    sections.set(key, [...(sections.get(key) ?? []), i]);
  }
  const isMenu = MENU_TYPES.includes(s.type);
  const ld = {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE[s.type] ?? "LocalBusiness",
    name: s.name,
    description: s.tagline || s.description || undefined,
    telephone: s.phone,
    url: siteUrl(`${locale === "am" ? "/am" : ""}/stores/${s.slug}`),
    address: { "@type": "PostalAddress", streetAddress: s.address || undefined, addressLocality: s.area?.nameEn ?? "Wolaita Sodo", addressCountry: "ET" },
    ...(cover ? { image: cover.url } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(ld)} />
      <div className="relative aspect-[16/6] max-h-80 w-full bg-brand-gradient sm:aspect-[16/5]">
        {cover && <Image src={cover.url} alt="" fill priority sizes="100vw" placeholder={cover.blurData ? "blur" : "empty"} blurDataURL={cover.blurData ?? undefined} className="object-cover" />}
      </div>
      <Container className="pb-12">
        <div className="-mt-12 flex flex-wrap items-end gap-4">
          <StoreLogo logo={s.logo} name={s.name} className="size-24 border-4 border-bg text-4xl shadow-pop" />
          <div className="min-w-0 pb-1">
            <p className="text-sm font-bold text-primary">{t(`type.${s.type}` as "type.SHOP")}</p>
            <h1 className="font-brand text-h2 text-fg">{s.name}</h1>
          </div>
        </div>
        <Link prefetch={false} href="/stores" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          <ArrowLeft className="size-4" /> {t("back")}
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {s.tagline && <p className="text-lg font-semibold text-fg">{s.tagline}</p>}
            {s.description && <p className="mt-2 leading-relaxed whitespace-pre-line text-fg-2">{s.description}</p>}

            {specials.length > 0 && (
              <section className="mt-8" aria-labelledby="specials">
                <h2 id="specials" className="flex items-center gap-2 font-brand text-h3 text-fg">
                  <Sparkles className="size-6 text-primary" aria-hidden /> {t("specials")}
                </h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {specials.map((i) => (
                    <ItemCard key={i.id} item={i} highlight onRequest={t("priceOnRequest")} />
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-8" aria-labelledby="items">
              <h2 id="items" className="font-brand text-h3 text-fg">
                {isMenu ? t("menu") : t("itemsTitle")}
              </h2>
              {items.length === 0 ? (
                <p className="mt-3 text-fg-2">{t("noItems")}</p>
              ) : (
                [...sections.entries()].map(([name, list]) => (
                  <div key={name} className="mt-5">
                    <h3 className="mb-2 border-b border-line pb-1 text-sm font-bold tracking-wide text-muted uppercase">{name}</h3>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {list.map((i) => (
                        <ItemCard key={i.id} item={i} onRequest={t("priceOnRequest")} />
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-card bg-surface p-5 shadow-card">
              <h2 className="mb-3 font-bold text-fg">{t("contact")}</h2>
              <div className="grid gap-2">
                <Button asChild variant="call" block>
                  <a href={telLink(s.phone)}>
                    <Phone /> {formatPhoneDisplay(s.phone)}
                  </a>
                </Button>
                {s.whatsapp && (
                  <Button asChild variant="whatsapp" block>
                    <a href={whatsappLink(s.whatsapp, t("hello", { name: s.name }))} target="_blank" rel="noopener noreferrer">
                      <WhatsAppIcon /> WhatsApp
                    </a>
                  </Button>
                )}
                {s.telegram && (
                  <Button asChild variant="telegram" block>
                    <a href={telegramLink(s.telegram)} target="_blank" rel="noopener noreferrer">
                      <TelegramIcon /> Telegram
                    </a>
                  </Button>
                )}
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                {s.openingHours && (
                  <div className="flex gap-2">
                    <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <div>
                      <dt className="sr-only">{t("hours")}</dt>
                      <dd className="text-fg">{s.openingHours}</dd>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dt className="sr-only">{t("address")}</dt>
                    <dd className="text-fg">{[s.address, area ?? "Wolaita Sodo"].filter(Boolean).join(", ")}</dd>
                  </div>
                </div>
              </dl>
            </section>
            <p className="text-xs text-muted">{t("disclaimer")}</p>
          </aside>
        </div>
      </Container>
    </>
  );
}

function ItemCard({
  item,
  highlight,
  onRequest,
}: {
  item: { id: string; name: string; description: string | null; price: number | null; priceNote: string | null; image: unknown };
  highlight?: boolean;
  onRequest: string;
}) {
  const img = storeImage(item.image);
  return (
    <li className={cn("flex gap-3 rounded-card bg-surface p-3 shadow-card", highlight && "border-2 border-yellow-500")}>
      {img && (
        <span className="relative size-20 shrink-0 overflow-hidden rounded-btn bg-line">
          <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-fg">{item.name}</p>
          <p className="shrink-0 text-right font-bold whitespace-nowrap text-primary">
            {item.price != null ? formatETB(item.price) : onRequest}
            {item.priceNote && <span className="block text-xs font-medium text-muted">{item.priceNote}</span>}
          </p>
        </div>
        {item.description && <p className="mt-1 line-clamp-3 text-sm text-fg-2">{item.description}</p>}
      </div>
    </li>
  );
}
