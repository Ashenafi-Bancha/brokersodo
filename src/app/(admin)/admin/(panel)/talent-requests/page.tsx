import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { TalentRequestsView } from "@/components/admin/talent-admin";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Talent requests" };

export default async function TalentRequestsPage() {
  const session = await requireStaffPage();
  const rows = await db.talentRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 3000,
    include: { seeker: { select: { name: true, phone: true, profession: true, slug: true } } },
  });
  return (
    <>
      <AdminPageHeader
        title="Talent requests"
        description="Employers asking to meet someone from Find Talent. Call the candidate first, then connect both sides."
        crumbs={[{ label: "Talent requests" }]}
      />
      <TalentRequestsView
        isAdmin={session.user.role === "ADMIN"}
        rows={rows.map((r) => ({
          id: r.id,
          employerName: r.employerName,
          contactName: r.contactName,
          phone: r.phone,
          message: r.message,
          status: r.status,
          notes: r.notes,
          createdAt: r.createdAt.toISOString(),
          seeker: r.seeker,
        }))}
      />
    </>
  );
}
