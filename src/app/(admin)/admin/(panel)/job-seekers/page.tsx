import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SeekersView } from "@/components/admin/jobs-admin";
import { requireStaffPage } from "@/lib/auth";
import { CATALOG_EN } from "@/lib/catalog-labels";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Talent pool" };

export default async function SeekersPage() {
  await requireStaffPage();
  const rows = await db.jobSeeker.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 5000, include: { area: { select: { nameEn: true } } } });
  return (
    <>
      <AdminPageHeader
        title="Talent pool"
        description="Graduates and skilled workers looking for work. Private and never shown on the website. Open a job and use Matching talent to find people for it."
        crumbs={[{ label: "Talent pool" }]}
      />
      <SeekersView
        labels={CATALOG_EN}
        rows={rows.map((s) => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          seekerType: s.seekerType,
          profession: s.profession,
          sector: s.sector,
          education: s.education,
          field: s.field,
          graduationYear: s.graduationYear,
          experience: s.experience,
          skills: s.skills,
          about: s.about,
          area: s.area?.nameEn ?? "",
          status: s.status,
          notes: s.notes,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
