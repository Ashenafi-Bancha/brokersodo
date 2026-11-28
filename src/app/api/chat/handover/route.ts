import { db } from "@/lib/db";
import { normalizeEthiopianPhone } from "@/lib/format";
import { conversationFor, systemText, toPublic } from "@/lib/chat/session";

export const dynamic = "force-dynamic";

/** "Talk to our team": the AI steps back and the chat appears in the staff inbox. */
export async function POST(req: Request) {
  let body: { token?: unknown; name?: unknown; phone?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const convo = await conversationFor(body.token);
  if (!convo) return Response.json({ error: "notFound" }, { status: 404 });
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phone = typeof body.phone === "string" && body.phone.trim() ? normalizeEthiopianPhone(body.phone) : null;
  if (typeof body.phone === "string" && body.phone.trim() && !phone) return Response.json({ error: "phone" }, { status: 400 });
  const already = convo.status === "WAITING" || convo.status === "STAFF";
  await db.chatConversation.update({
    where: { id: convo.id },
    data: {
      ...(already ? {} : { status: "WAITING" }),
      unreadByStaff: true,
      lastMessageAt: new Date(),
      ...(name ? { visitorName: name } : {}),
      ...(phone ? { visitorPhone: phone } : {}),
    },
  });
  const note = already ? null : await db.chatMessage.create({ data: { conversationId: convo.id, role: "SYSTEM", text: systemText("handover", convo.locale) } });
  return Response.json({ status: already ? convo.status : "WAITING", messages: note ? [toPublic(note)] : [] }, { headers: { "Cache-Control": "no-store" } });
}
