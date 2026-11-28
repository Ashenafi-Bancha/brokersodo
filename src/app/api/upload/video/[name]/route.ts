import { open, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { MAX_VIDEO_BYTES, checkLocalTicket, localVideoPath } from "@/lib/storage/video";

export const dynamic = "force-dynamic";

/**
 * Development only: receives a video for a signed local upload link. In production the
 * browser uploads straight to object storage and this route is not used.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_UPLOADS !== "true") return new Response("Not found", { status: 404 });
  const { name } = await params;
  const q = new URL(req.url).searchParams;
  const size = Number(q.get("size"));
  if (!checkLocalTicket(name, size, Number(q.get("exp")), q.get("sig") ?? "")) return new Response("Forbidden", { status: 403 });
  if (!req.body) return new Response("Empty", { status: 400 });
  const file = localVideoPath(name);
  await mkdir(path.dirname(file), { recursive: true });
  const fh = await open(file, "w");
  const reader = req.body.getReader();
  let seen = 0;
  try {
    // Plain read loop: stops as soon as the body is larger than the signed size.
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      seen += value.byteLength;
      if (seen > Math.min(size, MAX_VIDEO_BYTES)) throw new Error("too large");
      await fh.write(value);
    }
    await fh.close();
  } catch {
    await reader.cancel().catch(() => {});
    await fh.close().catch(() => {});
    await unlink(file).catch(() => {});
    return new Response("Upload failed", { status: 413 });
  }
  return new Response(null, { status: 200 });
}
