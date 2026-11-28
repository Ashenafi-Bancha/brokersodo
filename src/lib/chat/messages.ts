import type Anthropic from "@anthropic-ai/sdk";

export type ChatHistory = { role: "VISITOR" | "AI" | "STAFF" | "SYSTEM"; text: string }[];

/**
 * The conversation sent to Claude: visitor turns are "user", AI and staff replies are
 * "assistant", chat notes are left out, it always starts with the visitor, and the site
 * data for this question comes last as an operator note.
 */
export function buildMessages(history: ChatHistory, siteData: string): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = history
    .filter((m) => m.role !== "SYSTEM" && m.text.trim())
    .slice(-16)
    .map((m) => ({ role: m.role === "VISITOR" ? ("user" as const) : ("assistant" as const), content: m.text }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  messages.push({ role: "system", content: `<site_data>\n${siteData || "No matching site data."}\n</site_data>` });
  return messages;
}
