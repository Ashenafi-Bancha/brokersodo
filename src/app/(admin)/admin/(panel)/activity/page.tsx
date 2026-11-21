import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Activity log" };

const PAGE = 50;
const LINKS: Record<string, (id: string) => string> = {
  Listing: (id) => `/admin/listings/${id}`,
  PropertySubmission: (id) => `/admin/submissions/${id}`,
  Category: (id) => `/admin/categories/${id}`,
};

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ page?: string; type?: string; user?: string }> }) {
  await requireStaffPage(["ADMIN"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { ...(sp.type ? { entityType: sp.type } : {}), ...(sp.user ? { userId: sp.user } : {}) };
  const [rows, total, types, users] = await Promise.all([
    db.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { user: { select: { name: true } } } }),
    db.activityLog.count({ where }),
    db.activityLog.findMany({ distinct: ["entityType"], select: { entityType: true } }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => `?${new URLSearchParams({ ...(sp.type ? { type: sp.type } : {}), ...(sp.user ? { user: sp.user } : {}), page: String(p) })}`;
  return (
    <>
      <AdminPageHeader title="Activity log" description={`${total} events — who did what, and when.`} crumbs={[{ label: "Activity log" }]} />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <select name="type" defaultValue={sp.type ?? ""} aria-label="Record type" className="min-h-10 rounded-btn border-[1.5px] border-line bg-surface px-3 text-sm">
          <option value="">All records</option>
          {types.map((t) => (
            <option key={t.entityType} value={t.entityType}>
              {t.entityType}
            </option>
          ))}
        </select>
        <select name="user" defaultValue={sp.user ?? ""} aria-label="Staff member" className="min-h-10 rounded-btn border-[1.5px] border-line bg-surface px-3 text-sm">
          <option value="">All staff</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          Filter
        </Button>
      </form>
      <div className="overflow-x-auto rounded-card bg-surface shadow-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left text-xs font-bold tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const href = r.entityId && LINKS[r.entityType]?.(r.entityId);
              return (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                    {formatDate(r.createdAt)} {r.createdAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" })}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-fg">{r.user?.name ?? "System"}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-pill bg-bg-2 px-2 py-0.5 text-xs font-bold text-fg-2">{r.action}</span>
                  </td>
                  <td className="px-4 py-2.5">{href ? <Link href={href} className="font-semibold text-primary hover:underline">{r.entityType}</Link> : r.entityType}</td>
                  <td className="px-4 py-2.5 text-fg-2">{r.summary}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  No activity.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <nav className="mt-4 flex items-center justify-end gap-2 text-sm text-muted" aria-label="Pagination">
        {page > 1 && (
          <Button asChild variant="outline" size="icon-xs" className="border-line">
            <Link href={qs(page - 1)} aria-label="Previous page">
              <ChevronLeft />
            </Link>
          </Button>
        )}
        <span>
          {page} / {pages}
        </span>
        {page < pages && (
          <Button asChild variant="outline" size="icon-xs" className="border-line">
            <Link href={qs(page + 1)} aria-label="Next page">
              <ChevronRight />
            </Link>
          </Button>
        )}
      </nav>
    </>
  );
}
