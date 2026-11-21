import "server-only";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { StorageProvider, StoredImage } from "./types";

let configured = false;
function client() {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

function toStored(r: UploadApiResponse): StoredImage {
  return { url: r.secure_url, publicId: r.public_id, width: r.width, height: r.height };
}

export const cloudinaryStorage: StorageProvider = {
  name: "cloudinary",
  upload(file, { folder }) {
    return new Promise((resolve, reject) => {
      client()
        .uploader.upload_stream(
          {
            folder: `brokersodo/${folder}`,
            resource_type: "image",
            // Originals stay clean (no watermark); size is capped to keep storage small.
            transformation: [{ width: 2400, height: 2400, crop: "limit" }],
            allowed_formats: ["jpg", "jpeg", "png", "webp", "avif", "heic", "heif"],
          },
          (err, res) => (err || !res ? reject(err ?? new Error("Upload failed")) : resolve(toStored(res))),
        )
        .end(file);
    });
  },
  async remove(publicId) {
    await client()
      .uploader.destroy(publicId)
      .catch(() => {});
  },
  async copy(image, folder) {
    const r = await client().uploader.upload(image.url, { folder: `brokersodo/${folder}`, resource_type: "image" });
    return { ...toStored(r), blurData: image.blurData };
  },
};
