# Architecture

## Runtime boundaries

```text
GitHub Pages                           GitHub
Nuxt SPA in the browser  ────────────>  REST: identity, installations, repositories
  Vue Query cache        ────────────>  GraphQL: Discussions, comments, replies
  local drafts
          │ only during sign-in
          ▼
OAuth Worker ───────────────────────>  GitHub OAuth code exchange
  App client secret
  no storage, no chat endpoints
```

The application is Nuxt 4 with `ssr: false`. `nuxt generate` emits static HTML,
JavaScript, CSS and fonts. No Nitro application server is deployed to Pages.
The separate Worker implements only `GET /config`, `POST /exchange`, and CORS
preflight. It has no GitHub App private key, installation token, database,
session registry, refresh-token store or message proxy.

## Identity and OAuth

A shared GitHub App has repository permissions **Discussions: read and write**
and GitHub's required **Metadata: read**. It requests no code/Contents, email,
administration or organization-membership permission. Install it only on
selected chat repositories. Each participant authorizes the App with their
own GitHub account. Effective permissions are the intersection of the App's
permissions, installation access and the user's own access.

The browser generates random state and an S256 PKCE verifier/challenge,
storing the pending transaction in sessionStorage for at most ten minutes.
GitHub redirects to the exact static client root. The client removes the
callback parameters from the address bar, consumes and validates state once,
and sends the code/verifier to the broker. The broker uses its configured
callback and App secret when exchanging at GitHub's fixed token endpoint.

The broker requires the exact client Origin, bounded JSON input and a valid
PKCE verifier. It does not accept caller-supplied upstream or redirect URLs.
Responses use `no-store`; upstream error bodies and credentials are never
reflected or logged by application code. GitHub refresh tokens are discarded.
Only expiring access tokens are accepted.

The access token is kept in sessionStorage for the current tab, survives a
reload, and expires at GitHub's reported time (normally eight hours). It is
never persisted in localStorage or placed in URLs. After expiry, sign in
again. Logout removes the session and clears the Vue Query cache. Browser
scripts on the client origin can access this credential; serving the client
is a trust boundary. The broker also sees the token during its exchange.
This is not a claim that the shared service operator has no technical access.

## Conversations and synchronization

One repository maps to one workspace, Discussion to channel, comment to message,
and reply to thread. A complete channel scan follows every Discussion page.
A message scan follows every comment page and every reply page. Zod validates
responses. A failure on any page fails that scan rather than exposing a partial
snapshot as a complete conversation.

Vue Query holds remote messages in memory. A successful complete scan replaces
that channel's cache, reflecting edits and deletions. Query keys include the
GitHub login, repository and channel. Switching workspaces does not reuse
another repository's messages or drafts. Sending captures the original workspace
and draft; a late acknowledgement cannot clear newly typed text or move a
message into the new workspace.

Channels refresh every minute and the open conversation every twenty seconds
while the tab is visible and online. Rate limits increase the delay. GitHub
mutations are never automatically retried: a lost response can hide a successful
write, so blindly retrying could duplicate a message. A failed send retains its
draft. There is no websocket realtime, typing, presence or offline send queue.
Search covers the loaded conversation, including its replies, rather than
claiming an index of every channel.

## Local storage

VueUse stores per-account/repository/channel/thread drafts and workspace
preferences in localStorage. The explicitly local preview stores its sample
messages there too. Remote conversation history is not persisted by this client.
Logout clears credentials and the remote cache; account-scoped drafts remain on
that device for the same user to resume. Browser-profile access can reveal local
drafts. Closing the tab clears sessionStorage but leaves localStorage drafts.

RxDB is deliberately omitted. It would become useful for a persistent,
queryable message mirror and a specified offline-outbox/reconciliation model.
Installing it alongside Vue Query does not create GitHub replication, realtime
or authentication automatically.

## Privacy and ownership

Repository visibility controls all Discussions in it. Anyone granted access
can read through GitHub as well as GitWok. No channel-level privacy or
end-to-end encryption is claimed. Different audiences need separate repositories.
GitHub retains the data and authorization role.

The common client trusts our delivered JavaScript and OAuth service. A team can
publish the client from its own public template repository while storing chat
in a separate private repository. Its own App, OAuth handler, domain and reviewed
updates reduce dependence on our infrastructure. A template copies files, not
Discussions, and does not automatically receive upstream changes.

## Primary sources

- [GitHub App user OAuth and effective permissions](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [GitHub Discussions GraphQL API](https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions)
- [GitHub Discussions visibility](https://docs.github.com/en/discussions/quickstart)
- [Nuxt static deployment](https://nuxt.com/docs/4.x/getting-started/deployment)
- [GitHub Free and paid plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)
