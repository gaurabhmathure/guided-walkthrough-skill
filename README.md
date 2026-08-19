# guided-walkthrough 

## What it does

Builds a spotlight-based, self-driven product tour for one specific flow in a React app. The user performs every real action themselves (click the real button, type in the real field) — the tour never auto-fills anything; it spotlights the real element, narrates what to do, then advances by observing the resulting DOM change. One shared tour engine is installed per app, so it can accumulate multiple named tours over time as more get added.

## Scope / prerequisites

- Built for React/Vite apps with a JSX component tree and a global stylesheet.
- Originally written against the Claude-Prototypes cape-* family of apps, so `SKILL.md` includes concrete file-path and class-name examples from that family (e.g. `src/context/GuidedTourContext.jsx`, `.btn-primary`). It is not a copy-paste template — it includes its own explicit step for checking and adapting button/class conventions to whatever the target repo actually uses.
- Meant to be applied by a Claude Code agent that reads and adapts the skill per-repo, not run as a static script.
- No backend dependency — purely a frontend/UI pattern.

## Install

```
/plugin marketplace add gaurabhmathure/guided-walkthrough-skill
/plugin install guided-walkthrough@guided-walkthrough
```

## Usage

Ask Claude Code to add a "guided walkthrough", "product tour", "onboarding tour", or "interactive tour" for a specific flow in a React app.

## What's included

- `SKILL.md` — the procedure
- `references/` — copy-voice guide, wizard-flow and ad-hoc-flow mapping recipes
- `assets/` — `GuidedTourContext.jsx`, `TourOverlay.jsx`, `PrototypeActionBar.jsx`, `tour.css`

## Version

v1.1.0 (see `skills/guided-walkthrough/SKILL.md` frontmatter)

## License

MIT — see [LICENSE](./LICENSE)
