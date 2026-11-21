import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "@/components/admin/taxonomy-ui";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAttributeSchema } from "@/lib/validators/attribute-schema";

export const metadata: Metadata = { title: "Edit category" };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage(["ADMIN"]);
  const { id } = await params;
  const [c, parents] = await Promise.all([
    db.category.findUnique({ where: { id } }),
    db.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true } }),
  ]);
  if (!c) notFound();
  return (
    <>
      <AdminPageHeader title={c.nameEn} description={`/c/${c.slug} · prefix ${c.refPrefix}`} crumbs={[{ href: "/admin/categories", label: "Categories" }, { label: c.nameEn }]} />
      <CategoryForm
        key={c.updatedAt.toISOString()}
        id={c.id}
        parents={parents}
        initial={{
          nameEn: c.nameEn,
          nameAm: c.nameAm ?? "",
          slug: c.slug,
          refPrefix: c.refPrefix,
          icon: c.icon,
          image: c.image ?? "",
          descriptionEn: c.descriptionEn ?? "",
          descriptionAm: c.descriptionAm ?? "",
          isActive: c.isActive,
          parentId: c.parentId ?? "",
          attributeSchema: parseAttributeSchema(c.attributeSchema),
        }}
      />
    </>
  );
}
