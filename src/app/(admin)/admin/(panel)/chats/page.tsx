import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ChatInbox } from "@/components/admin/chat-admin";
import { requireStaffPage } from "@/lib/auth";
import { aiEnabled } from "@/lib/chat/assistant";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Chats" };
export const dynamic = "force-dynamic";

const ORDER = { WAITING: 0, STAFF: 1, AI: 2, CLOSED: 3 } as const;

export default async function ChatsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireStaffPage();
  const { id } = await searchParams;
  const [convos, selected] = await Promise.all([
    db.chatConversation.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 200,
      select: {
        id: true,
        status: true,
        visitorName: true,
        visitorPhone: true,
        unreadByStaff: true,
        lastMessageAt: true,
        locale: true,
        messages: { where: { role: { not: "SYSTEM" } }, orderBy: { createdAt: "desc" }, take: 1, select: { text: true } },
      },
    }),
    id
      ? db.chatConversation.findUnique({
          where: { id: id.slice(0, 40) },
          include: { messages: { orderBy: { createdAt: "asc" }, take: 500 } },
        })
      : null,
  ]);
  const rows = convos
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
    .map((c) => ({
      id: c.id,
      status: c.status,
      name: c.visitorName,
      phone: c.visitorPhone,
      preview: c.messages[0]?.text.slice(0, 120) ?? "",
      unread: c.unreadByStaff,
      lastMessageAt: c.lastMessageAt.toISOString(),
      locale: c.locale,
    }));
  const waiting = rows.filter((r) => r.status === "WAITING").length;
  return (
    <>
      <AdminPageHeader
        title="Chats"
        description={`${waiting} waiting for a person. The AI assistant ${aiEnabled() ? "answers visitors first" : "is off (no ANTHROPIC_API_KEY), so every chat comes here"}; visitors tap “Talk to our team” to reach you. Reply to any chat to take it over.`}
        crumbs={[{ label: "Chats" }]}
      />
      <ChatInbox
        rows={rows}
        selected={
          selected
            ? {
                id: selected.id,
                status: selected.status,
                name: selected.visitorName,
                phone: selected.visitorPhone,
                startPath: selected.startPath,
                locale: selected.locale,
                member: !!selected.memberId,
                messages: selected.messages.map((m) => ({ id: m.id, role: m.role, text: m.text, staffName: m.staffName, createdAt: m.createdAt.toISOString() })),
              }
            : null
        }
      />
    </>
  );
}
