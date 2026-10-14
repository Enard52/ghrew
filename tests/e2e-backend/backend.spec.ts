import { expect, test } from "@playwright/test";

const app = {
  appSlug: "ghrew-test",
  owner: "team",
  installUrl: "https://github.com/apps/ghrew-test/installations/new",
};
const workspace = {
  version: 1,
  backend: true,
  repository: "team/ghrew-chat",
  vault: "team/ghrew-vault",
  clientId: "client-id",
  appSlug: "ghrew-test",
  publicKey: "",
  openRegistration: false,
  memberPrivateChannels: false,
};

test("a fresh deployment guides App registration without an issue mailbox or manual GitHub credentials", async ({
  page,
}) => {
  let submitted: unknown;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/config")
      return route.fulfill({
        json: {
          configured: false,
          setupAvailable: true,
          app: null,
          sandbox: "",
        },
      });
    if (path === "/api/setup/start") {
      submitted = route.request().postDataJSON();
      return route.fulfill({
        json: {
          action:
            "https://github.com/organizations/team/settings/apps/new?state=" +
            "a".repeat(64),
          manifest: JSON.stringify({ name: "Ghrew team", public: false }),
        },
      });
    }
    throw new Error("Unexpected API request " + path);
  });
  await page.goto("/login");
  await expect(page).toHaveURL(/\/create\/$/);
  await expect(
    page.getByRole("heading", { name: "1. Register your GitHub App" }),
  ).toBeVisible();
  await page.getByLabel("GitHub organization", { exact: true }).fill("team");
  await page
    .getByLabel("Deployment setup key", { exact: true })
    .fill("test-only-key-with-at-least-32-characters");
  await page.getByRole("button", { name: "Prepare GitHub App" }).click();
  await expect(
    page.getByRole("button", { name: "Review and create App on GitHub" }),
  ).toBeVisible();
  expect(submitted).toEqual({
    organization: "team",
    setupToken: "test-only-key-with-at-least-32-characters",
  });
  await expect(page.locator('input[name="manifest"]')).toHaveValue(
    /"public":false/,
  );
  expect(await page.locator("body").innerText()).not.toContain(
    "Enable Device Flow",
  );
  await page.goto("/?preview=1");
  await expect(
    page.getByText("Demo workspace. Changes stay in this browser."),
  ).toBeVisible();
});

test("an owner installs the deployment's App and creates a verified workspace", async ({
  page,
}) => {
  const calls: unknown[] = [];
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/config")
      return route.fulfill({
        json: { configured: true, setupAvailable: true, app, sandbox: "" },
      });
    if (path === "/api/session")
      return route.fulfill({
        json: {
          viewer: { id: 1, login: "alice" },
          csrf: "c".repeat(64),
          expiresAt: Date.now() + 86400_000,
          workspace: null,
          app,
          sandbox: "",
        },
      });
    if (path === "/api/workspaces") {
      calls.push(route.request().postDataJSON());
      expect(route.request().headers()["x-ghrew-csrf"]).toBe("c".repeat(64));
      return route.fulfill({ json: { workspace } });
    }
    throw new Error("Unexpected API request " + path);
  });
  await page.goto("/create/");
  await expect(
    page.getByRole("heading", { name: "3. Connect your organization" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Install GitHub App" }),
  ).toHaveAttribute("href", app.installUrl);
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(
    page.getByText("Workspace prepared", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open your workspace" }),
  ).toHaveAttribute("href", "/w/team");
  expect(calls).toEqual([{ organization: "team" }]);
});

test("cookie sessions use the backend workspace despite a stale browser preference, preserve private reads and clear on sign-out", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "ghrew:workspaces:v2",
      JSON.stringify({ alice: "old-team/ghrew-chat" }),
    );
  });
  let signedOut = false;
  let vaultListAttempts = 0;
  const requests: { url: string; authorization: string | undefined }[] = [];
  page.on("request", (request) =>
    requests.push({
      url: request.url(),
      authorization: request.headers().authorization,
    }),
  );
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/config")
      return route.fulfill({
        json: { configured: true, setupAvailable: true, app, sandbox: "" },
      });
    if (path === "/api/session")
      return route.fulfill({
        status: signedOut ? 401 : 200,
        json: signedOut
          ? { error: "Signed out" }
          : {
              viewer: { id: 1, login: "alice" },
              csrf: "c".repeat(64),
              expiresAt: Date.now() + 86400_000,
              workspace,
              app,
              sandbox: "",
            },
      });
    if (path === "/api/logout") {
      signedOut = true;
      return route.fulfill({ json: { signedOut: true } });
    }
    if (path === "/api/vault") {
      const body = route.request().postDataJSON();
      if (body.operation.op === "list" && vaultListAttempts++ === 0)
        return route.fulfill({
          status: 409,
          json: { error: "Another workspace operation is in progress. Retry shortly." },
        });
      if (body.operation.op === "list")
        return route.fulfill({
          json: {
            channels: [
              {
                id: "direct-channel",
                name: "Bob",
                kind: "dm",
                description: "",
              },
              {
                id: "private-channel",
                name: "Private room",
                description: "Members only",
                kind: "private",
              },
            ],
          },
        });
      if (body.operation.op === "read")
        return route.fulfill({
          json: {
            messages: [
              {
                id: "m1",
                channelId: body.operation.conversation,
                parentId: "",
                author: "bob",
                body: "Only permitted participants can see this.",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: "saved",
                url: "",
              },
            ],
          },
        });
      throw new Error("Unexpected private operation");
    }
    if (path === "/api/github") {
      const body = route.request().postDataJSON();
      if (body.path.startsWith("/user/installations/9/repositories"))
        return route.fulfill({
          json: {
            total_count: 1,
            repositories: [
              {
                id: 10,
                full_name: "team/ghrew-chat",
                private: false,
                has_discussions: true,
              },
            ],
          },
        });
      if (body.path.startsWith("/user/installations"))
        return route.fulfill({
          json: { total_count: 1, installations: [{ id: 9 }] },
        });
      if (
        body.path === "/graphql" &&
        body.body.query.includes("query Channels")
      )
        return route.fulfill({
          json: {
            data: {
              repository: {
                discussions: {
                  nodes: [
                    {
                      id: "general",
                      title: "general",
                      body: "Welcome",
                      url: "https://github.com/team/ghrew-chat/discussions/1",
                    },
                  ],
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            },
          },
        });
      if (body.path === "/graphql")
        return route.fulfill({
          json: {
            data: {
              node: {
                comments: {
                  nodes: [],
                  pageInfo: { hasNextPage: false, endCursor: null },
                },
              },
            },
          },
        });
      throw new Error("Unexpected GitHub proxy operation");
    }
    throw new Error("Unexpected API request " + path);
  });
  await page.goto("/?workspace=old-team/ghrew-chat&channel=private-channel");
  await expect(page.locator(".workspace-switch")).toHaveText("team");
  await expect(
    page.getByText("Conversations are busy. Try again shortly."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/w\/old-team\/c\/private-channel$/);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Private room", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Only permitted participants can see this."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/w\/team\/c\/private-channel$/);
  await page.getByRole("button", { name: "# general", exact: true }).click();
  await expect(page).toHaveURL(/\/w\/team\/c\/general$/);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Private room", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bob", exact: true }).click();
  await expect(page).toHaveURL(/\/w\/team\/dm\/direct-channel$/);
  await page.goBack();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Private room", exact: true }),
  ).toBeVisible();
  await page.goto("/?channel=missing-channel");
  await expect(
    page.getByRole("heading", { name: "# general", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Private room/ }).click();
  await expect(
    page.getByText("Only permitted participants can see this."),
  ).toBeVisible();
  expect(requests.some((r) => r.url.startsWith("https://api.github.com"))).toBe(
    false,
  );
  expect(requests.some((r) => r.authorization)).toBe(false);
  expect(
    await page.evaluate(() => JSON.stringify({ ...sessionStorage })),
  ).not.toContain("ghrew-backend:");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue with GitHub" }),
  ).toBeVisible();
  await expect(
    page.getByText("Only permitted participants can see this."),
  ).toHaveCount(0);
  expect(signedOut).toBe(true);
});

