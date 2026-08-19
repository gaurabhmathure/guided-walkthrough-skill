---
name: guided-walkthrough
description: Use when the user asks to add a "guided walkthrough", "product tour", "onboarding tour", "interactive tour", or "walk the user through" a flow in a web app — builds a spotlight-based guided tour for a specific feature/flow, reusing a shared tour engine so one app can accumulate multiple named tours over time as more get added.
version: 1.2.0
---

Build an interactive, spotlight-based guided tour for one specific flow in the current app. The user performs every action themselves (click the real button, type in the real field) — the tour never auto-fills anything; it spotlights the real element and narrates what to do, then advances by observing the resulting DOM change. Reuse the same engine and entry-point convention across every tour, in every app, so this stays cheap to repeat.

## 1. Ask scoping questions

Use `AskUserQuestion`, not plain conversational text — this mirrors how this exact skill was scoped when it was first designed. Ask (adapt wording to the actual flow, don't ask verbatim if the answer is obvious from context):

- Which flow/feature should this tour walk through?
- Should the entry point be a new button in the existing Prototype action bar (default — recommend this unless the user asks for something else)?
- What's the end state the tour should land on (e.g. a specific tab/page that now shows the result of the flow)?
- Confirm the interaction model defaults to "you perform every action yourself" — only offer a system-auto-fills alternative if the user explicitly asks for it (this pairs well with auto-advancing single-choice steps rather than requiring a separate Continue click, if the target app supports that).

## 2. Check for an existing tour engine in this repo

Look for `src/context/GuidedTourContext.jsx`. If it's already there, reuse it as-is — do not re-copy or fork it, and do not modify it unless you find an actual bug (if you do, fix it here AND report that the bug should be back-ported to `assets/TourOverlay.jsx` in this skill for future prototypes).

If it's missing, copy in:
- `assets/GuidedTourContext.jsx` → `src/context/GuidedTourContext.jsx`
- `assets/TourOverlay.jsx` → `src/components/tour/TourOverlay.jsx`
- `assets/tour.css` → append its contents to the repo's global stylesheet (e.g. `src/index.css`)

Then wire `GuidedTourProvider` into the app's root entry point (e.g. `main.jsx`), wrapping the app the same way any existing top-level provider (a toast provider, etc.) is already wrapped — nest it, don't replace anything.

Read both copied files once after writing to confirm the relative imports resolve correctly for wherever you placed them (`GuidedTourContext.jsx` imports `../components/tour/TourOverlay`; `TourOverlay.jsx` imports `../Icon` — adjust only if this repo's icon component lives somewhere else).

**Also check `TourOverlay.jsx`'s hardcoded button classNames (`btn-icon`, `btn btn-primary`) against this repo's actual button convention before assuming they'll just work.** It was written against a CSS convention where `.btn-primary` is self-sufficient (padding, font-size, radius all in one class). Some repos instead compose a base `.btn` class with a modifier (`className="btn btn-primary"`, where `.btn-primary` alone only sets color/background) — ported as-is there, the dismiss button renders with no padding or sizing at all. Fix by editing the className strings in this repo's copy to match whatever composition the rest of its own buttons already use — don't invent a third convention. Same check applies to `.btn-outline` and `.option-card`/`.option-card-title`/`.option-card-desc` (used by the info modal's tour-picker panel) and `.tour-*`/`.btn-icon` from `tour.css` — copy in whichever of these this repo doesn't already have, adapted to its own class-composition style rather than verbatim. This exact mismatch is easy to hit whenever the target app composes buttons differently than the app this skill was first built against.

## 3. Check for an existing Prototype action bar and tour picker

Look for a component matching the dashed-border-box "Prototype action(s)" pattern (e.g. `src/components/PrototypeActionBar.jsx`) — the same visual treatment is sometimes reused elsewhere for state toggles rather than actions; either way, that's the convention to match.

**A prototype should have exactly one "Guided tour" button in the action bar, ever — not one per tour.** That button opens a shared tour-picker list (a registry of every named tour, e.g. `src/data/tours/index.js`: `{ id, title, description, steps }` entries), rather than starting a specific tour directly. This is what actually scales to multiple tours cleanly: adding tour #2 means adding one entry to the registry array, not adding a second button anywhere.

One proven approach: put this picker as a second "screen" inside the app's existing info/onboarding modal, if it has one — a sliding two-panel layout (`.proto-modal__slider`/`.proto-modal__panel`, `transform: translateX(-50%)` to switch), reachable two ways: a "Guided tour" outline button next to the modal's own primary CTA, and directly (opening straight to the tours screen, skipping the info screen) from the action bar's single button. If the target app's info modal doesn't yet support a second screen, extend it the same way rather than building a separate standalone modal — one modal, one picker, reused from both entry points. If there's no existing info modal, a small standalone tour-picker modal works just as well.

If the action bar exists but only has a single hardcoded tour button (an older shape from before this convention), migrate it to the picker pattern rather than adding more buttons beside it.

If it doesn't exist, copy `assets/PrototypeActionBar.jsx` in and mount it once at the bottom of the relevant page's content (inline, scrolls with the page — not fixed/sticky).

## 4. Map the target flow

Read `references/wizard-flow-mapping.md` if the flow has a shared shell + one state variable governing which step renders (the common case for multi-step flows — most "Add X" wizards are built this way). Otherwise read `references/adhoc-flow-mapping.md`. Add the `data-tour-*` markers per whichever recipe applies — prefer adding markers to shared shell/footer components over touching every individual leaf screen, per the minimal-diff principle both recipes describe.

## 5. Author the step-graph data

Create `src/data/tours/<flowName>Tour.js` in the target repo. Key it by the flow's own screen/state values (never by sequence number). Write copy following `references/copy-voice.md` — short, plain, imperative, names the real button/field. Apply the `ctaSelector` technique (§5 of `wizard-flow-mapping.md`) on every multi-field step from the start, not as an afterthought.

## 6. Wire the entry point

Add the new tour to the registry (step 3's picker) with a distinct, stable ID string (e.g. `'addLine'`, `'pushEsimUpdate'`) — this is what lets a prototype run more than one named tour without collision — and have selecting it call `startTour(<tourId>, <tourSteps>)` from `useGuidedTour()`.

**Also record where the tour starts, and navigate there before starting it.** A tour whose first step targets something that only exists on one tab/page opens onto an empty scrim if the user happens to be somewhere else. Give each registry entry the location its first step lives on (a `startTab` field works well) and apply it in the same handler that starts the tour, reusing whatever deep-link mechanism the app already has for jumping to a tab/route — don't invent a second one. Set it on every tour, even when the first target is visible everywhere, so tours always open from a known starting point.

## 7. Verify end-to-end

Same discipline as any other change in this codebase:
1. `npm run build`.
2. Start a local preview server.
3. Drive the new tour with a headless Playwright script through at least one full path — click through every step, confirm the tooltip/spotlight target matches expectations at each one, confirm it lands on the correct end state, confirm zero console/page errors.
4. Screenshot-check the spotlight visually at 2-3 representative steps (read the screenshots back).
5. Clean up screenshots and kill the preview server when done.

**If no headless-browser tool is available in this environment** (no `chromium-cli`, and installing Playwright is blocked), don't skip verification — trace it by hand instead: for every step, re-read the actual JSX for its `selector`/`selectors`/`advanceSelector` and confirm each `data-tour` string exists exactly where the step expects it, confirm the DOM condition that's supposed to flip (an attribute, a mount/unmount, a className) really does flip on the user action described, and confirm nothing upstream (a default value, an already-mounted element) makes the condition true before the user acts — this is exactly how the "already-at-default" instant-skip bug above gets caught without ever opening a browser. Say plainly that this was a hand-trace, not a live run, so the user knows to click through it themselves before demoing.

## 8. Log it

If the target repo keeps a `projectlog.md` (or equivalent session log), add an entry describing the new tour the same way past sessions are logged there — what flow it covers, what markers/files were added, what was verified.
