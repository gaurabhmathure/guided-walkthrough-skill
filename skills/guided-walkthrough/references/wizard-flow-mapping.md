# Mapping a wizard-style flow

Use this recipe when the target flow already has:
- A **shared shell** component rendering every step (a header, a scrollable body, a footer) — e.g. a `WizardShell.jsx` component.
- A **single state variable** (usually in the parent orchestrator component) whose value determines which step body is currently rendered — e.g. a `screen` state variable in the orchestrator component.

If the flow isn't built this way, use `adhoc-flow-mapping.md` instead.

## 1. Find the shell and the state variable

Read the orchestrator component (the one holding the state and rendering the shell). Confirm:
- The name and full list of possible values for the state variable (e.g. `screen`, `step`, `currentPage`).
- Which component renders the shared header/body/footer chrome for every step.
- Which component renders the primary "advance" button for each step (Continue/Confirm/Place order/Submit/Done) — it may be a shared footer component, or it may be inline per step.

## 2. Add markers to the shell (not to every leaf step)

This is the minimal-diff trick that keeps a wizard tour cheap to build: add markers to the ONE shared shell/footer, not to each of the N step components.

- On the shell's root panel: `data-tour-screen={<the state variable's current value>}` — thread it through as a new prop from the orchestrator (e.g. `tourScreen={screen}`).
- On the shell's shared footer's primary button: `data-tour="wizard-primary-cta"`. If the flow's terminal/closing screens render their own inline "Done"-style button instead of going through the shared footer (this is common — terminal screens often have their own inline buttons), add the same marker to each of those individually.
- On the shell's scrollable content wrapper (the div wrapping `{children}`/the step body): `data-tour="step-body"` — this becomes the generic "spotlight this whole form" target for any step that doesn't need a narrower target.

Check whether these markers already exist (a prior tour may have added them) — if so, reuse them; don't duplicate.

## 3. Mark option-card / single-choice screens

If a step is "pick one of N option cards, then it either auto-advances or requires clicking Continue":
- Wrap the whole option-card list in `data-tour="option-group"` (spotlight the group, not one card — the tour shouldn't need to predict which the user will pick).
- A single-choice pick should ideally auto-advance the flow's state on click, without a separate Continue click — a common UX preference worth confirming with whoever owns the app before building the tour around it. If the target flow's screen doesn't already do this, that's worth fixing first — it's a UX correctness issue independent of the tour, not something to work around in the tour's copy.

## 4. Key the tour's step-graph data by the state variable's own values

Don't number your steps 1, 2, 3. Key the step-graph object by the exact state values from step 1 (plus `entry`, an end-state key, and `done`):

```js
export const myFlowTourSteps = {
  entry: { kind: 'entry', selector: '[data-tour="my-flow-entry-button"]', title: '...', body: '...' },
  'step-a': { kind: 'mid-wizard', selector: '[data-tour-screen="step-a"] [data-tour="option-group"]', title: '...', body: '...' },
  'step-b': {
    kind: 'mid-wizard',
    selector: '[data-tour-screen="step-b"] [data-tour="step-body"]',
    ctaSelector: '[data-tour-screen="step-b"] [data-tour="wizard-primary-cta"]',
    title: '...', body: '...',
  },
  'terminal-step': {
    kind: 'mid-wizard',
    closesWizard: true,
    selector: '[data-tour-screen="terminal-step"] [data-tour="wizard-primary-cta"]',
    title: '...', body: '...',
  },
  'end-state': { kind: 'awaitActive', selector: '[data-tour="the-tab-or-page-the-flow-lands-on"]', title: '...', body: '...' },
  done: { kind: 'done', title: "That's the tour!", body: '...', dismissLabel: 'Got it' },
}
```

This is what makes Back, an unexpected Cancel/close mid-flow, and "flow already open on some screen" all resolve for free — the driver (`TourOverlay.jsx`, unmodified) just reads whichever `data-tour-screen` value is really mounted and looks it up in this object. Never write logic that predicts which screen comes next; only ever read what's actually there.

## 5. Use `ctaSelector` on every multi-field step, from the start

For any step whose target is the whole form (`[data-tour="step-body"]`) and that has a real primary CTA button gated on validation, also set `ctaSelector` to that button's selector. `TourOverlay.jsx` will automatically shift the spotlight from the form to the button the moment it becomes enabled — do this for every such step up front, it's a two-line addition per step and meaningfully improves the experience (it's easy to add this later instead, but it's cheap enough to just do it from the start).

## 6. End state

Every wizard-style flow needs exactly one step of `kind: 'awaitActive'` right after the last `mid-wizard` step closes — this is "the tour has left the wizard and is now pointing at wherever the flow's result lives" (e.g. a table tab that now shows the newly-created records). Its `selector` should target an element that gains a detectable `active`-style class when the user clicks it (commonly a tab). Set `nextKey` explicitly only if it should NOT go straight to `'done'` (e.g. chaining into a second confirmation step).
