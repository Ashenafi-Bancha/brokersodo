import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { TutorRequestsView } from "@/components/admin/tutors-admin";
import { requireStaffPage } from "@/lib/auth";
import { CATALOG_EN } from "@/lib/catalog-labels";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Tutor requests" };

export default async function TutorRequestsPage() {
  await requireStaffPage();
  const [rows, tutors] = await Promise.all([
    db.tutorRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 3000,
      include: { area: { select: { nameEn: true } }, tutor: { select: { displayName: true, refCode: true } } },
    }),
    db.tutor.findMany({
      where: { status: "ACTIVE" },
      orderBy: { displayName: "asc" },
      select: { id: true, refCode: true, fullName: true, subjects: true, levels: true, modes: true, areaId: true, hourlyRate: true },
    }),
  ]);
  return (
    <>
      <AdminPageHeader
        title="Tutor requests"
        description="Families and students asking for a tutor. Pick a matching tutor, call both sides, then mark it Matched."
        crumbs={[{ label: "Tutor requests" }]}
      />
      <TutorRequestsView
        labels={CATALOG_EN}
        tutors={tutors.map((t) => ({ id: t.id, refCode: t.refCode, name: t.fullName, subjects: t.subjects, levels: t.levels, modes: t.modes, areaId: t.areaId, hourlyRate: t.hourlyRate }))}
        rows={rows.map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          subject: r.subject,
          level: r.level,
          mode: r.mode,
          area: r.area?.nameEn ?? "",
          areaId: r.areaId,
          schedule: r.schedule,
          budget: r.budget,
          message: r.message,
          status: r.status,
          notes: r.notes,
          tutorId: r.tutorId,
          tutorName: r.tutor ? `${r.tutor.displayName} (${r.tutor.refCode})` : null,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
