# Ghrew

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/inchidev/ghrew)

The recommended installation packages the client and a small Cloudflare backend
together. Click Deploy to Cloudflare, choose a random `SETUP_TOKEN` of at least
32 characters, then open `/create/` on your new site. The guided setup registers
your own GitHub App, receives its keys directly, and creates `ghrew-chat` plus
one administrator-only `ghrew-vault`. GitHub approvals remain necessary; there
is no Device Flow, sign-in issue, auth repository or Actions queue in this mode.

The shared sandbox uses our App. An independent deployment uses **your App,
your Cloudflare account and your GitHub repositories**, without calling our auth
service. [Cloudflare setup and trust boundaries](docs/cloudflare-backend.md).

The older static/Actions implementation below is retained as a legacy option.

**Your crew on GitHub.** A free, MIT-licensed project by
[inchi.dev](https://inchi.dev), bringing team conversations and, in the roadmap,
agents around GitHub projects. See [the roadmap](ROADMAP.md) for the one-click
deployment goal and planned Copilot integration. Agent integration is not yet
implemented.

An experimental team chat backed by GitHub Discussions, with a Nuxt 4 static
client on GitHub Pages. A GitHub organization is a workspace. Every participant
signs in with their own GitHub account. The shared sandbox uses a public App and open Ghrew registration, so visitors
do not need to join its GitHub organization. Ordinary team installations use a
private App and require organization membership.

## Workspace layout

| Repository      | Visibility                   | Purpose                                                                       |
| --------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `ghrew-chat`   | Public                       | Shared channels: Discussions, comments and threads                            |
| `ghrew-vault`  | Private, administrators only | **All** private channels and DMs, with per-conversation membership            |
| `ghrew-auth`   | Public                       | Encrypted sign-in and vault request mailbox; GitHub Actions executes requests |
| `ghrew-client` | Public, optional             | A team-owned copy of the static client                                        |

Ordinary participants never receive repository access or installation tokens for
`ghrew-vault`. An Action checks the authenticated issue author's GitHub ID,
workspace membership and conversation permissions before reading or writing the
vault. GitHub organization owners always have administrative access; this is not
end-to-end encryption against workspace administrators or GitHub.

## Sign-in without a persistent server

The browser opens a prepared issue in the workspace's public auth repository.
The user submits it on GitHub. An Action starts GitHub's Device Flow and returns
an encrypted device code. The user approves the workspace App on GitHub; the
Action checks that the approving account matches the issue author and returns an
encrypted, expiring user token. The token stays in the browser tab's
sessionStorage. No GitHub password, shared PAT or OAuth client secret is requested.

Private operations use encrypted issues and replies in the same mailbox. The
workspace App private key and mailbox key belong in that repository's Actions
Secrets. Public conversation requests go directly to GitHub. Actions is still
server-side execution: this replaces an always-running server with queued jobs,
not with zero compute. There is no websocket realtime, presence or typing.

## Try the sandbox

[Open the Ghrew preview](https://ghrew.inchi.dev/?preview=1).
The renamed client is being established at this address. Fresh sandbox sign-in
and workspace provisioning are not ready yet. The preview uses sample data and
local drafts; it does not send messages to GitHub. The previous GitWok sandbox's
live checks do not establish readiness of a new Ghrew workspace.

## Create your workspace

Open [the setup wizard](https://ghrew.inchi.dev/create/), install and authorize
Ghrew Creator in your organization, then choose the shared site or your own
Pages client. The wizard restores progress after a reload in the same tab and
checks administrator sign-in, vault access and public Discussions before offering
the workspace link. An own-client installation also waits for its Pages workflow
to succeed. GitHub still requires App creation/installation approvals
and manually enabling Device Flow. Keep the setup tab open until completion.

The shared Creator service must be provisioned before this browser flow can be
used on the new deployment. Until then, the CLI below is the supported starting
point for a fresh installation. The one-click flow is a roadmap goal.

The installer also supports a local CLI alternative. Each workspace uses its own
GitHub App and keys. A shared frontend can access your browser session and
decrypted messages; your own Pages deployment lets you control the client code
and updates. Revoking Creator removes its provisioning access.

```sh
npm ci
# Requires Node.js 24, gh CLI login, and organization-owner access.
npm run setup -- --organization YOUR_ORG --own-client
```

Organization base permissions must be **None** before creating the vault. Ghrew
stops rather than silently changing access to unrelated repositories. Review the
App registration in GitHub, enable Device Flow, and install the workspace App
only on its three workspace repositories. The CLI prints the next links.

The browser installer additionally needs a configured and installed global
Creator App. It explicitly reports unfinished registration steps; it does not
label a partially installed workspace as ready.

[Self-hosting](docs/self-hosting.md) · [Architecture and trust boundaries](docs/architecture.md)

## Development and validation

```sh
npm ci
cp .env.example .env
npm run dev -- --port 5178
npm run check
npx playwright install chromium
npm run test:e2e
```

Open `/?preview=1` for the explicitly local preview. For mailbox sign-in set
`NUXT_PUBLIC_AUTH_REPOSITORY=YOUR_ORG/ghrew-auth`, or open
`/?auth=YOUR_ORG/ghrew-auth&workspace=YOUR_ORG/ghrew-chat`.
The existing OAuth Worker remains an optional fallback when no auth repository
is selected; it cannot provide the administrator-only vault transport.

Unit and browser tests cover encryption, identity binding, vault permissions,
installer guards, public/private messaging, logout, drafts, threads and phone
navigation. Browser APIs are mocked: those checks do not prove a live App
registration, GitHub authorization or deployment. Live authorization, vault provisioning, encrypted private writes, client reads
and logout were verified under the previous GitWok names in `inchidev`; these are
historical baseline checks, not proof of a freshly provisioned Ghrew sandbox. A new team's browser installation
and a second participant's access still need their own live verification.

## Stack, storage and updates

Nuxt 4 SPA, Vue 3, Nuxt UI, Tailwind CSS, VueUse, TanStack Vue Query, Zod and Day.js.
RxDB is not included. Remote messages live in memory; localStorage stores drafts
and workspace preferences. Logout clears credentials and remote caches, while
account-scoped drafts remain on that device. Private channels refresh every two
minutes or manually; public messages refresh every twenty seconds while visible.

Templates copy code, not Discussions or secrets, and do not automatically receive
updates. Review upstream changes before applying and redeploying your own copy.
GitHub Free permits private repositories and unlimited collaborators; paid
organization plans have their own seat billing. The public auth repository uses
standard public Actions runners; abuse and GitHub execution limits still apply.

MIT licensed. [DIRECTION.md](DIRECTION.md) records the visual direction.
