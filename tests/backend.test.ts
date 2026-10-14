import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  Miniflare,
  convertV4MiniflareOptions,
  Response as MFResponse,
} from "miniflare";
import { build } from "esbuild";
import { createHmac, generateKeyPairSync } from "node:crypto";
import { Store, type Workspace } from "../backend/store";

const origin = "https://ghrew.test",
  secret = "test-only-setup-key-with-at-least-32-characters";
const privateKey = generateKeyPairSync("rsa", { modulusLength: 2048 })
  .privateKey.export({ type: "pkcs8", format: "pem" })
  .toString();
const app = {
  id: 123,
  slug: "ghrew-test",
  client_id: "client-id",
  client_secret: "private-client-secret",
  pem: privateKey,
  webhook_secret: "private-webhook-secret",
  owner: { login: "team" },
};
const response = (value: unknown, status = 200) =>
  new MFResponse(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
let mf: Miniflare,
  store: Store,
  currentUser = 1,
  revoked = false,
  wrongOwner = false,
  basePermission = "none",
  tokenRevocations = 0;
let ownerRole: "admin" | "member" | "outside" = "admin";
let githubCalls: {
  url: string;
  authorization: string;
  method: string;
  body: unknown;
}[] = [];
let membership = {
  version: 1,
  organization: "team",
  admins: [1],
  members: [
    { id: 1, login: "user1" },
    { id: 2, login: "user2" },
    { id: 3, login: "user3" },
  ],
  openRegistration: false,
  memberPrivateChannels: false,
  blocked: [] as number[],
};
const cookieValue = (header: string | null) => header?.split(";")[0] || "";
async function request(path: string, init: RequestInit = {}) {
  return mf.dispatchFetch(origin + path, { redirect: "manual", ...init });
}
async function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return request(path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
async function register() {
  const start = await post("/api/setup/start", {
    organization: "team",
    setupToken: secret,
  });
  expect(start.status).toBe(200);
  const data = (await start.json()) as { action: string; manifest: string };
  const state = new URL(data.action).searchParams.get("state");
  const callback = await request(
    `/api/setup/callback?code=manifest-code&state=${state}`,
    { headers: { Cookie: cookieValue(start.headers.get("set-cookie")) } },
  );
  expect(callback.status).toBe(303);
  return data;
}
async function login(id = 1) {
  currentUser = id;
  const start = await request("/api/auth/start");
  expect(start.status).toBe(303);
  const state = new URL(start.headers.get("location")!).searchParams.get(
    "state",
  )!;
  const result = await request(
    `/api/auth/callback?code=oauth-code&state=${state}`,
    { headers: { Cookie: cookieValue(start.headers.get("set-cookie")) } },
  );
  expect(result.status).toBe(303);
  const cookies = result.headers.getSetCookie();
  const cookie = cookieValue(
    cookies.find((c) => c.startsWith("__Host-ghrew_session=")) || null,
  );
  const session = await request("/api/session", {
    headers: { Cookie: cookie },
  });
  expect(session.status).toBe(200);
  const data = (await session.json()) as { csrf: string };
  return {
    cookie,
    csrf: data.csrf,
    sessionCookie: cookies.find((c) => c.startsWith("__Host-ghrew_session="))!,
    state,
    flowCookie: cookieValue(start.headers.get("set-cookie")),
  };
}
const sessionHeaders = (session: { cookie: string; csrf: string }) => ({
  Cookie: session.cookie,
  "X-Ghrew-CSRF": session.csrf,
});

beforeAll(async () => {
  await build({
    entryPoints: ["backend/worker.ts"],
    bundle: true,
    platform: "browser",
    format: "esm",
    target: "es2022",
    external: ["node:*"],
    outfile: "artifacts/backend-test-worker.mjs",
  });
});
beforeEach(async () => {
  currentUser = 1;
  revoked = false;
  wrongOwner = false;
  basePermission = "none";
  githubCalls = [];
  tokenRevocations = 0;
  ownerRole = "admin";
  membership = {
    version: 1,
    organization: "team",
    admins: [1],
    members: [
      { id: 1, login: "user1" },
      { id: 2, login: "user2" },
      { id: 3, login: "user3" },
    ],
    openRegistration: false,
    memberPrivateChannels: false,
    blocked: [],
  };
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: "artifacts/backend-test-worker.mjs",
      compatibilityDate: "2026-10-14",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: ["DB"],
      bindings: {
        SETUP_TOKEN: secret,
        PUBLIC_APP: "false",
        SANDBOX_ORGANIZATION: "team",
      },
      serviceBindings: { ASSETS: () => new MFResponse("client") },
      outboundService: async (req) => {
        const url = new URL(req.url),
          authorization = req.headers.get("Authorization") || "",
          method = req.method;
        const raw = await req.text();
        const body = raw ? JSON.parse(raw) : undefined;
        githubCalls.push({ url: req.url, authorization, method, body });
        if (url.pathname.startsWith("/app-manifests/"))
          return response({
            ...app,
            owner: { login: wrongOwner ? "wrong-owner" : "team" },
          });
        if (url.pathname === "/login/oauth/access_token")
          return response({
            access_token: `private-user-token-${currentUser}`,
            token_type: "bearer",
            expires_in: 28800,
            refresh_token: `private-refresh-token-${currentUser}`,
            refresh_token_expires_in: 15897600,
          });
        if (url.pathname === "/user") {
          if (revoked) return response({ message: "Bad credentials" }, 401);
          const id = Number(
            authorization.match(/private-user-token-(\d+)/)?.[1] || currentUser,
          );
          return response({ id, login: `user${id}` });
        }
        if (url.pathname === "/user/memberships/orgs/team")
          return response({ role: "admin", state: "active" });
        if (url.pathname === "/orgs/team")
          return response({ default_repository_permission: basePermission });
        if (url.pathname.startsWith("/orgs/team/memberships/user")) {
          const id = Number(url.pathname.split("user").at(-1));
          if (id === 1 && ownerRole === "outside")
            return response({ message: "Not found" }, 404);
          return response({
            state: "active",
            role: id === 1 ? ownerRole : "member",
            user: { id, login: `user${id}` },
          });
        }
        if (url.pathname === "/user/installations")
          return response({
            total_count: 1,
            installations: [{ id: 9, app_id: 123, account: { login: "team" } }],
          });
        if (url.pathname === "/repos/team/ghrew-chat")
          return response({
            id: 10,
            private: false,
            description: "unrelated repository",
            has_discussions: true,
          });
        if (url.pathname === "/repos/team/ghrew-vault/installation")
          return response({ id: 9 });
        if (url.pathname === "/app/installations/9/access_tokens")
          return response({ token: "private-installation-token" });
        if (url.pathname === "/repos/team/ghrew-vault")
          return response({ id: 11, private: true });
        if (url.pathname.endsWith("/.ghrew/members.json")) {
          if (method === "PUT") {
            membership = JSON.parse(
              Buffer.from(
                (body as { content: string }).content,
                "base64",
              ).toString(),
            );
            return response({});
          }
          return response({
            sha: "members-sha",
            content: Buffer.from(JSON.stringify(membership)).toString("base64"),
          });
        }
        if (url.pathname === "/repos/team/ghrew-vault/collaborators")
          return response([{ id: 1 }]);
        if (url.pathname === "/installation/token" && method === "DELETE") {
          tokenRevocations++;
          return response(null, 204);
        }
        if (url.pathname === "/graphql") {
          const query = (body as { query: string }).query;
          if (query.includes("query Vault"))
            return response({
              data: {
                repository: {
                  id: "vault-repository-id",
                  discussionCategories: {
                    nodes: [{ id: "category", slug: "general" }],
                  },
                  discussions: {
                    nodes: [
                      {
                        id: "private-channel",
                        title: "private",
                        body: JSON.stringify({
                          version: 1,
                          id: "internal-private",
                          kind: "private",
                          name: "Only Alice and Bob",
                          members: [1, 2],
                        }),
                        url: "",
                      },
                    ],
                    pageInfo: { hasNextPage: false, endCursor: null },
                  },
                },
              },
            });
          if (query.includes("query Read"))
            return response({
              data: {
                node: {
                  comments: {
                    nodes: [
                      {
                        id: "comment",
                        body: JSON.stringify({
                          version: 1,
                          type: "message",
                          nonce: "original",
                          author: { id: 1, login: "user1" },
                          body: "Private conversation content",
                        }),
                        createdAt: "2026-10-14T00:00:00Z",
                        updatedAt: "2026-10-14T00:00:00Z",
                      },
                    ],
                    pageInfo: { hasNextPage: false, endCursor: null },
                  },
                },
              },
            });
          return response({
            data: { viewer: { login: `user${currentUser}` } },
          });
        }
        throw new Error("Unexpected outbound request: " + req.url);
      },
    }),
  );
  await request("/api/config");
  store = new Store(await mf.getD1Database("DB"), secret);
});
afterEach(async () => {
  await mf?.dispose();
});

