import { expect, test, type Browser, type Page } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@brokersodo.local";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "";
const PASSWORD = "e2e-pass-123";
const randomPhone = () => `09${String(Math.floor(10_000_000 + Math.random() * 89_999_999))}`;

/** A tiny valid-looking PDF. */
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

async function signUp(page: Page, name: string) {
  await page.goto("/account/sign-up");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel(/^Phone number/).fill(randomPhone());
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(PASSWORD);
  await page.getByRole("textbox", { name: "Repeat password", exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function staff(browser: Browser) {
  const admin = await browser.newPage();
  await admin.goto("/admin/login");
  await admin.getByLabel("Email").fill(email);
  await admin.getByLabel("Password", { exact: true }).fill(adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await expect(admin.getByRole("heading", { level: 1 })).toContainText("Welcome back");
  return admin;
}

test("staff add a job sector; it appears in filters and forms, then can be hidden", async ({ page, browser }) => {
  test.skip(!adminPassword, "Set E2E_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");
  const name = `E2E Solar ${Date.now() % 100000}`;
  const admin = await staff(browser);
  await admin.goto("/admin/job-categories");
  const sectors = admin.locator("section").filter({ hasText: "Job sectors" });
  await sectors.getByLabel("New — English name").fill(name);
  await sectors.getByLabel("Amharic name").first().fill("ሶላር");
  await sectors.getByRole("button", { name: "Add" }).click();
  await expect(admin.getByText(`Added “${name}”`)).toBeVisible();

  await page.goto("/jobs");
  await expect(page.getByRole("combobox", { name: "Sector" }).locator("option", { hasText: name })).toHaveCount(1);
  await page.goto("/jobs/post");
  await expect(page.getByLabel("Sector", { exact: false }).first().locator("option", { hasText: name })).toHaveCount(1);

  // Hide it again so test runs leave the lists clean.
  await admin.reload();
  const row = admin.locator("tr").filter({ has: admin.locator(`input[value="${name}"]`) });
  await row.getByRole("button", { name: "Hide" }).click();
  await expect(admin.getByText("Saved")).toBeVisible();
  await page.goto("/jobs");
  await expect(page.getByRole("combobox", { name: "Sector" }).locator("option", { hasText: name })).toHaveCount(0);
  await admin.close();
});

test("a CV is private: the owner opens it, visitors cannot; non-PDF files are refused", async ({ page, browser }) => {
  await signUp(page, "E2E CV Member");
  await page.goto("/account/talent");
  await expect(page.getByText("Save your talent profile first")).toBeVisible();
  await page.getByLabel(/Profession or trade/).fill("Electrician");
  await page.getByLabel(/Sector you want/).selectOption("TRADES");
  await page.getByLabel(/highest education/).selectOption("TVET");
  await page.getByLabel(/I agree that BrokerSodo may keep/).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Your profile is saved.")).toBeVisible();
  await page.reload();

  await page.locator("#cv-file").setInputFiles({ name: "notes.txt", mimeType: "application/pdf", buffer: Buffer.from("hello, not a pdf") });
  await expect(page.getByText("Only PDF files can be uploaded.")).toBeVisible();

  await page.locator("#cv-file").setInputFiles({ name: "my-cv.pdf", mimeType: "application/pdf", buffer: PDF });
  const link = page.getByRole("link", { name: "my-cv.pdf" });
  await expect(link).toBeVisible();
  const href = (await link.getAttribute("href")) ?? "";
  expect(href).toMatch(/^\/api\/cv\//);

  const own = await page.request.get(href);
  expect(own.status()).toBe(200);
  expect(own.headers()["content-type"]).toContain("application/pdf");
  expect(own.headers()["cache-control"]).toContain("no-store");

  const stranger = await browser.newContext();
  expect((await stranger.request.get(new URL(href, page.url()).toString())).status()).toBe(404);
  await stranger.close();
});

test("an employer gets an update when staff verify the company, and sees it in their account", async ({ page, browser }) => {
  test.skip(!adminPassword, "Set E2E_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");
  const company = `E2E Notify Co ${Date.now()}`;
  await signUp(page, "E2E Notify Member");
  await page.goto("/account/employer");
  await page.getByLabel(/Company or business name/).fill(company);
  await page.getByLabel(/^Industry/).selectOption("OFFICE");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Not verified yet").first()).toBeVisible();

  const admin = await staff(browser);
  await admin.goto("/admin/members");
  await admin.getByPlaceholder(/Search name/).fill(company);
  await admin.getByRole("button", { name: "Verify", exact: true }).click();
  await admin.getByRole("alertdialog").getByRole("button", { name: "Verify" }).click();
  await expect(admin.getByText("Company verified")).toBeVisible();
  await admin.close();

  await page.goto("/account/employer");
  await expect(page.getByRole("link", { name: /1 new update/ })).toBeVisible();
  await page.goto("/account");
  await expect(page.getByText(`${company} is verified.`)).toBeVisible();
  await page.goto("/account/employer");
  await expect(page.getByRole("link", { name: /new update/ })).toHaveCount(0);
});
