import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { IMAGE_WIDTHS } from "@/lib/image";
import type { StorageProvider, StoredImage } from "./types";

/**
 * S3-compatible storage (AletCloud Object Storage).
 * Each upload creates watermarked public sizes plus one clean original. The original's
 * name is derived with a server secret, so it cannot be guessed from a public photo URL.
 */
sharp.cache(false);
sharp.concurrency(1);

const ID = /^(listings|submissions)\/[0-9a-f-]{36}$/;
const LARGEST = IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];

let cached: S3Client | null = null;
function client() {
  cached ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "et-addis-1",
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return cached;
}
const bucket = () => process.env.S3_BUCKET!;

export function s3PublicBase() {
  const explicit = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  return explicit || `${(process.env.S3_ENDPOINT ?? "").replace(/\/$/, "")}/${process.env.S3_BUCKET}`;
}

const variantKey = (id: string, width: number) => `${id}-w${width}.webp`;
function originalKey(id: string) {
  const tag = createHmac("sha256", process.env.AUTH_SECRET ?? "").update(id).digest("hex").slice(0, 40);
  return `originals/${id.split("/")[0]}/${tag}.webp`;
}

/** The storage id of one of our public photo URLs, or null if the URL is not ours. */
export function s3IdFromUrl(url: string): string | null {
  const base = `${s3PublicBase()}/`;
  if (!url.startsWith(base)) return null;
  const m = url.slice(base.length).match(/^((?:listings|submissions)\/[0-9a-f-]{36})-w(?:480|960|1600)\.webp$/);
  return m ? m[1] : null;
}

const put = (Key: string, Body: Buffer) =>
  client().send(new PutObjectCommand({ Bucket: bucket(), Key, Body, ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable" }));

async function watermarkFor(width: number) {
  const logo = await readFile(path.join(process.cwd(), "public", "brand", "logo-horizontal.png"));
  const target = Math.max(72, Math.round(width * 0.22));
  const { data, info } = await sharp(logo).resize({ width: target }).flatten({ background: "#ffffff" }).png().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function saveImage(input: Buffer, folder: string): Promise<StoredImage> {
  const id = `${folder}/${randomUUID()}`;
  const original = await sharp(input)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  let finalSize = { width: 0, height: 0 };
  for (const w of IMAGE_WIDTHS) {
    const resized = await sharp(original).resize({ width: w, height: w, fit: "inside", withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
    const mark = await watermarkFor(resized.info.width);
    const margin = Math.max(6, Math.round(resized.info.width * 0.015));
    const canPlace = mark.width + margin < resized.info.width && mark.height + margin < resized.info.height;
    const out = await sharp(resized.data)
      .composite(canPlace ? [{ input: mark.data, left: resized.info.width - mark.width - margin, top: resized.info.height - mark.height - margin }] : [])
      .webp({ quality: w === 480 ? 68 : 74 })
      .toBuffer();
    await put(variantKey(id, w), out);
    if (w === LARGEST) finalSize = { width: resized.info.width, height: resized.info.height };
  }
  await put(originalKey(id), original);
  return { url: `${s3PublicBase()}/${variantKey(id, LARGEST)}`, publicId: `s3:${id}`, ...finalSize };
}

export const s3Storage: StorageProvider = {
  name: "s3",
  upload: (file, { folder }) => saveImage(file, folder),
  async remove(publicId) {
    const id = publicId.startsWith("s3:") ? publicId.slice(3) : "";
    if (!ID.test(id)) return;
    const keys = [...IMAGE_WIDTHS.map((w) => variantKey(id, w)), originalKey(id)];
    await Promise.all(keys.map((Key) => client().send(new DeleteObjectCommand({ Bucket: bucket(), Key })).catch(() => {})));
  },
  async copy(image, folder) {
    // The id comes from the URL, never from client-supplied metadata.
    const id = s3IdFromUrl(image.url);
    if (!id) return image;
    const res = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: originalKey(id) }));
    const bytes = await res.Body!.transformToByteArray();
    return { ...(await saveImage(Buffer.from(bytes), folder)), blurData: image.blurData };
  },
};
