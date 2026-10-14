import { expect, test } from "@playwright/test";

test("local messages and per-room drafts survive reloads without claiming remote delivery", async ({
  page,
}) => {
  await page.goto("/?preview=1");
  const composer = page.getByRole("textbox", { name: "Message", exact: true });
  await composer.fill("A message that stays on this device");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page
      .locator(".message")
      .filter({ hasText: "A message that stays on this device" }),
  ).toContainText("On this device");
  await composer.fill("Draft for general");
  await expect(page.locator("#draft-status")).toHaveText("Draft saved");
  await page.getByRole("button", { name: "# building", exact: true }).click();
  await expect(composer).toHaveValue("");
  await composer.fill("Draft for building");
  await expect(page.locator("#draft-status")).toHaveText("Draft saved");
  await page.reload();
  await expect(composer).toHaveValue("Draft for building");
  await page.getByRole("button", { name: "# general", exact: true }).click();
  await expect(composer).toHaveValue("Draft for general");
  await expect(
    page.getByText("A message that stays on this device", { exact: true }),
  ).toBeVisible();
});

test("threads persist replies and user-supplied HTML is displayed as text", async ({
  page,
}) => {
  await page.goto("/?preview=1");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Room draft while reading a thread");
  await page.getByRole("button", { name: "2 replies", exact: true }).click();
  const malicious = '<img src=x onerror="window.ghrewInjected=true">';
  await page
    .getByRole("textbox", { name: "Reply", exact: true })
    .fill(malicious);
  await page.getByRole("button", { name: "Reply", exact: true }).click();
  await expect(
    page.locator(".thread-feed").getByText(malicious, { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => "ghrewInjected" in window)).toBe(false);
  await expect(page).toHaveURL(/thread=preview-guide/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Thread", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close thread" }).click();
  await expect(page.locator(".thread-panel")).toHaveCount(0);
  await expect(page.locator(".ghrew-shell")).not.toHaveClass(/has-thread/);
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toHaveValue("Room draft while reading a thread");
  await expect(
    page.getByRole("button", { name: "3 replies", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "3 replies", exact: true }).click();
  await expect(
    page.locator(".thread-feed").getByText(malicious, { exact: true }),
  ).toBeVisible();
});

test("offline state keeps local writing available and search can recover from an empty result", async ({
  page,
  context,
}) => {
  await page.goto("/?preview=1");
  await expect(page.getByRole("heading", { name: "# general" })).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByRole("status")).toContainText("You’re offline");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Written while offline");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("Written while offline", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search messages" })
    .fill("nothing-will-match-this");
  await expect(page.getByText("No messages match your search.")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).first().click();
  await expect(
    page.getByText("Written while offline", { exact: true }),
  ).toBeVisible();
});

test("entry is a dedicated sign-in page and an unavailable OAuth service fails closed", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:5180/config", (route) =>
    route.fulfill({ status: 503, body: "{}" }),
  );
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Sign in to Ghrew", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ghrew-shell")).toHaveCount(0);
  await expect(
    page.getByText("Your team’s conversations, in one place.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("input[type=password]")).toHaveCount(0);
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to Ghrew", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ghrew-shell")).toHaveCount(0);
});

test("phone room drawer and full-screen thread remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?preview=1");
  await page.getByRole("button", { name: "Open channels" }).click();
  await page.getByRole("button", { name: "# building", exact: true }).click();
  await expect(page.getByRole("heading", { name: "# building" })).toBeVisible();
  await page
    .getByRole("button", { name: "Reply in thread", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thread", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Reply", exact: true }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});
