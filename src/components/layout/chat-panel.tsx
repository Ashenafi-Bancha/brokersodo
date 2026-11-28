"use client";
import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bot, Headset, Loader2, Send, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: "VISITOR" | "AI" | "STAFF" | "SYSTEM"; text: string; staffName: string | null; createdAt: string };
type Status = "AI" | "WAITING" | "STAFF" | "CLOSED";

const KEY = "bs_chat";
const read = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const write = (v: string) => {
  try {
    localStorage.setItem(KEY, v);
  } catch {}
};

/** Renders text with only site-internal markdown links ([label](/path)) made clickable. */
function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]{1,120})\]\((\/[^\s)]{0,200})\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <Link key={m.index} href={m[2]} className="font-bold text-primary underline underline-offset-2">
        {m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className="whitespace-pre-line">{parts}</span>;
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const path = usePathname();
  const [token, setToken] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status>("AI");
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [handover, setHandover] = React.useState(false);
  const [contact, setContact] = React.useState({ name: "", phone: "" });
  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const lastAt = React.useRef<string>(new Date(0).toISOString());

  const addMessages = React.useCallback((list: Msg[]) => {
    if (!list.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev, ...list.filter((m) => !seen.has(m.id))];
      lastAt.current = next.reduce((a, m) => (m.createdAt > a ? m.createdAt : a), lastAt.current);
      return next;
    });
  }, []);

  const poll = React.useCallback(async () => {
    const tk = token ?? read();
    if (!tk) return;
    const r = await fetch(`/api/chat?token=${encodeURIComponent(tk)}&after=${encodeURIComponent(lastAt.current)}`, { cache: "no-store" }).catch(() => null);
    if (!r || !r.ok) return;
    const d = (await r.json()) as { status: Status; messages: Msg[] };
    setStatus(d.status);
    addMessages(d.messages);
  }, [token, addMessages]);

  // Restore an earlier chat on this device.
  React.useEffect(() => {
    if (!open) return;
    const tk = read();
    if (tk && !token) setToken(tk);
    inputRef.current?.focus();
  }, [open, token]);
  React.useEffect(() => {
    if (open && token) void poll();
  }, [open, token, poll]);
  // While staff are in charge, check for replies every 5 seconds.
  React.useEffect(() => {
    if (!open || !token || status === "AI") return;
    const id = window.setInterval(() => void poll(), 5000);
    return () => window.clearInterval(id);
  }, [open, token, status, poll]);
  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setDraft("");
    const tempId = `tmp-${Date.now()}`;
    setMessages((p) => [...p, { id: tempId, role: "VISITOR", text, staffName: null, createdAt: new Date().toISOString() }]);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, text, locale, path }) });
      if (r.status === 429) throw new Error("rate");
      if (!r.ok || !r.body) throw new Error("fail");
      if ((r.headers.get("content-type") ?? "").includes("ndjson")) {
        // AI reply, streamed line by line.
        const aiId = `ai-${Date.now()}`;
        setMessages((p) => [...p, { id: aiId, role: "AI", text: "", staffName: null, createdAt: new Date().toISOString() }]);
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (!line) continue;
            const ev = JSON.parse(line) as { type: string; token?: string | null; text?: string; message?: Msg; visitor?: Msg };
            if (ev.type === "meta") {
              if (ev.token) {
                setToken(ev.token);
                write(ev.token);
              }
              if (ev.visitor) setMessages((p) => p.map((m) => (m.id === tempId ? ev.visitor! : m)));
            } else if (ev.type === "delta" && ev.text) {
              setMessages((p) => p.map((m) => (m.id === aiId ? { ...m, text: m.text + ev.text } : m)));
            } else if (ev.type === "done" && ev.message) {
              setMessages((p) => p.map((m) => (m.id === aiId ? ev.message! : m)));
              lastAt.current = ev.message.createdAt;
            }
          }
        }
      } else {
        const d = (await r.json()) as { token: string | null; status: Status; messages: Msg[] };
        if (d.token) {
          setToken(d.token);
          write(d.token);
        }
        setStatus(d.status);
        setMessages((p) => p.filter((m) => m.id !== tempId));
        addMessages(d.messages);
      }
    } catch (e) {
      setMessages((p) => p.filter((m) => m.id !== tempId));
      setDraft(text);
      setError(e instanceof Error && e.message === "rate" ? t("errorRate") : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function requestTeam() {
    if (!token) {
      setError(t("writeFirst"));
      return;
    }
    setBusy(true);
    setError(null);
    const r = await fetch("/api/chat/handover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...contact }) }).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) {
      setError(r?.status === 400 ? t("phoneInvalid") : t("errorGeneric"));
      return;
    }
    const d = (await r.json()) as { status: Status; messages: Msg[] };
    setStatus(d.status);
    addMessages(d.messages);
    setHandover(false);
  }

  if (!open) return null;
  const withTeam = status === "WAITING" || status === "STAFF";
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label={t("title")}
      className="fixed inset-0 z-50 flex flex-col bg-surface shadow-pop sm:inset-auto sm:right-4 sm:bottom-24 sm:h-[min(640px,80vh)] sm:w-[380px] sm:rounded-card print:hidden"
    >
      <header className="flex items-center gap-3 bg-red-500 px-4 py-3 text-white sm:rounded-t-card">
        <span className="grid size-10 place-items-center rounded-full bg-white/20">{withTeam ? <Headset className="size-5" /> : <Bot className="size-5" />}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{t("title")}</p>
          <p className="truncate text-xs text-white/90">{withTeam ? t("withTeam") : t("subtitle")}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t("close")} className="grid size-10 cursor-pointer place-items-center rounded-full hover:bg-white/15">
          <X className="size-5" />
        </button>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-bg-2 p-4" aria-live="polite">
        <Bubble role="AI" text={t("greeting")} />
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} text={m.text} who={m.role === "STAFF" ? (m.staffName ?? t("team")) : undefined} typing={m.role === "AI" && !m.text} />
        ))}
      </div>

      {handover && (
        <div className="space-y-2 border-t border-line bg-yellow-50 p-3">
          <p className="text-sm font-semibold text-fg">{t("handoverIntro")}</p>
          <div className="grid grid-cols-2 gap-2">
            <input aria-label={t("name")} placeholder={t("name")} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="min-h-10 rounded-btn border border-line-strong bg-surface px-3 text-sm" />
            <input aria-label={t("phone")} placeholder={t("phone")} inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="min-h-10 rounded-btn border border-line-strong bg-surface px-3 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void requestTeam()} className="min-h-10 flex-1 cursor-pointer rounded-btn bg-red-500 px-3 text-sm font-bold text-white disabled:opacity-60">
              {t("handoverSubmit")}
            </button>
            <button type="button" onClick={() => setHandover(false)} className="min-h-10 cursor-pointer rounded-btn px-3 text-sm font-semibold text-fg-2">
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {error && (
          <p role="alert" className="mb-2 text-sm font-medium text-error">
            {error}
          </p>
        )}
        {!withTeam && !handover && (
          <button type="button" onClick={() => setHandover(true)} className="mb-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-pill bg-yellow-500 px-3 text-sm font-bold text-navy-900 hover:bg-yellow-400">
            <Headset className="size-4" /> {t("talkToTeam")}
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            rows={1}
            maxLength={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            aria-label={t("placeholder")}
            placeholder={t("placeholder")}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-btn border-[1.5px] border-line-strong bg-bg px-3 py-2.5 text-base text-fg outline-none focus:border-[var(--input-focus)]"
          />
          <button type="submit" disabled={busy || !draft.trim()} aria-label={t("send")} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-btn bg-red-500 text-white disabled:opacity-50">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </button>
        </form>
        <p className="mt-1.5 text-[11px] text-muted">{withTeam ? t("teamNote") : t("aiNote")}</p>
      </div>
    </section>
  );
}

function Bubble({ role, text, who, typing }: { role: Msg["role"]; text: string; who?: string; typing?: boolean }) {
  if (role === "SYSTEM")
    return <p className="mx-auto max-w-[90%] rounded-pill bg-surface px-3 py-1.5 text-center text-xs font-semibold text-fg-2 shadow-card">{text}</p>;
  const mine = role === "VISITOR";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] rounded-card px-3.5 py-2.5 text-sm shadow-card", mine ? "bg-red-500 text-white" : "bg-surface text-fg")}>
        {who && <p className="mb-0.5 text-xs font-bold text-primary">{who}</p>}
        {typing ? (
          <span className="inline-flex gap-1" aria-label="…">
            <span className="size-1.5 animate-bounce rounded-full bg-muted" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:120ms]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:240ms]" />
          </span>
        ) : mine ? (
          <span className="whitespace-pre-line">{text}</span>
        ) : (
          <RichText text={text} />
        )}
      </div>
    </div>
  );
}
