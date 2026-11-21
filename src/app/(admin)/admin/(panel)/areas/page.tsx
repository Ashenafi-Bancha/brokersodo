import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AreasManager } from "@/components/admin/taxonomy-ui";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Areas" };

export default async function AreasPage() {
  await requireStaffPage(["ADMIN"]);
  const areas = await db.area.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], include: { _count: { select: { listings: true } } } });
  return (
    <>
      <AdminPageHeader title="Areas" description="Neighbourhoods used for filters and listing locations. Drag to reorder." crumbs={[{ label: "Areas" }]} />
      <AreasManager rows={areas.map((a) => ({ id: a.id, nameEn: a.nameEn, nameAm: a.nameAm, slug: a.slug, city: a.city, isActive: a.isActive, count: a._count.listings }))} />
    </>
  );
}
