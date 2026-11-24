import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff().catch(() => null);
  if (!session) redirect("/admin/login");
  const [submissions, inquiries, wanted, pendingJobs, newApplicants, tutors, tutorRequests] = await Promise.all([
    db.propertySubmission.count({ where: { status: "PENDING" } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.wantedRequest.count({ where: { status: "OPEN" } }),
    db.jobPost.count({ where: { status: "PENDING" } }),
    db.jobApplication.count({ where: { status: "NEW" } }),
    db.tutor.count({ where: { status: "PENDING" } }),
    db.tutorRequest.count({ where: { status: "NEW" } }),
  ]);
  return (
    <AdminShell
      me={{ name: session.user.name ?? "Staff", email: session.user.email ?? "", role: session.user.role }}
      counts={{ submissions, inquiries, wanted, jobs: pendingJobs + newApplicants, tutors, tutorRequests }}
    >
      {children}
    </AdminShell>
  );
}
