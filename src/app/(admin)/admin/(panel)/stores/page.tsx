import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StoresView } from "@/components/admin/stores-admin";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";
import en from "../../../../../../messages/en.json";

export const metadata: Metadata = { title: "Stores" };

export default async function AdminStoresPage() {
  const session = await requireStaffPage();
  const rows = await db.store.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 3000,
    include: { area: { select: { nameEn: true } }, member: { select: { name: true, phone: true } }, _count: { select: { items: true } } },
  });
  const pending = rows.filter((r) => r.status === "PENDING").length;
  return (
    <>
      <AdminPageHeader
        title="Stores"
        description={`${pending} waiting for approval. Call the business, check it is real (and that the Telebirr payment arrived, once subscriptions start), then approve. Owners manage their own items and prices.`}
        crumbs={[{ label: "Stores" }]}
      />
      <StoresView
        isAdmin={session.user.role === "ADMIN"}
        typeLabels={(en as unknown as { stores: { type: Record<string, string> } }).stores.type}
        rows={rows.map((r) => ({
          id: r.id,
          refCode: r.refCode,
          slug: r.slug,
          name: r.name,
          type: r.type,
          phone: r.phone,
          area: r.area?.nameEn ?? "",
          status: r.status,
          featured: r.featured,
          items: r._count.items,
          owner: r.member.name,
          ownerPhone: r.member.phone,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
