import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { TutorsView } from "@/components/admin/tutors-admin";
import { requireStaffPage } from "@/lib/auth";
import { CATALOG_EN } from "@/lib/catalog-labels";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Tutors" };

export default async function AdminTutorsPage() {
  const session = await requireStaffPage();
  const [tutors, areas] = await Promise.all([
    db.tutor.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 3000,
      include: { area: { select: { nameEn: true } }, _count: { select: { requests: true } } },
    }),
    db.area.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true } }),
  ]);
  const pending = tutors.filter((t) => t.status === "PENDING").length;
  return (
    <>
      <AdminPageHeader title="Tutors" description={`${pending} waiting for review. Check ID and certificates, tick Verified, then make them live.`} crumbs={[{ label: "Tutors" }]} />
      <TutorsView
        isAdmin={session.user.role === "ADMIN"}
        labels={CATALOG_EN}
        areas={areas.map((a) => ({ id: a.id, name: a.nameEn }))}
        rows={tutors.map((t) => ({
          id: t.id,
          refCode: t.refCode,
          slug: t.slug,
          displayName: t.displayName,
          fullName: t.fullName,
          phone: t.phone,
          subjects: t.subjects,
          levels: t.levels,
          modes: t.modes,
          education: t.education,
          field: t.field,
          experienceYears: t.experienceYears,
          bio: t.bio,
          availability: t.availability,
          hourlyRate: t.hourlyRate,
          areaId: t.areaId,
          area: t.area?.nameEn ?? "",
          isVerified: t.isVerified,
          featured: t.featured,
          staffNotes: t.staffNotes,
          status: t.status,
          rejectReason: t.rejectReason,
          createdAt: t.createdAt.toISOString(),
          requestCount: t._count.requests,
        }))}
      />
    </>
  );
}
