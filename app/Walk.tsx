// Small helpers left from the walk-behind-the-screens hall (decision 005), which decision 007's
// first-person game replaced. WalkTo is now a no-op kept so app/App.tsx's classic screens compile.

import { Component, type ReactNode } from 'react'

export type WalkScreen = 'briefing' | 'design' | 'poll' | 'flight' | 'results' | 'launch'

/** shortcut: does nothing since the hall was removed; delete the WalkTo lines in App.tsx and this with them. */
export function WalkTo(_: { screen: WalkScreen }) {
  return null
}

export function hasWebGL(): boolean {
  if (typeof WebGLRenderingContext === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** For 3D that is only scenery (a cutscene picture): if it cannot load (offline, a stale chunk) the game goes on without it. */
export class Scenery extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
