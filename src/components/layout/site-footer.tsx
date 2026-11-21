import { getLocale, getTranslations } from "next-intl/server";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCategories, getSiteSettings } from "@/server/queries/public";
import { telLink, telegramLink, whatsappLink } from "@/lib/contact";
import { formatPhoneDisplay } from "@/lib/format";
import { localized } from "@/lib/utils";
import { LogoWhite } from "./brand";
import { FacebookIcon, InstagramIcon, TelegramIcon, TikTokIcon, WhatsAppIcon, YouTubeIcon } from "./icons";
import { StaticMap } from "@/components/listings/map-lazy";

export async function SiteFooter() {
  const [t, tn, locale, settings, categories] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
    getLocale(),
    getSiteSettings(),
    getCategories(),
  ]);
  const socials = [
    { href: settings.facebookUrl, label: "Facebook", Icon: FacebookIcon },
    { href: settings.tiktokUrl, label: "TikTok", Icon: TikTokIcon },
    { href: settings.instagramUrl, label: "Instagram", Icon: InstagramIcon },
    { href: settings.youtubeUrl, label: "YouTube", Icon: YouTubeIcon },
    { href: settings.telegramChannel ? telegramLink(settings.telegramChannel) : null, label: "Telegram", Icon: TelegramIcon },
  ].filter((s): s is { href: string; label: string; Icon: typeof FacebookIcon } => Boolean(s.href));
  const address = localized(settings, "address", locale);
  const hours = localized(settings, "hours", locale);

  return (
    <footer className="cv-auto relative mt-20 bg-navy-900 text-navy-100">
      <div aria-hidden className="h-2 bg-brand-gradient" />
      <div aria-hidden className="pointer-events-none absolute inset-0 top-2 bg-pattern-dark opacity-60" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <LogoWhite className="h-10" />
          <p className="text-sm leading-relaxed text-navy-200">{t("aboutText")}</p>
          {socials.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold tracking-wider text-yellow-500 uppercase">{t("follow")}</p>
              <div className="flex gap-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid size-10 place-items-center rounded-full bg-navy-800 text-white transition-colors hover:bg-red-500"
                  >
                    <s.Icon className="size-5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <nav aria-label={tn("categories")}>
          <h2 className="mb-4 font-bold text-white">{tn("categories")}</h2>
          <ul className="space-y-2 text-sm">
            {categories
              .filter((c) => !c.parentId)
              .map((c) => (
                <li key={c.id}>
                  <Link prefetch={false} href={`/c/${c.slug}`} className="text-navy-200 hover:text-yellow-500">
                    {localized(c, "name", locale)}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>

        <nav aria-label={t("quickLinks")}>
          <h2 className="mb-4 font-bold text-white">{t("quickLinks")}</h2>
          <ul className="space-y-2 text-sm">
            {[
              ["/listings", tn("allListings")],
              ["/sell", tn("sellWithUs")],
              ["/wanted", tn("wanted")],
              ["/saved", tn("saved")],
              ["/how-it-works", tn("howItWorks")],
              ["/about", tn("about")],
              ["/faq", tn("faq")],
              ["/contact", tn("contact")],
              ["/terms", tn("terms")],
              ["/privacy", tn("privacy")],
            ].map(([href, label]) => (
              <li key={href}>
                <Link prefetch={false} href={href} className="text-navy-200 hover:text-yellow-500">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-4">
          <h2 className="font-bold text-white">{t("contactUs")}</h2>
          <ul className="space-y-3 text-sm">
            <li>
              <a href={telLink(settings.phonePrimary)} className="flex items-center gap-2 hover:text-yellow-500">
                <Phone className="size-4 text-yellow-500" /> {formatPhoneDisplay(settings.phonePrimary)}
              </a>
            </li>
            <li>
              <a href={telegramLink(settings.telegramUsername)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-yellow-500">
                <TelegramIcon className="size-4 text-yellow-500" /> @{settings.telegramUsername}
              </a>
            </li>
            <li>
              <a href={whatsappLink(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-yellow-500">
                <WhatsAppIcon className="size-4 text-yellow-500" /> WhatsApp
              </a>
            </li>
            {settings.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="flex items-center gap-2 hover:text-yellow-500">
                  <Mail className="size-4 text-yellow-500" /> {settings.email}
                </a>
              </li>
            )}
            {address && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-yellow-500" /> {address}
              </li>
            )}
            {hours && (
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-yellow-500" />
                <span className="whitespace-pre-line">{hours}</span>
              </li>
            )}
          </ul>
          <div className="h-36 overflow-hidden rounded-card">
            <StaticMap lat={settings.mapLat} lng={settings.mapLng} zoom={14} marker label={settings.businessName} />
          </div>
        </div>
      </div>
      <div className="relative border-t border-navy-700">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 pb-28 text-xs text-navy-300 sm:flex-row sm:px-6 md:pb-6 lg:px-8">
          <p>{t("rights", { year: new Date().getFullYear() })}</p>
          <p className="font-brand text-yellow-500">BUY. SELL. RENT. — SODO DEALS</p>
        </div>
      </div>
    </footer>
  );
}
