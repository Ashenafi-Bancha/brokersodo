"use client";
import * as React from "react";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Pilcrow, RemoveFormatting } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight rich-text editor (contentEditable + a small toolbar).
 * Output is HTML; it is sanitised on the server (allow-list) before saving.
 */
export function RichTextEditor({
  value,
  onChange,
  id,
  placeholder,
  minHeight = 180,
  lang,
}: {
  value: string;
  onChange: (html: string) => void;
  id: string;
  placeholder?: string;
  minHeight?: number;
  lang?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const lastValue = React.useRef(value);

  React.useEffect(() => {
    if (ref.current && value !== lastValue.current) {
      ref.current.innerHTML = value;
      lastValue.current = value;
    }
  }, [value]);
  React.useEffect(() => {
    if (ref.current) ref.current.innerHTML = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    const html = ref.current?.innerHTML ?? "";
    lastValue.current = html;
    onChange(html === "<br>" ? "" : html);
  };
  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const tools = [
    { icon: Bold, label: "Bold", run: () => exec("bold") },
    { icon: Italic, label: "Italic", run: () => exec("italic") },
    { icon: Heading2, label: "Heading", run: () => exec("formatBlock", "<h3>") },
    { icon: Pilcrow, label: "Paragraph", run: () => exec("formatBlock", "<p>") },
    { icon: List, label: "Bullet list", run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", run: () => exec("insertOrderedList") },
    {
      icon: Link2,
      label: "Link",
      run: () => {
        const url = window.prompt("Link URL (https://…)");
        if (url && /^https?:\/\//.test(url)) exec("createLink", url);
      },
    },
    { icon: RemoveFormatting, label: "Clear formatting", run: () => exec("removeFormat") },
  ];

  return (
    <div className="overflow-hidden rounded-btn border-[1.5px] border-line-strong bg-bg focus-within:border-[var(--input-focus)]">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 border-b border-line bg-bg-2 p-1">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.label}
            aria-label={t.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.run}
            className="grid size-8 cursor-pointer place-items-center rounded-sm text-fg-2 hover:bg-surface hover:text-fg"
          >
            <t.icon className="size-4" />
          </button>
        ))}
      </div>
      <div
        id={id}
        ref={ref}
        lang={lang}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          // Paste as plain text to avoid foreign styles
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className={cn(
          "prose-bs max-w-none px-3.5 py-3 text-[15px] outline-none",
          "empty:before:text-muted empty:before:content-[attr(data-placeholder)]",
        )}
      />
    </div>
  );
}
