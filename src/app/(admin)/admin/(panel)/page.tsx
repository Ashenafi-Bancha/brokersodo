import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Inbox, MessagesSquare, Search, Tags } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoryChart, InquiriesChart } from "@/components/admin/dashboard-charts";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const DAYS = 30;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const session = await requireStaffPage();
  const { denied } = await searchParams;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const since = new Date(now.getTime() - (DAYS - 1) * 86400_000);
  since.setHours(0, 0, 0, 0);

  const [active, newInquiries, pendingSubs, openWanted, closedMonth, byCategory, categories, inquiryDays, activity, unassigned, staleDrafts, recentSubs] = await Promise.all([
    db.listing.count({ where: { status: { in: ["PUBLISHED", "RESERVED"] } } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.propertySubmission.count({ where: { status: "PENDING" } }),
    db.wantedRequest.count({ where: { status: "OPEN" } }),
    db.listing.count({ where: { status: { in: ["SOLD", "RENTED"] }, soldAt: { gte: monthStart } } }),
    db.listing.groupBy({ by: ["categoryId"], where: { status: { in: ["PUBLISHED", "RESERVED"] } }, _count: { _all: true } }),
    db.category.findMany({ select: { id: true, nameEn: true } }),
    db.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'Africa/Addis_Ababa') AS day, count(*)::bigint AS count
      FROM "Inquiry" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`,
    db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { name: true } } } }),
    db.inquiry.findMany({ where: { status: "NEW", assignedBrokerId: null }, orderBy: { createdAt: "asc" }, take: 5, include: { listing: { select: { refCode: true } } } }),
    db.listing.findMany({ where: { status: "DRAFT", updatedAt: { lt: new Date(now.getTime() - 7 * 86400_000) } }, orderBy: { updatedAt: "asc" }, take: 5, select: { id: true, refCode: true, titleEn: true, updatedAt: true } }),
    db.propertySubmission.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 5, select: { id: true, title: true, name: true, createdAt: true } }),
  ]);

  const catName = new Map(categories.map((c) => [c.id, c.nameEn]));
  const catData = byCategory.map((b) => ({ name: catName.get(b.categoryId) ?? "—", count: b._count._all })).sort((a, b) => b.count - a.count);
  const dayMap = new Map(inquiryDays.map((d) => [new Date(d.day).toISOString().slice(0, 10), Number(d.count)]));
  const inqData = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    return { day: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), count: dayMap.get(key) ?? 0 };
  });

  const kpis = [
    { label: "Active listings", value: active, href: "/admin/listings", Icon: Tags },
    { label: "New inquiries", value: newInquiries, href: "/admin/inquiries", Icon: MessagesSquare, alert: newInquiries > 0 },
    { label: "Pending submissions", value: pendingSubs, href: "/admin/submissions", Icon: Inbox, alert: pendingSubs > 0 },
    { label: "Open wanted requests", value: openWanted, href: "/admin/wanted", Icon: Search },
    { label: "Sold / rented this month", value: closedMonth, href: "/admin/listings", Icon: CheckCircle2 },
  ];

  return (
    <>
      <AdminPageHeader title={`Hello, ${session.user.name?.split(" ")[0] ?? "there"}`} description="Here's what's happening at BrokerSodo." />
      {denied && (
        <p role="alert" className="mb-5 flex items-center gap-2 rounded-btn bg-amber-50 px-4 py-3 text-sm font-semibold text-reserved dark:bg-amber-900/30 dark:text-amber-200">
          <AlertTriangle className="size-4" /> That section is for admins only.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <li key={k.label}>
            <Link href={k.href} className="flex h-full flex-col gap-2 rounded-card bg-surface p-4 shadow-card transition-shadow hover:shadow-pop">
              <span className="flex items-center justify-between text-sm font-semibold text-muted">
                {k.label}
                <k.Icon className="size-4" />
              </span>
              <span className="flex items-center gap-2 font-brand text-4xl text-fg tabular-nums">
                {k.value}
                {k.alert && <span className="size-2.5 rounded-full bg-red-500" aria-label="needs attention" />}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-card bg-surface p-5 shadow-card">
          <h2 className="font-bold text-fg">Inquiries per day</h2>
          <p className="mb-4 text-sm text-muted">Last {DAYS} days · {inqData.reduce((s, d) => s + d.count, 0)} total</p>
          <InquiriesChart data={inqData} />
        </section>
        <section className="rounded-card bg-surface p-5 shadow-card">
          <h2 className="font-bold text-fg">Active listings by category</h2>
          <p className="mb-4 text-sm text-muted">Published and reserved</p>
          <CategoryChart data={catData} />
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AttentionCard title="Unassigned new inquiries" href="/admin/inquiries" empty="Every new inquiry has a broker.">
          {unassigned.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2">
              <span className="truncate">
                {i.name} {i.listing && <span className="font-mono text-xs text-primary">{i.listing.refCode}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted">{relativeTime(i.createdAt)}</span>
            </li>
          ))}
        </AttentionCard>
        <AttentionCard title="Pending submissions" href="/admin/submissions" empty="Inbox zero 🎉">
          {recentSubs.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2">
              <Link href={`/admin/submissions/${s.id}`} className="truncate hover:underline">
                {s.title} <span className="text-muted">· {s.name}</span>
              </Link>
              <span className="shrink-0 text-xs text-muted">{relativeTime(s.createdAt)}</span>
            </li>
          ))}
        </AttentionCard>
        <AttentionCard title="Drafts untouched for 7+ days" href="/admin/listings" empty="No stale drafts.">
          {staleDrafts.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2">
              <Link href={`/admin/listings/${l.id}`} className="truncate hover:underline">
                <span className="font-mono text-xs text-primary">{l.refCode}</span> {l.titleEn}
              </Link>
              <span className="shrink-0 text-xs text-muted">{relativeTime(l.updatedAt)}</span>
            </li>
          ))}
        </AttentionCard>
      </div>

      <section className="mt-6 rounded-card bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-fg">Recent activity</h2>
          {session.user.role === "ADMIN" && (
            <Link href="/admin/activity" className="text-sm font-semibold text-primary hover:underline">
              View all
            </Link>
          )}
        </div>
        <ul className="divide-y divide-line text-sm">
          {activity.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <StatusBadge status={a.action.toUpperCase()} />
              <span className="min-w-0 flex-1 truncate text-fg-2">
                <span className="font-semibold text-fg">{a.user?.name ?? "System"}</span> · {a.summary ?? `${a.action} ${a.entityType}`}
              </span>
              <span className="shrink-0 text-xs text-muted">{relativeTime(a.createdAt)}</span>
            </li>
          ))}
          {activity.length === 0 && <li className="py-4 text-muted">No activity yet.</li>}
        </ul>
      </section>
    </>
  );
}

function AttentionCard({ title, href, empty, children }: { title: string; href: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="rounded-card bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-fg">{title}</h2>
        <Link href={href} aria-label={`Open ${title}`} className="text-primary">
          <ArrowRight className="size-4" />
        </Link>
      </div>
      {children.length ? <ul className="space-y-2.5 text-sm text-fg">{children}</ul> : <p className="text-sm text-muted">{empty}</p>}
    </section>
  );
}
