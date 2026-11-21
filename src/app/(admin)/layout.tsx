import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { fontVariables } from "@/lib/fonts";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { pickMessages } from "@/components/scoped-intl";

export const metadata: Metadata = {
  title: { default: "BrokerSodo Admin", template: "%s · BrokerSodo Admin" },
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

/** Staff-only shell (English UI). */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body className="min-h-dvh bg-bg-2">
        <NextIntlClientProvider locale="en" messages={await pickMessages(["theme"], false)}>
          <Providers>
            {children}
            <Toaster position="top-center" richColors closeButton toastOptions={{ className: "!rounded-btn !font-sans" }} />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
