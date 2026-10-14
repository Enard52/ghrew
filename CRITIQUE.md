# Design review

Independent critique by one continuing design critic, following the
web-designer rubric. This reviews the local client foundation, not production
authentication or live GitHub integration.

| Criterion                | Round 1 | Round 2 |
| ------------------------ | ------: | ------: |
| Concept on the page      |       3 |       3 |
| Not the category average |       3 |       3 |
| Not a slop face          |       4 |       4 |
| First screen             |       3 |       4 |
| Typography               |       4 |       4 |
| Colour                   |       4 |       4 |
| Richness                 |       3 |       4 |
| Structure and rhythm     |       4 |       4 |
| Craft                    |       4 |       4 |
| Responsive               |       4 |       4 |
| Everyone's computer      |       4 |       4 |
| Signature                |       2 |       3 |
| Screenshot test          |       3 |       3 |

Round 1: seven of thirteen criteria at 4+, signature below 3. The working
conversation was coherent but the tutorial content and repeated local-storage
labels made it read like scaffolding. The signature filmstrip showed only a
generic entrance.

Round 2: nine of thirteen criteria at 4+, none below 3. Specific sample team
content, a matching parent/thread rail, a phone return action and an immediate
preview action improved the core experience. All five round-1 asks were
substantially addressed. The layout remains a familiar chat, deliberately so
for this experiment. It has not met the numerical studio-quality stop rule
of ten criteria at 4+; no claim of that standard is made.

## Final cleanup after round 2 (not rescored)

- Put the unfinished-login notice before the fields.
- Updated the entry's sample exchange to match the actual preview.
- Removed the duplicate lower preview link.
- Limited message paragraphs to 66ch.
- Added a browser assertion that opening, replying to and closing a thread
  preserves the room draft.

## Verification

The final round-2 scan at 390, 768, 1280 and 1440 CSS pixels has no failures.
The 12-pass platform matrix is clean: Windows 125/150%, forced colours,
Linux, Android, Firefox, WebKit desktop/iPhone, 320px reflow, reduced motion,
and desktop/phone localization stress. Earlier forced-colour and label-wrap
failures were fixed. A hidden status element's mobile width caused horizontal
overflow during round 2; it was constrained and the full matrix rerun.

Local artifacts (ignored by Git):

- `artifacts/design/r2-fixed/sheet.png`
- `artifacts/design/r2-fixed/matrix/sheet.png`
- `artifacts/design/r2/film/strip.png`
- `artifacts/design/final-entry/sheet.png`
- `artifacts/design/final-light/sheet.png`

The filmstrip shows thread opening but does not prove the complete
draft/open/return interaction; that behavior is covered by the browser test.
WebKit and platform emulation are not tests on physical devices. Screen
readers, actual Windows glyph rasterization and production performance have
not been measured.

## Nuxt migration — round 1

The existing critic continued after the migration to Nuxt UI. Scores by rubric
line: **3, 3, 4, 4, 3, 4, 4, 4, 4, 4, 2, 3, 3**. Seven of thirteen at 4+.
The welcome modal clarified GitHub identity. Defects: CSS-mask icons disappeared
in High Contrast, desktop prose was wide, seed-message storage labels repeated
permanent preview notices, phone utility chrome competed with messages, and the
thread capture did not demonstrate the source/parent relationship.

## Nuxt migration — round 2

Scores: **3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3**. Nine of thirteen at 4+;
none below 3. The critic found no remaining material visual defect and advised
against restarting the design to chase distinctiveness. This does **not** meet
the numerical studio rule of ten lines at 4+; scores are reported as given.

All five fixes landed: High Contrast icons use CanvasText with forced-colour
adjustment disabled for their masks; prose is constrained to 56ch (the actual
font makes 66ch about 625px); sample per-message labels are screen-reader-only;
one preview explanation replaces multiple notices and export moves to a menu;
matching copper rails identify the source and quoted parent.

The interaction capture exposed a transient close-thread defect: the grid
changed to two columns while the leaving third child was still present. The
client now retains the third column until `after-leave`. Settled screenshots
and a browser check confirm full sidebar height, a restored composer, and the
same room draft after return. Thread drafts remain separate.

Latest artifacts, local and ignored:

- `artifacts/design/nuxt-auth-r1-fixed/sheet.png`: welcome modal at 390/1440.
- `artifacts/design/nuxt-auth-r1-fixed/matrix/`: twelve clean platform passes.
- `artifacts/design/nuxt-chat-r2/sheet.png`: chat at 390/768/1280/1440.
- `artifacts/design/nuxt-chat-r2-final/matrix/`: twelve clean platform passes.
- `artifacts/design/nuxt-chat-r2/film/strip.png`: whole-shell thread frames.
- `artifacts/design/nuxt-chat-r2/interaction/`: before, settled thread and return.

The 11px metadata warnings are deliberate for timestamps, draft/sync notices
and secondary utilities; message text is 13/14px. No text is below 11px.
Browser engines and emulated platform settings are not real-device, ClearType,
screen-reader or production-performance proof. The filmstrip begins at the
opening interaction; the separate before image supplies its pre-trigger state.
The final optional polish shortens the phone search placeholder; not rescored.
