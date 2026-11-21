import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  return (
    <div className="relative grid min-h-dvh place-items-center bg-bg-2 p-4">
      <div aria-hidden className="absolute inset-0 bg-pattern" />
      <div className="relative w-full max-w-sm overflow-hidden rounded-card bg-surface shadow-pop">
        <div aria-hidden className="h-2 bg-brand-gradient" />
        <div className="p-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-stacked.webp" alt="BrokerSodo" width={640} height={530} className="mx-auto h-36 w-auto dark:rounded-btn dark:bg-white dark:p-2" />
          <h1 className="mt-6 text-center text-xl font-bold text-fg">Staff sign in</h1>
          <p className="mt-1 text-center text-sm text-muted">BrokerSodo admin — authorised staff only.</p>
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
