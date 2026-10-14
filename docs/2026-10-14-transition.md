# GitWok to Ghrew transition

Date: 2026-10-14, Asia/Saigon.

The active checkout is `/Users/ij69/Documents/ghrew`; its origin is
`https://github.com/inchidev/ghrew.git`. The new repository contains the original
Git history plus the Ghrew rename. Product identifiers, installer templates,
configuration filenames, mailbox protocol names and browser storage namespaces
now use Ghrew. This is a fresh namespace, not an in-place migration of old
workspace data or existing browser sessions.

## Retired resources

The following test repositories were first backed up and archived, then deleted
after the user explicitly chose a fresh Ghrew sandbox. Each deletion was verified
by a subsequent API response of 404:

- `inchidev/gitwok-chat`
- `inchidev/gitwok-auth`
- `inchidev/gitwok-vault`
- `gitwok-sandbox/gitwok-chat`
- `gitwok-sandbox/gitwok-auth`
- `gitwok-sandbox/gitwok-vault`

The old source repository `inchidev/gitwok` is also archived, with Actions
disabled and Pages removed. Its PR history remains available. The
`gitwok.inchi.dev` CNAME and Cloudflare Worker `gitwok-oauth` were deleted.

A private local backup outside this repository contains a source Git bundle,
mirrors of the six service repositories, complete exports of their issues,
issue comments and Discussions, and the previous local recovery material.
Secrets in GitHub Actions cannot be exported through the API. The backup is
not a guarantee of restoring every credential or an existing App identity.

## GitHub App cleanup

With the user's explicit deletion confirmation, these four registrations were
deleted through signed-in Chrome: `gitwok-chat`, `gitwok-inchidev`,
`gitwok-creator`, and `gitwok-sandbox`. Both organizations' registered App lists
showed **No GitHub Apps** afterward. The API independently confirmed zero App
installations in both `inchidev` and `gitwok-sandbox`.

The old `gitwok-sandbox` organization remains as an empty namespace, with no
repositories or App installations. The original source repository remains
archived to preserve its PR history. No organization access settings were changed.
Fresh Ghrew authentication will use new resources; old conversations, credentials
and App identities are not being migrated.

## Ghrew deployment and plans

`ghrew.inchi.dev` is bound to GitHub Pages for `inchidev/ghrew`. The published
client is an early preview; use `/?preview=1` for sample conversations and local
drafts. Fresh sandbox authentication and the shared Creator are not provisioned.
Old GitWok live checks do not prove Ghrew authentication or private messaging.

After GitHub's DNS check succeeded, certificate provisioning was restarted from
Chrome Pages settings. The certificate was approved, HTTPS returned 200, and
HTTPS enforcement was enabled. The domain now serves the preview over HTTPS.

The [roadmap](../ROADMAP.md) records the free-product decision, one-click
deployment goal and planned Copilot workflow. Agent integration and the proposed
OAuth/backend redesign have not been implemented.

## Validation

- 36 unit tests passed; Nuxt, OAuth Worker and installer type checks passed.
- Static generation and optional OAuth Worker compilation passed.
- All 13 existing browser scenarios passed locally after updating the renamed
  headline assertion; these use mocked GitHub APIs.
- GitHub CI and the first Ghrew Pages deployment succeeded.
- The local preview was inspected in a browser. This does not establish a fresh
  team installation or second-participant authorization.
