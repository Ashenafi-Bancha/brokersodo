import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/** The visitor's browser keeps a random chat key; only its SHA-256 is stored. */
export const hashChatToken = (token: string) => createHash("sha256").update(`chat:${token}`).digest("hex");
export const newChatToken = () => randomBytes(32).toString("base64url");

export async function conversationFor(token: unknown) {
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  return db.chatConversation.findUnique({ where: { tokenHash: hashChatToken(token) } });
}

export const MAX_CHAT_TEXT = 1000;

export type PublicChatMessage = { id: string; role: "VISITOR" | "AI" | "STAFF" | "SYSTEM"; text: string; staffName: string | null; createdAt: string };

export const toPublic = (m: { id: string; role: PublicChatMessage["role"]; text: string; staffName: string | null; createdAt: Date }): PublicChatMessage => ({
  id: m.id,
  role: m.role,
  text: m.text,
  // Staff are shown by first name only.
  staffName: m.staffName ? m.staffName.split(/\s+/)[0] : null,
  createdAt: m.createdAt.toISOString(),
});

export const systemText = (kind: "handover" | "staffJoined" | "closed" | "offline", locale: string) => {
  const am = locale === "am";
  switch (kind) {
    case "handover":
      return am ? "ቡድናችን በቅርቡ ይመልስልዎታል። በሥራ ሰዓት ብዙውን ጊዜ በጥቂት ደቂቃዎች ውስጥ።" : "Our team will reply here soon — usually within a few minutes during working hours.";
    case "staffJoined":
      return am ? "ከቡድናችን ጋር እያወሩ ነው።" : "You are now talking to our team.";
    case "closed":
      return am ? "ውይይቱ ተዘግቷል። እናመሰግናለን!" : "This chat was closed. Thank you!";
    case "offline":
      return am ? "ረዳቱ አሁን አይገኝም፤ መልዕክትዎ ለቡድናችን ደርሷል።" : "The assistant is offline, so your message went to our team.";
  }
};
