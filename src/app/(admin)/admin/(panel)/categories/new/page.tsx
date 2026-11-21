import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "@/components/admin/taxonomy-ui";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "New category" };

export default async function NewCategoryPage() {
  await requireStaffPage(["ADMIN"]);
  const parents = await db.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true } });
  return (
    <>
      <AdminPageHeader title="New category" crumbs={[{ href: "/admin/categories", label: "Categories" }, { label: "New" }]} />
      <CategoryForm
        parents={parents}
        initial={{ nameEn: "", nameAm: "", slug: "", refPrefix: "", icon: "other", image: "", descriptionEn: "", descriptionAm: "", isActive: true, parentId: "", attributeSchema: [] }}
      />
    </>
  );
}
