"use client";
import { isStoredVariant, variantUrl } from "./image";

/**
 * next/image loader. Uploaded photos already exist in several sizes, so this picks the right file.
 * Local images (brand assets, sample photos, dev uploads) are pre-optimised and served as-is.
 */
export default function loader({ src, width }: { src: string; width: number; quality?: number }) {
  if (isStoredVariant(src)) return variantUrl(src, width);
  // One URL per file, so the browser never downloads a photo twice.
  if (process.env.NODE_ENV === "production") return src;
  // Dev only: keeps next/image's "loader ignores width" check quiet.
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}w=${width}`;
}
