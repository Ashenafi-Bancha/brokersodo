import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { stat, unlink } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetBucketCorsCommand, HeadObjectCommand, PutBucketCorsCommand, PutObjectCommand, S3Client, type CORSRule } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Env, s3PublicBase } from "./s3";

/**
 * Optional property videos (max 50 MB). The browser uploads straight to AletCloud Object
 * Storage with a short-lived signed link, so large files never pass through the app server.
 * Before a video is saved on a listing, the server checks the stored object's real size and type.
 * In development (no S3) the file goes to /public/uploads/videos through a signed local route.
 */

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const NAME = /^[0-9a-f-]{36}\.(mp4|webm|mov)$/;

const s3Configured = () => {
  const e = s3Env();
  return Boolean(e.endpoint && e.bucket && e.accessKeyId && e.secretAccessKey);
};

let cached: S3Client | null = null;
function client() {
  const env = s3Env();
  cached ??= new S3Client({
    endpoint: env.endpoint,
    region: env.region,
    forcePathStyle: true,
    credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return cached;
}

const sign = (value: string) => createHmac("sha256", process.env.AUTH_SECRET ?? "dev").update(`video:${value}`).digest("hex");

/** Origins allowed to upload from the browser. */
function siteOrigins() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://brokersodo.com").replace(/\/$/, "");
  const out = new Set([site]);
  try {
    const u = new URL(site);
    out.add(`${u.protocol}//${u.host.startsWith("www.") ? u.host.slice(4) : `www.${u.host}`}`);
  } catch {}
  return [...out];
}

let corsReady: Promise<void> | null = null;
/**
 * Lets browsers on our site PUT videos into the bucket (CORS). Keeps any rules already
 * there and only adds ours once per server start.
 */
function ensureBucketCors() {
  corsReady ??= (async () => {
    const Bucket = s3Env().bucket;
    const origins = siteOrigins();
    let rules: CORSRule[] = [];
    try {
      rules = (await client().send(new GetBucketCorsCommand({ Bucket }))).CORSRules ?? [];
    } catch {
      rules = []; // No CORS configuration yet.
    }
    const covered = origins.every((o) => rules.some((r) => r.AllowedOrigins?.includes(o) && r.AllowedMethods?.includes("PUT")));
    if (covered) return;
    rules.push({ AllowedOrigins: origins, AllowedMethods: ["PUT", "GET", "HEAD"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 3600 });
    await client().send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: { CORSRules: rules } }));
  })().catch((e) => {
    corsReady = null; // Try again next time.
    console.error("[video] could not set bucket CORS", e);
  });
  return corsReady;
}

export type VideoTicket = { uploadUrl: string; headers: Record<string, string>; url: string };

/** A one-time upload link for one video of the given type and exact size. */
export async function createVideoUpload(contentType: string, size: number): Promise<VideoTicket> {
  const ext = VIDEO_TYPES[contentType];
  if (!ext) throw new Error("type");
  if (!Number.isInteger(size) || size <= 0 || size > MAX_VIDEO_BYTES) throw new Error("size");
  const name = `${randomUUID()}.${ext}`;
  if (s3Configured()) {
    await ensureBucketCors();
    const Key = `videos/${name}`;
    const uploadUrl = await getSignedUrl(
      client(),
      new PutObjectCommand({ Bucket: s3Env().bucket, Key, ContentType: contentType, ContentLength: size, CacheControl: "public, max-age=31536000, immutable" }),
      { expiresIn: 600, signableHeaders: new Set(["content-type", "content-length"]) },
    );
    return { uploadUrl, headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" }, url: `${s3PublicBase()}/${Key}` };
  }
  const exp = Date.now() + 600_000;
  const sig = sign(`${name}|${size}|${exp}`);
  return { uploadUrl: `/api/upload/video/${name}?size=${size}&exp=${exp}&sig=${sig}`, headers: { "Content-Type": contentType }, url: `/uploads/videos/${name}` };
}

/** Checks a local upload link (development only). */
export function checkLocalTicket(name: string, size: number, exp: number, sig: string) {
  if (!NAME.test(name) || exp < Date.now() || size <= 0 || size > MAX_VIDEO_BYTES) return false;
  const want = Buffer.from(sign(`${name}|${size}|${exp}`));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}
export const localVideoPath = (name: string) => path.join(process.cwd(), "public", "uploads", "videos", name);

/** The file name if the URL is one of our stored videos, else null. Never trusts anything else. */
function videoName(url: string | null | undefined): string | null {
  if (!url) return null;
  const base = s3Configured() ? `${s3PublicBase()}/videos/` : "/uploads/videos/";
  if (!url.startsWith(base)) return null;
  const name = url.slice(base.length);
  return NAME.test(name) ? name : null;
}

/**
 * Returns the URL if it points to a finished upload in our storage that is a video of
 * 50 MB or less, otherwise null (forms then save no video).
 */
export async function verifiedVideo(url: string | null | undefined): Promise<string | null> {
  const name = videoName(url);
  if (!name) return null;
  try {
    if (s3Configured()) {
      const head = await client().send(new HeadObjectCommand({ Bucket: s3Env().bucket, Key: `videos/${name}` }));
      const size = Number(head.ContentLength ?? 0);
      if (size <= 0 || size > MAX_VIDEO_BYTES || !String(head.ContentType ?? "").startsWith("video/")) {
        await removeVideo(url);
        return null;
      }
    } else {
      const s = await stat(localVideoPath(name));
      if (s.size <= 0 || s.size > MAX_VIDEO_BYTES) return null;
    }
    return url!;
  } catch {
    return null;
  }
}

export async function removeVideo(url: string | null | undefined) {
  const name = videoName(url);
  if (!name) return;
  if (s3Configured()) await client().send(new DeleteObjectCommand({ Bucket: s3Env().bucket, Key: `videos/${name}` })).catch(() => {});
  else await unlink(localVideoPath(name)).catch(() => {});
}
