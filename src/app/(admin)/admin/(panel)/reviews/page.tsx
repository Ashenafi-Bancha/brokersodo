import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ReviewsView } from "@/components/admin/talent-admin";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Tutor reviews" };

export default async function ReviewsPage() {
  const session = await requireStaffPage();
  const rows = await db.tutorReview.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 3000,
    include: { tutor: { select: { displayName: true, refCode: true, slug: true } } },
  });
  const pending = rows.filter((r) => r.status === "PENDING").length;
  return (
    <>
      <AdminPageHeader
        title="Tutor reviews"
        description={`${pending} waiting. Approve honest reviews; reviews not matched by us are worth a quick call first. Only approved reviews count toward a tutor's stars.`}
        crumbs={[{ label: "Tutor reviews" }]}
      />
      <ReviewsView
        isAdmin={session.user.role === "ADMIN"}
        rows={rows.map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          rating: r.rating,
          comment: r.comment,
          verified: r.verified,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          tutor: r.tutor,
        }))}
      />
    </>
  );
}
