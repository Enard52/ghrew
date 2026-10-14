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

The Cloudflare backend uses two repositories: public `ghrew-chat` for shared
channels and private `ghrew-vault` for private channels and DMs. The sandbox's
repositories live in [`ghrew-sandbox`](https://github.com/ghrew-sandbox);
[`inchidev/ghrew`](https://github.com/inchidev/ghrew) is the OSS source. There is
no auth repository in backend mode.

### Legacy static/Actions layout

| Repository     | Visibility                   | Purpose                                                                       |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `ghrew-chat`   | Public                       | Shared channels: Discussions, comments and threads                            |
| `ghrew-vault`  | Private, administrators only | **All** private channels and DMs, with per-conversation membership            |
| `ghrew-auth`   | Public                       | Encrypted sign-in and vault request mailbox; GitHub Actions executes requests |
| `ghrew-client` | Public, optional             | A team-owned copy of the static client                                        |

Ordinary participants never receive repository access or installation tokens for
`ghrew-vault`. In legacy mode, an Action checks the authenticated issue author's GitHub ID,
workspace membership and conversation permissions before reading or writing the
vault. GitHub organization owners always have administrative access; this is not
end-to-end encryption against workspace administrators or GitHub.

## Legacy sign-in without a persistent server

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

[Open the Ghrew sandbox](https://ghrew.inchi.dev/) and continue with GitHub.
Public channels live in `ghrew-sandbox/ghrew-chat`; private channels and DMs live
in administrator-only `ghrew-sandbox/ghrew-vault`. The public
`ghrew-sandbox-by-inchi` App is owned by `inchidev` and installed on those two
sandbox repositories. Visitors join Ghrew without joining its GitHub organization.

[Try the local demo](https://ghrew.inchi.dev/?preview=1) for sample conversations
and browser-local drafts; demo messages are not sent to GitHub.

## Create your workspace

Use [Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/inchidev/ghrew),
then open `/create/` on your own deployment. The wizard registers your own GitHub
App and creates the two workspace repositories. GitHub still requires App
registration and installation approvals. Organization base permissions must be
**None** before creating the private vault. See [the Cloudflare guide](docs/cloudflare-backend.md).
A fresh independent deployment and a second participant still need live verification.

The optional legacy static/Actions installer creates an additional auth mailbox
and requires Device Flow. Its separate CLI/Creator setup is documented in
[legacy self-hosting](docs/self-hosting.md).

[Architecture and trust boundaries](docs/architecture.md)

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
registration, GitHub authorization or deployment. Live sandbox verification is
recorded separately in [the backend guide](docs/cloudflare-backend.md), including
which accounts and deployment paths have actually been checked.

## Stack, storage and updates

Nuxt 4 SPA, Vue 3, Nuxt UI, Tailwind CSS, VueUse, TanStack Vue Query, Zod and Day.js.
RxDB is not included. Remote messages live in memory; localStorage stores drafts
and workspace preferences. Logout clears credentials and remote caches, while
account-scoped drafts remain on that device. Private channels refresh every two
minutes or manually; public messages refresh every twenty seconds while visible.

Templates copy code, not Discussions or secrets, and do not automatically receive
updates. Review upstream changes before applying and redeploying your own copy.
GitHub Free permits private repositories and unlimited collaborators; paid
organization plans have their own seat billing. The legacy public auth repository uses
standard public Actions runners; abuse and GitHub execution limits still apply.

MIT licensed. [DIRECTION.md](DIRECTION.md) records the visual direction. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, testing commands, issue templates, and contribution guidelines.
