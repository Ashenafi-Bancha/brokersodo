import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MembersView } from "@/components/admin/members-admin";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage() {
  const session = await requireStaffPage();
  const rows = await db.member.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      name: true,
      phone: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      seeker: { select: { status: true } },
      tutor: { select: { status: true } },
      company: { select: { id: true, name: true, verified: true, _count: { select: { jobs: true } } } },
      _count: { select: { applications: true } },
    },
  });
  const unverified = rows.filter((r) => r.company && !r.company.verified).length;
  return (
    <>
      <AdminPageHeader
        title="Members"
        description={`Visitor accounts (job seekers, tutors, families, employers). Separate from staff logins. ${unverified} compan${unverified === 1 ? "y" : "ies"} waiting for verification: call them, then verify so they can see their applicants.`}
        crumbs={[{ label: "Members" }]}
      />
      <MembersView
        isAdmin={session.user.role === "ADMIN"}
        rows={rows.map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          isActive: r.isActive,
          createdAt: r.createdAt.toISOString(),
          lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
          seeker: r.seeker?.status ?? null,
          tutor: r.tutor?.status ?? null,
          company: r.company ? { id: r.company.id, name: r.company.name, verified: r.company.verified, jobs: r.company._count.jobs } : null,
          applications: r._count.applications,
        }))}
      />
    </>
  );
}
