import { expect, test, type Page } from "@playwright/test";

const pageInfo = { hasNextPage: false, endCursor: null };
function comment(id: string, body: string) {
  return {
    id,
    body,
    createdAt: "2026-10-14T08:00:00Z",
    updatedAt: "2026-10-14T08:00:00Z",
    url: `https://github.com/inchidev/gitwok/discussions/1#${id}`,
    author: { login: "robin" },
    replies: { nodes: [], pageInfo },
  };
}
async function githubRoutes(page: Page, failSend = false) {
  const messages = [
    comment("remote-1", "A conversation from GitHub"),
    comment("remote-2", "This message will be deleted"),
  ];
  await page.route("https://api.github.com/**", async (route) => {
    const url = new URL(route.request().url());
    expect(route.request().headers().authorization).toBe(
      "Bearer test-browser-session",
    );
    const json = (data: unknown) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (url.pathname === "/user") return json({ id: 123, login: "robin" });
    if (url.pathname === "/user/installations")
      return json({ total_count: 1, installations: [{ id: 1 }] });
    if (url.pathname.endsWith("/repositories"))
      return json({
        total_count: 2,
        repositories: [
          {
            id: 1,
            full_name: "inchidev/gitwok",
            private: false,
            has_discussions: true,
          },
          {
            id: 2,
            full_name: "my-team/private-chat",
            private: true,
            has_discussions: true,
          },
        ],
      });
    const { query, variables } = route.request().postDataJSON();
    if (query.includes("query Channels"))
      return json({
        data: {
          repository: {
            discussions: {
              nodes: [
                {
                  id:
                    variables.name === "gitwok"
                      ? "github-general"
                      : "private-general",
                  title: "#general",
                  body: "The team’s conversation",
                  url: "https://github.com/inchidev/gitwok/discussions/1",
                },
              ],
              pageInfo,
            },
          },
        },
      });
    if (query.includes("query Messages"))
      return json({
        data: {
          node: {
            comments: {
              nodes:
                variables.id === "github-general"
                  ? messages
                  : [comment("private-message", "Only the private workspace")],
              pageInfo,
            },
          },
        },
      });
    if (query.includes("mutation Send")) {
      if (failSend) return json({ errors: [{ message: "denied" }] });
      const message = comment("new-saved", variables.body);
      messages.push(message);
      return json({ data: { addDiscussionComment: { comment: message } } });
    }
    return route.fulfill({ status: 404, body: "{}" });
  });
  return messages;
}

async function session(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "gitwok:github-session:v1",
      JSON.stringify({
        accessToken: "test-browser-session",
        expiresAt: Date.now() + 60 * 60_000,
      }),
    ),
  );
}

test("GitHub OAuth completes with PKCE, sends directly to Discussions, and clears the session on sign-out", async ({
  page,
}) => {
  await githubRoutes(page);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.route("http://127.0.0.1:5180/config", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        clientId: "test-client",
        redirectUri: "http://127.0.0.1:5179/",
        installUrl: "https://github.com/apps/test-gitwok/installations/new",
      }),
    }),
  );
  await page.route("https://github.com/login/oauth/authorize**", (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.has("client_secret")).toBe(false);
    return route.fulfill({
      status: 302,
      headers: {
        location: `http://127.0.0.1:5179/?code=test-code&state=${url.searchParams.get("state")}`,
      },
    });
  });
  let exchanges = 0;
  await page.route("http://127.0.0.1:5180/exchange", (route) => {
    exchanges++;
    const body = route.request().postDataJSON();
    expect(body.code).toBe("test-code");
    expect(body.verifier).toHaveLength(64);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "test-browser-session",
        expiresAt: Date.now() + 28_800_000,
      }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(
    page.getByText("A conversation from GitHub", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(exchanges).toBe(1);
  expect(page.url()).not.toContain("code=");
  expect(page.url()).not.toContain("state=");
  const composer = page.getByRole("textbox", { name: "Message", exact: true });
  await composer.fill("Sent under my GitHub identity");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page
      .locator(".message")
      .filter({ hasText: "Sent under my GitHub identity" }),
  ).toContainText("Saved to GitHub");
  await expect(composer).toHaveValue("");
  expect(
    requests
      .filter((url) => url.startsWith("http://127.0.0.1:5180/"))
      .map((url) => new URL(url).pathname),
  ).toEqual(["/config", "/config", "/exchange"]);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "test-browser-session",
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("gitwok:github-session:v1"),
    ),
  ).toBeNull();
  await expect(
    page.getByText("Sent under my GitHub identity", { exact: true }),
  ).toHaveCount(0);
});

test("failed sends preserve the draft, and refresh replaces edited and deleted messages", async ({
  page,
}) => {
  await session(page);
  const messages = await githubRoutes(page, true);
  await page.goto("/");
  await expect(
    page.getByText("A conversation from GitHub", { exact: true }),
  ).toBeVisible();
  const composer = page.getByRole("textbox", { name: "Message", exact: true });
  await composer.fill("Keep my draft after a rejected send");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Your draft is still here",
  );
  await expect(composer).toHaveValue("Keep my draft after a rejected send");
  messages[0]!.body = "Edited on GitHub";
  messages.splice(1);
  await page.getByRole("button", { name: "Refresh messages" }).click();
  await expect(
    page.getByText("Edited on GitHub", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("This message will be deleted", { exact: true }),
  ).toHaveCount(0);
});

test("switching repositories isolates messages and keeps drafts in their original workspace", async ({
  page,
}) => {
  await session(page);
  await githubRoutes(page);
  await page.goto("/");
  await expect(
    page.getByText("A conversation from GitHub", { exact: true }),
  ).toBeVisible();
  const composer = page.getByRole("textbox", { name: "Message", exact: true });
  await composer.fill("Draft for the public workspace");
  await page.getByRole("button", { name: /gitwok inchidev\/gitwok/ }).click();
  await page
    .getByRole("button", { name: "my-team/private-chat", exact: true })
    .click();
  await expect(
    page.getByText("Only the private workspace", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("A conversation from GitHub", { exact: true }),
  ).toHaveCount(0);
  await expect(composer).toHaveValue("");
  await composer.fill("Draft for the private workspace");
  await page
    .getByRole("button", { name: /private-chat my-team\/private-chat/ })
    .click();
  await page
    .getByRole("button", { name: "inchidev/gitwok", exact: true })
    .click();
  await expect(composer).toHaveValue("Draft for the public workspace");
});
