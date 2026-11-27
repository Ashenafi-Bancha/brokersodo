import { expect, test, type Browser, type Page } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@brokersodo.local";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "";

/** Rows created here start with "E2E" so they can be cleaned up afterwards. */
const randomPhone = () => `09${String(Math.floor(10_000_000 + Math.random() * 89_999_999))}`;
const PASSWORD = "e2e-pass-123";

async function signUp(page: Page, name: string, phone: string) {
  await page.goto("/account/sign-up");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel(/^Phone number/).fill(phone);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(PASSWORD);
  await page.getByRole("textbox", { name: "Repeat password", exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello");
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

test("sign up, sign out, sign in; account pages need a session and members cannot open the admin", async ({ page, request }) => {
  // Both languages render (Amharic pages are pre-built, so pages that read the cookie must be dynamic).
  // Plain requests, so the browser does not switch to Amharic for the rest of the test.
  for (const u of ["/account/sign-in", "/am/account/sign-in", "/am/account/sign-up"]) expect((await request.get(u)).status()).toBe(200);

  await page.goto("/account/talent");
  await expect(page).toHaveURL(/\/account\/sign-in\?next=%2Faccount/);

  const phone = randomPhone();
  await signUp(page, "E2E Member One", phone);

  // A member session is not a staff session.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);

  await page.goto("/account");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/account");
  await expect(page).toHaveURL(/sign-in/);

  // Same phone cannot register twice.
  await page.goto("/account/sign-up");
  await page.getByLabel("Your name").fill("E2E Member Copy");
  await page.getByLabel(/^Phone number/).fill(phone);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(PASSWORD);
  await page.getByRole("textbox", { name: "Repeat password", exact: true }).fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("This phone number already has an account").first()).toBeVisible();

  await page.goto("/account/sign-in?next=/account/settings");
  await page.getByLabel(/^Phone number/).fill(phone);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill("wrong-pass-999");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Wrong phone number or password.")).toBeVisible();
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account\/settings$/);
});

test("a member creates a talent profile, applies to a job and follows the application", async ({ page }) => {
  await signUp(page, "E2E Talent Member", randomPhone());

  await page.goto("/account/talent");
  await page.getByLabel(/Profession or trade/).fill("Bookkeeper");
  await page.getByLabel(/Sector you want/).selectOption("FINANCE");
  await page.getByLabel(/highest education/).selectOption("DIPLOMA");
  await page.getByLabel(/I agree that BrokerSodo may keep/).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Your profile is saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Waiting for our check").first()).toBeVisible();

  // Apply to an open job; name and phone are filled from the account.
  await page.goto("/jobs");
  await page.locator("article h3 a").first().click();
  await expect(page).toHaveURL(/\/jobs\/[a-z0-9-]+-bs-j-\d+/);
  const jobTitle = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? "";
  await page.getByRole("button", { name: "Save job" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("E2E Talent Member");
  await page.getByLabel(/highest education/).selectOption("DIPLOMA");
  await page.getByLabel(/I agree that BrokerSodo may share/).check();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByText("Application sent")).toBeVisible();
  await page.reload();
  await expect(page.getByText("You already applied")).toBeVisible();

  await page.goto("/account/talent");
  const apps = page.getByRole("region").filter({ hasText: "My applications" }).or(page.locator("section").filter({ hasText: "My applications" }));
  await expect(apps.getByText(jobTitle).first()).toBeVisible();
  await expect(page.locator("section").filter({ hasText: "Saved jobs" }).getByText(jobTitle).first()).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Withdraw" }).first().click();
  await expect(page.getByText("Withdrawn").first()).toBeVisible();
});

test("an employer posts a job; after staff verify and publish, they manage applicants", async ({ page, browser }) => {
  test.skip(!adminPassword, "Set E2E_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");
  const stamp = Date.now();
  const company = `E2E Coffee Co ${stamp}`;
  const title = `E2E Barista ${stamp}`;
  await signUp(page, "E2E Employer Member", randomPhone());

  await page.goto("/account/employer");
  await expect(page.getByText("Add your company details first")).toBeVisible();
  await page.getByLabel(/Company or business name/).fill(company);
  await page.getByLabel(/^Industry/).selectOption("HOTEL");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Not verified yet").first()).toBeVisible();

  await page.locator("#main").getByRole("link", { name: "Post a job" }).click();
  await page.getByLabel(/Job title/).fill(title);
  await page.getByRole("radio", { name: "Skilled workers" }).click();
  await page.getByLabel("Sector", { exact: false }).first().selectOption("HOTEL");
  await page.getByLabel(/Job description/).fill("Prepare coffee and serve customers in our cafe near the Sodo stadium.");
  await page.getByLabel(/I confirm this is a real job/).check();
  await page.getByRole("button", { name: "Send for review" }).click();
  await expect(page.getByText("Job received")).toBeVisible();

  await page.goto("/account/employer");
  const row = page.locator("li").filter({ hasText: title });
  await expect(row.getByText("Waiting for review")).toBeVisible();

  // Staff verify the company and publish the job.
  const admin = await staff(browser);
  await admin.goto("/admin/members");
  await admin.getByPlaceholder(/Search name/).fill(company);
  await admin.getByRole("button", { name: "Verify", exact: true }).click();
  await admin.getByRole("alertdialog").getByRole("button", { name: "Verify" }).click();
  await expect(admin.getByText("Company verified")).toBeVisible();
  await admin.goto("/admin/jobs");
  await admin.getByPlaceholder(/Search jobs/).fill(title);
  await admin.getByRole("button", { name: new RegExp(`^${title}`) }).click();
  await admin.getByRole("button", { name: "Approve & publish", exact: true }).click();
  await expect(admin.getByText("Job published")).toBeVisible();
  await admin.close();

  // A visitor applies.
  const visitor = await browser.newPage();
  await visitor.goto(`/jobs?q=${encodeURIComponent(title)}`);
  await visitor.getByRole("link", { name: title }).click();
  await visitor.getByLabel("Your name").fill("E2E Barista Applicant");
  await visitor.getByLabel(/Phone/).fill(randomPhone());
  await visitor.getByLabel(/highest education/).selectOption("GRADE_10");
  await visitor.getByLabel(/I agree that BrokerSodo may share/).check();
  await visitor.getByRole("button", { name: "Send application" }).click();
  await expect(visitor.getByText("Application sent")).toBeVisible();
  await visitor.close();

  // The verified employer sees the applicant with their phone and shortlists them.
  await page.goto("/account/employer");
  await page.locator("li").filter({ hasText: title }).getByRole("link", { name: /1 applicant/ }).click();
  await expect(page.getByText("E2E Barista Applicant")).toBeVisible();
  await expect(page.locator('#main li a[href^="tel:"]').first()).toBeVisible();
  await page.getByLabel("Applicant status").selectOption("SHORTLISTED");
  await page.reload();
  await expect(page.getByLabel("Applicant status")).toHaveValue("SHORTLISTED");
});

test("a member creates a tutor profile that waits for staff", async ({ page }) => {
  await signUp(page, "E2E Tutor Member", randomPhone());
  await page.goto("/account/tutor");
  await page.getByRole("checkbox", { name: "Physics" }).click();
  await page.getByRole("checkbox", { name: "Grades 9-10" }).click();
  await page.getByLabel("Highest education").selectOption("DEGREE");
  await page.getByLabel(/About your teaching/).fill("Physics graduate; I explain with simple experiments and past exam questions.");
  await page.getByLabel(/I agree that BrokerSodo checks/).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Your profile is saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Waiting for our check").first()).toBeVisible();
  await expect(page.getByText("No student requests yet")).toBeVisible();
});
