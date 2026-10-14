# GitWok direction

## Brief (self-authored from the implementation request)

A public, MIT-licensed experiment for a small team. Everyone signs in with
their own GitHub account. The shared static client opens into the chat shell;
a welcome modal explains GitWok and offers GitHub sign-in. Conversations live
in GitHub Discussions, and a separate OAuth-only handler exchanges login codes.
The sidebar offers connecting another repository and hosting a team-owned copy.
The implementation uses Nuxt 4, Nuxt UI, Tailwind, VueUse, Vue Query, Zod and
Day.js. RxDB is deferred until a persistent offline mirror/outbox is needed.

Feel: companionable, focused, handmade. The name suggests a wok: a shared
place where contributions come together. No photographs or generated assets
are needed. The conversation itself is the visual evidence.

## Three explorations

A. Iron kitchen: a dark enamel work surface, warm copper action, Be Vietnam
Pro, split conversation shell. Richness comes from a complete readable
conversation; incoming messages settle into a shared timeline.

B. Porcelain notebook: a white page, teal action, Georgia-led message text,
topbar shell. Richness comes from line-art branches tying replies together;
the reply connector draws when a thread is opened.

C. Radio commons: a blue colour field, yellow action, condensed headings,
inbox shell. Richness comes from physical channel tiles, which slide to
reveal the active conversation.

Explorations live in docs/design/explore. All three were rendered at phone
and desktop sizes. A was selected: it makes an all-day conversation feel
companionable while retaining readable small text. B was too document-like
for an ongoing room; C's saturated field competed with longer messages.

## Refused category defaults

No KPI dashboard, avatar-initial circles, gradient AI branding, decorative
status lights or nested cards. A channel rail is justified by conversations,
not by a dashboard template. Names are readable text. Preview content is
explicitly marked as sample content and never presented as live GitHub data.

## Proposed tokens and interaction

The iron direction uses a deep green-grey enamel ground (#202827), slightly
lighter rails (#28312f), clear neutral text (#f1f2ec), muted readable text
(#b6c0b9), and copper (#f1a36e) only for the selected channel and primary action.
Be Vietnam Pro has a friendly but compact reading rhythm and supports both
English and Vietnamese. Six sizes: 12, 13, 14, 16, 22, 36px. Spacing: 4, 8,
12, 16, 24, 32, 48px. Controls have 8px radii; dialogs have 16px radii.

The phone is a full writing client. Channels become a drawer and threads
become a sheet. A saved draft survives channel switches and reloads.
Signature: opening a thread picks out the source message with a copper rail
and settles a matching reply panel beside the room over 160ms. The room draft
remains intact. On phone the thread becomes a full-screen sheet with an
explicit return to its room. Reduced motion shows the final state immediately.
Saved marks are reserved for actual remote acknowledgement. The sample room
has a permanent local-preview notice and no fabricated GitHub delivery.

Light mode uses a cool pale green ground, white surfaces and a darker copper
action. The same font and geometry apply. Controls have explicit forced-colour
borders, and user-generated content is rendered as text.

Voice: brief and specific, like a helpful teammate.

## Content and states

Entry: GitWok; “Your team, in conversation.”; “A shared place to talk, backed
by your GitHub Discussions.”; “Join with your GitHub account.”; “Your team’s
repository.”; “Open source, yours to host.”; “Continue with GitHub”; “Explore
the local preview”; “Source code”. No separate password or manual token field.
Sidebar: “The shared kitchen” in preview; repository name in live workspaces;
“Your workspaces”; “Conversations”; “Make yourself at home”; “Put GitWok on
your own GitHub”; account name; “Connected with GitHub”.
Hosting modal: “A GitWok of your own”; client template, separate private chat
repository, own GitHub App and OAuth handler, reviewed updates.
Chat: #general; “The room for everyday things”; search messages; channel
list; “Write a message…”; “Send message”; “Reply in thread”; “Open in GitHub”.
Empty: “This conversation starts with you.” / “Write the first message”.
Filtered: “No messages match your search.” / “Clear search”.
Offline: “You’re offline. Your draft and local history are still here.”
Pending: “Waiting to send”. Error: “Couldn’t save to GitHub. Your message is
still on this device.” / “Retry”. Locked: “Open this workspace to read its
conversations.” Permission: explain the workspace’s actual access model.
Admin: repository connection, channels, member access and export.
