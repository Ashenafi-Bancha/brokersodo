import "server-only";
import { mkdir, writeFile, unlink, copyFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { StorageProvider } from "./types";

/**
 * Development fallback: stores images in /public/uploads.
 * Not for production: app files are lost on each deploy. Configure S3 storage there.
 */
const PUBLIC = path.join(process.cwd(), "public");
const ROOT = path.join(PUBLIC, "uploads");

export const localStorage: StorageProvider = {
  name: "local",
  async upload(file, { folder }) {
    const dir = path.join(ROOT, folder);
    await mkdir(dir, { recursive: true });
    const id = `${folder}/${randomUUID()}.webp`;
    const { data, info } = await sharp(file)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    await writeFile(path.join(ROOT, id), data);
    return { url: `/uploads/${id}`, publicId: `local:${id}`, width: info.width, height: info.height };
  },
  async remove(publicId) {
    if (!publicId.startsWith("local:")) return;
    const target = path.join(ROOT, publicId.slice(6));
    if (!target.startsWith(ROOT)) return;
    await unlink(target).catch(() => {});
  },
  async copy(image, folder) {
    if (!image.url.startsWith("/")) return image;
    const src = path.join(PUBLIC, image.url);
    if (!src.startsWith(PUBLIC)) return image;
    const dir = path.join(ROOT, folder);
    await mkdir(dir, { recursive: true });
    const id = `${folder}/${randomUUID()}${path.extname(src) || ".webp"}`;
    await copyFile(src, path.join(ROOT, id));
    return { ...image, url: `/uploads/${id}`, publicId: `local:${id}` };
  },
};
