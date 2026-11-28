import { db } from "@/lib/db";
import { getMember } from "@/lib/member-auth";
import { clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { MAX_AI_TURNS, aiEnabled, offlineText, siteDataFor, streamReply } from "@/lib/chat/assistant";
import { MAX_CHAT_TEXT, conversationFor, hashChatToken, newChatToken, systemText, toPublic } from "@/lib/chat/session";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Poll for new messages (staff replies) since a time. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const convo = await conversationFor(url.searchParams.get("token"));
  if (!convo) return json({ error: "notFound" }, 404);
  const after = url.searchParams.get("after");
  const since = after && !Number.isNaN(Date.parse(after)) ? new Date(after) : new Date(0);
  const messages = await db.chatConversation
    .findUnique({ where: { id: convo.id } })
    .messages({ where: { createdAt: { gt: since } }, orderBy: { createdAt: "asc" }, take: 100 });
  return json({ status: convo.status, messages: (messages ?? []).map(toPublic) });
}

/**
 * Send a message. Starts a conversation when no token is given. While the AI is in charge,
 * the reply streams back as NDJSON lines: {type:"meta"} then {type:"delta"} chunks, then {type:"done"}.
 */
export async function POST(req: Request) {
  let body: { token?: unknown; text?: unknown; locale?: unknown; path?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid" }, 400);
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_CHAT_TEXT) : "";
  if (!text) return json({ error: "empty" }, 400);
  const locale = body.locale === "am" ? "am" : "en";

  const fp = await clientFingerprint();
  if (!(await rateLimit(`chat:${fp}`, 30, 10 * 60)).ok) return json({ error: "rateLimited" }, 429);

  let convo = body.token ? await conversationFor(body.token) : null;
  let token: string | null = null;
  if (!convo) {
    if (!(await rateLimit(`chat-new:${fp}`, 10, 60 * 60)).ok) return json({ error: "rateLimited" }, 429);
    token = newChatToken();
    const me = await getMember().catch(() => null);
    convo = await db.chatConversation.create({
      data: {
        tokenHash: hashChatToken(token),
        memberId: me?.id ?? null,
        locale,
        startPath: typeof body.path === "string" ? body.path.slice(0, 200) : null,
        visitorName: me?.name ?? null,
        visitorPhone: me?.phone ?? null,
        // Without an AI key, chats go straight to staff.
        status: aiEnabled() ? "AI" : "WAITING",
      },
    });
  }
  if (convo.status === "CLOSED") {
    convo = await db.chatConversation.update({ where: { id: convo.id }, data: { status: "WAITING" } });
  }

  const visitorMsg = await db.chatMessage.create({ data: { conversationId: convo.id, role: "VISITOR", text } });
  const toStaff = convo.status !== "AI" || !aiEnabled() || convo.aiTurns >= MAX_AI_TURNS;
  await db.chatConversation.update({
    where: { id: convo.id },
    data: { lastMessageAt: new Date(), ...(toStaff ? { unreadByStaff: true, ...(convo.status === "AI" ? { status: "WAITING" } : {}) } : {}) },
  });

  if (toStaff) {
    const notes = [];
    // Tell the visitor a person will answer: on handover from the AI, or on a new chat while the AI is off.
    if (convo.status === "AI" || (token && !aiEnabled())) {
      notes.push(await db.chatMessage.create({ data: { conversationId: convo.id, role: "SYSTEM", text: systemText(aiEnabled() ? "handover" : "offline", locale) } }));
    }
    return json({ token, status: convo.status === "AI" ? "WAITING" : convo.status, messages: [toPublic(visitorMsg), ...notes.map(toPublic)] });
  }

  // AI reply, streamed.
  const history = await db.chatMessage.findMany({ where: { conversationId: convo.id }, orderBy: { createdAt: "asc" }, take: 60, select: { role: true, text: true } });
  const convoId = convo.id;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(o)}\n`));
      send({ type: "meta", token, status: "AI", visitor: toPublic(visitorMsg) });
      let reply = "";
      try {
        const siteData = await siteDataFor(text);
        const gen = streamReply(history, siteData);
        for (;;) {
          const r = await gen.next();
          if (r.done) {
            if (r.value.refused && !reply) reply = offlineText(locale);
            break;
          }
          reply += r.value;
          send({ type: "delta", text: r.value });
        }
      } catch (e) {
        console.error("[chat ai]", e);
        if (!reply) {
          reply = offlineText(locale);
          send({ type: "delta", text: reply });
        }
      }
      const saved = await db.chatMessage.create({ data: { conversationId: convoId, role: "AI", text: reply.slice(0, 8000) } });
      await db.chatConversation.update({ where: { id: convoId }, data: { aiTurns: { increment: 1 }, lastMessageAt: new Date() } });
      send({ type: "done", message: toPublic(saved) });
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
