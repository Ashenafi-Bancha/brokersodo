import "server-only";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * Member (visitor) accounts: job seekers, tutors, families and employers.
 *
 * Kept apart from the staff Auth.js login on purpose: a member session can never open
 * /admin, and staff permissions never depend on member data. Sessions live in the
 * database, so signing out or deactivating an account ends them at once. The cookie
 * holds a random token; only its SHA-256 is stored.
 */

const SESSION_DAYS = 30;
const secure = process.env.NODE_ENV === "production";
// __Host- cookies must be Secure, host-only and Path=/ — the strongest cookie scoping browsers offer.
export const MEMBER_COOKIE = secure ? "__Host-bs_member" : "bs_member";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const hashMemberPassword = (pw: string) => bcrypt.hash(pw, 12);
export const checkMemberPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

let _dummy: Promise<string> | null = null;
/** Compare against a throwaway hash so unknown phones take as long as wrong passwords. */
export const equaliseTiming = async (pw: string) => bcrypt.compare(pw, await (_dummy ??= bcrypt.hash("timing-equaliser", 12)));

export async function startMemberSession(memberId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.memberSession.create({ data: { id: hashToken(token), memberId, expiresAt } });
  (await cookies()).set(MEMBER_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", expires: expiresAt });
  // Opportunistic clean-up of expired sessions.
  if (Math.random() < 0.05) void db.memberSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
}

export async function endMemberSession() {
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value;
  if (token) await db.memberSession.deleteMany({ where: { id: hashToken(token) } }).catch(() => {});
  jar.delete(MEMBER_COOKIE);
}

/** Ends every session of a member except the current one (after a password change). */
export async function endOtherMemberSessions(memberId: string) {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  await db.memberSession.deleteMany({ where: { memberId, ...(token ? { id: { not: hashToken(token) } } : {}) } });
}

export type CurrentMember = { id: string; name: string; phone: string };

/** The signed-in member for this request, or null. Re-checks the database on every request. */
export const getMember = cache(async (): Promise<CurrentMember | null> => {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const s = await db.memberSession.findUnique({
    where: { id: hashToken(token) },
    select: { expiresAt: true, member: { select: { id: true, name: true, phone: true, isActive: true } } },
  });
  if (!s || s.expiresAt < new Date() || !s.member.isActive) return null;
  return { id: s.member.id, name: s.member.name, phone: s.member.phone };
});

/** For account pages: send visitors to sign in, then back here. */
export async function requireMemberPage(locale: string, next: string): Promise<CurrentMember> {
  const m = await getMember();
  if (!m) {
    const prefix = locale === "am" ? "/am" : "";
    redirect(`${prefix}/account/sign-in?next=${encodeURIComponent(next)}`);
  }
  return m;
}

/** Keeps sign-in redirects on this site and inside the account area or a job/tutor page. */
export function safeNext(raw: unknown): string {
  // Paths are kept without the locale prefix; callers add it with localePath().
  const raw2 = typeof raw === "string" ? raw : "";
  const v = raw2 === "/am" ? "/" : raw2.startsWith("/am/") ? raw2.slice(3) : raw2;
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return "/account";
  if (v.startsWith("/admin")) return "/account";
  return v.slice(0, 300);
}
