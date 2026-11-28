import { expect, test } from "@playwright/test";
import { adminPassword, staff } from "./helpers";

/**
 * Without ANTHROPIC_API_KEY (local tests) every chat goes straight to staff, which
 * exercises the chat window, the admin inbox and staff replies reaching the visitor.
 */
test("a visitor chats; staff see it in the inbox and their reply reaches the visitor", async ({ page, browser }) => {
  test.skip(!adminPassword, "Set E2E_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");
  test.skip(!!process.env.ANTHROPIC_API_KEY, "This test covers the no-AI path");
  const question = `E2E chat ${Date.now()}: is there a 2-bedroom house for rent near the university?`;

  await page.goto("/");
  await page.getByRole("button", { name: "Contact BrokerSodo" }).click();
  await page.getByRole("link", { name: "Chat with us" }).click();
  const chat = page.getByRole("dialog", { name: "BrokerSodo assistant" });
  await expect(chat).toBeVisible();
  await chat.getByRole("textbox", { name: "Type your message…" }).fill(question);
  await chat.getByRole("button", { name: "Send" }).click();
  await expect(chat.getByText(question)).toBeVisible();
  await expect(chat.getByText("your message went to our team")).toBeVisible();

  const admin = await staff(browser);
  await admin.goto("/admin/chats");
  await admin.getByText(question.slice(0, 30)).first().click();
  await expect(admin.getByText(question)).toBeVisible();
  await admin.getByRole("textbox", { name: "Reply" }).fill("Hello! Yes, we have two. When can you visit?");
  await admin.getByRole("button", { name: "Send" }).click();
  await expect(admin.getByText("Hello! Yes, we have two.")).toBeVisible();

  // The visitor sees the reply (polled every 5 seconds) and the chat survives a reload.
  await expect(chat.getByText("Hello! Yes, we have two. When can you visit?")).toBeVisible({ timeout: 15_000 });
  await expect(chat.getByText("You are now talking to our team.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Contact BrokerSodo" }).click();
  await page.getByRole("link", { name: "Chat with us" }).click();
  await expect(page.getByRole("dialog", { name: "BrokerSodo assistant" }).getByText(question)).toBeVisible();

  await admin.getByRole("button", { name: "Close" }).click();
  await admin.close();
});

test("the chat API refuses bad input and unknown chats", async ({ request }) => {
  expect((await request.post("/api/chat", { data: { text: "   " } })).status()).toBe(400);
  expect((await request.get("/api/chat?token=not-a-real-token-xxxxxxxxxxxxxxx")).status()).toBe(404);
  expect((await request.post("/api/chat/handover", { data: { token: "not-a-real-token-xxxxxxxxxxxxxxx" } })).status()).toBe(404);
});
