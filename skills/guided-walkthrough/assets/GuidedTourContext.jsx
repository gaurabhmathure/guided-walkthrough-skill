import React from 'react'
import ReactDOM from 'react-dom'
import TourOverlay from '../components/tour/TourOverlay'

const GuidedTourContext = React.createContext(null)

// Mirrors Toast.jsx's provider shape (if this repo has one): a context whose
// value lets any descendant trigger global UI, with the actual UI rendered
// here — except this one portals to document.body since a spotlight must
// escape overflow:hidden ancestors to stay correctly positioned.
export function GuidedTourProvider({ children }) {
  const [active, setActive] = React.useState(null) // { tourId, steps, stepKey } | null

  const startTour = React.useCallback((tourId, steps) => {
    setActive({ tourId, steps, stepKey: 'entry' })
  }, [])

  const stopTour = React.useCallback(() => setActive(null), [])

  return (
    <GuidedTourContext.Provider value={{ startTour, stopTour, activeTourId: active?.tourId ?? null }}>
      {children}
      {active && ReactDOM.createPortal(
        <TourOverlay tourState={active} setTourState={setActive} onExit={stopTour} />,
        document.body
      )}
    </GuidedTourContext.Provider>
  )
}

export function useGuidedTour() {
  const ctx = React.useContext(GuidedTourContext)
  if (!ctx) throw new Error('useGuidedTour must be used within a GuidedTourProvider')
  return ctx
}
