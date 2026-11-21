import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ListingForm } from "@/components/admin/listing-form";
import { ListingQuickActions } from "@/components/admin/listing-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireStaffPage } from "@/lib/auth";
import { getListingForEdit, getListingFormOptions, toFormInput } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaffPage();
  const { id } = await params;
  const [listing, options] = await Promise.all([getListingForEdit(id), getListingFormOptions()]);
  if (!listing) notFound();
  return (
    <>
      <AdminPageHeader
        title={listing.titleEn}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold text-primary">{listing.refCode}</span>
            <StatusBadge status={listing.status} />
            <span>{listing.viewCount.toLocaleString()} views</span>
            {listing.inquiries.length > 0 && (
              <Link href={`/admin/inquiries?listing=${listing.id}`} className="font-semibold text-primary hover:underline">
                {listing.inquiries.length} recent inquiries
              </Link>
            )}
          </span>
        }
        crumbs={[{ href: "/admin/listings", label: "Listings" }, { label: listing.refCode }]}
        actions={<ListingQuickActions listing={{ id: listing.id, refCode: listing.refCode, status: listing.status, dealType: listing.dealType }} isAdmin={session.user.role === "ADMIN"} />}
      />
      <ListingForm key={listing.updatedAt.toISOString()} id={listing.id} refCode={listing.refCode} slug={listing.slug} initial={toFormInput(listing)} {...options} />
    </>
  );
}
