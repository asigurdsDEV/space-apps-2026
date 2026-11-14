// Walk between stations instead of switching screens (decision 005): ui/hangar's hall stays
// mounted behind the screens, each screen says where it is with <WalkTo>, and the screen comes
// back as a panel over the hall once the walk is over. Without WebGL it is today's screens.

import { Component, createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import type { SimState } from '../shared'
import { Hangar, stationFor, walkMs, type HangarScreen, type StationId } from '../ui/hangar'

/** The screens, plus the launch sequence: ui/hangar has a station for it (the pad window) but no screen name. */
export type WalkScreen = HangarScreen | 'launch'
const at = (screen: WalkScreen): StationId => (screen === 'launch' ? 'pad' : stationFor(screen))

const Go = createContext<(screen: WalkScreen) => void>(() => {})

/** Rendered by a screen: "the player is here now". Does nothing outside <Walk>. */
export function WalkTo({ screen }: { screen: WalkScreen }) {
  const go = useContext(Go)
  // Layout effect: the new screen is hidden for the walk before it is ever painted.
  useLayoutEffect(() => go(screen), [go, screen])
  return null
}

function hasWebGL(): boolean {
  if (typeof WebGLRenderingContext === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** For 3D that is only scenery (the hall, a cutscene picture): if it cannot load (offline, a stale chunk) the game goes on without it. */
export class Scenery extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

const still = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export interface WalkProps {
  /** Puts the designed spacecraft on the assembly-bay stand. */
  state: Pick<SimState, 'entities' | 'params'>
  /** The scenario title, shown on the mission call wall. */
  title: string
  children: ReactNode
}

export function Walk({ state, title, children }: WalkProps) {
  const [webgl] = useState(hasWebGL)
  const [screen, setScreen] = useState<WalkScreen>('briefing')
  /** The screen whose station the camera has reached. Timed with the hall's own walkMs, so a hall that fails to load can never leave the panel hidden. */
  const [arrived, setArrived] = useState(screen)
  useEffect(() => {
    if (arrived === screen) return
    const timer = setTimeout(() => setArrived(screen), still() ? 0 : walkMs(at(arrived), at(screen)))
    return () => clearTimeout(timer)
  }, [arrived, screen])

  if (!webgl) return <>{children}</>
  return (
    <Go value={setScreen}>
      {/* Scenery: the screens carry every control and every word, so the hall is kept out of the tab order. */}
      <div className="app-hall" inert aria-hidden="true">
        <Scenery>
          <Hangar station={at(screen)} state={state} title={title} />
        </Scenery>
      </div>
      <div className={`app-over${arrived === screen ? '' : ' app-over--walking'}`} aria-busy={arrived !== screen}>
        {children}
      </div>
    </Go>
  )
}
