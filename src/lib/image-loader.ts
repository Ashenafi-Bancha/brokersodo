"use client";
import { cloudinaryResize, isCloudinary } from "./image";

/**
 * next/image loader. Cloudinary images are resized and served as AVIF/WebP by Cloudinary's CDN.
 * Local images (brand SVGs, seeded placeholders, dev uploads) are pre-optimised and served as-is.
 */
export default function loader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (isCloudinary(src)) return cloudinaryResize(src, width, quality);
  // Local images are pre-sized: one URL per file so the browser never downloads a photo twice.
  if (process.env.NODE_ENV === "production") return src;
  // Dev only: keeps next/image's "loader ignores width" check quiet.
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}w=${width}`;
}
