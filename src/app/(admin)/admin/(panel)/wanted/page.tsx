import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { WantedView } from "@/components/admin/wanted-ui";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Wanted requests" };

export default async function WantedPage() {
  await requireStaffPage();
  const rows = await db.wantedRequest.findMany({
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
    take: 1000,
    include: {
      category: { select: { nameEn: true } },
      area: { select: { nameEn: true } },
      matches: { select: { id: true, refCode: true, titleEn: true, price: true } },
    },
  });
  return (
    <>
      <AdminPageHeader title="Wanted requests" description="Buyers telling us what they need. Find a match, link it and call them." crumbs={[{ label: "Wanted" }]} />
      <WantedView
        rows={rows.map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          category: r.category?.nameEn ?? "",
          dealType: r.dealType,
          description: r.description,
          budgetMin: r.budgetMin,
          budgetMax: r.budgetMax,
          area: r.area?.nameEn ?? "",
          status: r.status,
          notes: r.notes,
          createdAt: r.createdAt.toISOString(),
          matches: r.matches,
        }))}
      />
    </>
  );
}
