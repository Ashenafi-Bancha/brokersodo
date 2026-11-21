import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff().catch(() => null);
  if (!session) redirect("/admin/login");
  const [submissions, inquiries, wanted] = await Promise.all([
    db.propertySubmission.count({ where: { status: "PENDING" } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.wantedRequest.count({ where: { status: "OPEN" } }),
  ]);
  return (
    <AdminShell
      me={{ name: session.user.name ?? "Staff", email: session.user.email ?? "", role: session.user.role }}
      counts={{ submissions, inquiries, wanted }}
    >
      {children}
    </AdminShell>
  );
}
