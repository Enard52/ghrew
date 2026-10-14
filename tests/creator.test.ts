import { describe, it, expect, vi, afterEach } from "vitest";
import { createWorkspaceRepositories } from "../app/lib/creator";
afterEach(() => vi.unstubAllGlobals());
const plan = {
  organization: "acme",
  clientUrl: "https://example.test/",
  ownClient: false,
  nonce: "installation-1",
  administrator: { id: 1, login: "owner" },
};
describe("workspace installer", () => {
  it("stops without writes when GitHub hides organization base permissions", async () => {
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        requests.push(init?.method || "GET");
        return Response.json(
          url.includes("/memberships/")
            ? { role: "admin", state: "active" }
            : { default_repository_permission: null },
        );
      }),
    );
    await expect(
      createWorkspaceRepositories("installer-token", plan, () => {}),
    ).rejects.toThrow("did not disclose organization base permissions");
    expect(requests).toEqual(["GET", "GET"]);
  });
  it("does not create a vault when base permissions would expose it to all members", async () => {
    const requests: { url: string; method: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        requests.push({ url, method: init?.method || "GET" });
        return Response.json(
          url.includes("/memberships/")
            ? { role: "admin", state: "active" }
            : { default_repository_permission: "read" },
        );
      }),
    );
    await expect(
      createWorkspaceRepositories("installer-token", plan, () => {}),
    ).rejects.toThrow("base permissions to None");
    expect(requests.every((request) => request.method === "GET")).toBe(true);
  });
  it("requires an organization owner, independently of UI installer flags", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ role: "member", state: "active" })),
    );
    await expect(
      createWorkspaceRepositories("member-token", plan, () => {}),
    ).rejects.toThrow("organization owner");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("checks every reserved repository name before performing writes", async () => {
    const calls: { url: string; method: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, method: init?.method || "GET" });
        if (url.includes("/memberships/"))
          return Response.json({ role: "admin", state: "active" });
        if (url.endsWith("/orgs/acme"))
          return Response.json({ default_repository_permission: "none" });
        if (url.endsWith("/.gitwok-installation.json"))
          return Response.json({
            content: Buffer.from(
              JSON.stringify({
                nonce: "some-other-installation",
                administrator: 1,
              }),
            ).toString("base64"),
          });
        return Response.json({ id: 123, private: false });
      }),
    );
    await expect(
      createWorkspaceRepositories("installer-token", plan, () => {}),
    ).rejects.toThrow("already exists");
    expect(calls.every((call) => call.method === "GET")).toBe(true);
  });
});
