import { expect, test } from "@playwright/test";
import { staff } from "./helpers";

const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "";

/** Rows created here start with "E2E" so they can be cleaned up afterwards. */


test("a public talent profile goes live after staff approve it, and an employer asks to connect", async ({ page, browser }) => {
  test.skip(!password, "Set E2E_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");
  const stamp = Date.now();
  const name = `E2E Talent ${stamp}`;
  const profession = `Solar installer ${stamp}`;

  // 1. A skilled worker creates a public profile.
  await page.goto("/jobs/talent-pool?type=SKILLED");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel(/^Phone/).fill("0916 222 333");
  await page.getByLabel(/Profession or trade/).fill(profession);
  await page.getByLabel(/Sector you want/).selectOption("TRADES");
  await page.getByLabel(/highest education/).selectOption("TVET");
  await page.getByLabel("Key skills").fill("Wiring, solar panels, inverters");
  await page.getByRole("checkbox", { name: "Amharic" }).click();
  await page.getByLabel(/Show my profile on Find Talent/).check();
  await page.getByLabel(/I agree that BrokerSodo may keep/).check();
  await page.getByRole("button", { name: "Join the talent pool" }).click();
  await expect(page.getByText("You're in the talent pool")).toBeVisible();

  // 2. Not public until staff check it.
  await page.goto(`/talent?q=${encodeURIComponent(profession)}`);
  await expect(page.getByText(profession)).toHaveCount(0);

  // 3. Staff set it Active.
  const admin = await staff(browser);
  await admin.goto("/admin/job-seekers");
  await admin.getByPlaceholder(/Search name/).fill(name);
  await admin.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await admin.getByRole("dialog").getByLabel("Status").selectOption("ACTIVE");
  await admin.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(admin.getByText("Job seeker updated")).toBeVisible();

  // 4. Listed on Find Talent with the first name only and no phone.
  await page.goto(`/talent?q=${encodeURIComponent(profession)}`);
  await page.getByRole("link", { name: "E2E" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E");
  await expect(page.getByText(profession, { exact: true })).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain("916222333");
  expect(html).not.toContain(name);

  // 5. An employer asks to connect; staff see it.
  await page.getByLabel(/Company or employer/).fill("E2E Solar Co");
  await page.getByLabel("Your name").fill("E2E Employer");
  await page.getByLabel(/^Phone/).fill("0916 444 555");
  await page.getByRole("button", { name: "Ask to connect" }).click();
  await expect(page.getByText("Request sent")).toBeVisible();

  await admin.goto("/admin/talent-requests");
  await expect(admin.getByText("E2E Solar Co")).toBeVisible();
  await admin.close();
});

test("a family reviews a tutor and the review shows after approval", async ({ page, browser }) => {
  test.skip(!password, "Set E2E_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");
  const comment = `E2E review ${Date.now()}: clear explanations and my son's maths marks went up.`;
  await page.goto("/tutors");
  const first = page.locator("article h3 a").first();
  test.skip((await first.count()) === 0, "No active tutor to review");
  await first.click();
  await page.getByText("Write a review", { exact: true }).click();
  const review = page.locator("details");
  await review.getByRole("button", { name: "Send review" }).click();
  await expect(review.getByText("Choose 1 to 5 stars")).toBeVisible();
  await review.getByRole("radio", { name: "5 stars" }).click();
  await review.getByLabel(/Your review/).fill(comment);
  await review.getByLabel("Your name").fill("E2E Reviewer");
  await review.getByLabel(/^Phone/).fill(`0916 ${String(Date.now()).slice(-6, -3)} ${String(Date.now()).slice(-3)}`);
  await review.getByLabel(/This review is honest/).check();
  await review.getByRole("button", { name: "Send review" }).click();
  await expect(review.getByText("Thank you for your review")).toBeVisible();
  const tutorUrl = page.url();

  // Hidden until approved.
  await page.reload();
  await expect(page.getByText(comment)).toHaveCount(0);

  const admin = await staff(browser);
  await admin.goto("/admin/reviews");
  await admin.getByPlaceholder(/Search review/).fill(comment.slice(0, 30));
  await admin.getByRole("button", { name: "Approve review" }).first().click();
  await expect(admin.getByText("Review is now public")).toBeVisible();
  await admin.close();

  await page.goto(tutorUrl);
  await expect(page.getByText(comment)).toBeVisible();
  await expect(page.getByLabel(/Rated \d\.\d out of 5/).first()).toBeVisible();
});

test("service category pages, filters and sitemap", async ({ page, request }) => {
  const jobs = await page.goto("/jobs/category/finance");
  expect(jobs?.status()).toBe(200);
  await expect(page).toHaveTitle(/Accounting & finance jobs in Wolaita Sodo/);
  await expect(page.getByRole("combobox", { name: "Work mode" })).toBeVisible();

  const tutors = await page.goto("/tutors/subject/maths");
  expect(tutors?.status()).toBe(200);
  await expect(page).toHaveTitle(/Maths tutors in Wolaita Sodo/);
  await expect(page.getByRole("combobox", { name: "Language" })).toBeVisible();

  expect((await page.goto("/jobs/category/not-a-sector"))?.status()).toBe(404);

  const talent = await page.goto("/talent");
  expect(talent?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find skilled people in Wolaita Sodo");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/talent");
  expect(sitemap).toContain("/jobs/category/it");
  expect(sitemap).toContain("/tutors/subject/programming");
});
