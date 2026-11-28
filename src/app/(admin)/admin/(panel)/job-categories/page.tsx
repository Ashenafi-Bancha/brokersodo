import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CatalogManager } from "@/components/admin/catalog-admin";
import { requireStaffPage } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Job & tutor categories" };

export default async function JobCategoriesPage() {
  await requireStaffPage(["ADMIN"]);
  const [sectors, subjects, jobsBySector, seekersBySector, tutors] = await Promise.all([
    getCatalog("sector"),
    getCatalog("subject"),
    db.jobPost.groupBy({ by: ["sector"], _count: { _all: true } }),
    db.jobSeeker.groupBy({ by: ["sector"], _count: { _all: true } }),
    db.tutor.findMany({ select: { subjects: true } }),
  ]);
  const sectorUse = new Map<string, number>();
  for (const r of [...jobsBySector, ...seekersBySector]) sectorUse.set(r.sector, (sectorUse.get(r.sector) ?? 0) + r._count._all);
  const subjectUse = new Map<string, number>();
  for (const t of tutors) for (const s of t.subjects) subjectUse.set(s, (subjectUse.get(s) ?? 0) + 1);
  return (
    <>
      <AdminPageHeader
        title="Job & tutor categories"
        description="Rename, reorder, hide or add job sectors and tutoring subjects. Hidden ones disappear from forms and filters; jobs, profiles and requests that already use them keep their name."
        crumbs={[{ label: "Job & tutor categories" }]}
      />
      <div className="grid gap-6">
        <CatalogManager
          group="sector"
          title="Job sectors"
          hint="Used by jobs, talent profiles and company profiles. Each sector also gets its own page, e.g. /jobs/category/it."
          rows={sectors.map((i) => ({ value: i.value, labelEn: i.labelEn, labelAm: i.labelAm, sortOrder: i.sortOrder, isActive: i.isActive, builtIn: i.builtIn, used: sectorUse.get(i.value) ?? 0 }))}
        />
        <CatalogManager
          group="subject"
          title="Tutoring subjects"
          hint="Used by tutor profiles and tutor requests. Each subject also gets its own page, e.g. /tutors/subject/maths."
          rows={subjects.map((i) => ({ value: i.value, labelEn: i.labelEn, labelAm: i.labelAm, sortOrder: i.sortOrder, isActive: i.isActive, builtIn: i.builtIn, used: subjectUse.get(i.value) ?? 0 }))}
        />
      </div>
    </>
  );
}
