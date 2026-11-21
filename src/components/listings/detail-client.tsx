"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Link2, Phone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacebookIcon, TelegramIcon, WhatsAppIcon } from "@/components/layout/icons";
import { pushRecent } from "@/lib/favorites";

/** Tap-to-copy reference code. */
export function RefCode({ code }: { code: string }) {
  const t = useTranslations("listing");
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-pill border-[1.5px] border-dashed border-line-strong bg-bg-2 px-3 font-mono text-sm font-bold text-fg hover:border-primary"
    >
      <span className="font-sans text-xs font-semibold text-muted">{t("ref")}</span>
      {code}
      {copied ? <Check className="size-4 text-sold" /> : <Copy className="size-4 text-muted" />}
      <span className="sr-only">{t("copyRef")}</span>
      <span role="status" className="sr-only">{copied ? t("copied") : ""}</span>
    </button>
  );
}

/** Share: Web Share API on mobile, explicit buttons everywhere. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const t = useTranslations("listing");
  const [canShare, setCanShare] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);
  React.useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);
  const text = `${title} — BrokerSodo`;
  const link = "grid size-11 place-items-center rounded-full text-white transition-transform hover:scale-105";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canShare && (
        <Button variant="outline" size="sm" onClick={() => navigator.share({ title: text, url }).catch(() => {})}>
          <Share2 /> {t("share")}
        </Button>
      )}
      <a className={`${link} bg-telegram`} href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" aria-label={`${t("share")}: Telegram`}>
        <TelegramIcon className="size-5" />
      </a>
      <a className={`${link} bg-whatsapp`} href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label={`${t("share")}: WhatsApp`}>
        <WhatsAppIcon className="size-5" />
      </a>
      <a className={`${link} bg-[#1877F2]`} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label={`${t("share")}: Facebook`}>
        <FacebookIcon className="size-5" />
      </a>
      <button
        type="button"
        className={`${link} cursor-pointer bg-navy-900 dark:bg-navy-600`}
        aria-label={linkCopied ? t("linkCopied") : t("copyLink")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 1600);
          } catch {
            /* ignore */
          }
        }}
      >
        {linkCopied ? <Check className="size-5" /> : <Link2 className="size-5" />}
      </button>
    </div>
  );
}

/** Counts one view per visitor per day (server de-duplicates) and records "recently viewed". */
export function ViewTracker({ id }: { id: string }) {
  React.useEffect(() => {
    pushRecent(id);
    const key = `bs:viewed:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    const timer = setTimeout(() => {
      fetch("/api/views", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }), keepalive: true }).catch(() => {});
    }, 2500); // only count visitors who actually stay
    return () => clearTimeout(timer);
  }, [id]);
  return null;
}

/** Mobile sticky contact bar. */
export function MobileContactBar({ tel, telegram, whatsapp }: { tel: string; telegram: string; whatsapp: string }) {
  const t = useTranslations("listing");
  return (
    <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-line bg-bg p-3 md:bottom-0 lg:hidden">
      <Button asChild variant="call" size="default">
        <a href={tel}>
          <Phone /> {t("callBrokerSodo")}
        </a>
      </Button>
      <Button asChild variant="telegram" size="icon" aria-label={t("telegram")}>
        <a href={telegram} target="_blank" rel="noopener noreferrer">
          <TelegramIcon />
        </a>
      </Button>
      <Button asChild variant="whatsapp" size="icon" aria-label={t("whatsapp")}>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon />
        </a>
      </Button>
    </div>
  );
}
