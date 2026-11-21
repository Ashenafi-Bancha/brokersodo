import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { UsersManager } from "@/components/admin/settings-ui";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const session = await requireStaffPage(["ADMIN"]);
  const users = await db.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true, _count: { select: { listings: true } } },
  });
  return (
    <>
      <AdminPageHeader title="Users & roles" description="Staff who can sign in to the admin." crumbs={[{ label: "Users" }]} />
      <UsersManager meId={session.user.id} rows={users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, isActive: u.isActive, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, listings: u._count.listings }))} />
    </>
  );
}
