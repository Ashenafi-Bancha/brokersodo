import Link from "next/link";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

/** Fallback 404 for paths outside any locale (rare — middleware localises most URLs). */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontVariables}>
      <body className="grid min-h-dvh place-items-center bg-bg p-6 text-center text-fg">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo/svg/logo-horizontal-full-colour.svg" alt="BrokerSodo" width={849} height={162} className="mx-auto h-12 w-auto" />
          <p className="mt-8 font-brand text-6xl text-primary">404</p>
          <p className="mt-2 text-muted">We couldn&apos;t spot that one.</p>
          <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-btn bg-primary px-6 font-bold text-on-primary">
            Go home
          </Link>
        </div>
      </body>
    </html>
  );
}
