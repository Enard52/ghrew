# GitWok

A team chat client backed by GitHub Discussions. Everyone joins with their own
GitHub account and writes under their own GitHub name.

The shared site opens directly into the chat shell, with a small welcome and
GitHub sign-in modal. You can connect another repository or publish your own
copy of the client from the workspace sidebar.

## Stack

Nuxt 4 SPA, Vue 3, Nuxt UI, Tailwind CSS, VueUse, TanStack Vue Query, Zod and Day.js.
GitHub Pages serves the generated client. A separate, stateless OAuth Worker
exchanges authorization codes; conversations go directly between the browser
and GitHub's GraphQL API.

RxDB is not included in this version. Vue Query owns the remote cache and
refresh lifecycle. VueUse persists workspace preferences, local preview
messages, and drafts. There is no offline outbox or permanent private-message
mirror; those would justify a dedicated local database later.

## Status

The client and OAuth exchange are implemented and covered by unit and browser
checks. The local preview works without GitHub. A live deployment needs a
registered GitHub App, its OAuth secret on the Worker, and the public broker
URL configured when building the client. A missing configuration fails closed;
the UI never asks users to paste personal access tokens or GitHub passwords.

## Workspaces and access

- One repository is a workspace; one Discussion is a channel.
- Discussion comments are messages; replies are threads.
- An administrator enables Discussions and installs the GitWok GitHub App on
  the selected repository, then invites team members through GitHub.
- Each participant authorizes the same GitHub App individually.
- GitHub permissions remain authoritative. Users with repository access can
  also read its Discussions directly on GitHub. Channels in one repository
  share its visibility. Messages are not end-to-end encrypted.
- Private repositories and unlimited collaborators are available on GitHub
  Free. Paid organizations have separate seat billing.

The source repository is public; team chat repositories can stay private.
A repository created from the client template copies the client code, not
Discussion history.

## Local development

Requires Node.js 24 and npm.

```sh
npm ci
cp .env.example .env
npm run dev -- --port 5178
```

Open `/` for the welcome modal or `/?preview=1` for the explicitly local preview.
Preview messages and drafts remain in the same browser profile. User text is
rendered as text, not HTML. The preview has no remote delivery or fake presence.

To connect GitHub locally, register a separate development App with callback
`http://127.0.0.1:5178/`, configure the OAuth handler with that exact `CLIENT_URL`,
and set `NUXT_PUBLIC_OAUTH_BROKER_URL` to its address. Production credentials
should only authorize the production origin.

## Validation

```sh
npm run check
npm run build:oauth
npx playwright install chromium
npm run test:e2e
```

Browser tests run against the generated static site. They cover the OAuth/PKCE
callback, direct GitHub transport, logout, workspace isolation, failed sends,
edits/deletes after refresh, drafts, threads, untrusted text and phone navigation.
OAuth and GitHub API responses in these tests are mocked. Passing them does not
prove that an external GitHub App registration or deployment is configured.

## Deployment and ownership

[Self-hosting guide](docs/self-hosting.md) · [Architecture](docs/architecture.md)

GitHub Actions builds the static client into `.output/public`. The included
Pages workflow is manually triggered for a reviewed revision. Its public
configuration comes from repository variables `OAUTH_BROKER_URL` and
`DEFAULT_REPOSITORY`. The App secret belongs only in the OAuth Worker's secret
binding, never in Pages variables, source files, build output or chat exports.

A team-hosted client needs its own GitHub App and OAuth handler: the shared
broker accepts only its configured site origin and callback URL. Team-owned
client updates are reviewed changes to that copy; templates do not auto-sync.

## Design and license

[DIRECTION.md](DIRECTION.md) records the enamel-green and copper design direction.
The client uses self-hosted Be Vietnam Pro, responsive channels and a thread
panel that preserves the conversation draft. MIT licensed.
