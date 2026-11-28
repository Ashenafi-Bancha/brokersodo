import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { expect, type Browser, type Page } from "@playwright/test";

export const adminEmail = process.env.E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@brokersodo.local";
export const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "";

const STATE = path.join(process.cwd(), "test-results", ".admin-state.json");
let saved = false;

/**
 * A signed-in staff page. Signs in once per test worker and reuses the session, so the
 * suite stays under the staff sign-in rate limit (8 tries per 15 minutes).
 */
export async function staff(browser: Browser): Promise<Page> {
  if (saved && existsSync(STATE)) {
    const ctx = await browser.newContext({ storageState: STATE });
    const page = await ctx.newPage();
    await page.goto("/admin");
    if (!page.url().includes("/admin/login")) return page;
    await ctx.close();
  }
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
  mkdirSync(path.dirname(STATE), { recursive: true });
  await ctx.storageState({ path: STATE });
  saved = true;
  return page;
}
