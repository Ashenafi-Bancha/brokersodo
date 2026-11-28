import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ListingForm } from "@/components/admin/listing-form";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { emptyListingInput, getListingFormOptions } from "@/server/queries/admin";
import type { ListingFormInput } from "@/lib/validators/admin";

export const metadata: Metadata = { title: "New listing" };

/** `?fromSubmission=<id>` pre-fills the form from a public submission ("Convert to listing"). */
export default async function NewListingPage({ searchParams }: { searchParams: Promise<{ fromSubmission?: string }> }) {
  const session = await requireStaffPage();
  const { fromSubmission } = await searchParams;
  const options = await getListingFormOptions();
  let initial: ListingFormInput = emptyListingInput(session.user.id);
  let note: string | undefined;

  if (fromSubmission) {
    const s = await db.propertySubmission.findUnique({ where: { id: fromSubmission } });
    if (s && s.status === "PENDING") {
      const photos = (Array.isArray(s.photos) ? s.photos : []) as { url: string; publicId?: string | null; width: number; height: number }[];
      initial = {
        ...initial,
        titleEn: s.title,
        descriptionEn: s.details ? `<p>${s.details.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!).replace(/\n+/g, "</p><p>")}</p>` : "",
        categoryId: s.categoryId ?? "",
        dealType: s.dealType,
        rentPeriod: s.rentPeriod ?? "MONTH",
        price: s.expectedPrice != null ? String(s.expectedPrice) : "",
        isNegotiable: s.isNegotiable,
        videoFile: s.videoFile ?? "",
        areaId: s.areaId ?? "",
        attributes: (s.attributes ?? {}) as Record<string, unknown>,
        ownerName: s.name,
        ownerPhone: s.phone,
        ownerNotes: s.staffNotes ? `From submission: ${s.staffNotes}` : "Converted from a public submission.",
        images: photos.map((p, i) => ({ url: p.url, publicId: p.publicId ?? null, width: p.width, height: p.height, alt: s.title, isCover: i === 0 })),
        fromSubmissionId: s.id,
      };
      note = `Pre-filled from ${s.name}'s submission. Review everything, then save — the submission will be marked approved and linked.`;
    }
  }

  return (
    <>
      <AdminPageHeader title="New listing" description={note} crumbs={[{ href: "/admin/listings", label: "Listings" }, { label: "New" }]} />
      <ListingForm initial={initial} {...options} />
    </>
  );
}
