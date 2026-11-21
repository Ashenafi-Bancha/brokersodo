import "server-only";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AuthError, requireStaff, type Role, type StaffSession } from "@/lib/auth";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

/**
 * Wrap every admin mutation: auth + role check (server-side, not just UI),
 * consistent error shape, Zod/Prisma error mapping.
 */
export async function adminAction<T>(
  roles: Role[],
  fn: (session: StaffSession) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const session = await requireStaff(roles);
    return await fn(session);
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    if (e instanceof ZodError) {
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors: e.flatten().fieldErrors as Record<string, string[]> };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return { ok: false, error: `That ${(e.meta?.target as string[] | undefined)?.join(", ") ?? "value"} is already in use.` };
      if (e.code === "P2003") return { ok: false, error: "This record is still used elsewhere and can't be removed." };
      if (e.code === "P2025") return { ok: false, error: "Record not found — it may have been deleted." };
    }
    console.error("[admin action]", e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function logActivity(
  session: StaffSession | null,
  action: string,
  entityType: string,
  entityId: string | null,
  summary?: string,
  meta?: Prisma.InputJsonValue,
) {
  await db.activityLog
    .create({ data: { userId: session?.user.id ?? null, action, entityType, entityId, summary, meta } })
    .catch((e) => console.error("[activity log]", e));
}

/** Invalidate all ISR pages (public site is small; this keeps everything consistent). */
export function revalidatePublic() {
  revalidatePath("/", "layout");
}
