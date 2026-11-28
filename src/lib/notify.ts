import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Kinds of account updates; text lives in messages under account.notify.<TYPE>. */
export type NotifyType =
  | "APPLICATION_STATUS"
  | "NEW_APPLICANT"
  | "JOB_STATUS"
  | "TUTOR_STATUS"
  | "TALENT_STATUS"
  | "TUTOR_REQUEST_STATUS"
  | "NEW_STUDENT"
  | "TALENT_REQUEST_STATUS"
  | "COMPANY_VERIFIED"
  | "STORE_STATUS";

/**
 * Adds an update to a member's account. Does nothing for records without an account,
 * and never lets a notification problem break the action that caused it.
 */
export async function notify(memberId: string | null | undefined, type: NotifyType, data: Record<string, string> = {}, link?: string) {
  if (!memberId) return;
  try {
    await db.notification.create({ data: { memberId, type, data: data as Prisma.InputJsonObject, link: link ?? null } });
  } catch (e) {
    console.error("[notify]", type, e);
  }
}
