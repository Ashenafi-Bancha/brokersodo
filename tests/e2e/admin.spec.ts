import { expect, test } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@brokersodo.local";
const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "";

/** admin login → create listing → it appears on the public site without owner details */
test("staff can sign in and publish a listing", async ({ page }) => {
  test.skip(!password, "Set E2E_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello");

  await page.goto("/admin/listings/new");
  await page.getByLabel("Category").selectOption({ label: "Land & Plots (L)" });
  const title = `E2E plot ${Date.now()}`;
  await page.getByLabel("Title (English)").fill(title);
  await page.getByLabel("Price (ETB)").fill("750k");
  await page.getByLabel(/Size/).fill("300");
  await page.getByLabel("Owner phone").fill("0916 123 456");
  await page.getByRole("button", { name: "Save & publish" }).click();

  await expect(page).toHaveURL(/\/admin\/listings\/[a-z0-9]+$/);
  await expect(page.getByText(/BS-L-\d{4}/).first()).toBeVisible();
  const viewLink = page.getByRole("link", { name: /View on site/ });
  await expect(viewLink).toBeVisible();
  const href = await viewLink.getAttribute("href");

  const pub = await page.request.get(href!);
  expect(pub.status()).toBe(200);
  const html = await pub.text();
  expect(html).toContain(title);
  expect(html).toContain("750,000 ETB");
  expect(html).not.toContain("916123456"); // owner phone never public
});
