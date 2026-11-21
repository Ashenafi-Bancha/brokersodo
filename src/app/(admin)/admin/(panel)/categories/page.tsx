import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoryList } from "@/components/admin/taxonomy-ui";
import { Button } from "@/components/ui/button";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAttributeSchema } from "@/lib/validators/attribute-schema";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireStaffPage(["ADMIN"]);
  const cats = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    select: { id: true, nameEn: true, nameAm: true, slug: true, icon: true, isActive: true, attributeSchema: true, _count: { select: { listings: true } } },
  });
  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Drag to reorder. Each category has its own fields (attribute schema)."
        crumbs={[{ label: "Categories" }]}
        actions={
          <Button asChild size="sm">
            <Link href="/admin/categories/new">
              <Plus /> New category
            </Link>
          </Button>
        }
      />
      <CategoryList
        rows={cats.map((c) => ({ id: c.id, nameEn: c.nameEn, nameAm: c.nameAm, slug: c.slug, icon: c.icon, isActive: c.isActive, count: c._count.listings, fields: parseAttributeSchema(c.attributeSchema).length }))}
      />
    </>
  );
}
