# Mapping an ad-hoc flow (no single state variable)

Use this recipe when the target flow is NOT a single orchestrator + shared shell — e.g. clicking into a detail drawer, opening a menu inside it, confirming a dialog, then checking a result on a different tab. If the flow IS a single orchestrator + shared shell driving a `screen`-style state variable, use `wizard-flow-mapping.md` instead — it's simpler and should be preferred whenever it applies.

Real example: a "push an update" tour — open a row's menu → View details → open the drawer's own menu → click the update action → confirm a dialog → close the drawer → check a status tab → a final callout on a specific column. Six real steps, no wizard anywhere in sight.

## 1. Mark each real target element directly

Add a distinct `data-tour="<id>"` straight onto each element you want to spotlight or check for — a button, a menu trigger, a dialog, a tab, a table cell. No shared screen marker is needed. Prefer adding these to shared components (a `KebabMenu`/`ConfirmDialog` that already accepts a pass-through `tourId`/`data-tour` prop) over one-off inline attributes, so the same component keeps working for future tours too — see how `KebabMenu.jsx` and `ConfirmDialog.jsx` both took a generic `tourId` prop rather than a bespoke one.

## 2. Chain steps linearly with `nextKey` — don't try to force the wizard `kind`s

An ad-hoc flow is a straight line, not a branching graph, so model it as one: every step names exactly what comes next via `nextKey` (the very first step must be keyed `entry`, since `startTour` always initializes `stepKey: 'entry'` — its `kind` can still be whatever fits, the *key* just has to be that literal string). Pick from:

