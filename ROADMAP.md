# Ghrew — your crew on GitHub

Updated: 2026-10-14, Asia/Saigon.

## Product decision

Ghrew is a free, MIT-licensed project by [inchi.dev](https://inchi.dev), built to
earn attention through a useful product. No Ghrew subscription, workspace fee,
seat fee or feature paywall is planned. The shared sandbox belongs at
`https://ghrew.inchi.dev/`.

Think of the social experience of Buzz or Discord, organized around GitHub:
organizations, project repositories, conversations, issues, pull requests,
reviews and checks. People and agents belong in the same workspace. GitHub
remains the source of truth for development work.

Free Ghrew does not promise free third-party infrastructure or unlimited AI.
Users bring their own supported Copilot access; GitHub controls eligibility,
policies and usage charges. We do not fund a shared unlimited agent account.

This decision supersedes the paid-workspace hypotheses in
[the earlier direction discussion](docs/2026-10-14-ghrew-direction.md).

## 1. Establish the Ghrew baseline

- Move the source to `inchidev/ghrew`, retaining Git history.
- Rename the client, installer, templates and configuration consistently.
- Retire GitWok test infrastructure after preserving a local backup.
- Publish the renamed client at `ghrew.inchi.dev` and report whether it is a
  preview or an authenticated sandbox. A page loading is not proof of sign-in.
- Preserve the current conversation implementation while deciding the next
  installation architecture. Do not present the existing multi-step installer
  as one-click deployment.

## 2. Make deployment understandable

Target experience: **Deploy Ghrew → approve GitHub access → choose organization
and repositories → open your workspace**. GitHub's consent and installation
approvals remain explicit.

Separate two user journeys:

1. **Try the shared sandbox:** sign in and join. No deployment or personal App
   registration should be required.
2. **Run your own Ghrew:** one deployment entry, guided configuration and a
   verifiable ready state. Explain who controls the frontend, backend and keys.

The current static client uses a public issue mailbox, Device Flow, GitHub
Actions and a per-workspace App. It requires several approvals, manual Device
Flow configuration and queued sign-in/private operations. Renaming it does not
remove these steps.

Proposed next design, still to decide: a small backend for standard GitHub OAuth,
sessions, token refresh and authorized GitHub API calls. For the shared service,
a maintained GitHub App could remove per-team App registration. A team-owned
deployment would still need its own credentials. A Cloudflare deployment button
can provision application infrastructure, but cannot silently create or approve
GitHub Apps or their secrets. Prototype and test the full onboarding path before
claiming one-click readiness.

First installation milestone: a fresh organization owner completes setup from
the browser, then an independent second participant signs in, sends a message,
reads a permitted private conversation and is denied an unpermitted one. Verify
reload/recovery and revocation as well as the happy path.

## 3. Connect real projects

- Connect selected existing repositories without duplicating their issue system.
- Link an issue, PR or check into a conversation with its current status.
- Keep conversation membership and repository access separate. Access to a room
  must not imply access to an attached private repository.
- Show the actual permissions an integration requests and who authorizes it.

## 4. First Copilot integration: conversation to PR

Proposed first agent workflow:

1. A person selects a repository and explicit conversation context.
2. Ghrew shows the prompt, acting identity and target branch for confirmation.
3. Submit a cloud agent task under that person's GitHub authorization.
4. Display queued/running/completed/failed status and the resulting PR.
5. Review, checks and merge continue through GitHub.

The documented endpoint is `POST /agents/repos/{owner}/{repo}/tasks`. The API is
in public preview, supports user-to-server tokens (including GitHub App user
tokens), and does not support App installation tokens. Cloud agent is available
on paid Copilot plans, subject to repository and organization policies. We must
validate permissions and the complete task-to-PR flow using Ghrew's actual App;
the existing chat App installation does not establish agent access.

First agent milestone: one ordinary participant submits a task, Ghrew retrieves
its status and PR, and revoked access prevents another submission. Do not run an
agent or share private conversation context merely because someone signed in.

Source: [GitHub cloud agent API](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-via-the-api).

## 5. Later: agents participating in conversations

The Copilot SDK documents user OAuth with each user's own subscription. It also
requires a Copilot CLI process, so it needs a separate execution environment
beyond the static client or an ordinary Worker token-exchange endpoint. Design
session isolation, room permissions, tool access, cancellation and costs before
adding an always-available room agent. This is separate from GitHub-hosted coding
tasks and remains a proposal.

Source: [Copilot SDK user OAuth](https://github.com/github/copilot-sdk/blob/main/docs/setup/github-oauth.md).

## Success criteria

Measure completed fresh installs, a team's return use, useful conversations and
discussion-to-PR outcomes. The purpose is adoption and attention for inchi.dev;
the earlier paid-pilot and monthly-revenue examples are no longer the plan.
