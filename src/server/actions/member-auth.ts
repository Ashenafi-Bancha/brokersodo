"use server";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clientFingerprint, rateLimit } from "@/lib/rate-limit";
import {
  checkMemberPassword,
  endMemberSession,
  endOtherMemberSessions,
  equaliseTiming,
  getMember,
  hashMemberPassword,
  startMemberSession,
} from "@/lib/member-auth";
import { accountNameSchema, changePasswordSchema, signInSchema, signUpSchema } from "@/lib/validators/member";
import type { PublicActionResult } from "./public";

function fieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "_")] ??= []).push(i.message);
  return out;
}

export async function signUpAction(input: unknown): Promise<PublicActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (d.website) return { ok: true };
  const fp = await clientFingerprint();
  if (!(await rateLimit(`member-signup:${fp}`, 5, 60 * 60)).ok) return { ok: false, error: "rateLimited" };
  try {
    const member = await db.member.create({
      data: { name: d.name, phone: d.phone, passwordHash: await hashMemberPassword(d.password), lastLoginAt: new Date() },
      select: { id: true },
    });
    await startMemberSession(member.id);
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "phoneTaken", fieldErrors: { phone: ["phone.taken"] } };
    }
    console.error("[member sign-up]", e);
    return { ok: false, error: "generic" };
  }
}

export async function signInAction(input: unknown): Promise<PublicActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const { phone, password } = parsed.data;
  const fp = await clientFingerprint();
  // Per phone (guessing one account) and per device (trying many accounts).
  const [byPhone, byDevice] = await Promise.all([rateLimit(`member-login:${phone}`, 8, 15 * 60), rateLimit(`member-login-fp:${fp}`, 30, 15 * 60)]);
  if (!byPhone.ok || !byDevice.ok) return { ok: false, error: "rateLimited" };
  const m = await db.member.findUnique({ where: { phone }, select: { id: true, passwordHash: true, isActive: true } });
  if (!m || !m.isActive) {
    await equaliseTiming(password);
    return { ok: false, error: "badLogin" };
  }
  if (!(await checkMemberPassword(password, m.passwordHash))) return { ok: false, error: "badLogin" };
  await db.member.update({ where: { id: m.id }, data: { lastLoginAt: new Date() } });
  await startMemberSession(m.id);
  return { ok: true };
}

export async function signOutAction(locale: string) {
  await endMemberSession();
  redirect(locale === "am" ? "/am" : "/");
}

export async function changePasswordAction(input: unknown): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  if (!(await rateLimit(`member-pw:${me.id}`, 6, 15 * 60)).ok) return { ok: false, error: "rateLimited" };
  const m = await db.member.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
  if (!m || !(await checkMemberPassword(parsed.data.current, m.passwordHash))) {
    return { ok: false, error: "invalid", fieldErrors: { current: ["password.wrong"] } };
  }
  await db.member.update({ where: { id: me.id }, data: { passwordHash: await hashMemberPassword(parsed.data.password) } });
  await endOtherMemberSessions(me.id);
  return { ok: true };
}

export async function updateAccountNameAction(input: unknown): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const parsed = accountNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  await db.member.update({ where: { id: me.id }, data: { name: parsed.data.name } });
  return { ok: true };
}