describe("Cloudflare backend", () => {
  it("returns sign-in to workspace, private channel and DM links while rejecting arbitrary destinations", async () => {
    await register();
    for (const [query, destination] of [
      ["workspace=" + encodeURIComponent("team/ghrew-chat"), "/w/team"],
      ["returnTo=" + encodeURIComponent("/w/team/c/private-channel?thread=m1"), "/w/team/c/private-channel?thread=m1"],
      ["returnTo=" + encodeURIComponent("/w/team/dm/direct-channel"), "/w/team/dm/direct-channel"],
      ["returnTo=" + encodeURIComponent("//evil.test/"), "/w/team"],
      ["returnTo=" + encodeURIComponent("/w/team/c/%2f%2fevil.test"), "/w/team"],
      ["workspace=" + encodeURIComponent("https://evil.test/"), "/w/team"],
    ]) {
      const start = await request("/api/auth/start?" + query);
      const state = new URL(start.headers.get("location")!).searchParams.get("state");
      const callback = await request(`/api/auth/callback?code=x&state=${state}`, { headers: { Cookie: cookieValue(start.headers.get("set-cookie")) } });
      expect(callback.status).toBe(303);
      expect(callback.headers.get("location")).toBe(destination);
    }
  });
  it("serves a split-hosted deep link from the public shell without forwarding private headers", async () => {
    const forwarded: { url: string; cookie: string | null; authorization: string | null }[] = [];
    const shellWorker = new Miniflare(convertV4MiniflareOptions({
      modules: true,
      scriptPath: "artifacts/backend-test-worker.mjs",
      compatibilityDate: "2026-10-14",
      compatibilityFlags: ["nodejs_compat"],
      outboundService: async req => {
        forwarded.push({ url: req.url, cookie: req.headers.get("Cookie"), authorization: req.headers.get("Authorization") });
        return new MFResponse("public app shell", { headers: { "Content-Type": "text/html" } });
      },
    }));
    try {
      const result = await shellWorker.dispatchFetch(origin + "/w/team/c/private-channel?thread=m1", {
        headers: { Cookie: "private-session", Authorization: "private-credential" },
      });
      expect(result.status).toBe(200);
      expect(await result.text()).toBe("public app shell");
      expect(result.headers.get("Cache-Control")).toBe("no-store");
      expect(forwarded).toEqual([{ url: origin + "/200.html", cookie: null, authorization: null }]);
    } finally { await shellWorker.dispose(); }
  });
  it("keeps a new deployment closed until an operator supplies the setup key", async () => {
    expect((await request("/health")).status).toBe(200);
    expect((await request("/api/session")).status).toBe(503);
    expect(
      (
        await post("/api/setup/start", {
          organization: "team",
          setupToken: "wrong",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await post(
          "/api/setup/start",
          { organization: "team", setupToken: secret },
          { Origin: "https://evil.test" },
        )
      ).status,
    ).toBe(403);
    expect(githubCalls).toHaveLength(0);
  });
  it("registers an owner-controlled App once and encrypts its credentials", async () => {
    const data = await register();
    expect(JSON.parse(data.manifest).public).toBe(false);
    expect(JSON.parse(data.manifest).callback_urls).toEqual([
      origin + "/api/auth/callback",
    ]);
    expect(
      (
        await post("/api/setup/start", {
          organization: "team",
          setupToken: secret,
        })
      ).status,
    ).toBe(409);
    const db = await mf.getD1Database("DB");
    const row = await db
      .prepare("SELECT value FROM settings WHERE key='app'")
      .first<{ value: string }>();
    expect(row?.value).not.toContain(app.client_secret);
    expect(row?.value).not.toContain("PRIVATE KEY");
    expect((await request("/api/config")).status).toBe(200);
    expect(
      JSON.stringify(await (await request("/api/config")).json()),
    ).not.toContain(app.client_secret);
  });
  it("binds manifest registration to its initiating browser and expected GitHub owner", async () => {
    const start = await post("/api/setup/start", {
      organization: "team",
      setupToken: secret,
    });
    const data = (await start.json()) as { action: string };
    const state = new URL(data.action).searchParams.get("state");
    expect(
      (await request(`/api/setup/callback?code=x&state=${state}`)).status,
    ).toBe(400);
    wrongOwner = true;
    expect(
      (
        await request(`/api/setup/callback?code=x&state=${state}`, {
          headers: { Cookie: cookieValue(start.headers.get("set-cookie")) },
        })
      ).status,
    ).toBe(403);
    expect(await store.app()).toBeNull();
  });
  it("uses PKCE, browser-bound single-use state and an HttpOnly session without exposing GitHub tokens", async () => {
    await register();
    const session = await login();
    expect(session.sessionCookie).toContain("HttpOnly");
    expect(session.sessionCookie).toContain("Secure");
    expect(session.sessionCookie).toContain("SameSite=Lax");
    expect(session.sessionCookie).not.toContain("private-user-token");
    const tokenCall = githubCalls.find((c) => c.url.endsWith("/access_token"));
    expect(
      (tokenCall?.body as { code_verifier: string }).code_verifier,
    ).toHaveLength(64);
    const data = await (
      await request("/api/session", { headers: { Cookie: session.cookie } })
    ).text();
    expect(data).not.toContain("private-user-token");
    expect(data).not.toContain("private-refresh-token");
    expect(
      (
        await request(`/api/auth/callback?code=x&state=${session.state}`, {
          headers: { Cookie: session.flowCookie },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request("/api/session", {
          headers: { Cookie: "__Host-ghrew_session=" + "a".repeat(64) },
        })
      ).status,
    ).toBe(401);
  });
  it("requires both origin and CSRF proof for writes and uses only the acting user's token for GitHub proxying", async () => {
    await register();
    const session = await login();
    const body = {
      path: "/graphql",
      method: "POST",
      body: { query: "query{viewer{login}}" },
    };
    expect(
      (await post("/api/github", body, { Cookie: session.cookie })).status,
    ).toBe(403);
    expect(
      (
        await post("/api/github", body, {
          ...sessionHeaders(session),
          Origin: "https://evil.test",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await post(
          "/api/github",
          { path: "//evil.test" },
          sessionHeaders(session),
        )
      ).status,
    ).toBe(403);
    const result = await post("/api/github", body, sessionHeaders(session));
    expect(result.status).toBe(200);
    expect(
      githubCalls.findLast((c) => c.url.endsWith("/graphql"))?.authorization,
    ).toBe("Bearer private-user-token-1");
    expect(
      (await post("/api/logout", {}, sessionHeaders(session))).status,
    ).toBe(200);
    expect(
      (await request("/api/session", { headers: { Cookie: session.cookie } }))
        .status,
    ).toBe(401);
  });
  it("refreshes expiring credentials server-side and rejects revoked GitHub authorization", async () => {
    await register();
    const session = await login();
    const row = await store.session(session.cookie.split("=")[1]!);
    row.credentials.accessExpires = Date.now() - 1;
    await store.saveSession(row);
    expect(
      (await request("/api/session", { headers: { Cookie: session.cookie } }))
        .status,
    ).toBe(200);
    expect(
      githubCalls.some(
        (c) =>
          (c.body as { grant_type?: string } | undefined)?.grant_type ===
          "refresh_token",
      ),
    ).toBe(true);
    revoked = true;
    expect(
      (await request("/api/session", { headers: { Cookie: session.cookie } }))
        .status,
    ).toBe(401);
    const db = await mf.getD1Database("DB");
    expect(
      await db.prepare("SELECT COUNT(*) AS count FROM sessions").first("count"),
    ).toBe(0);
  });
  it("checks webhook signatures over the exact bytes before revoking sessions", async () => {
    await register();
    const session = await login();
    const body = JSON.stringify(
      { action: "revoked", sender: { id: 1, login: "user1" } },
      null,
      2,
    );
    const call = (signature: string) =>
      request("/api/webhooks", {
        method: "POST",
        headers: {
          "X-GitHub-Event": "github_app_authorization",
          "X-Hub-Signature-256": signature,
        },
        body,
      });
    expect((await call("sha256=wrong")).status).toBe(403);
    expect(
      (await request("/api/session", { headers: { Cookie: session.cookie } }))
        .status,
    ).toBe(200);
    expect(
      (
        await call(
          "sha256=" +
            createHmac("sha256", app.webhook_secret).update(body).digest("hex"),
        )
      ).status,
    ).toBe(200);
    expect(
      (await request("/api/session", { headers: { Cookie: session.cookie } }))
        .status,
    ).toBe(401);
  });
  it("enforces private-channel membership and never sends an installation token to the browser", async () => {
    await register();
    const workspace: Workspace = {
      organization: "team",
      repository: "team/ghrew-chat",
      vault: "team/ghrew-vault",
      installationId: 9,
      nonce: "workspace-nonce",
      ready: true,
      openRegistration: false,
      memberPrivateChannels: false,
    };
    await store.saveWorkspace(workspace);
    const bob = await login(2);
    const allowed = await post(
      "/api/vault",
      {
        organization: "team",
        operation: { op: "read", conversation: "private-channel" },
      },
      sessionHeaders(bob),
    );
    expect(allowed.status).toBe(200);
    const text = await allowed.text();
    expect(text).toContain("Private conversation content");
    expect(text).not.toContain("private-installation-token");
    const carol = await login(3);
    const denied = await post(
      "/api/vault",
      {
        organization: "team",
        operation: { op: "read", conversation: "private-channel" },
      },
      sessionHeaders(carol),
    );
    expect(denied.ok).toBe(false);
    expect(await denied.text()).not.toContain("Private conversation content");
    const unknown = await post(
      "/api/vault",
      { organization: "other", operation: { op: "list" } },
      sessionHeaders(carol),
    );
    expect(unknown.status).toBe(404);
    expect(tokenRevocations).toBe(2);
    const formerOwner = await login(1);
    ownerRole = "member";
    const demoted = await post(
      "/api/vault",
      {
        organization: "team",
        operation: { op: "read", conversation: "private-channel" },
      },
      sessionHeaders(formerOwner),
    );
    expect(demoted.ok).toBe(false);
    expect(await demoted.text()).not.toContain("Private conversation content");
    ownerRole = "outside";
    const removed = await post(
      "/api/vault",
      { organization: "team", operation: { op: "list" } },
      sessionHeaders(formerOwner),
    );
    expect(removed.ok).toBe(false);
  });
  it("refuses unsafe organization base access and preserves unrelated repositories", async () => {
    await register();
    const session = await login();
    basePermission = "read";
    const unsafe = await post(
      "/api/workspaces",
      { organization: "team" },
      sessionHeaders(session),
    );
    expect(unsafe.status).toBe(409);
    expect(await unsafe.text()).toContain("None");
    basePermission = "none";
    const unrelated = await post(
      "/api/workspaces",
      { organization: "team" },
      sessionHeaders(session),
    );
    expect(unrelated.status).toBe(409);
    expect(await unrelated.text()).toContain("unrelated");
    expect(
      githubCalls.filter(
        (c) => c.method === "POST" && c.url.includes("/orgs/team/repos"),
      ),
    ).toHaveLength(0);
  });
});
