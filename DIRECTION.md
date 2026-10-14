# Ghrew: Slack structure, GitHub UI

## Brief and constraints

User-authored brief, 2026-10-14: make Ghrew work visually like Slack, using GitHub's visual language exactly. Replace the obsolete wok logo with a newly generated identity. Never show the empty chat behind a login dialog. Keep implementation details out of normal conversation and sign-in screens.

Keep: GitHub sign-in, workspace switching, public/private conversations and DMs, drafts, search, threads, mobile navigation, accessible error states, self-hosting entry, theme switching. Replace: warm palette, Be Vietnam Pro, large marketing modal, technical notices, oversized navigation, decorative wok.

## Exploration and choice

Three rendered first-screen studies are in `docs/design/github/` and ignored evidence in `artifacts/redesign/explore-*`:
A: one sidebar, light. Familiar but loses the workspace/conversation distinction.
B: workspace rail + channel sidebar, dark. Selected; closest to Slack's mental model without copying Slack's palette.
C: repository-style top tabs, light. Rejected; spends vertical room on navigation and feels like repository administration.

All studies deliberately use GitHub system typography, green primary actions, blue selection and Primer neutrals. The requested exact GitHub visual vocabulary overrides the skill's default requirement to explore unrelated typefaces, accent hues and expressive motion. Both light and dark ship. The category clone is intentional, not an originality claim.

## Tokens and shell

Use official `@primer/primitives` light/dark theme variables and `@iconify-json/octicon`. Keep Nuxt UI and map its semantic variables to Primer. System font stack follows GitHub and the user's OS. 12px metadata, 14px body, 16px section headings, 24px sign-in title. Spacing 4/8/12/16/24/32. Controls 6px radius; dialogs 12px; app panels use hairlines.

Desktop: 56px top toolbar, 56px workspace rail, 232px channels, flexible conversation, optional 360px thread. Channel rows 32px. Search is global and supports Cmd/Ctrl+K. On phone: 48px toolbar, channel drawer, full-screen thread; the composer stays reachable above safe areas.

Richness comes from real conversation content, not fake dashboards or decorative imagery. Preview is explicitly labeled Demo. Generated near-black conversation-bubble g mark is used as a monochrome alpha mask; no old wok assets remain in the rendered app.

Signature: opening a thread keeps the source message marked and reveals the matching reply pane in 160ms. Reduced motion is immediate. No ambient decoration: fidelity to GitHub wins over the skill's illustrative animation defaults.

## Content

Entry: Ghrew; Sign in to Ghrew; Your team’s conversations, in one place.; Continue with GitHub; Try a demo; Create your own workspace. Footer: Made by inchi; Source code. No shell under entry. Loading: Connecting to your workspace….

Shell: workspace name; Channels; Direct messages; New conversation; account name; Sign out. Repository paths belong in the workspace connection/admin flow, not the channel rail.

Channel: name and its actual topic; Search messages; Refresh messages. Empty: No messages yet. / Send the first message. Loading: Loading messages… . Offline: You’re offline. Your draft is saved. Demo: Demo workspace. Changes stay in this browser. Private access belongs in participant/settings disclosures; no vault/backend/Actions notices in chat.

Message: author, time, body, reply count. Remote delivery is represented by an accessible Sent status and a quiet check; local demo delivery remains honestly labeled On this device. External source action is available but secondary.

Composer: Write a message…; Send message; Draft saved; Cmd/Ctrl + Enter to send. Error retains the draft. Thread: Thread; channel name; Reply; Close thread.

Admin setup retains required organization, deployment-key, permissions and access explanations. Those details answer an actual administration decision and are not shown in normal sign-in/chat.

## Sources

GitHub Primer foundations: https://primer.style/product/getting-started/foundations/
Official color tokens: https://primer.style/product/primitives/color/
Generated logo prompt and asset provenance: `docs/design/github/logo.md`.

History exception: `app|object|light|grotesque|green|data|sidebar` differs from
this same project's earlier GitWok iteration on three look columns. Preserve
system typography, real conversation content and the familiar sidebar because
the user explicitly requested an exact GitHub visual language over Slack
structure. This is an intentional redesign of the same product, not a reused
look for an unrelated client.

## 2026-10-15: public landing and application routes

User-approved evolution of the existing GitHub/Slack direction: `/` becomes the
project landing, `/login` the dedicated sign-in screen, `/w/:organization/c/:id`
and `/w/:organization/dm/:id` the conversations. Keep the logo, Primer tokens,
system font, green primary actions, blue selection, light/dark support and all
chat features. Existing query links redirect; demo moves to `/demo`.

The landing extends the chosen visual language rather than reopening the three
visual directions above. First screen: “Your crew, on GitHub.”; channels, private
groups and direct messages; “Open Ghrew”; “Try the demo”; “Free and open source.
Bring your GitHub account.” The richness is a clearly labeled interactive demo
using the application's existing sample conversations. Switching general/building
shows the corresponding messages. No platform internals, infrastructure copy,
fabricated customers or usage claims. Three short product explanations and source/
inchi links finish the page. On phone the preview follows the introduction and
retains its channel navigation. The root never loads identity or conversations.
