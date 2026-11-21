import { phoneDigits } from "@/lib/format";

/** All contact links point to BrokerSodo — never to an owner. */
export function telLink(phone: string) {
  const d = phoneDigits(phone);
  return `tel:+${d}`;
}

export function telegramLink(username: string, text?: string) {
  const u = username.replace(/^@/, "");
  return text ? `https://t.me/${u}?text=${encodeURIComponent(text)}` : `https://t.me/${u}`;
}

export function whatsappLink(number: string, text?: string) {
  const d = phoneDigits(number);
  return text ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : `https://wa.me/${d}`;
}

export type ContactChannels = {
  phone: string;
  telegram: string;
  whatsapp: string;
};
