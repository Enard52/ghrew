// Admin CLI bootstrap. Uses the administrator's existing gh login, never a pasted token.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { newMailboxKey } from "../shared/mailbox.ts";
const [repository, clientId, appSlug] = process.argv.slice(2);
if (
  !/^[\w-]+\/ghrew-auth$/.test(repository || "") ||
  !/^[\w.]+$/.test(clientId || "") ||
  !/^[\w-]+$/.test(appSlug || "")
)
  throw new Error(
    "Usage: node scripts/provision-auth.mjs OWNER/ghrew-auth CLIENT_ID APP_SLUG",
  );
const gh = (...args) =>
  execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
let exists = false;
try {
  gh("repo", "view", repository, "--json", "nameWithOwner");
  exists = true;
} catch {
  /* Create only when missing. */
}
if (exists)
  throw new Error(
    "Auth repository already exists. Refusing to replace its key or files.",
  );
const key = await newMailboxKey();
const config = {
  version: 1,
  repository,
  clientId,
  appSlug,
  publicKey: key.publicKey,
};
const directory = `artifacts/bootstrap-${Date.now()}`;
await mkdir(`${directory}/.github/workflows`, { recursive: true });
await mkdir(`${directory}/scripts`, { recursive: true });
await mkdir(`${directory}/shared`, { recursive: true });
for (const [source, target] of [
  ["templates/auth-workflow.yml", ".github/workflows/auth.yml"],
  ["scripts/action-auth.ts", "scripts/action-auth.ts"],
  ["scripts/vault-service.ts", "scripts/vault-service.ts"],
  ["shared/mailbox.ts", "shared/mailbox.ts"],
  ["shared/vault.ts", "shared/vault.ts"],
])
  await writeFile(`${directory}/${target}`, await readFile(source));
await writeFile(
  `${directory}/ghrew-auth.json`,
  JSON.stringify(config, null, 2) + "\n",
);
await writeFile(
  `${directory}/README.md`,
  "# Ghrew authentication\n\nGitHub-only Device Flow broker. Requests contain only an ephemeral public key and random challenge. Device codes and session tokens are encrypted for that browser. GitHub account names and sign-in times are public metadata.\n\nThe private encryption key belongs in the MAILBOX_PRIVATE_KEY Actions Secret. Do not put it in this repository. Enable Device Flow on the configured GitHub App.\n",
);
execFileSync("git", ["init", "-b", "main"], { cwd: directory, stdio: "pipe" });
execFileSync("git", ["add", "."], { cwd: directory, stdio: "pipe" });
execFileSync(
  "git",
  ["commit", "-m", "Initialize encrypted Ghrew auth mailbox"],
  { cwd: directory, stdio: "pipe" },
);
gh(
  "repo",
  "create",
  repository,
  "--public",
  "--description",
  "Ghrew encrypted sign-in mailbox",
  "--source",
  directory,
);
// Install the key before pushing the workflow. No plaintext secret is stored on disk.
execFileSync(
  "gh",
  ["secret", "set", "MAILBOX_PRIVATE_KEY", "--repo", repository],
  { input: JSON.stringify(key.privateKey), stdio: ["pipe", "pipe", "pipe"] },
);
execFileSync("git", ["push", "-u", "origin", "main"], {
  cwd: directory,
  stdio: "pipe",
});
console.log(`Auth mailbox created: https://github.com/${repository}`);
