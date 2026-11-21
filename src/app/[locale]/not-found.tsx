import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <Container className="flex flex-col items-center py-20 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-cart.webp" alt="" width={512} height={525} className="mb-6 h-20 w-auto animate-look dark:rounded-sm dark:bg-white dark:p-1" />
      <p className="font-brand text-6xl text-primary">404</p>
      <h1 className="mt-3 font-brand text-h2 text-fg">{t("notFoundTitle")}</h1>
      <p className="mt-3 max-w-md text-muted">{t("notFoundBody")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">{t("goHome")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/listings">{t("browse")}</Link>
        </Button>
      </div>
    </Container>
  );
}
