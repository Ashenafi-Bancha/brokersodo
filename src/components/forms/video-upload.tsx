"use client";
import * as React from "react";
import { Film, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type VideoLabels = { add: string; hint: string; uploading: string; remove: string; tooBig: string; badType: string; failed: string };

type Ticket = { ok: true; data?: { uploadUrl: string; headers: Record<string, string>; url: string } } | { ok: false; error: string };

const TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX = 50 * 1024 * 1024;

/**
 * One optional video (MP4, WebM or MOV, up to 50 MB). The file goes straight to storage
 * with a signed link from `requestTicket`; `onChange` receives the stored URL.
 */
export function VideoUpload({
  value,
  onChange,
  requestTicket,
  labels,
  className,
}: {
  value: string | null | undefined;
  onChange: (url: string) => void;
  requestTicket: (input: { type: string; size: number }) => Promise<Ticket>;
  labels: VideoLabels;
  className?: string;
}) {
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const xhr = React.useRef<XMLHttpRequest | null>(null);
  React.useEffect(() => () => xhr.current?.abort(), []);

  async function upload(file: File) {
    setError(null);
    // Some phones report an empty type for .mov files.
    const type = file.type || (file.name.toLowerCase().endsWith(".mov") ? "video/quicktime" : "");
    if (!TYPES.includes(type)) return setError(labels.badType);
    if (file.size > MAX) return setError(labels.tooBig);
    setProgress(0);
    const t = await requestTicket({ type, size: file.size }).catch(() => null);
    if (!t || !t.ok || !t.data) {
      setProgress(null);
      return setError(labels.failed);
    }
    const { uploadUrl, headers, url } = t.data;
    const req = new XMLHttpRequest();
    xhr.current = req;
    req.open("PUT", uploadUrl);
    for (const [k, v] of Object.entries(headers)) req.setRequestHeader(k, v);
    req.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    req.onload = () => {
      setProgress(null);
      if (req.status >= 200 && req.status < 300) onChange(url);
      else setError(labels.failed);
    };
    req.onerror = () => {
      setProgress(null);
      setError(labels.failed);
    };
    req.send(file);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value ? (
        <div className="relative overflow-hidden rounded-btn bg-navy-900">
          <video src={value} controls preload="metadata" playsInline className="aspect-video w-full" />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={labels.remove}
            className="absolute top-2 right-2 grid size-9 cursor-pointer place-items-center rounded-full bg-white/90 text-navy-900 shadow"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-btn border-2 border-dashed border-line-strong p-4 text-center text-sm font-bold text-muted hover:border-primary hover:text-primary",
            progress !== null && "pointer-events-none",
          )}
        >
          {progress !== null ? <Loader2 className="size-7 animate-spin" /> : <Film className="size-7" />}
          <span>{progress !== null ? `${labels.uploading} ${progress}%` : labels.add}</span>
          {progress !== null && (
            <span className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-pill bg-line" aria-hidden>
              <span className="block h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
            </span>
          )}
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            className="sr-only"
            disabled={progress !== null}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
      <p className="text-xs text-muted">{labels.hint}</p>
      {error && (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}
