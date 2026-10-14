# Host your own Ghrew

## GitHub-only workspace

Use a GitHub organization you own and Node.js 24 with the authenticated `gh` CLI.
Set organization **Settings → Member privileges → Base permissions → None**.
Review the effect on existing repositories first; Ghrew refuses to change this
organization-wide setting automatically.

```sh
git clone https://github.com/inchidev/ghrew.git
cd ghrew
npm ci
npm run setup -- --organization YOUR_ORG --own-client
```

The installer creates public `ghrew-chat` and `ghrew-auth`, and one private
`ghrew-vault`. It does not invite users to the vault. Do not assign organization
teams, ordinary collaborators or unrelated Apps to that repository. Organization
owners retain GitHub's inherent administrative access.

Open the temporary local URL printed by the installer. Review and create the
workspace GitHub App on GitHub. Its generated private key and a mailbox encryption
key are stored in `ghrew-auth` Actions Secrets, never in public files. Keep the
installer running until it reports completion; interrupted callbacks can be
retried while that process is running.

Follow the printed links to:

1. Enable **Device Flow** in the workspace App settings. Keep expiring user tokens enabled.
2. Install the App only on `ghrew-chat`, `ghrew-auth` and `ghrew-vault`.
3. Open the workspace URL and complete sign-in through a prepared issue and GitHub's device approval.
4. Invite participants to the GitHub organization: its private workspace App can only be authorized by organization members. Then add them to Ghrew by username, create a private channel, and verify access from a member's account before treating the setup as complete.

The App requests Discussions, Issues and Contents write, Metadata read, pull
requests read, and organization Projects read. Private repository Contents is
used for membership; Discussions is used for conversations. No OAuth client
secret is needed in mailbox mode.

With `--own-client`, a public `ghrew-client` is generated from the Ghrew template.
The installer writes public `ghrew-client.json`, configures Actions
as the Pages build source, and dispatches the included Pages workflow. Without
that flag, the workspace uses the shared client at `ghrew.inchi.dev`. Teams
must trust the JavaScript served by whichever client they use.

## Browser provisioning and the Creator App

Start at `/create/` before entering a chat. Choose the shared site for a quick
start or publish your own Pages client to control the JavaScript and updates.
Keep this tab open through registration, installation and verification. A reload
restores its checkpoint. The master checks the runtime sign-in and vault through
Actions before showing the workspace link. An own-client installation waits
for the Pages workflow to succeed.

The shared site's browser wizard needs a separately registered public **Creator
App**. A maintainer can prepare it using `node scripts/register-creator.mjs`, then
review the App registration on GitHub and enable Device Flow. That helper updates
the existing shared auth repository's public Creator configuration without
replacing its mailbox key. Install the Creator on the target organization and
approve its provisioning permissions before using the browser wizard. Prefer
Only select repositories: repositories the App creates are automatically added
to its installation. It does not need blanket access to unrelated repositories.
See [GitHub installation access](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party).

The Creator needs repository Administration, Contents, Workflows, Secrets,
Actions, Pages and Discussions write, plus organization Members and Administration
read. Organization Administration read lets setup verify base permissions before
creating the private vault; it cannot change those settings.
It creates the workspace's separate runtime App; it does not retain that App's
private key in a shared service. Revoke the Creator after installation if desired.

## Manual Pages deployment

For a reviewed client copy, set repository Actions variables:

| Variable             | Example                |
| -------------------- | ---------------------- |
| `AUTH_REPOSITORY`    | `YOUR_ORG/ghrew-auth` |
| `DEFAULT_REPOSITORY` | `YOUR_ORG/ghrew-chat` |

Enable GitHub Actions as the Pages source. Run **Deploy Ghrew client**. Leave
`custom_domain` blank for the repository Pages path, or supply your configured
custom domain. The workflow generates static `.output/public`; no credentials
belong in Pages variables or build output. Local development uses the equivalent
`NUXT_PUBLIC_AUTH_REPOSITORY` and `NUXT_PUBLIC_DEFAULT_REPOSITORY` environment variables.

## Legacy OAuth fallback

Teams using only direct repository Discussions can still deploy `oauth/worker.ts`.
Register an App with Discussions write and Metadata read, exact client callback,
expiring user tokens and disabled webhooks. Put its client secret only in the
handler's secret binding. Configure `GITHUB_CLIENT_ID`, `GITHUB_APP_SLUG`,
`CLIENT_URL`, and secret `GITHUB_CLIENT_SECRET` on the handler; set public client
variable `OAUTH_BROKER_URL`. `npm run build:oauth` produces its standalone module.
This mode does not provide the administrator-only vault.

## Updates, capacity and backups

Templates do not auto-sync. Review upstream changes, apply them to your own
client and auth workflow sources, run checks, then deploy. Preserve your own
`ghrew-auth.json` and Secrets; bootstrap scripts deliberately refuse accidental
key rotation or adoption of unrelated repositories. Keep a protected backup of
your App and mailbox keys outside the public repositories.

A Git clone does not back up Discussion history. The current preview export is
not a workspace backup. GitHub retains conversation data; the client has no
persistent private-message mirror. Public mailbox metadata remains public even
though request contents are encrypted. Private operations have Actions queue
latency and periodically poll, rather than providing realtime delivery.
