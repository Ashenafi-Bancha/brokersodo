import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FaqManager, PageEditor, TestimonialsManager } from "@/components/admin/content-ui";
import { SettingsForm } from "@/components/admin/settings-ui";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettingsInput } from "@/server/queries/settings-input";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Content" };

const TABS = [
  ["homepage", "Homepage"],
  ["testimonials", "Testimonials"],
  ["faq", "FAQs"],
  ["pages", "Pages"],
] as const;
type Tab = (typeof TABS)[number][0];

const DEFAULT_PAGES = [
  { slug: "about", titleEn: "About BrokerSodo" },
  { slug: "terms", titleEn: "Terms of use" },
  { slug: "privacy", titleEn: "Privacy policy" },
];

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaffPage(["ADMIN"]);
  const { tab: raw } = await searchParams;
  const tab: Tab = (TABS.map((t) => t[0]) as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "homepage";

  let body: React.ReactNode;
  if (tab === "testimonials") {
    const rows = await db.testimonial.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
    body = <TestimonialsManager rows={rows.map((t) => ({ id: t.id, name: t.name, role: t.role ?? "", quoteEn: t.quoteEn, quoteAm: t.quoteAm ?? "", rating: t.rating, avatar: t.avatar ?? "", isActive: t.isActive }))} />;
  } else if (tab === "faq") {
    const rows = await db.faq.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    body = <FaqManager rows={rows.map((f) => ({ id: f.id, questionEn: f.questionEn, questionAm: f.questionAm ?? "", answerEn: f.answerEn, answerAm: f.answerAm ?? "", isActive: f.isActive }))} />;
  } else if (tab === "pages") {
    const pages = await db.page.findMany({ orderBy: { slug: "asc" } });
    const all = DEFAULT_PAGES.map((d) => {
      const p = pages.find((x) => x.slug === d.slug);
      return p ? { id: p.id, slug: p.slug, titleEn: p.titleEn, titleAm: p.titleAm ?? "", bodyEn: p.bodyEn, bodyAm: p.bodyAm ?? "", isActive: p.isActive } : { id: d.slug, slug: d.slug, titleEn: d.titleEn, titleAm: "", bodyEn: "", bodyAm: "", isActive: true };
    });
    body = <PageEditor pages={all} />;
  } else {
    body = <SettingsForm initial={await getSettingsInput()} sections={["homepage"]} />;
  }

  return (
    <>
      <AdminPageHeader title="Content" description="What visitors read on the public site." crumbs={[{ label: "Content" }]} />
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Content sections">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/content?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={cn("inline-flex min-h-10 items-center rounded-pill px-4 text-sm font-bold", tab === k ? "bg-red-500 text-white" : "bg-surface text-muted shadow-card hover:text-fg")}>
            {label}
          </Link>
        ))}
      </nav>
      {body}
    </>
  );
}
