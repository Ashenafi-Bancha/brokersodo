"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Headset, Loader2, Phone, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm, useRunAction } from "./confirm";
import { closeChatAction, deleteChatAction, markChatReadAction, staffChatReplyAction } from "@/server/actions/admin-chat";
import { formatPhoneDisplay, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ChatListRow = { id: string; status: string; name: string | null; phone: string | null; preview: string; unread: boolean; lastMessageAt: string; locale: string };
export type ChatThreadMsg = { id: string; role: string; text: string; staffName: string | null; createdAt: string };
export type ChatThread = { id: string; status: string; name: string | null; phone: string | null; startPath: string | null; locale: string; member: boolean; messages: ChatThreadMsg[] };

const STATUS: Record<string, { label: string; cls: string }> = {
  WAITING: { label: "Waiting for a person", cls: "bg-red-500 text-white" },
  STAFF: { label: "With staff", cls: "bg-yellow-500 text-navy-900" },
  AI: { label: "AI assistant", cls: "bg-bg-2 text-fg-2" },
  CLOSED: { label: "Closed", cls: "bg-bg-2 text-muted" },
};

/** Keeps the inbox fresh while it is open. */
function useAutoRefresh(ms: number) {
  const router = useRouter();
  React.useEffect(() => {
    const id = window.setInterval(() => router.refresh(), ms);
    return () => window.clearInterval(id);
  }, [router, ms]);
}

export function ChatInbox({ rows, selected }: { rows: ChatListRow[]; selected: ChatThread | null }) {
  useAutoRefresh(5000);
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <ul className={cn("flex max-h-[75vh] flex-col gap-1 overflow-y-auto rounded-card bg-surface p-2 shadow-card", selected && "hidden lg:flex")}>
        {rows.length === 0 && <li className="p-4 text-sm text-muted">No chats yet. Visitors start one from the yellow button on the website.</li>}
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/chats?id=${r.id}`}
              className={cn("block rounded-btn p-3 hover:bg-bg-2", selected?.id === r.id && "bg-yellow-50")}
              aria-current={selected?.id === r.id ? "true" : undefined}
            >
              <span className="flex items-center gap-2">
                {r.unread && <span className="size-2.5 shrink-0 rounded-full bg-red-500" aria-label="Unread" />}
                <span className="truncate font-semibold text-fg">{r.name || "Visitor"}</span>
                <span className={cn("ml-auto shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-bold", STATUS[r.status]?.cls)}>{STATUS[r.status]?.label}</span>
              </span>
              <span className="mt-1 block truncate text-sm text-fg-2">{r.preview}</span>
              <span className="text-xs text-muted">
                {relativeTime(r.lastMessageAt)} · {r.locale === "am" ? "Amharic" : "English"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {selected ? <Thread key={selected.id} chat={selected} /> : <p className="hidden rounded-card bg-surface p-8 text-center text-muted shadow-card lg:block">Choose a chat on the left.</p>}
    </div>
  );
}

function Thread({ chat }: { chat: ChatThread }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const [draft, setDraft] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    void markChatReadAction(chat.id);
  }, [chat.id, chat.messages.length]);
  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat.messages.length]);
  const reply = () => {
    const text = draft.trim();
    if (!text) return;
    run(
      () => staffChatReplyAction(chat.id, text),
      () => {
        setDraft("");
        router.refresh();
      },
    );
  };
  return (
    <section className="flex max-h-[75vh] min-h-[60vh] flex-col overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <Link href="/admin/chats" className="text-sm font-bold text-primary lg:hidden">
          ← Chats
        </Link>
        <div className="min-w-0">
          <p className="font-bold text-fg">
            {chat.name || "Visitor"} {chat.member && <span className="text-xs font-semibold text-muted">(member)</span>}
          </p>
          <p className="text-xs text-muted">
            {chat.startPath ? `Started on ${chat.startPath} · ` : ""}
            {chat.locale === "am" ? "Amharic" : "English"}
          </p>
        </div>
        <span className="mr-auto" />
        {chat.phone && (
          <Button asChild variant="call" size="sm">
            <a href={`tel:${chat.phone}`}>
              <Phone /> {formatPhoneDisplay(chat.phone)}
            </a>
          </Button>
        )}
        {chat.status !== "CLOSED" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => closeChatAction(chat.id), () => router.refresh())}>
            <XCircle /> Close
          </Button>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-error"
          aria-label="Delete chat"
          disabled={pending}
          onClick={async () => {
            const ok = await confirm({ title: "Delete this chat?", description: "The conversation is removed for good.", confirmLabel: "Delete", destructive: true });
            if (ok.ok) run(() => deleteChatAction(chat.id), () => router.push("/admin/chats"));
          }}
        >
          <Trash2 />
        </Button>
      </header>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-bg-2 p-4">
        {chat.messages.map((m) =>
          m.role === "SYSTEM" ? (
            <p key={m.id} className="mx-auto w-fit rounded-pill bg-surface px-3 py-1 text-xs font-semibold text-fg-2">
              {m.text}
            </p>
          ) : (
            <div key={m.id} className={cn("flex", m.role === "VISITOR" ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[80%] rounded-card px-3 py-2 text-sm shadow-card", m.role === "VISITOR" ? "bg-surface text-fg" : m.role === "AI" ? "bg-yellow-50 text-fg" : "bg-red-500 text-white")}>
                <p className="mb-0.5 flex items-center gap-1 text-[11px] font-bold opacity-80">
                  {m.role === "AI" ? <Bot className="size-3" /> : m.role === "STAFF" ? <Headset className="size-3" /> : null}
                  {m.role === "VISITOR" ? chat.name || "Visitor" : m.role === "AI" ? "AI assistant" : m.staffName}
                  <span className="font-normal">· {relativeTime(m.createdAt)}</span>
                </p>
                <p className="whitespace-pre-line">{m.text}</p>
              </div>
            </div>
          ),
        )}
      </div>
      <form
        className="flex items-end gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          reply();
        }}
      >
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              reply();
            }
          }}
          aria-label="Reply"
          placeholder={chat.status === "AI" ? "Reply to take over from the AI…" : "Write a reply…"}
          className="min-h-11 flex-1 resize-none rounded-btn border-[1.5px] border-line-strong bg-bg px-3 py-2 text-sm outline-none focus:border-[var(--input-focus)]"
        />
        <Button type="submit" disabled={pending || !draft.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : <Send />} Send
        </Button>
      </form>
    </section>
  );
}
