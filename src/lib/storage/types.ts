export type StoredImage = {
  url: string;
  publicId: string | null;
  width: number;
  height: number;
  blurData?: string | null;
};

export interface StorageProvider {
  name: "s3" | "local";
  upload(file: Buffer, opts: { folder: string }): Promise<StoredImage>;
  remove(publicId: string): Promise<void>;
  /** Copy an existing stored file into another folder (submission → listing). */
  copy(image: StoredImage, folder: string): Promise<StoredImage>;
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB (the client compresses well below this)
