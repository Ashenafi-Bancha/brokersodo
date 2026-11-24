"use client";
import { useTranslations } from "next-intl";
import { Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { CategoryIcon, Logo } from "./brand";
import { HeaderSearch, LanguageSwitcher, ThemeToggle, type NavCategory } from "./header-controls";

export function MobileMenuSheet({
  open,
  onOpenChange,
  categories,
  phoneHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: NavCategory[];
  phoneHref: string;
}) {
  const t = useTranslations("nav");
  const links = [
    { href: "/", label: t("home") },
    { href: "/listings", label: t("allListings") },
    { href: "/listings?deal=sale", label: t("buy") },
    { href: "/listings?deal=rent", label: t("rent") },
    { href: "/jobs", label: t("jobs") },
    { href: "/jobs/post", label: t("postJob") },
    { href: "/tutors", label: t("findTutor") },
    { href: "/tutors/join", label: t("becomeTutor") },
    { href: "/wanted", label: t("wanted") },
    { href: "/saved", label: t("saved") },
    { href: "/how-it-works", label: t("howItWorks") },
    { href: "/about", label: t("about") },
    { href: "/faq", label: t("faq") },
    { href: "/contact", label: t("contact") },
  ];
  const close = () => onOpenChange(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" title={<Logo className="h-8" />}>
        <div className="flex flex-col gap-6 p-5">
          <HeaderSearch />
          <div>
            <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">{t("categories")}</p>
            <ul className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/c/${c.slug}`} onClick={close} className="flex min-h-12 items-center gap-2 rounded-btn bg-bg-2 px-3 py-2 text-sm font-semibold text-fg">
                    <CategoryIcon icon={c.icon} className="size-6 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className="flex min-h-12 items-center border-b border-line font-semibold text-fg">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3">
            <LanguageSwitcher compact />
            <ThemeToggle />
          </div>
          <div className="grid gap-2">
            <Button asChild variant="primary" block>
              <Link href="/sell" onClick={close}>
                {t("sellWithUs")}
              </Link>
            </Button>
            <Button asChild variant="secondary" block>
              <a href={phoneHref}>
                <Phone /> {t("call")}
              </a>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Dialog>
  );
}