- **`awaitElement`** — advances once `document.querySelector(step.advanceSelector || step.selector)` exists. Use when the user's action causes something NEW to appear (a drawer opening, a menu opening, a dialog opening). `selector` is what gets spotlighted; `advanceSelector` (optional, defaults to `selector`) is what you're actually waiting for — these are often different elements (e.g. spotlight the row's kebab button, but advance once the *drawer* shows up).
- **`awaitGone`** — advances once `document.querySelector(step.selector)` no longer matches. Use when the user's action causes the *currently spotlighted* thing to disappear (confirming a dialog closes it; clicking a close button unmounts the drawer). Only safe immediately after a step whose own advance condition already proved the element existed — don't open a tour directly onto an `awaitGone` step, or a selector typo will look like instant success instead of failing loudly.
- **`awaitActive`** — advances once `step.selector` gains a `.active`-ish className (a tab that was just clicked). Same as the wizard path's end-state step.

**Watch for a step whose target is already in the state it's asking for — it'll instantly skip past itself.** `awaitElement` fires the moment `evaluateAdvance()` first runs, which is on mount, before the user has read anything. This bites any control whose *current or default* value already matches what the step tells the user to pick — e.g. a role selector defaulting to "Admin," where a step saying "click Admin" would find that already true and vanish before it's read. A plain value check (`data-selected="admin"`) doesn't help, since it's true from the first render too. Fix: have the component track whether it's been interacted with at all, independent of the resulting value — a local `touched` boolean that flips `true` on any click of any option, reflected as `data-touched` on its wrapper (`onClick={() => { onChange(optionKey); setTouched(true) }}`) — and gate the step's `advanceSelector` on that flag instead of the value: `'[data-tour="org-role"][data-touched="true"]'`. This guarantees a real interaction happened, regardless of whether the value actually changed.

## 3. Never leave an action area sitting under the scrim with nothing lit

Every place the user is expected to look or click must be the spotlighted element at that moment — including items *inside* a menu or popover. Spotlighting only the ⋮ trigger and leaving the opened menu dimmed tells the user "something here" but not which row to click.

**A menu interaction is always TWO steps, not one.** One step to open the menu ("Open its ⋮ menu"), then a separate step naming the item to click ("Click View line details"). Don't put both instructions in one tooltip: the second half refers to something that doesn't exist on screen yet when the user reads it. Chain them with `advanceSelector` pointing at the menu item (its appearance = the menu opened) and `nextKey` to the item step:

```js
entry: {
  kind: 'awaitElement',
  selector: '[data-tour="row-kebab"]',
  advanceSelector: '[data-tour="view-details-item"]',   // menu opened
  nextKey: 'open-details',
  title: '…', body: 'Open its ⋮ menu to take a look.',
},
'open-details': {
  kind: 'awaitElement',
  selector: '[data-tour="view-details-item"]',          // now spotlit
  advanceSelector: '[data-tour="the-drawer"]',          // item clicked
  nextKey: '…',
  title: '…', body: 'Click View line details.',
},
```

Mark the item via the shared component's pass-through prop rather than a wrapper (`KebabMenu`'s items accept `tourId`, rendered as `data-tour` on that item's button). (`ctaSelector` also shifts the spotlight from a trigger to an item within one step, but it keeps the same copy — use it for form → submit-button, not for menus, where the copy needs to change.)

**Mark popovers so the tooltip steers around them.** Placement avoids anything tagged `data-tour-obstacle` (plus the spotlit target itself), picking the first side that both fits the viewport and stays clear. Add that attribute to every menu/dropdown panel in the app (e.g. a row's kebab menu, a sort menu, a page-size menu) — otherwise the tooltip can land squarely on the menu it just told the user to click into, which is the exact failure the two-step split above is meant to make legible.

Same rule for read-only steps: if a step's copy says "here's the eSIM version" or "this is the alert to act on," the spotlight must be on that exact field or row, not on the whole panel or table.

**Check what the tooltip itself lands on, not just what's lit.** The spotlight can be perfect while the tooltip covers something the user needs — a table's column header above the highlighted cell, a label next to the highlighted field. Placement picks the first side of the target with room (bottom, then top, then right, then left), so the practical check is: at each step, does the tooltip sit over anything that gives the lit element its meaning? A verification script can assert this directly — compare the tooltip's rect against the container's `thead`/label and fail if they intersect.

**When the thing to read and the control to click sit apart, light both.** Use `selectors` (an array) instead of `selector` and the engine spotlights the union of those elements — e.g. `['[data-tour="drawer-tab-alerts"]', '[data-tour="line-information-card"]']` for "Line information shows the eSIM flagged Outdated, now click the Alerts tab." A single-element spotlight there would bury the named tab under the scrim. Prefer a union over rewording the copy to avoid naming the control: the user still has to find it. Keep unions to elements that are reasonably close together, so the lit region stays a focused area rather than most of the screen.

**A dropdown/select's own opened panel needs the same `selectors` union treatment — even though it doesn't look "apart" from its trigger.** If a step's target IS a `<select>`-style trigger and the user has to click an option inside the popover it opens, spotlighting only `selector: '[data-tour="the-trigger"]'` leaves the panel sitting in the dark once it opens: an absolutely-positioned popover doesn't expand its positioned ancestor's `getBoundingClientRect()`, so the union of "trigger + panel" isn't automatic just because the panel is a DOM descendant of the trigger's wrapper. Give the panel its own marker (e.g. derive it from the trigger's `tourId` — `data-tour={`${tourId}-panel`}` — so callers don't need a second prop) and use `selectors: ['[data-tour="the-trigger"]', '[data-tour="the-trigger-panel"]']`: before the panel opens only the trigger matches and gets lit; the instant it renders, both match and the spotlight expands to cover it too. Also give that panel `data-tour-obstacle` regardless (see below) — cheap insurance for any *other* tour step that might spotlight something nearby while this one happens to be open.

## 4. End state, optionally with a final callout

Finish with an `awaitActive` step (e.g. checking a tab actually switched) leading into `done`. If the last thing worth telling the user isn't "you're finished" but "here's a specific detail to keep an eye on" (an expiry column, a status pill, a count), give the `done` step its own `selector` — `TourOverlay.jsx` will spotlight it exactly like a normal step, just with a dismiss button instead of an auto-advance condition, rather than falling back to the plain centered "that's the tour" card. Omit `selector` on `done` when there's nothing specific left to point at.

## 5. Copy and CTA-shift techniques are unchanged

`references/copy-voice.md` and the `ctaSelector` technique from `wizard-flow-mapping.md` §5 apply exactly the same way here — they're about the step DATA, not about how screens are structured.