test("signed-out entry has no hidden chat shell at phone, tablet and desktop widths", async ({
  page,
}) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/config")
      return route.fulfill({
        json: { configured: true, setupAvailable: true, app, sandbox: "team" },
      });
    if (path === "/api/session")
      return route.fulfill({ status: 401, json: { error: "Signed out" } });
    throw new Error(
      "Signed-out entry attempted a conversation request: " + path,
    );
  });
  for (const width of [390, 712, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Continue with GitHub" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("heading", { name: "Sign in to Ghrew", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".ghrew-shell")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Message", exact: true }),
    ).toHaveCount(0);
    const copy = await page.locator("main").innerText();
    expect(copy).not.toMatch(
      /vault|Cloudflare|backend|Actions|repository|token/i,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
  await page.getByRole("button", { name: "Try a demo" }).click();
  await expect(page.locator(".ghrew-shell")).toBeVisible();
  await expect(
    page.getByText("Demo workspace. Changes stay in this browser."),
  ).toBeVisible();
});

test("the landing is public, and protected links preserve their destination at login", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    apiRequests.push(path);
    if (path === "/api/config")
      return route.fulfill({
        json: { configured: true, setupAvailable: true, app, sandbox: "team" },
      });
    if (path === "/api/session")
      return route.fulfill({ status: 401, json: { error: "Signed out" } });
    if (path === "/api/auth/start")
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "GitHub sign-in started",
      });
    throw new Error("Unexpected API request " + path);
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your crew, on GitHub." }),
  ).toBeVisible();
  expect(apiRequests).toEqual([]);
  await page.getByRole("button", { name: "# building", exact: true }).click();
  await expect(
    page.getByText(
      "The new homepage is ready for review. Please add feedback in a thread so we can keep track.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "# general", exact: true }).click();
  await page.getByRole("link", { name: "2 replies", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Thread", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(
    /\/demo\/c\/preview-general\?thread=preview-guide$/,
  );
  await page.goto("/");
  await expect(page.locator(".ghrew-shell")).toHaveCount(0);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Continue with GitHub" }),
  ).toBeEnabled();
  await page.goto("/w/team/c/private-channel?thread=m1");
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
    "/w/team/c/private-channel?thread=m1",
  );
  await expect(page.locator(".ghrew-shell")).toHaveCount(0);
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(page).toHaveURL(/\/api\/auth\/start\?returnTo=/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
    "/w/team/c/private-channel?thread=m1",
  );
});
