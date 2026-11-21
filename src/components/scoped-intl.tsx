import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

/** Namespaces needed by client components on every public page. */
const CORE = ["nav", "theme", "fab", "bottomNav", "listing", "errors"] as const;

type Messages = Record<string, unknown>;

/** Only the requested namespaces are serialised to the browser (smaller HTML on slow networks). */
export async function pickMessages(namespaces: readonly string[], core = true): Promise<Messages> {
  const all = (await getMessages()) as Messages;
  const out: Messages = {};
  for (const ns of core ? [...CORE, ...namespaces] : namespaces) if (all[ns] !== undefined) out[ns] = all[ns];
  if (core) {
    // The category menu needs just this one string from the large `home` namespace.
    const home = all.home as Messages | undefined;
    out.home = { listingsCount: home?.listingsCount };
  }
  return out;
}

/** Adds page-specific namespaces for the client components inside it. */
export async function ScopedIntl({ namespaces, children }: { namespaces: readonly string[]; children: React.ReactNode }) {
  return <NextIntlClientProvider messages={await pickMessages(namespaces)}>{children}</NextIntlClientProvider>;
}
