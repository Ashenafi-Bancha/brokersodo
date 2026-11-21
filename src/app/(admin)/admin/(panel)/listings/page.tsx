import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ListingsTable } from "@/components/admin/listings-table";
import { Button } from "@/components/ui/button";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminListingRows } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Listings" };

export default async function AdminListingsPage() {
  const session = await requireStaffPage();
  const [rows, categories, brokers] = await Promise.all([
    getAdminListingRows(),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { nameEn: true } }),
    db.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <AdminPageHeader
        title="Listings"
        description={`${rows.length} total · ${rows.filter((r) => r.status === "PUBLISHED").length} published`}
        crumbs={[{ label: "Listings" }]}
        actions={
          <Button asChild size="sm">
            <Link href="/admin/listings/new">
              <Plus /> New listing
            </Link>
          </Button>
        }
      />
      <ListingsTable rows={rows} isAdmin={session.user.role === "ADMIN"} categories={categories.map((c) => c.nameEn)} brokers={brokers} />
    </>
  );
}
