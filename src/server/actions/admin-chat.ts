"use server";
import { db } from "@/lib/db";
import { systemText } from "@/lib/chat/session";
import { adminAction, logActivity, type ActionResult } from "./_helpers";

const STAFF = ["ADMIN", "BROKER"] as const;

/** Staff reply in a chat. The first staff reply takes the chat over from the AI. */
export async function staffChatReplyAction(conversationId: string, text: string): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    const body = String(text ?? "").trim().slice(0, 2000);
    if (!body) return { ok: false, error: "Write a message first" };
    const convo = await db.chatConversation.findUnique({ where: { id: conversationId }, select: { status: true, locale: true } });
    if (!convo) return { ok: false, error: "Chat not found" };
    const staffUser = await db.user.findUnique({ where: { id: session.user.id }, select: { name: true } });
    if (convo.status !== "STAFF") {
      await db.chatMessage.create({ data: { conversationId, role: "SYSTEM", text: systemText("staffJoined", convo.locale) } });
    }
    await db.chatMessage.create({ data: { conversationId, role: "STAFF", text: body, staffName: staffUser?.name ?? "BrokerSodo" } });
    await db.chatConversation.update({ where: { id: conversationId }, data: { status: "STAFF", unreadByStaff: false, lastMessageAt: new Date() } });
    if (convo.status !== "STAFF") await logActivity(session, "update", "ChatConversation", conversationId, "Joined a chat");
    return { ok: true };
  });
}

export async function markChatReadAction(conversationId: string): Promise<ActionResult> {
  return adminAction([...STAFF], async () => {
    await db.chatConversation.updateMany({ where: { id: conversationId, unreadByStaff: true }, data: { unreadByStaff: false } });
    return { ok: true };
  });
}

export async function closeChatAction(conversationId: string): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    const convo = await db.chatConversation.findUnique({ where: { id: conversationId }, select: { status: true, locale: true } });
    if (!convo) return { ok: false, error: "Chat not found" };
    if (convo.status !== "CLOSED") {
      await db.chatMessage.create({ data: { conversationId, role: "SYSTEM", text: systemText("closed", convo.locale) } });
      await db.chatConversation.update({ where: { id: conversationId }, data: { status: "CLOSED", unreadByStaff: false } });
      await logActivity(session, "status", "ChatConversation", conversationId, "Closed a chat");
    }
    return { ok: true, message: "Chat closed" };
  });
}

/** Admin only: delete a chat and its messages (personal data). */
export async function deleteChatAction(conversationId: string): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    await db.chatConversation.delete({ where: { id: conversationId } });
    await logActivity(session, "delete", "ChatConversation", conversationId, "Deleted a chat");
    return { ok: true, message: "Chat deleted" };
  });
}
