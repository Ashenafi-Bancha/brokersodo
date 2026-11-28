"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Bot, MessageCircle, Phone, X } from "lucide-react";
import { ChatPanel } from "./chat-panel";
import { usePathname } from "@/i18n/navigation";
import { TelegramIcon, WhatsAppIcon } from "./icons";
import { cn } from "@/lib/utils";

/** Floating contact button — expands to Call / Telegram / WhatsApp (all BrokerSodo). CSS-only animation. */
export function ContactFab({ tel, telegram, whatsapp }: { tel: string; telegram: string; whatsapp: string }) {
  const t = useTranslations("fab");
  const tl = useTranslations("listing");
  const tc = useTranslations("chat");
  const [open, setOpen] = React.useState(false);
  const [chat, setChat] = React.useState(false);
  const onListing = usePathname().startsWith("/listings/");
  const items = [
    { href: "#chat", label: tc("open"), Icon: Bot, cls: "bg-yellow-500 text-navy-900!" },
    { href: tel, label: tl("callBrokerSodo"), Icon: Phone, cls: "bg-red-500" },
    { href: telegram, label: tl("telegram"), Icon: TelegramIcon, cls: "bg-telegram" },
    { href: whatsapp, label: tl("whatsapp"), Icon: WhatsAppIcon, cls: "bg-whatsapp" },
  ];
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div
      className={cn(
        "fixed right-4 z-40 flex flex-col items-end gap-3 print:hidden",
        onListing ? "bottom-[calc(160px+env(safe-area-inset-bottom))] md:bottom-24 lg:bottom-6" : "bottom-[calc(88px+env(safe-area-inset-bottom))] md:bottom-6",
      )}
    >
      <ul id="contact-fab-menu" className={cn("flex flex-col items-end gap-3", !open && "pointer-events-none")} aria-hidden={!open}>
        {items.map((it, i) => (
          <li
            key={it.label}
            style={{ transitionDelay: open ? `${(items.length - i - 1) * 40}ms` : "0ms" }}
            className={cn("transition-[opacity,transform] duration-200 ease-out", open ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-90 opacity-0")}
          >
            <a
              href={it.href}
              target={it.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              tabIndex={open ? 0 : -1}
              className="flex items-center gap-2"
              onClick={(e) => {
                if (it.href !== "#chat") return;
                e.preventDefault();
                setOpen(false);
                setChat(true);
              }}
            >
              <span className="rounded-pill bg-surface px-3 py-1.5 text-sm font-bold text-fg shadow-card">{it.label}</span>
              <span className={cn("grid size-12 place-items-center rounded-full text-white shadow-pop", it.cls)}>
                <it.Icon className="size-5" />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <ChatPanel open={chat} onClose={() => setChat(false)} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="contact-fab-menu"
        aria-label={open ? t("close") : t("open")}
        className="grid size-14 cursor-pointer place-items-center rounded-full bg-yellow-500 text-navy-900 shadow-pop transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
