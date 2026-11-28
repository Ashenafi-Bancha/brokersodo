import { db } from "@/lib/db";
import { canOpenCv } from "@/lib/cv-access";

export const dynamic = "force-dynamic";

/** Serves a CV only to people allowed to see it (see canOpenCv). Never cached. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cvId = id.slice(0, 40);
  // Same answer for "missing" and "not allowed", so ids cannot be probed.
  if (!(await canOpenCv(cvId))) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const cv = await db.cvFile.findUnique({ where: { id: cvId }, select: { data: true, fileName: true } });
  if (!cv) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const safeName = cv.fileName.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "cv.pdf";
  return new Response(new Uint8Array(cv.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // A PDF never needs scripts or forms from this site.
      "Content-Security-Policy": "sandbox; default-src 'none'; object-src 'self'",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
