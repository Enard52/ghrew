# Ghrew: product direction and conversation summary

Date: 2026-10-14 (Asia/Ho_Chi_Minh)

Update later the same day: the user selected a fully free, attention-building
project for inchi.dev, with the sandbox at `ghrew.inchi.dev`. The paid-service
hypotheses below are historical. [The roadmap](../ROADMAP.md) records the current
direction and proposed milestones.

This document captures the naming and product discussion that led to moving the
project into `/Users/ij69/Documents/ghrew`. It distinguishes accepted direction
from proposals and work that still needs validation.

## Accepted direction

- Product name: **Ghrew**.
- Tagline: **Ghrew — your crew on GitHub.**
- The workspace should bring people and agents together around existing GitHub
  organizations, repositories, issues, pull requests, reviews, and checks.
- Agents are intended to become part of the product. This is broader than a
  standalone team messenger.
- Keep the product deeply native to GitHub. A small external backend is an
  acceptable possibility; authentication, server ownership, and trust remain open.

The central insight is that teams already have their projects and work history
in GitHub. Ghrew should let them work together on those existing objects, with
minimal setup and without inventing a second repository or task system that must
be synchronized back to GitHub.

## Naming and domains

GitWok was considered an awkward fit. Generic alternatives such as Crew and
Cockpit had existing software/product collisions. Ghrew combines a GitHub cue
with “crew” and fits a team containing both people and agents.

The user liked the name and tagline and considered `ghrew.ai`, which fits the
intended agent focus. No domain purchase or final domain selection occurred.

Registry checks during this conversation on 2026-10-14 found:

| Name | .com | .app | .dev | .io | .chat | .ai |
| --- | --- | --- | --- | --- | --- | --- |
| ghrew | Registered | Not found | Not found | Not found | Not found | Not found |
| ghork | Registered | Not found | Not found | Not found | Not found | Not checked |

“Not found” means no registration was returned by the registry's RDAP or WHOIS
service at check time. Registrar purchase eligibility and pricing were not
checked. These results can change. Ghork also had an existing web-development
business using the name.

## Intended product experience

A proposed first workflow:

1. Connect an existing GitHub organization and selected project repositories.
2. Discuss a bug or change with the team in a project conversation.
3. Turn the agreed context into an explicit agent task.
4. Show task status and link the resulting pull request back into the conversation.
5. Continue review and checks through the existing GitHub workflow.

Ghrew would provide the shared conversation and coordination experience. GitHub
would retain the underlying project objects and, for the cloud Copilot route,
execute the coding task.

This workflow is a proposal, not an implemented or live-verified feature.

## Copilot integration: documented options

Official GitHub documentation was checked during the conversation.

### Cloud agent API: proposed first integration

GitHub documents starting a Copilot task with a prompt and repository, listing
tasks, checking status, and optionally creating a pull request. Assigning an
existing issue to Copilot is another supported path.

- The agent tasks endpoint is `POST /agents/repos/{owner}/{repo}/tasks`.
- The API is in public preview and may change.
- Cloud agent requires a paid Copilot plan and availability in the target repository.
- The tasks API accepts user-to-server credentials, including GitHub App user
  tokens. GitHub App installation tokens are not supported for that API.
- Ghrew would submit the task and display progress/results; GitHub runs the agent.
- Authentication, permissions, usage billing, and a complete task-to-PR cycle
  still need testing with Ghrew's actual App and user accounts.

Source: [Using Copilot cloud agent via the API](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-via-the-api).

### Copilot SDK: possible conversational integration

The official SDK can support agent sessions and custom tools inside an app.
Its user OAuth setup documents using each authenticated user's own Copilot
subscription. This could power an agent that participates in Ghrew conversations.

The SDK communicates with a Copilot CLI process. A web deployment therefore
needs an execution environment for that process, beyond the static browser client
and a simple token-exchange endpoint. This is a separate architecture choice from
calling the GitHub-hosted cloud agent API.

