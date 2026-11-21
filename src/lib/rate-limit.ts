import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Fixed-window rate limiter backed by Postgres (works on Vercel without Redis).
 * Returns ok=false once `limit` hits are recorded for `key` inside `windowSec`.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; remaining: number }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSec * 1000);
  try {
    const rows = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expiresAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."expiresAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < ${now} THEN ${expiresAt} ELSE "RateLimit"."expiresAt" END
      RETURNING "count"`;
    const count = Number(rows[0]?.count ?? 1);
    if (Math.random() < 0.01) void db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => {});
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    // Never block real users because the limiter failed.
    return { ok: true, remaining: limit };
  }
}

/** Hashed client identifier (IP + UA) — we never store raw IPs. */
export async function clientFingerprint(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "0.0.0.0";
  const ua = h.get("user-agent") || "";
  return createHash("sha256")
    .update(`${ip}|${ua}|${process.env.AUTH_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|slurp|preview|facebookexternalhit|telegrambot|whatsapp|headless|lighthouse/i.test(userAgent);
}
