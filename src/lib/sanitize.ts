import "server-only";
import sanitize from "sanitize-html";

/** Allow-list HTML for rich-text descriptions and CMS pages. */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitize(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "blockquote", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "tel", "mailto"],
    transformTags: {
      a: sanitize.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
      b: "strong",
      i: "em",
    },
  });
}

/** Plain text (for meta descriptions, JSON-LD). */
export function stripHtml(html: string | null | undefined, max = 300): string {
  const text = sanitize(html ?? "", { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
