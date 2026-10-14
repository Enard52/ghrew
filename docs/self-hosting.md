# Host your own GitWok

You need a GitHub account, a chat repository, a public client repository for
free GitHub Pages hosting, and somewhere to run the small OAuth handler. This
repository includes a Cloudflare Worker for that handler. It does not host chat.

## 1. Prepare the chat repository

Create a private repository (or choose an existing one), enable Discussions in
Settings → General → Features, and invite participants using their GitHub
accounts. Start a Discussion such as `general`; each Discussion becomes a
channel. Participants must have access to that repository.

GitHub Free supports private repositories and unlimited collaborators. An
organization on a paid plan has its own member/seat billing.

## 2. Create your client copy

Use the GitWok repository's **Use this template** button to create a public
client repository. Your chat repository remains separate and private. The
client repository must contain no credentials or chat exports.

Choose your Pages URL before registering OAuth: for example,
`https://your-team.github.io/gitwok/`, or your own domain. The trailing slash
and any project subdirectory matter: use the same exact URL throughout.

## 3. Register a GitHub App

In your GitHub account or organization settings, open Developer settings →
GitHub Apps → New GitHub App. Use these settings:

| Setting                              | Value                                                |
| ------------------------------------ | ---------------------------------------------------- |
| Name                                 | A unique name for your GitWok client                 |
| Homepage                             | Your client URL                                      |
| Callback URL                         | Your exact client root URL, including trailing slash |
| Expire user authorization tokens     | Enabled                                              |
| Webhooks                             | Disabled                                             |
| Repository permissions               | Discussions: read and write; Metadata: read          |
| Account and organization permissions | None                                                 |
| Installation availability            | Choose the accounts your team needs                  |

No App private key is needed for this client. Generate a client secret and
store it only as a secret binding on the OAuth handler. Record the public
client ID and App slug. Install the App on **only selected chat repositories**.
Team members authorize it individually when signing in.

## 4. Configure the OAuth handler

`oauth/worker.ts` is the complete handler. `npm run build:oauth` produces the
standalone module at `dist/oauth-worker.mjs` for API-based deployment. The
Wrangler configuration is in `oauth/wrangler.jsonc` for teams using that CLI.

| Binding                | Type        | Value                                        |
| ---------------------- | ----------- | -------------------------------------------- |
| `GITHUB_CLIENT_ID`     | Public text | Your App's client ID, not its numeric App ID |
| `GITHUB_APP_SLUG`      | Public text | The slug in `github.com/apps/<slug>`         |
| `CLIENT_URL`           | Public text | Your exact client root URL                   |
| `GITHUB_CLIENT_SECRET` | Secret      | Your App's client secret                     |

Use HTTPS in production. Each handler accepts one exact client origin and
callback, not arbitrary copies of the app. A development callback may use
`http://127.0.0.1:<port>/`; keep development and production Apps separate.

The handler accepts `/config` and `/exchange`, does not store tokens or messages,
and discards refresh tokens. Set an appropriate request limit at your hosting
provider if exposing the exchange publicly. Users sign in again after expiry.

## 5. Publish the client

In the client repository's Settings → Secrets and variables → Actions →
Variables, set:

- `OAUTH_BROKER_URL`: the public HTTPS address of your handler, without a path.
- `DEFAULT_REPOSITORY`: `owner/chat-repository`.

Enable GitHub Actions as the Pages build source. Run the **Deploy GitWok client**
workflow on your reviewed branch. Leave `custom_domain` blank for a project URL;
provide it only after configuring that custom domain in Pages settings and DNS.
The workflow builds `.output/public` and never needs the App secret.

Sign in, open **Your workspaces**, and choose or enter the chat repository. If
it is missing, check the App's selected repositories, your own repository
invitation and whether Discussions is enabled. After installing on another
repository, use **Refresh list**.

## Updates and data

Template repositories have independent history and do not automatically sync.
Review upstream releases and apply changes to your copy, resolve conflicts,
run checks, then publish with your own Pages workflow. Keep public configuration
in your repository variables and secrets on your OAuth handler.

Discussion history is held by GitHub, not by the client template or a Git clone.
Moving the interface does not require moving the conversations. The current
preview export exports only the local preview's selected channel; it is not a
workspace backup tool.
