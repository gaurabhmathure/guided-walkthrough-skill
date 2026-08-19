import React from 'react'
import Icon from '../Icon'

const TOOLTIP_WIDTH = 300
// Starting guess only — the real height depends on how long the step's copy
// runs, and placement is recomputed from the measured height (see
// useLayoutEffect below). Assuming a fixed height lets a long tooltip overlap
// the very element it's pointing at.
const TOOLTIP_FALLBACK_HEIGHT = 130
const PLACEMENTS = ['bottom', 'top', 'right', 'left']

function computeTooltipPosition(rect, placement, size) {
  const gap = 14
  let top, left
  if (placement === 'bottom') { top = rect.bottom + gap; left = rect.left + rect.width / 2 - size.width / 2 }
  else if (placement === 'top') { top = rect.top - gap - size.height; left = rect.left + rect.width / 2 - size.width / 2 }
  else if (placement === 'right') { top = rect.top + rect.height / 2 - size.height / 2; left = rect.right + gap }
  else { top = rect.top + rect.height / 2 - size.height / 2; left = rect.left - gap - size.width }

  const vw = window.innerWidth
  const vh = window.innerHeight
  top = Math.max(12, Math.min(top, vh - size.height - 12))
  left = Math.max(12, Math.min(left, vw - size.width - 12))
  return { top, left }
}

function intersects(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)
}

// Prefer bottom → top → right → left, but among the placements that fit in the
// viewport, pick the first whose resulting tooltip doesn't cover anything the
// user has to interact with: the spotlit target itself, or an open
// menu/dropdown (marked `data-tour-obstacle`). Without this the tooltip can
// land squarely on the popover it just told the user to click into.
function pickPlacement(rect, size, obstacles = []) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const room = { bottom: vh - rect.bottom, top: rect.top, right: vw - rect.right, left: rect.left }
  const fits = {
    bottom: room.bottom >= size.height + 16,
    top: room.top >= size.height + 16,
    right: room.right >= size.width + 16,
    left: room.left >= size.width + 16,
  }
  const fitting = PLACEMENTS.filter((p) => fits[p])
  const keepClear = [rect, ...obstacles]
  const clear = fitting.find((p) => {
    const { top, left } = computeTooltipPosition(rect, p, size)
    const box = { top, left, right: left + size.width, bottom: top + size.height }
    return !keepClear.some((o) => intersects(box, o))
  })
  return clear
    || fitting[0]
    || PLACEMENTS.reduce((best, p) => (room[p] > room[best] ? p : best), 'bottom')
}

