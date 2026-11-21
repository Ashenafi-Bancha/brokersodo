import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireStaffPage } from "@/lib/auth";
import { getListingForEdit } from "@/server/queries/admin";
import { formatETB, rentSuffix } from "@/lib/format";
import { sanitizeRichText } from "@/lib/sanitize";
import { formatAttributeValue, parseAttributeSchema } from "@/lib/validators/attribute-schema";

export const metadata: Metadata = { title: "Preview" };

/** Staff preview of how the public page will look (works for drafts). Owner info is intentionally not shown. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const l = await getListingForEdit(id);
  if (!l) notFound();
  const fields = parseAttributeSchema(l.category.attributeSchema);
  const attrs = (l.attributes ?? {}) as Record<string, unknown>;
  const specs = fields.map((f) => ({ label: f.labelEn, value: formatAttributeValue(f, attrs[f.key]) })).filter((s) => s.value);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-btn bg-yellow-500 px-4 py-3 font-semibold text-navy-900">
        <span className="inline-flex items-center gap-2">
          <Eye className="size-4" /> Preview — {l.status === "PUBLISHED" ? "this listing is live" : `status: ${l.status.toLowerCase()} (not public)`}
        </span>
        <Link href={`/admin/listings/${l.id}`} className="inline-flex items-center gap-1 underline">
          <ArrowLeft className="size-4" /> Back to edit
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {l.images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.id} src={img.url} alt={img.alt ?? ""} className={`aspect-[4/3] w-full rounded-btn object-cover ${i === 0 ? "col-span-2 row-span-2 sm:col-span-2" : ""}`} />
            ))}
            {l.images.length === 0 && <div className="col-span-full grid aspect-[4/3] place-items-center rounded-card bg-bg-2 text-muted">No photos</div>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={l.dealType === "RENT" ? "rent" : "sale"}>{l.dealType === "RENT" ? "For rent" : "For sale"}</Badge>
            {l.isVerified && <Badge variant="verified">Verified</Badge>}
            {l.isInspected && <Badge variant="inspected">Inspected</Badge>}
            {l.featured && <Badge variant="featured">★ Featured</Badge>}
            {l.isNegotiable && <Badge variant="negotiable">Negotiable</Badge>}
          </div>
          <h1 className="text-3xl font-extrabold text-fg">{l.titleEn}</h1>
          <p className="font-brand text-3xl text-price">
            {l.priceOnRequest || l.price == null ? "Price on request" : `${formatETB(l.price)} ${rentSuffix(l.rentPeriod)}`}
          </p>
          <p className="text-sm text-muted">
            {l.refCode} · {l.category.nameEn}
            {l.area ? ` · ${l.area.nameEn}` : ""}
          </p>
          {specs.length > 0 && (
            <dl className="grid overflow-hidden rounded-card bg-surface shadow-card sm:grid-cols-2">
              {specs.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 border-b border-line px-5 py-3 text-sm">
                  <dt className="text-muted">{s.label}</dt>
                  <dd className="font-semibold text-fg">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="prose-bs rounded-card bg-surface p-6 shadow-card" dangerouslySetInnerHTML={{ __html: sanitizeRichText(l.descriptionEn) }} />
        </div>
        <aside className="h-fit rounded-card bg-surface p-5 shadow-card">
          <p className="font-bold text-fg">Contact panel</p>
          <p className="mt-1 text-sm text-muted">On the public page buyers see Call / Telegram / WhatsApp buttons to BrokerSodo and the inquiry form. Owner details are never shown.</p>
        </aside>
      </div>
    </div>
  );
}
