import "server-only";
import { getSiteSettings } from "./public";
import type { SettingsInput } from "@/lib/validators/admin";

/** Site settings row → form values (nulls become empty strings for inputs). */
export async function getSettingsInput(): Promise<SettingsInput> {
  const s = await getSiteSettings();
  const str = (v: string | null) => v ?? "";
  return {
    businessName: s.businessName,
    taglineEn: str(s.taglineEn),
    taglineAm: str(s.taglineAm),
    phonePrimary: s.phonePrimary,
    phoneSecondary: str(s.phoneSecondary),
    telegramUsername: s.telegramUsername,
    telegramChannel: str(s.telegramChannel),
    whatsappNumber: s.whatsappNumber,
    email: str(s.email),
    addressEn: str(s.addressEn),
    addressAm: str(s.addressAm),
    mapLat: s.mapLat,
    mapLng: s.mapLng,
    hoursEn: str(s.hoursEn),
    hoursAm: str(s.hoursAm),
    facebookUrl: str(s.facebookUrl),
    tiktokUrl: str(s.tiktokUrl),
    instagramUrl: str(s.instagramUrl),
    youtubeUrl: str(s.youtubeUrl),
    heroTitleEn: str(s.heroTitleEn),
    heroTitleAm: str(s.heroTitleAm),
    heroSubtitleEn: str(s.heroSubtitleEn),
    heroSubtitleAm: str(s.heroSubtitleAm),
    statListings: s.statListings ?? "",
    statDeals: s.statDeals ?? "",
    statClients: s.statClients ?? "",
    statYears: s.statYears ?? "",
    seoTitle: str(s.seoTitle),
    seoDescription: str(s.seoDescription),
  };
}
