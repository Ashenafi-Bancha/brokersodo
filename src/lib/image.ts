/**
 * Image URL helpers shared by server and client.
 * Uploaded photos are stored as pre-sized, watermarked WebP files named
 * `<id>-w480.webp`, `<id>-w960.webp` and `<id>-w1600.webp`. The clean original is stored separately.
 */
export const IMAGE_WIDTHS = [480, 960, 1600] as const;

const VARIANT = /-w(?:480|960|1600)\.webp$/;

/** True for an uploaded photo. Its watermark is already part of the image. */
export function isStoredVariant(url: string) {
  return VARIANT.test(url);
}

/** Smallest stored size that covers the requested width. */
export function variantUrl(url: string, width: number): string {
  if (!isStoredVariant(url)) return url;
  const size = IMAGE_WIDTHS.find((w) => w >= width) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  return url.replace(VARIANT, `-w${size}.webp`);
}
