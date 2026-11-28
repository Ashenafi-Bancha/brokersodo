import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { isLikelyBot } from "@/lib/rate-limit";

/**
 * Debounced view counter: one view per visitor per listing per day.
 * Bots and refreshes don't inflate the count. We store only a hash.
 */
export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent");
  if (isLikelyBot(ua)) return new NextResponse(null, { status: 204 });
  let id: unknown;
  try {
    ({ id } = await req.json());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (typeof id !== "string" || !/^[a-z0-9]{10,40}$/i.test(id)) return new NextResponse(null, { status: 400 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0";
  const day = new Date().toISOString().slice(0, 10);
  const key = createHash("sha256").update(`${id}|${ip}|${ua}|${day}|${process.env.AUTH_SECRET ?? ""}`).digest("hex").slice(0, 40);
  try {
    await db.listingView.create({ data: { id: key, listingId: id } });
    await db.listing.updateMany({ where: { id, status: { in: ["PUBLISHED", "UNDER_NEGOTIATION", "RESERVED"] } }, data: { viewCount: { increment: 1 } } });
    if (Math.random() < 0.01) {
      await db.listingView.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 2 * 86400_000) } } });
    }
  } catch {
    // duplicate key → already counted today
  }
  return new NextResponse(null, { status: 204 });
}
