"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  React.useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Container className="flex flex-col items-center py-20 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-cart.webp" alt="" width={512} height={525} className="mb-6 h-16 w-auto dark:rounded-sm dark:bg-white dark:p-1" />
      <h1 className="font-brand text-h2 text-fg">{t("errorTitle")}</h1>
      <p className="mt-3 max-w-md text-muted">{t("errorBody")}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted">#{error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcw /> {t("retry")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t("goHome")}</Link>
        </Button>
      </div>
    </Container>
  );
}