Sources: [Copilot SDK](https://github.com/github/copilot-sdk),
[user OAuth setup](https://github.com/github/copilot-sdk/blob/main/docs/setup/github-oauth.md).

## Authentication, servers, and trust

Three permissions must stay understandable and distinct:

1. Sign in: establish a person's GitHub identity.
2. Connect projects: grant Ghrew access to selected repositories and operations.
3. Run an agent: authorize an explicit task under a particular identity and budget.

A GitHub App user token has only the permissions and resource access shared by
the user and the App. Signing in does not automatically grant access to all of
that user's repositories. Installing the App and authorizing an individual user
are separate actions.

Source: [GitHub App user access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app).

A proposed commercial architecture is a small backend handling OAuth, token
refresh, sessions, authorization checks, and GitHub API calls. Browser sessions
could use Secure, HttpOnly cookies while GitHub tokens remain server-side.
GitHub App web authorization supports state and PKCE and documents a client
secret requirement for the code exchange.

This architecture requires trusting the backend operator with the granted
GitHub authority. Encryption at rest does not remove that trust. A team-owned
deployment of both client and backend could offer another ownership option.
No architecture or authentication migration was approved or implemented here.

### Current implementation constraints

The existing implementation is documented in [architecture.md](architecture.md)
and [self-hosting.md](self-hosting.md):

- A static Nuxt client uses encrypted issue mailboxes and GitHub Actions for
  Device Flow authentication and private vault operations.
- User tokens live in browser `sessionStorage`; delivered client JavaScript is
  part of the trust boundary. Refresh credentials are discarded in mailbox mode.
- Workspace administrators and GitHub can access private conversations. The
  mailbox protocol is not end-to-end encryption against those parties and has
  no forward secrecy.
- The workspace App is currently installed on the three service repositories.
  Real project integration needs selected project repository access and a review
  of required permissions. The current manifest has pull request read access.
- Private channel and DM membership is enforced by the application. Agent
  context sharing must respect those conversation permissions as well as
  GitHub repository permissions.
- An optional legacy OAuth backend exists, but it does not implement the full
  proposed session/backend architecture or replace the private vault transport.

GitHub-only deployment also needs a policy review before commercialization.
GitHub Pages explicitly restricts commercial SaaS hosting. GitHub Actions terms
restrict commercial reuse of the Actions service and general serverless/backend
uses. Applicability to the mailbox design has not been resolved with GitHub.
External client hosting and a small backend were suggested as a practical path.

Sources: [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits),
[additional product terms](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features).

## Business hypotheses

The commercial value to test is recurring team coordination around real projects:
shared agent tasks, context handoffs, automatic workflows, reliable delivery,
notifications, and maintained integrations.

The initial customer hypothesis is a small product team or development studio
already using GitHub and coding agents. GitHub's own Agent HQ is a direct
competitive consideration; a basic agent-launch interface alone is unlikely to
establish a strong distinction.

Source: [GitHub Agent HQ](https://github.blog/news-insights/company-news/pick-your-agent-use-claude-and-codex-on-agent-hq/).

Proposals discussed, with no pricing or paywall decisions made:

- A free open client for adoption and team-owned use.
- A maintained team service, testing roughly $29–49 per workspace per month.
- Separately budgeted managed execution if Ghrew pays for models or compute.
- Start with users' own supported credentials/subscriptions or model keys to
  avoid assuming unlimited agent costs within a flat subscription.

Suggested validation: give five external teams one useful discussion-to-PR
workflow, offer a paid pilot, and observe weekly use and willingness to renew
over a month. At $49, 100 paying workspaces would produce $4,900 monthly revenue
before expenses; this was illustrative arithmetic, not a forecast.

The user raised eventual acquisition by GitHub as an attractive possible outcome.
This is an aspiration, with no buyer interest or acquisition likelihood established.
Adoption, retention, and independent revenue would support either continued
operation or a future sale.

## Next validation proposed

Run one complete scenario in a test organization:

1. Sign in as an ordinary participant.
2. Connect a selected project with explicitly reviewed permissions.
3. Submit a Copilot task under that participant's identity.
4. Retrieve status and the resulting PR in Ghrew.
5. Revoke access and verify subsequent operations fail.

This would validate the authentication and trust design before expanding the
agent experience. It has not been performed as part of this discussion.

## Workspace move

The complete checkout was moved from
`/Users/ij69/Documents/vnmtvlv/gitwok` to `/Users/ij69/Documents/ghrew`.
Git history and local files were preserved. The existing remote remains
`https://github.com/inchidev/gitwok.git`, on branch `main`.

This move does not rename package identifiers, service repositories, GitHub Apps,
deployed URLs, or the remote repository. No commit, push, domain purchase, or
deployment was requested or performed.
