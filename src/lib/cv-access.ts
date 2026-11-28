import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMember } from "@/lib/member-auth";

export const CV_MAX_BYTES = 3 * 1024 * 1024;

/**
 * Who may open a CV:
 *  - the job seeker who owns it,
 *  - active staff,
 *  - a verified employer, for people who applied to one of that employer's jobs.
 */
export async function canOpenCv(cvId: string): Promise<boolean> {
  const cv = await db.cvFile.findUnique({ where: { id: cvId }, select: { seeker: { select: { memberId: true } } } });
  if (!cv) return false;
  const ownerMemberId = cv.seeker.memberId;

  const me = await getMember();
  if (me && ownerMemberId === me.id) return true;

  const session = await auth().catch(() => null);
  if (session?.user?.id) {
    const staff = await db.user.findUnique({ where: { id: session.user.id }, select: { isActive: true } });
    if (staff?.isActive) return true;
  }

  if (me && ownerMemberId) {
    const company = await db.company.findUnique({ where: { memberId: me.id }, select: { verified: true } });
    if (company?.verified) {
      const applied = await db.jobApplication.findFirst({ where: { memberId: ownerMemberId, job: { memberId: me.id } }, select: { id: true } });
      if (applied) return true;
    }
  }
  return false;
}
