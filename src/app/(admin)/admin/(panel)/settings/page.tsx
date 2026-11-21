import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-ui";
import { requireStaffPage } from "@/lib/auth";
import { getSettingsInput } from "@/server/queries/settings-input";

export const metadata: Metadata = { title: "Site settings" };

export default async function SettingsPage() {
  await requireStaffPage(["ADMIN"]);
  return (
    <>
      <AdminPageHeader title="Site settings" description="Contact channels, office, hours, social links and SEO defaults." crumbs={[{ label: "Site settings" }]} />
      <div className="max-w-4xl">
        <SettingsForm initial={await getSettingsInput()} sections={["contact", "social", "seo"]} />
      </div>
    </>
  );
}
