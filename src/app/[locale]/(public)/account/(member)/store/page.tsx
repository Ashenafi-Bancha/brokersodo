import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ScopedIntl } from "@/components/scoped-intl";
import { Panel, StatusPill } from "@/components/account/status-pill";
import { ItemManager, StoreForm } from "@/components/stores/store-forms";
import { db } from "@/lib/db";
import { requireMemberPage } from "@/lib/member-auth";
import { storeImage } from "@/lib/stores";
import { localized } from "@/lib/utils";
import { getAreas } from "@/server/queries/public";
import type { StoreInput } from "@/lib/validators/stores";

// Reads the sign-in cookie, so it renders on every request (also for /am).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("tabStore") };
}

export default async function MyStorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireMemberPage(locale, "/account/store");
  const [t, ts, areas, store] = await Promise.all([
    getTranslations("account"),
    getTranslations("stores"),
    getAreas(),
    db.store.findUnique({ where: { memberId: me.id }, include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } }),
  ]);
  const initial: Partial<StoreInput> = store
    ? {
        name: store.name,
        type: store.type as StoreInput["type"],
        tagline: store.tagline ?? "",
        description: store.description,
        phone: store.phone.replace(/^\+251/, "0"),
        telegram: store.telegram ?? "",
        whatsapp: store.whatsapp?.replace(/^\+251/, "0") ?? "",
        areaId: store.areaId ?? "",
        address: store.address ?? "",
        openingHours: store.openingHours ?? "",
        logo: storeImage(store.logo),
        cover: storeImage(store.cover),
      }
    : { phone: me.phone.replace(/^\+251/, "0") };
  const sections = [...new Set(store?.items.map((i) => i.section).filter(Boolean) ?? [])];

  return (
    <div className="grid gap-6">
      <Panel
        title={store ? ts("yourStore") : ts("openYourStore")}
        action={
          store ? (
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill status={store.status} label={ts(`status.${store.status}` as "status.PENDING")} />
              {store.status === "ACTIVE" && (
                <Link href={`/stores/${store.slug}`} className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
                  <ExternalLink className="size-4" /> {t("viewPublic")}
                </Link>
              )}
            </span>
          ) : undefined
        }
      >
        <p className="mb-4 flex gap-2 rounded-btn bg-bg-2 p-3 text-sm text-fg-2">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {store?.status === "REJECTED" && store.rejectReason ? `${ts("rejectedNote")} ${store.rejectReason}` : ts("storeNote")}
        </p>
        <ScopedIntl namespaces={["stores", "form"]}>
          <StoreForm initial={initial} areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))} />
        </ScopedIntl>
      </Panel>
      {store && (
        <Panel title={ts("itemsManage")}>
          <p className="mb-4 text-sm text-fg-2">{ts("itemsNote")}</p>
          <ScopedIntl namespaces={["stores", "form"]}>
            <ItemManager
              sections={sections}
              items={store.items.map((i) => ({
                id: i.id,
                section: i.section,
                name: i.name,
                description: i.description,
                price: i.price,
                priceNote: i.priceNote,
                image: storeImage(i.image),
                isSpecial: i.isSpecial,
                isAvailable: i.isAvailable,
                sortOrder: i.sortOrder,
              }))}
            />
          </ScopedIntl>
        </Panel>
      )}
    </div>
  );
}
