import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ContactFab } from "@/components/layout/contact-fab";
import { getSiteSettings } from "@/server/queries/public";
import { telLink, telegramLink, whatsappLink } from "@/lib/contact";
import { alternates, jsonLdScript } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";
import { pickMessages } from "@/components/scoped-intl";

/** Rendered on first request, then cached, so building the app never needs the database. */
export function generateStaticParams() {
  return [];
}

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const [t, settings] = await Promise.all([getTranslations({ locale, namespace: "meta" }), getSiteSettings()]);
  const title = (locale === "en" && settings.seoTitle) || t("siteTitle");
  const description = (locale === "en" && settings.seoDescription) || t("siteDescription");
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s | BrokerSodo` },
    description,
    applicationName: "BrokerSodo",
    alternates: alternates(locale, "/"),
    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "48x48" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
      type: "website",
      siteName: "BrokerSodo",
      title,
      description,
      locale: locale === "am" ? "am_ET" : "en_US",
      images: [{ url: "/og-image-1200x630.png", width: 1200, height: 630, alt: "BrokerSodo — Sodo Deals" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image-1200x630.png"] },
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [settings, t] = await Promise.all([getSiteSettings(), getTranslations({ locale, namespace: "nav" })]);

  const messages = await pickMessages([]);

  const orgLd = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness", "RealEstateAgent"],
    "@id": `${siteUrl()}/#org`,
    name: settings.businessName,
    url: siteUrl(),
    logo: siteUrl("/brand/logo-stacked.png"),
    image: siteUrl("/og-image-1200x630.png"),
    telephone: settings.phonePrimary,
    email: settings.email ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.addressEn ?? undefined,
      addressLocality: "Wolaita Sodo",
      addressCountry: "ET",
    },
    geo: { "@type": "GeoCoordinates", latitude: settings.mapLat, longitude: settings.mapLng },
    areaServed: [
      { "@type": "City", name: "Wolaita Sodo" },
    ],
    sameAs: [settings.facebookUrl, settings.tiktokUrl, settings.instagramUrl, settings.youtubeUrl].filter(Boolean),
  };

  return (
    <html lang={locale} suppressHydrationWarning className={fontVariables}>
      <body className="min-h-dvh">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <a
              href="#main"
              className="sr-only z-[60] rounded-btn bg-yellow-500 px-4 py-2 font-bold text-navy-900 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
              {t("skipToContent")}
            </a>
            <SiteHeader />
            <main id="main" className="min-h-[60vh]">
              {children}
            </main>
            <SiteFooter />
            <BottomNav />
            <ContactFab
              tel={telLink(settings.phonePrimary)}
              telegram={telegramLink(settings.telegramUsername)}
              whatsapp={whatsappLink(settings.whatsappNumber)}
            />
          </Providers>
        </NextIntlClientProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(orgLd)} />
      </body>
    </html>
  );
}
