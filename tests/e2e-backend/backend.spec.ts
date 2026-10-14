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
  await page.goto("/");
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
    page.getByText(
      "Local preview · sample conversations, saved in this browser.",
    ),
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
  ).toHaveAttribute("href", "/?workspace=team%2Fghrew-chat");
  expect(calls).toEqual([{ organization: "team" }]);
});

test("cookie sessions route public and private reads through the backend and sign out without browser GitHub tokens", async ({
  page,
}) => {
  let signedOut = false;
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
      if (body.operation.op === "list")
        return route.fulfill({
          json: {
            channels: [
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
                channelId: "private-channel",
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
  await page.goto("/");
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
