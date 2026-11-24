import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { JobsView } from "@/components/admin/jobs-admin";
import { requireStaffPage } from "@/lib/auth";
import { CATALOG_EN } from "@/lib/catalog-labels";
import { dateFromDeadline } from "@/lib/jobs-catalog";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Jobs" };

export default async function AdminJobsPage() {
  await requireStaffPage();
  const [jobs, areas] = await Promise.all([
    db.jobPost.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 2000,
      include: { area: { select: { nameEn: true } }, applications: { orderBy: { createdAt: "desc" } } },
    }),
    db.area.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], select: { id: true, nameEn: true } }),
  ]);
  const pending = jobs.filter((j) => j.status === "PENDING").length;
  return (
    <>
      <AdminPageHeader
        title="Jobs"
        description={`${pending} waiting for review. Call the employer, check the post, then publish. Applicants are inside each job.`}
        crumbs={[{ label: "Jobs" }]}
      />
      <JobsView
        labels={CATALOG_EN}
        areas={areas.map((a) => ({ id: a.id, name: a.nameEn }))}
        rows={jobs.map((j) => ({
          id: j.id,
          refCode: j.refCode,
          slug: j.slug,
          title: j.title,
          employerName: j.employerName,
          showEmployer: j.showEmployer,
          employerVerified: j.employerVerified,
          featured: j.featured,
          sector: j.sector,
          jobType: j.jobType,
          audience: j.audience,
          education: j.education,
          minExperience: j.minExperience,
          vacancies: j.vacancies,
          salaryMin: j.salaryMin,
          salaryMax: j.salaryMax,
          salaryPeriod: j.salaryPeriod,
          areaId: j.areaId,
          area: j.area?.nameEn ?? "",
          description: j.description,
          requirements: j.requirements,
          deadline: dateFromDeadline(j.deadline),
          contactName: j.contactName,
          contactPhone: j.contactPhone,
          staffNotes: j.staffNotes,
          status: j.status,
          rejectReason: j.rejectReason,
          createdAt: j.createdAt.toISOString(),
          applicants: j.applications.map((a) => ({
            id: a.id,
            name: a.name,
            phone: a.phone,
            education: a.education,
            field: a.field,
            experience: a.experience,
            skills: a.skills,
            message: a.message,
            status: a.status,
            notes: a.notes,
            createdAt: a.createdAt.toISOString(),
          })),
        }))}
      />
    </>
  );
}
