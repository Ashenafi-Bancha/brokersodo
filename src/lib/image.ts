/**
 * Image URL helpers shared by server and client.
 * Public listing photos get the BrokerSodo watermark through a Cloudinary
 * transformation, so the stored original is never modified.
 */
const UPLOAD_SEGMENT = "/image/upload/";

export function isCloudinary(url: string) {
  return url.includes("res.cloudinary.com") && url.includes(UPLOAD_SEGMENT);
}

/** True when the CDN burns the watermark in (otherwise the UI overlays the brand mark). */
export function hasCdnWatermark(url: string) {
  return Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_WATERMARK_ID) && isCloudinary(url);
}

export function watermarked(url: string): string {
  const overlay = process.env.NEXT_PUBLIC_CLOUDINARY_WATERMARK_ID;
  if (!overlay || !isCloudinary(url)) return url;
  const layer = overlay.replace(/\//g, ":");
  const t = `l_${layer},g_south_east,w_0.22,fl_relative,o_85,x_16,y_16/`;
  return url.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}${t}`);
}

/** Cloudinary resize (used by the next/image loader and OG images). */
export function cloudinaryResize(url: string, width: number, quality?: number): string {
  if (!isCloudinary(url)) return url;
  const t = `f_auto,q_${quality ?? "auto"},c_limit,w_${width}/`;
  return url.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}${t}`);
}
