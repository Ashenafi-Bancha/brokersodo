import { expect, test } from "@playwright/test";

/** home → browse → filter → listing detail → submit inquiry */
test("visitor can find a listing and send an inquiry", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every deal in Sodo");

  // Browse a category from the home page
  await page.getByRole("link", { name: /Cars & Vehicles/ }).first().click();
  await expect(page).toHaveURL(/\/c\/vehicles/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cars & Vehicles");

  // Apply a filter through the URL-driven filter UI (sidebar on desktop, sheet on mobile)
  const isMobile = (page.viewportSize()?.width ?? 1200) < 1024;
  if (isMobile) {
    await page.getByRole("button", { name: /Filters/ }).click();
    await page.getByRole("dialog").getByLabel("Transmission").selectOption("automatic");
    await page.getByRole("dialog").getByRole("button", { name: "Show results" }).click();
  } else {
    await page.getByRole("complementary", { name: "Filters" }).getByLabel("Transmission").selectOption("automatic");
  }
  await expect(page).toHaveURL(/f_transmission=automatic/);
  await expect(page.getByRole("button", { name: /Remove filter Transmission/ })).toBeVisible();

  // Sorting keeps the filter and updates the URL
  await page.getByLabel("Sort").first().selectOption("price_asc");
  await expect(page).toHaveURL(/f_transmission=automatic.*sort=price_asc/);

  // Open the first listing
  const first = page.getByRole("article").first().getByRole("link").first();
  await first.click();
  await expect(page).toHaveURL(/\/listings\//);
  await expect(page.getByText(/BS-V-\d{4}/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Call BrokerSodo/ }).first()).toHaveAttribute("href", /^tel:\+251/);
  await expect(page.getByRole("link", { name: "WhatsApp", exact: true }).first()).toHaveAttribute("href", /wa\.me\/251\d+\?text=/);

  // Submit an inquiry (validation first)
  const form = page.locator("#inquiry");
  await form.scrollIntoViewIfNeeded(); // the form loads when it comes into view
  await form.getByLabel("Your name").fill("E2E Buyer");
  await form.getByLabel("Phone number").fill("12345");
  await form.getByRole("button", { name: "Send" }).click();
  await expect(form.getByRole("alert")).toContainText("valid Ethiopian mobile");
  await form.getByLabel("Phone number").fill("0911 00 00 00");
  await form.getByRole("button", { name: "Send" }).click();
  await expect(form.getByText("Thank you!")).toBeVisible();
});

test("Amharic locale and 404", async ({ page }) => {
  await page.goto("/am");
  await expect(page.locator("html")).toHaveAttribute("lang", "am");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("በሶዶ");
  const res = await page.goto("/listings/this-does-not-exist");
  expect(res?.status()).toBe(404);
});
