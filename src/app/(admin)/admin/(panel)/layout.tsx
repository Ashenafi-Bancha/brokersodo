import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff().catch(() => null);
  if (!session) redirect("/admin/login");
  const [submissions, inquiries, wanted, pendingJobs, newApplicants, tutors, tutorRequests, talentRequests, reviews, seekers, companies, stores, chats] = await Promise.all([
    db.propertySubmission.count({ where: { status: "PENDING" } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.wantedRequest.count({ where: { OR: [{ status: "OPEN" }, { responses: { some: { status: "NEW" } } }] } }),
    db.jobPost.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    db.jobApplication.count({ where: { status: "NEW" } }),
    db.tutor.count({ where: { status: "PENDING" } }),
    db.tutorRequest.count({ where: { status: "NEW" } }),
    db.talentRequest.count({ where: { status: "NEW" } }),
    db.tutorReview.count({ where: { status: "PENDING" } }),
    // Public profiles waiting for a check
    db.jobSeeker.count({ where: { status: "NEW", visibility: "PUBLIC" } }),
    // Companies waiting for verification
    db.company.count({ where: { verified: false } }),
    db.store.count({ where: { status: "PENDING" } }),
    // Chats where a visitor is waiting for staff
    db.chatConversation.count({ where: { status: { in: ["WAITING", "STAFF"] }, unreadByStaff: true } }),
  ]);
  return (
    <AdminShell
      me={{ name: session.user.name ?? "Staff", email: session.user.email ?? "", role: session.user.role }}
      counts={{ submissions, inquiries, wanted, jobs: pendingJobs + newApplicants, tutors, tutorRequests, talentRequests, reviews, seekers, companies, stores, chats }}
    >
      {children}
    </AdminShell>
  );
}
