import "server-only";
import sharp, { type Metadata } from "sharp";
import { cloudinaryStorage } from "./cloudinary";
import { localStorage } from "./local";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, type StorageProvider, type StoredImage } from "./types";

export * from "./types";

/** Swap providers here (e.g. S3 or R2) without touching the rest of the app. */
export function getStorage(): StorageProvider {
  return process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY ? cloudinaryStorage : localStorage;
}

export class UploadError extends Error {}

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
