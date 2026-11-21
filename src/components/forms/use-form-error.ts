"use client";
import { useTranslations } from "next-intl";

/** Map Zod message codes like "phone.invalid" to translated text (form.errors.phone_invalid). */
export function useFormError() {
  const t = useTranslations("form.errors");
  return (msg?: string) => {
    if (!msg) return undefined;
    const key = msg.replace(/\./g, "_");
    return t.has(key) ? t(key) : msg;
  };
}
