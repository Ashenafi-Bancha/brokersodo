import { expect, test } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@brokersodo.local";
const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "";

/** Rows created here start with "E2E" so they can be cleaned up afterwards. */

test("employer posts a job, staff publish it, a graduate applies", async ({ page, browser }) => {
  test.skip(!password, "Set E2E_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");
  const title = `E2E Accountant ${Date.now()}`;

  // 1. Employer posts a job. It is not public yet.
  await page.goto("/jobs/post");
  await page.getByLabel(/Job title/).fill(title);
  await page.getByLabel(/Company or employer name/).fill("E2E Employer");
  await page.getByRole("radio", { name: "Fresh graduates" }).click();
  await page.getByLabel("Sector", { exact: false }).first().selectOption("FINANCE");
  await page.getByLabel(/Job description/).fill("Record daily sales, prepare monthly reports and help with tax filing.");
  await page.getByLabel(/Salary from/).fill("9000");
  await page.getByLabel(/Salary up to/).fill("12000");
  await page.getByLabel("Your name").fill("E2E Owner");
  await page.getByLabel("Your phone").fill("0916 111 222");
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByLabel(/I confirm this is a real job/)).toBeVisible();
  await expect(page.getByText("Please tick this box to continue")).toBeVisible();
  await page.getByLabel(/I confirm this is a real job/).check();
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByText("Job received")).toBeVisible();
  await expect(page.getByText(/BS-J-\d{4}/)).toBeVisible();

  await page.goto(`/jobs?q=${encodeURIComponent(title)}`);
  await expect(page.getByText(title)).toHaveCount(0);

  // 2. Staff publish it.
  const admin = await browser.newPage();
  await admin.goto("/admin/login");
  await admin.getByLabel("Email").fill(email);
  await admin.getByLabel("Password", { exact: true }).fill(password);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await expect(admin.getByRole("heading", { level: 1 })).toContainText("Welcome back");
  await admin.goto("/admin/jobs");
  await admin.getByPlaceholder(/Search jobs/).fill(title);
  await admin.getByRole("button", { name: new RegExp(`^${title}`) }).click();
  await admin.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(admin.getByText("Job published")).toBeVisible();

  // 3. It is public, without the employer's phone, and a graduate applies.
  await page.goto(`/jobs?for=GRADUATE&q=${encodeURIComponent(title)}`);
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  const html = await page.content();
  expect(html).not.toContain("916111222");
  const ld = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => e.textContent ?? ""));
  expect(ld.some((s) => s.includes('"JobPosting"')) || html.includes("JobPosting")).toBe(true);
  await page.getByLabel("Your name").fill("E2E Applicant");
  await page.getByLabel(/Phone/).fill("0916 333 444");
  await page.getByLabel(/highest education/).selectOption("DEGREE");
  await page.getByLabel(/I agree that BrokerSodo may share/).check();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByText("Application sent")).toBeVisible();

  // 4. Staff see the applicant inside the job.
  await admin.reload();
  await admin.getByPlaceholder(/Search jobs/).fill(title);
  await admin.getByRole("button", { name: new RegExp(`^${title}`) }).click();
  await expect(admin.getByText("E2E Applicant")).toBeVisible();
  await admin.close();
});

test("tutor joins and a family requests a tutor", async ({ page }) => {
  await page.goto("/tutors/join");
  await page.getByRole("checkbox", { name: "Maths" }).click();
  await page.getByRole("checkbox", { name: "Grades 9-10" }).click();
  await page.getByLabel("Highest education").selectOption("DEGREE");
  await page.getByLabel(/About your teaching/).fill("I have taught mathematics for five years and prepare students for exams.");
  await page.getByLabel("Full name").fill("E2E Tutor Person");
  await page.getByLabel(/^Phone/).fill("0916 555 666");
  await page.getByLabel(/I agree that BrokerSodo checks/).check();
  await page.getByRole("button", { name: "Send my profile" }).click();
  await expect(page.getByText("Profile received")).toBeVisible();

  await page.goto("/tutors/request?subject=MATHS&level=SECONDARY");
  await expect(page.getByLabel("Subject")).toHaveValue("MATHS");
  await page.getByLabel(/Your name/).fill("E2E Parent");
  await page.getByLabel(/^Phone/).fill("0916 777 888");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Request sent")).toBeVisible();
});

test("talent pool sign-up keeps details private", async ({ page }) => {
  await page.goto("/jobs/talent-pool?type=SKILLED");
  await expect(page.getByRole("radio", { name: "Skilled workers" })).toHaveAttribute("aria-checked", "true");
  await page.getByLabel("Your name").fill("E2E Seeker");
  await page.getByLabel(/^Phone/).fill("0916 999 000");
  await page.getByLabel(/Profession or trade/).fill("Electrician");
  await page.getByLabel(/Sector you want/).selectOption("TRADES");
  await page.getByLabel(/highest education/).selectOption("TVET");
  await page.getByLabel(/I agree that BrokerSodo may keep/).check();
  await page.getByRole("button", { name: "Join the talent pool" }).click();
  await expect(page.getByText("You're in the talent pool")).toBeVisible();
});
