import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { InquiriesView } from "@/components/admin/inquiries-ui";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Inquiries" };

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const session = await requireStaffPage();
  const { listing } = await searchParams;
  const [rows, brokers, filteredListing] = await Promise.all([
    db.inquiry.findMany({
      where: listing ? { listingId: listing } : { OR: [{ status: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } }, { updatedAt: { gte: new Date(Date.now() - 60 * 86400_000) } }] },
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: { listing: { select: { id: true, refCode: true, titleEn: true, slug: true } }, assignedBroker: { select: { name: true } } },
    }),
    db.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listing ? db.listing.findUnique({ where: { id: listing }, select: { refCode: true } }) : null,
  ]);
  return (
    <>
      <AdminPageHeader
        title="Inquiries"
        description={filteredListing ? `Leads for ${filteredListing.refCode}` : "Drag cards between columns to update status. Closed leads older than 60 days are hidden."}
        crumbs={[{ label: "Inquiries" }]}
      />
      <InquiriesView
        isAdmin={session.user.role === "ADMIN"}
        brokers={brokers}
        rows={rows.map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          message: r.message,
          preferredContact: r.preferredContact,
          source: r.source,
          status: r.status,
          notes: r.notes,
          createdAt: r.createdAt.toISOString(),
          brokerId: r.assignedBrokerId,
          brokerName: r.assignedBroker?.name ?? null,
          listing: r.listing ? { id: r.listing.id, refCode: r.listing.refCode, title: r.listing.titleEn, slug: r.listing.slug } : null,
        }))}
      />
    </>
  );
}
