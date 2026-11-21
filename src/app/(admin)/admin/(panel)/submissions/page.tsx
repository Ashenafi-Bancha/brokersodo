import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SubmissionsTable } from "@/components/admin/submissions-ui";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Submissions" };

export default async function SubmissionsPage() {
  await requireStaffPage();
  const subs = await db.propertySubmission.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 1000,
    include: { category: { select: { nameEn: true } }, area: { select: { nameEn: true } } },
  });
  return (
    <>
      <AdminPageHeader title="Submissions" description="Properties sent in through “Sell with us”. Verify, then convert to a listing or reject." crumbs={[{ label: "Submissions" }]} />
      <SubmissionsTable
        rows={subs.map((s) => {
          const photos = (Array.isArray(s.photos) ? s.photos : []) as { url: string }[];
          return {
            id: s.id,
            title: s.title,
            name: s.name,
            phone: s.phone,
            category: s.category?.nameEn ?? "—",
            dealType: s.dealType,
            price: s.expectedPrice,
            area: s.area?.nameEn ?? "",
            photos: photos.length,
            status: s.status,
            createdAt: s.createdAt.toISOString(),
            thumb: photos[0]?.url ?? null,
          };
        })}
      />
    </>
  );
}
