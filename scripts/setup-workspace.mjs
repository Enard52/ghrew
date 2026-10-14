import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import {
  createWorkspaceRepositories,
  finishAppRegistration,
} from "../app/lib/creator.ts";
const args = process.argv.slice(2);
const organization = args[args.indexOf("--organization") + 1];
if (
  !args.includes("--organization") ||
  !/^[a-z\d-]{1,39}$/i.test(organization || "")
)
  throw new Error(
    "Usage: npm run setup -- --organization YOUR_ORG [--own-client]",
  );
const token = execFileSync("gh", ["auth", "token"], {
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
}).trim();
const administrator = JSON.parse(
  execFileSync("gh", ["api", "user", "--jq", "{id,login}"], {
    encoding: "utf8",
  }),
);
let plan = {
  organization,
  ownClient: args.includes("--own-client"),
  publicApp: args.includes("--public-app"),
  clientUrl: args.includes("--own-client")
    ? `https://${organization}.github.io/ghrew-client/`
    : "https://ghrew.inchi.dev/",
  nonce: crypto.randomUUID(),
  administrator,
};
const recoveryPath = `.ghrew-setup/${organization.toLowerCase()}.json`;
try {
  const saved = JSON.parse(await readFile(recoveryPath, "utf8"));
  if (
    saved.organization === organization &&
    saved.administrator.id === administrator.id &&
    saved.ownClient === plan.ownClient &&
    Boolean(saved.publicApp) === plan.publicApp
  )
    plan = saved;
} catch (error) {
  if (error.code !== "ENOENT")
    throw new Error(
      "Could not read installer recovery plan. Check .ghrew-setup before retrying.",
    );
}
await mkdir(".ghrew-setup", { recursive: true, mode: 0o700 });
await writeFile(recoveryPath, JSON.stringify(plan), { mode: 0o600 });

await createWorkspaceRepositories(token, plan, (message) =>
  console.log(message),
);
const state = crypto.randomUUID();
let base = "";
let processing = false;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, base);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (url.pathname === "/bootstrap/auth-bundle.json") {
    res.setHeader("Content-Type", "application/json");
    res.end(await readFile("public/bootstrap/auth-bundle.json"));
    return;
  }
  if (url.pathname === "/callback") {
    if (
      processing ||
      url.searchParams.get("state") !== state ||
      !url.searchParams.get("code")
    ) {
      res.statusCode = 400;
      res.end("Invalid setup callback.");
      return;
    }
    processing = true;
    try {
      const config = await finishAppRegistration(
        token,
        plan,
        url.searchParams.get("code"),
        base + "/",
        (message) => console.log(message),
      );
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        `<h1>Your Ghrew is prepared</h1><p>Enable Device Flow in your App’s settings, then install it on ghrew-chat, ghrew-auth and ghrew-vault.</p><p><a href="https://github.com/organizations/${organization}/settings/apps/${config.appSlug}">Enable Device Flow</a></p><p><a href="https://github.com/apps/${config.appSlug}/installations/new">Install workspace App</a></p><p><a href="${plan.clientUrl}?auth=${encodeURIComponent(config.repository)}&workspace=${organization}/ghrew-chat">Open your Ghrew</a></p>`,
      );
      console.log(
        `Ready: ${plan.clientUrl}?auth=${config.repository}&workspace=${organization}/ghrew-chat`,
      );
      setTimeout(() => server.close(), 10_000);
    } catch {
      processing = false;
      res.statusCode = 500;
      res.end(
        "Setup stopped. No credentials were logged. Check GitHub permissions, then reload this callback to retry while this installer is still running.",
      );
      console.error(
        "Workspace setup stopped. Existing repositories were preserved.",
      );
    }
    return;
  }
  if (url.pathname !== "/") {
    res.statusCode = 404;
    res.end();
    return;
  }
  const manifest = {
    name: `Ghrew ${organization}`,
    url: plan.clientUrl,
    redirect_url: base + "/callback",
    callback_urls: [plan.clientUrl],
    setup_url: plan.clientUrl,
    public: plan.publicApp,
    hook_attributes: { url: plan.clientUrl + "unused-webhook", active: false },
    default_permissions: {
      contents: "write",
      discussions: "write",
      issues: "write",
      pull_requests: "read",
      organization_projects: "read",
    },
    default_events: [],
  };
  const encoded = JSON.stringify(manifest)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(
    `<h1>Register your workspace App</h1><p>GitHub owns your data. This setup saves the private App key and mailbox encryption key in your own ghrew-auth Actions Secrets.</p><form method="post" action="https://github.com/organizations/${organization}/settings/apps/new?state=${state}"><input type="hidden" name="manifest" value="${encoded}"><button>Review and create App on GitHub</button></form>`,
  );
});
server.listen(0, "127.0.0.1", () => {
  base = `http://127.0.0.1:${server.address().port}`;
  console.log(`Open ${base} to approve your workspace App on GitHub.`);
});
setTimeout(() => server.close(), 30 * 60_000).unref();
