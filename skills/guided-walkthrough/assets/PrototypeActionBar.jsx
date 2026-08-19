import React from 'react'

// Prototype-only action bar — a dashed-border-box treatment used here
// for actions (buttons that do something) rather than data/loading-state
// toggles. Sits inline at the bottom of the page's content (not
// fixed/sticky) — it scrolls with the page.
//
// Renders whatever prototype-level actions this app has as `children` —
// any other prototype-only action is a sibling button passed in here,
// divider-separated, rather than a new bar being created per action.
//
// The guided-tour entry point is always exactly ONE button here, even once
// a prototype has several named tours — it opens a shared tour-picker list
// (see the guided-walkthrough skill's SKILL.md §3), it does not get a
// second button per tour. Example usage:
//
//   <PrototypeActionBar>
//     <button className="btn-outline" onClick={onOpenTourList}>
//       <Icon name="tour" size={16} />
//       Guided tour
//     </button>
//   </PrototypeActionBar>
export default function PrototypeActionBar({ children }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: '10px 14px',
        border: '1px dashed #d1d1d1',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 11.5, color: '#a3a3a3' }}>Prototype action · not part of the product</span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  )
}