// Drives the tour purely by observing the real DOM (data-tour-screen /
// data-tour markers) rather than hooking into a flow's internal React state,
// which usually isn't controllable from outside. This is what makes Back,
// an unexpected Cancel/close, and "flow already mid-way through" all work
// for free, with no special-casing.
//
// Step `kind`s:
//   - 'entry'/'mid-wizard' — wizard-style flows sharing one data-tour-screen
//     marker (see AddLineWizard's tour). 'entry' waits for the marker to
//     appear at all; 'mid-wizard' waits for its value to change, or (with
//     closesWizard: true) for it to disappear entirely.
//   - 'awaitActive'   — waits for `step.advanceSelector` (defaults to
//     `step.selector`) to gain an "active" className (e.g. a tab just
//     clicked). Used for a flow's end state, or when the spotlighted
//     element (e.g. a status field) differs from what confirms the click.
//   - 'awaitElement'  — ad-hoc flows: waits for `step.advanceSelector`
//     (defaults to `step.selector`) to appear at all (e.g. a dialog opening).
//   - 'awaitGone'     — ad-hoc flows: waits for `step.selector` to disappear
//     (e.g. a dialog closing). Only safe once the prior step's own advance
//     condition already guaranteed the element existed when this step began.
//   - 'done'          — terminal. With no `selector`: a centered dismiss
//     card. With a `selector`: spotlights that element like a normal step,
//     but with a "Got it"-style dismiss button instead of auto-advancing —
//     use this to end a tour by calling out something specific (e.g. an
//     expiry column) rather than a generic closing card.
//
// Any step may use `selectors` (an array) instead of `selector` to light the
// union of several elements — for steps whose copy references both something
// to read and a control to click that sit apart on screen.
export default function TourOverlay({ tourState, setTourState, onExit }) {
  const { steps, stepKey } = tourState
  const currentStep = steps[stepKey]
  const [rect, setRect] = React.useState(null)
  const [obstacles, setObstacles] = React.useState([])
  const rafRef = React.useRef(null)
  const tooltipRef = React.useRef(null)
  const [tooltipHeight, setTooltipHeight] = React.useState(TOOLTIP_FALLBACK_HEIGHT)

  // Measure the tooltip as rendered so placement uses its real height. Runs
  // after every render but only sets state when the height actually moved, so
  // it settles in one extra frame instead of looping.
  React.useLayoutEffect(() => {
    const el = tooltipRef.current
    if (!el) return
    const h = el.offsetHeight
    setTooltipHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev))
  })

  // A 'done' step spotlights something only if it names a target; without one
  // it falls back to a centered dismiss card.
  const isCenteredDone = currentStep.kind === 'done' && !currentStep.selector && !currentStep.selectors?.length

  const evaluateAdvance = React.useCallback(() => {
    setTourState((prev) => {
      if (!prev) return prev
      const step = prev.steps[prev.stepKey]
      const marker = document.querySelector('[data-tour-screen]')

      if (step.kind === 'entry') {
        if (marker && prev.steps[marker.dataset.tourScreen]) {
          return { ...prev, stepKey: marker.dataset.tourScreen }
        }
        return prev
      }

      if (step.kind === 'mid-wizard') {
        if (!marker) {
          return step.closesWizard ? { ...prev, stepKey: step.nextKey || 'done' } : null
        }
        const nextKey = marker.dataset.tourScreen
        if (nextKey !== prev.stepKey && prev.steps[nextKey]) return { ...prev, stepKey: nextKey }
        return prev
      }

      if (step.kind === 'awaitActive') {
        const target = document.querySelector(step.advanceSelector || step.selector)
        if (target && target.className.includes('active')) return { ...prev, stepKey: step.nextKey || 'done' }
        return prev
      }

      // Ad-hoc (non-wizard) flows: a linear chain with no shared screen
      // marker. 'awaitElement' advances once a target element appears (e.g.
      // a dialog opening) — advanceSelector defaults to selector if omitted.
      // 'awaitGone' advances once the spotlighted element disappears (e.g. a
      // dialog closing) — safe to use whenever the prior step's own advance
      // condition already guaranteed the element existed at the moment this
      // step began, so its absence unambiguously means the user acted.
      if (step.kind === 'awaitElement') {
        const found = document.querySelector(step.advanceSelector || step.selector)
        if (found) return { ...prev, stepKey: step.nextKey || 'done' }
        return prev
      }

      if (step.kind === 'awaitGone') {
        const stillThere = document.querySelector(step.selector)
        if (!stillThere) return { ...prev, stepKey: step.nextKey || 'done' }
        return prev
      }

      return prev
    })
  }, [setTourState])

  React.useEffect(() => {
    evaluateAdvance()
    let scheduled = false
    const observer = new MutationObserver(() => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => { scheduled = false; evaluateAdvance() })
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => observer.disconnect()
  }, [evaluateAdvance])

  React.useEffect(() => {
    if (isCenteredDone) { setRect(null); return }
    function resolveTargets(step) {
      // Once the primary CTA is enabled, that's the actual next action —
      // shift the spotlight from "fill this in" to "click this," rather
      // than leaving it parked on the form the whole time. Same mechanism
      // also covers menus/popovers cleanly: point `selector` at the menu
      // trigger and `ctaSelector` at the specific item inside it that needs
      // clicking — the popover's other items stay dimmed by the scrim (never
      // a dark overlay with no specific highlight) since the moment the menu
      // opens, the spotlight jumps straight to that one item.
      if (step.ctaSelector) {
        const cta = document.querySelector(step.ctaSelector)
        if (cta && !cta.disabled) return [cta]
      }
      // `selectors` (plural) lights the union of several elements at once, for
      // steps where the thing to LOOK at and the thing to CLICK sit apart —
      // e.g. "here's the outdated eSIM, now open the Alerts tab." Without it
      // the named control would be buried under the scrim.
      const list = step.selectors || [step.selector]
      return list.map((s) => document.querySelector(s)).filter(Boolean)
    }
    // Keep `bottom`/`right` on the stored rect, not just top/left/width/height
    // — pickPlacement/computeTooltipPosition read them, and without them those
    // comparisons go NaN, which silently rules out the 'bottom' and 'right'
    // placements entirely and pins every tooltip above its target.
    function unionRect(els) {
      let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity
      for (const el of els) {
        const r = el.getBoundingClientRect()
        top = Math.min(top, r.top); left = Math.min(left, r.left)
        right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom)
      }
      return { top, left, bottom, right, width: right - left, height: bottom - top }
    }
    // Open menus/dropdowns the tooltip must steer around. Measured in the same
    // frame as the target so placement never reasons about a stale popover.
    function measureObstacles() {
      return Array.from(document.querySelectorAll('[data-tour-obstacle]'))
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => ({ top: r.top, left: r.left, right: r.right, bottom: r.bottom }))
    }
    const sig = (list) => list.map((r) => `${r.top},${r.left},${r.right},${r.bottom}`).join('|')
    function measure() {
      const els = resolveTargets(currentStep)
      if (els.length) {
        const r = unionRect(els)
        setRect((prev) => (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height)
          ? prev
          : r)
      } else {
        setRect(null)
      }
      const next = measureObstacles()
      setObstacles((prev) => (sig(prev) === sig(next) ? prev : next))
      rafRef.current = requestAnimationFrame(measure)
    }
    rafRef.current = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(rafRef.current)
  }, [currentStep])

  if (isCenteredDone) {
    return (
      <div className="tour-scrim">
        <div
          ref={tooltipRef}
          className="tour-tooltip"
          style={{ top: window.innerHeight / 2 - tooltipHeight / 2, left: window.innerWidth / 2 - TOOLTIP_WIDTH / 2 }}
        >
          <button className="btn-icon tour-skip-btn" onClick={onExit} aria-label="Close">
            <Icon name="close" size={15} />
          </button>
          <div className="tour-tooltip-title">{currentStep.title}</div>
          <div className="tour-tooltip-body">{currentStep.body}</div>
          <div className="tour-tooltip-dismiss">
            <button className="btn-primary" onClick={onExit}>{currentStep.dismissLabel || 'Got it'}</button>
          </div>
        </div>
      </div>
    )
  }

  if (!rect) return <div className="tour-scrim" />

  const size = { width: TOOLTIP_WIDTH, height: tooltipHeight }
  const placement = pickPlacement(rect, size, obstacles)
  const pos = computeTooltipPosition(rect, placement, size)

  return (
    <div className="tour-scrim">
      <div className="tour-spotlight" style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }} />
      <div ref={tooltipRef} className="tour-tooltip" style={{ top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}>
        <button className="btn-icon tour-skip-btn" onClick={onExit} aria-label="Skip tour" title="Skip tour">
          <Icon name="close" size={15} />
        </button>
        <div className="tour-tooltip-title">{currentStep.title}</div>
        <div className="tour-tooltip-body">{currentStep.body}</div>
        {currentStep.kind === 'done' && (
          <div className="tour-tooltip-dismiss">
            <button className="btn-primary" onClick={onExit}>{currentStep.dismissLabel || 'Got it'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
