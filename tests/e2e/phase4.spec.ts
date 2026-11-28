import { expect, test, type Page } from "@playwright/test";
import { staff } from "./helpers";

const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "";
const PASSWORD = "e2e-pass-123";
const randomPhone = () => `09${String(Math.floor(10_000_000 + Math.random() * 89_999_999))}`;

/** Rows created here start with "E2E" so they can be cleaned up afterwards. */


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

test("an owner submits a property with a video and a negotiable price; staff see both", async ({ page, browser }) => {
  test.skip(!adminPassword || process.env.ALLOW_LOCAL_UPLOADS !== "true", "Needs admin password and ALLOW_LOCAL_UPLOADS=true");
  const title = `E2E Video House ${Date.now()}`;
  await page.goto("/sell");
  await page.getByRole("button", { name: /Houses for Sale/ }).first().click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Short title").fill(title);
  await page.getByLabel(/Expected price/).fill("2500000");
  await page.getByLabel("The price is negotiable").check();
  await page.getByRole("button", { name: "Next" }).click();

  // A fake "video" that is too big is refused in the browser; a small MP4 uploads.
  const input = page.locator('input[type="file"][accept*="video"]');
  await input.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a video") });
  await expect(page.getByText("Use an MP4, WebM or MOV video.")).toBeVisible();
  await input.setInputFiles({ name: "tour.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(64 * 1024, 1) });
  await expect(page.locator("video")).toHaveAttribute("src", /\/uploads\/videos\/[0-9a-f-]{36}\.mp4$/);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Your name").fill("E2E Video Owner");
  await page.getByLabel(/^Phone/).fill(randomPhone());
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("We've got it!")).toBeVisible();

  const admin = await staff(browser);
  await admin.goto("/admin/submissions");
  await admin.getByText(title).first().click();
  await expect(admin.getByTestId("submission-video")).toBeVisible();
  await expect(admin.getByText(/negotiable/i).first()).toBeVisible();
  await admin.close();
});

test("staff mark a listing under negotiation; the public page shows the badge", async ({ page, browser }) => {
  test.skip(!adminPassword, "Set E2E_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");
  await page.goto("/listings");
  const link = page.locator("article h3 a").first();
  const href = (await link.getAttribute("href")) ?? "";
  await expect(page.locator("article").first().getByText("Available")).toBeVisible();
  const ref = href.match(/bs-[a-z]+-\d+$/i)?.[0]?.toUpperCase() ?? "";
  expect(ref).not.toBe("");

  const admin = await staff(browser);
  await admin.goto(`/admin/listings?q=${encodeURIComponent(ref)}`);
  await admin.getByPlaceholder("Search ref code or title…").fill(ref);
  await admin.getByRole("button", { name: `Actions for ${ref}` }).click();
  await admin.getByRole("menuitem", { name: "Under negotiation" }).click();
  await expect(admin.getByText("1 listing updated")).toBeVisible();

  await page.goto(href);
  await expect(page.getByText("Under negotiation").first()).toBeVisible();

  // Put it back.
  await admin.getByRole("button", { name: `Actions for ${ref}` }).click();
  await admin.getByRole("menuitem", { name: /Publish|Re-publish/ }).click();
  await admin.close();
});

test("a wanted request goes public after staff approve it, and an owner answers it", async ({ page, browser }) => {
  test.skip(!adminPassword, "Set E2E_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");
  const desc = `E2E wanted ${Date.now()}: 3-bedroom house near the university with water`;
  await page.goto("/wanted");
  await page.getByLabel("What are you looking for?").fill(desc);
  await page.getByLabel("Your name").first().fill("E2E Buyer Wanted");
  await page.getByLabel(/^Phone/).first().fill(randomPhone());
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Request received!")).toBeVisible();
  await page.goto("/wanted");
  await expect(page.getByText(desc)).toHaveCount(0);

  const admin = await staff(browser);
  await admin.goto("/admin/wanted");
  await admin.getByPlaceholder("Search requests…").fill(desc.slice(0, 24));
  await admin.getByRole("button", { name: /E2E Buyer Wanted/ }).first().click();
  await admin.getByLabel(/Show on website/).check();
  await admin.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(admin.getByText("Wanted request updated")).toBeVisible();

  await page.goto("/wanted");
  const card = page.locator("li").filter({ hasText: desc });
  await expect(card).toBeVisible();
  await expect(card.getByText("E2E Buyer Wanted")).toHaveCount(0);
  await card.getByText("I have this").click();
  await card.getByLabel("Your name").fill("E2E House Owner");
  await card.getByLabel(/^Phone/).fill(randomPhone());
  await card.getByRole("button", { name: "Send to BrokerSodo" }).click();
  await expect(card.getByText("Thank you!")).toBeVisible();

  await admin.reload();
  await admin.getByPlaceholder("Search requests…").fill(desc.slice(0, 24));
  await admin.getByRole("button", { name: /E2E Buyer Wanted/ }).first().click();
  await expect(admin.getByText("E2E House Owner")).toBeVisible();
  await admin.close();
});

test("a business opens a store with items; after staff approve it, it is public", async ({ page, browser }) => {
  test.skip(!adminPassword, "Set E2E_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");
  const name = `E2E Cafe ${Date.now()}`;
  await signUp(page, "E2E Store Owner");
  await page.goto("/account/store");
  await page.getByLabel("Business name").fill(name);
  await page.getByLabel("Type of business").selectOption("CAFE");
  await page.getByLabel("Short line").fill("Fresh coffee near the stadium");
  await page.getByLabel("Opening hours").fill("Mon–Sat 7:00–21:00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Waiting for approval").first()).toBeVisible();

  await page.getByRole("button", { name: "Add item" }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Macchiato");
  await page.getByRole("combobox", { name: /^Section/ }).fill("Drinks");
  await page.getByLabel("Price (ETB)").fill("35");
  await page.getByLabel("Show as a special").check();
  await page.getByRole("button", { name: "Save changes" }).last().click();
  await expect(page.getByText("Macchiato")).toBeVisible();

  await page.goto(`/stores?q=${encodeURIComponent(name)}`);
  await expect(page.getByText(name)).toHaveCount(0);

  const admin = await staff(browser);
  await admin.goto("/admin/stores");
  await admin.getByPlaceholder(/Search store/).fill(name);
  await admin.getByRole("button", { name: "Approve" }).first().click();
  await expect(admin.getByText("Store is now live")).toBeVisible();
  await admin.close();

  await page.goto(`/stores?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText("Specials")).toBeVisible();
  await expect(page.getByText("Macchiato").first()).toBeVisible();
  await expect(page.getByText(/35/).first()).toBeVisible();
  await expect(page.locator('a[href^="tel:"]').filter({ hasText: /\d/ }).first()).toBeVisible();

  await page.goto("/account");
  await expect(page.getByText(/Your store .* Live/)).toBeVisible();
});
