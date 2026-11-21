import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, Eye, Handshake, Lock, MapPinned, Megaphone, PhoneCall, Search, Send, ShieldCheck, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { PageHero } from "@/components/layout/page-hero";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "how" });
  return { title: t("title"), description: t("subtitle"), alternates: alternates(locale, "/how-it-works") };
}

export default async function HowPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, th, tn] = await Promise.all([getTranslations("how"), getTranslations("home"), getTranslations("nav")]);
  const flows = [
    { key: "buyerSteps", label: th("forBuyers"), icons: [Search, PhoneCall, Eye, Handshake], chip: "bg-red-500 text-white", cta: { href: "/listings", label: tn("allListings") } },
    { key: "sellerSteps", label: th("forSellers"), icons: [Send, BadgeCheck, Megaphone, Wallet], chip: "bg-yellow-500 text-navy-900", cta: { href: "/sell", label: tn("sellWithUs") } },
  ] as const;
  const why = [ShieldCheck, Lock, MapPinned];
  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} />
      <Container className="space-y-14 py-12">
        {flows.map((f) => (
          <section key={f.key} aria-labelledby={f.key}>
            <h2 id={f.key} className="mb-6 font-brand text-h3 text-fg">
              {f.label}
            </h2>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {f.icons.map((Icon, i) => (
                <li key={i} className="relative rounded-card bg-surface p-6 shadow-card">
                  <span className="absolute top-4 right-5 font-brand text-4xl text-line">{i + 1}</span>
                  <span className={`grid size-12 place-items-center rounded-btn ${f.chip}`}>
                    <Icon className="size-6" />
                  </span>
                  <p className="mt-4 font-bold text-fg">{th(`${f.key}.${i + 1}.title` as "buyerSteps.1.title")}</p>
                  <p className="mt-1 text-sm text-muted">{th(`${f.key}.${i + 1}.body` as "buyerSteps.1.body")}</p>
                </li>
              ))}
            </ol>
            <Button asChild className="mt-6">
              <Link href={f.cta.href}>{f.cta.label}</Link>
            </Button>
          </section>
        ))}
        <section aria-labelledby="why" className="rounded-card bg-bg-2 p-8 text-fg sm:p-10">
          <h2 id="why" className="font-brand text-h3">
            {t("whyTitle")}
          </h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-3">
            {why.map((Icon, i) => (
              <li key={i}>
                <Icon className="size-8 text-primary" />
                <p className="mt-3 font-bold">{t(`why.${i + 1}.title` as "why.1.title")}</p>
                <p className="mt-1 text-sm text-fg-2">{t(`why.${i + 1}.body` as "why.1.body")}</p>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  );
}
