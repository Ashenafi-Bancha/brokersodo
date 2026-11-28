"use server";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { adminAction, logActivity, revalidatePublic, type ActionResult } from "./_helpers";

/** Verifying a company lets its owner see applicants' names and phones for their own jobs. */
export async function setCompanyVerifiedAction(companyId: string, verified: boolean): Promise<ActionResult> {
  return adminAction(["ADMIN", "BROKER"], async (session) => {
    const c = await db.company.update({ where: { id: companyId }, data: { verified: !!verified }, select: { name: true, memberId: true } });
    if (verified) await notify(c.memberId, "COMPANY_VERIFIED", { name: c.name }, "/account/employer");
    // Their jobs show the verified badge too.
    await db.jobPost.updateMany({ where: { companyId }, data: { employerVerified: !!verified } });
    await logActivity(session, verified ? "verify" : "unverify", "Company", companyId, `${c.name} ${verified ? "verified" : "unverified"}`);
    revalidatePublic();
    return { ok: true, message: verified ? "Company verified" : "Verification removed" };
  });
}

/** Deactivating signs the member out everywhere at once. Their profiles stay for staff to review. */
export async function setMemberActiveAction(memberId: string, active: boolean): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    const m = await db.member.update({ where: { id: memberId }, data: { isActive: !!active }, select: { name: true } });
    if (!active) await db.memberSession.deleteMany({ where: { memberId } });
    await logActivity(session, active ? "activate" : "deactivate", "Member", memberId, `Member ${m.name} ${active ? "reactivated" : "deactivated"}`);
    return { ok: true, message: active ? "Account reactivated" : "Account deactivated and signed out" };
  });
}
