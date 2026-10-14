import { test, expect } from "@playwright/test";
import {
  newMailboxKey,
  seal,
  unseal,
  parseMailboxRequest,
  REPLY_PREFIX,
} from "../../shared/mailbox";
test("workspace creation is reachable before sandbox sign-in on desktop and phone", async ({
  page,
}) => {
  const key = await newMailboxKey();
  await page.route("https://api.github.com/**", (r) =>
    r.fulfill({
      json: {
        version: 1,
        repository: "ghrew-sandbox/ghrew-auth",
        clientId: "sandbox",
        appSlug: "sandbox",
        publicKey: key.publicKey,
        creatorClientId: "creator",
        creatorAppSlug: "ghrew-creator",
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("link", { name: "Create your own workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Create your own workspace",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Install Ghrew Creator", exact: true }),
  ).toHaveAttribute(
    "href",
    "https://github.com/apps/ghrew-creator/installations/new",
  );
  await expect(
    page.getByRole("button", { name: "Authorize Ghrew Creator", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText("Your workspace is verified", { exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Create your own workspace",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/setup-phone.png", fullPage: true });
});
test("setup resumes after reload and verifies the actual vault before offering the team-owned client", async ({
  page,
}) => {
  const key = await newMailboxKey();
  const config = {
    version: 1,
    repository: "acme/ghrew-auth",
    clientId: "workspace",
    appSlug: "workspace",
    publicKey: key.publicKey,
    vault: "acme/ghrew-vault",
  };
  await page.addInitScript(
    ({ config }) => {
      localStorage.setItem("ghrew:auth-repository:v1", config.repository);
      sessionStorage.setItem(
        "ghrew:github-session:v1",
        JSON.stringify({
          accessToken: "runtime-user-token",
          expiresAt: Date.now() + 3600000,
          mailboxRepository: config.repository,
        }),
      );
      sessionStorage.setItem(
        "ghrew:setup-config",
        JSON.stringify({
          config,
          plan: {
            organization: "acme",
            clientUrl: "https://acme.github.io/ghrew-client/",
            ownClient: true,
            nonce: "setup",
            administrator: { id: 1, login: "alice" },
          },
        }),
      );
    },
    { config },
  );
  let result: string | undefined;
  let release = false;
  let directVault = false;
  page.on("request", (r) => {
    if (r.url().startsWith("https://api.github.com/repos/acme/ghrew-vault"))
      directVault = true;
  });
  await page.route("https://api.github.com/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/user")
      return route.fulfill({ json: { id: 1, login: "alice" } });
    if (path.endsWith("/contents/ghrew-auth.json"))
      return route.fulfill({
        json: path.includes("/acme/")
          ? config
          : {
              ...config,
              repository: "ghrew-sandbox/ghrew-auth",
              creatorAppSlug: "ghrew-creator",
            },
      });
    if (path === "/repos/acme/ghrew-chat")
      return route.fulfill({ json: { private: false, has_discussions: true } });
    if (
      path === "/repos/acme/ghrew-auth/issues" &&
      route.request().method() === "POST"
    ) {
      const body = route.request().postDataJSON();
      const request = parseMailboxRequest(body.title, body.body);
      const operation = await unseal(
        key.privateKey,
        request.publicKey,
        request.id,
        request.payload!,
      );
      expect(operation).toEqual({ op: "members" });
      result =
        REPLY_PREFIX +
        JSON.stringify(
          await seal(
            key.privateKey,
            key.publicKey,
            request.publicKey,
            request.id,
            {
              id: request.id,
              kind: "result",
              part: 0,
              total: 1,
              data: JSON.stringify({
                admins: [1],
                members: [{ id: 1, login: "alice" }],
              }),
            },
          ),
        );
      return route.fulfill({ json: { number: 1 } });
    }
    if (path.endsWith("/issues/1/comments"))
      return route.fulfill({
        json: release && result ? [{ id: 1, body: result }] : [],
      });
    throw new Error("Unexpected setup API " + path);
  });
  await page.goto("/create/");
  await expect(
    page.getByText("Checking your private vault through Actions…", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open my workspace", exact: true }),
  ).toHaveCount(0);
  release = true;
  await expect(
    page.getByRole("heading", {
      name: "Your workspace is verified",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open my workspace", exact: true }),
  ).toHaveAttribute(
    "href",
    /^https:\/\/acme.github.io\/ghrew-client\/\?auth=acme%2Fghrew-auth&workspace=acme%2Fghrew-chat$/,
  );
  expect(directVault).toBe(false);
  await page.screenshot({
    path: "artifacts/setup-verified.png",
    fullPage: true,
  });
});

test("a saved setup requires its own workspace sign-in when another workspace session is active", async ({
  page,
}) => {
  const key = await newMailboxKey();
  const config = {
    version: 1,
    repository: "acme/ghrew-auth",
    clientId: "workspace",
    appSlug: "workspace",
    publicKey: key.publicKey,
    vault: "acme/ghrew-vault",
  };
  await page.addInitScript(
    ({ config }) => {
      localStorage.setItem(
        "ghrew:auth-repository:v1",
        "ghrew-sandbox/ghrew-auth",
      );
      sessionStorage.setItem(
        "ghrew:github-session:v1",
        JSON.stringify({
          accessToken: "sandbox-token",
          expiresAt: Date.now() + 3600000,
          mailboxRepository: "ghrew-sandbox/ghrew-auth",
        }),
      );
      sessionStorage.setItem(
        "ghrew:setup-config",
        JSON.stringify({
          config,
          plan: {
            organization: "acme",
            clientUrl: "https://acme.github.io/ghrew-client/",
            ownClient: true,
            nonce: "setup",
            administrator: { id: 1, login: "alice" },
          },
        }),
      );
    },
    { config },
  );
  const writes: string[] = [];
  await page.route("https://api.github.com/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "POST") writes.push(path);
    if (path === "/user")
      return route.fulfill({ json: { id: 1, login: "alice" } });
    if (path.endsWith("/contents/ghrew-auth.json"))
      return route.fulfill({
        json: {
          ...config,
          repository: "ghrew-sandbox/ghrew-auth",
          creatorAppSlug: "ghrew-creator",
        },
      });
    return route.fulfill({
      status: 403,
      json: { message: "Wrong workspace token" },
    });
  });
  await page.goto("/create/");
  await expect(
    page.getByRole("button", {
      name: "Test my workspace sign-in",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Your workspace is verified",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(writes).toEqual([]);
});
