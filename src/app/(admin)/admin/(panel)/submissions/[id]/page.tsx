import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SubmissionActions } from "@/components/admin/submissions-ui";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatETB, rentSuffix } from "@/lib/format";
import { formatAttributeValue, parseAttributeSchema } from "@/lib/validators/attribute-schema";

export const metadata: Metadata = { title: "Submission" };

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaffPage();
  const { id } = await params;
  const s = await db.propertySubmission.findUnique({
    where: { id },
    include: { category: { select: { nameEn: true, attributeSchema: true } }, area: { select: { nameEn: true } } },
  });
  if (!s) notFound();
  const photos = (Array.isArray(s.photos) ? s.photos : []) as { url: string; width?: number; height?: number }[];
  const fields = parseAttributeSchema(s.category?.attributeSchema ?? []);
  const attrs = (s.attributes ?? {}) as Record<string, unknown>;
  const specs = fields.map((f) => ({ label: f.labelEn, value: formatAttributeValue(f, attrs[f.key]) })).filter((x) => x.value);

  return (
    <>
      <AdminPageHeader
        title={s.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} /> Received {formatDate(s.createdAt)}
          </span>
        }
        crumbs={[{ href: "/admin/submissions", label: "Submissions" }, { label: s.title }]}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-card bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-lg font-bold text-fg">Photos ({photos.length})</h2>
            {photos.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-btn bg-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover transition-transform hover:scale-105" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No photos were uploaded.</p>
            )}
            {s.videoFile && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-bold text-fg">Video</h3>
                <video src={s.videoFile} controls preload="metadata" playsInline className="aspect-video w-full rounded-btn bg-navy-900" data-testid="submission-video" />
              </div>
            )}
          </section>
          <section className="rounded-card bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-lg font-bold text-fg">Details</h2>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                ["Category", s.category?.nameEn ?? "—"],
                ["Deal", s.dealType === "RENT" ? `Rent ${rentSuffix(s.rentPeriod)}` : "Sale"],
                ["Expected price", s.expectedPrice != null ? `${formatETB(s.expectedPrice)}${s.isNegotiable ? " · negotiable" : ""}` : s.isNegotiable ? "Negotiable" : "—"],
                ["Area", s.area?.nameEn ?? "—"],
                ...specs.map((x) => [x.label, x.value]),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-semibold text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            {s.details && <p className="mt-5 rounded-btn bg-bg-2 p-4 text-sm whitespace-pre-line text-fg-2">{s.details}</p>}
            {s.status === "REJECTED" && s.rejectReason && <p className="mt-4 rounded-btn bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">Rejected: {s.rejectReason}</p>}
          </section>
        </div>
        <aside>
          <div className="space-y-4 rounded-card border-2 border-red-500 bg-surface p-5 shadow-card xl:sticky xl:top-24">
            <p className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-300">
              <Lock className="size-4" /> Submitter — private
            </p>
            <p className="text-lg font-bold text-fg">{s.name}</p>
            <SubmissionActions id={s.id} title={s.title} isAdmin={session.user.role === "ADMIN"} status={s.status} name={s.name} phone={s.phone} notes={s.staffNotes} linkedListingId={s.linkedListingId} />
          </div>
        </aside>
      </div>
    </>
  );
}
