import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/misc";
import { PageHero } from "@/components/layout/page-hero";
import { ContactForm } from "@/components/forms/simple-forms";
import { StaticMap } from "@/components/listings/map-lazy";
import { TelegramIcon, WhatsAppIcon } from "@/components/layout/icons";
import { getSiteSettings } from "@/server/queries/public";
import { telLink, telegramLink, whatsappLink } from "@/lib/contact";
import { formatPhoneDisplay } from "@/lib/format";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { ScopedIntl } from "@/components/scoped-intl";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/contact") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, s] = await Promise.all([getTranslations("contact"), getSiteSettings()]);
  const address = localized(s, "address", locale);
  const hours = localized(s, "hours", locale);
  const channels = [
    { href: telLink(s.phonePrimary), label: t("phone"), value: formatPhoneDisplay(s.phonePrimary), Icon: Phone, cls: "bg-red-500" },
    { href: telegramLink(s.telegramUsername), label: t("telegram"), value: `@${s.telegramUsername}`, Icon: TelegramIcon, cls: "bg-telegram" },
    { href: whatsappLink(s.whatsappNumber), label: t("whatsapp"), value: formatPhoneDisplay(s.whatsappNumber), Icon: WhatsAppIcon, cls: "bg-whatsapp" },
    ...(s.email ? [{ href: `mailto:${s.email}`, label: t("email"), value: s.email, Icon: Mail, cls: "bg-navy-900 dark:bg-navy-600" }] : []),
  ];
  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {channels.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-card bg-surface p-4 shadow-card transition-shadow hover:shadow-pop"
                >
                  <span className={`grid size-12 shrink-0 place-items-center rounded-btn text-white ${c.cls}`}>
                    <c.Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-muted">{c.label}</span>
                    <span className="block truncate font-bold text-fg">{c.value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="space-y-3 rounded-card bg-surface p-5 shadow-card">
            {address && (
              <p className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm text-muted">{t("address")}</span>
                  <span className="font-semibold text-fg">{address}</span>
                </span>
              </p>
            )}
            {hours && (
              <p className="flex gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm text-muted">{t("hours")}</span>
                  <span className="font-semibold whitespace-pre-line text-fg">{hours}</span>
                </span>
              </p>
            )}
          </div>
          <section aria-labelledby="map-title">
            <h2 id="map-title" className="mb-3 text-lg font-bold text-fg">
              {t("mapTitle")}
            </h2>
            <div className="h-72 overflow-hidden rounded-card shadow-card">
              <StaticMap lat={s.mapLat} lng={s.mapLng} zoom={15} marker label={s.businessName} />
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${s.mapLat}&mlon=${s.mapLng}#map=16/${s.mapLat}/${s.mapLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-bold text-primary hover:underline"
            >
              {t("openMap")} →
            </a>
          </section>
        </div>
        <div className="h-fit rounded-card bg-surface p-5 shadow-card sm:p-8">
          <h2 className="mb-5 text-xl font-bold text-fg">{t("formTitle")}</h2>
          <ScopedIntl namespaces={["form", "inquiry"]}>
            <ContactForm />
          </ScopedIntl>
        </div>
      </Container>
    </>
  );
}
