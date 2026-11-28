import "server-only";
import sharp, { type Metadata } from "sharp";
import { localStorage } from "./local";
import { s3Env, s3IdFromUrl, s3Storage } from "./s3";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, type StorageProvider, type StoredImage } from "./types";

export * from "./types";

/** Uses S3-compatible storage (AletCloud) when configured, otherwise local files in development. */
export function getStorage(): StorageProvider {
  if (s3Configured()) return s3Storage;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_UPLOADS !== "true") {
    throw new UploadError("Image storage is not configured");
  }
  return localStorage;
}

export class UploadError extends Error {}

function s3Configured() {
  const e = s3Env();
  return Boolean(e.endpoint && e.bucket && e.accessKeyId && e.secretAccessKey);
}

/** Normalises a client-sent photo. Returns null unless it is a file our storage created. */
export function trustedPhoto<T extends { url: string; publicId?: string | null }>(photo: T): T | null {
  if (s3Configured()) {
    const id = s3IdFromUrl(photo.url);
    return id ? { ...photo, publicId: `s3:${id}` } : null;
  }
  return /^\/uploads\/(?:submissions|stores)\/[0-9a-f-]{36}\.webp$/.test(photo.url) ? { ...photo, publicId: `local:${photo.url.slice("/uploads/".length)}` } : null;
}

/** Validate type and size, sniff the real format with sharp, then store. */
export async function storeImage(file: File, folder: string): Promise<StoredImage> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new UploadError("Only JPG, PNG, WebP or HEIC images are allowed");
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("Image is too large (max 8 MB)");
  const buf = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    throw new UploadError("That file is not a valid image");
  }
  if (!meta.width || !meta.height || meta.width > 12000 || meta.height > 12000) {
    throw new UploadError("Invalid image dimensions");
  }
  const stored = await getStorage().upload(buf, { folder });
  stored.blurData = await blurDataUrl(buf).catch(() => null);
  return stored;
}

export async function blurDataUrl(buf: Buffer): Promise<string> {
  const tiny = await sharp(buf).resize(12, 9, { fit: "cover" }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${tiny.toString("base64")}`;
}
