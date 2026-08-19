# Tour copy voice

Every tooltip is short, plain, and imperative — it names the concrete UI action, then (only if it removes real ambiguity) says why. No marketing language, no exclamation-point enthusiasm, no jargon a first-time user wouldn't already know.

## Shape

- **Title**: 2-5 words, states what this step is about (not an instruction) — "Pick the device," "Where should the numbers come from?," "Check the order."
- **Body**: 1-2 sentences. First sentence is almost always the literal action ("Click X," "Fill in Y, then click Z"). A second sentence only appears when there's a genuinely useful bit of context — a default recommendation, or a reassurance about something optional/reversible.

## Real examples (verbatim, from a shipped tour)

> **One line, or several?**
> Click Single line for just one person, or Multiple lines to set up a batch of employees at once.

> **Pick the device**
> Click whichever option matches how this line will be used. Not sure? Employee owned is the most common pick.

> **You're all set**
> These lines are pending until someone activates them. You can activate one right now from this list, or just click Done — you can always send the invite later.

> **Fill in the line's details**
> Fill in the highlighted fields — anything required has a red asterisk. Click Place order when you're ready.

## Do

- Name the exact button/field label the user will see ("Click Place order," not "click the button to place your order").
- Reassure about anything optional or reversible in the same breath ("sending an invite is completely optional right now").
- Keep every step's body to one screen-width of text or less — these render in a fixed 300px-wide tooltip.
- Match the target app's own copy conventions (e.g. if the app avoids em dashes elsewhere, the tour copy should too).

## Don't

- Don't explain what the feature is for in general — the tour is about *how to operate this specific screen right now*, not a product pitch.
- Don't repeat the screen's own on-screen label text back verbatim as filler ("This is the Order details screen. Order details lets you...").
- Don't invent multi-step instructions inside one tooltip when the step only requires one click — keep the 1:1 mapping between a tooltip and a single spotlighted target.
