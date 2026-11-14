export type PilotAction = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down' | 'brake'

/** Craft-relative requests, not velocity, world coordinates or sim commands. */
export interface PilotIntent {
  forward: -1 | 0 | 1
  right: -1 | 0 | 1
  up: -1 | 0 | 1
  brake: boolean
}

export const PILOT_CONTROLS: ReadonlyArray<{ action: PilotAction; label: string; code: string; key: string }> = [
  { action: 'forward', label: 'Forward', code: 'KeyW', key: 'W' },
  { action: 'backward', label: 'Backward', code: 'KeyS', key: 'S' },
  { action: 'left', label: 'Left', code: 'KeyA', key: 'A' },
  { action: 'right', label: 'Right', code: 'KeyD', key: 'D' },
  { action: 'up', label: 'Up', code: 'KeyR', key: 'R' },
  { action: 'down', label: 'Down', code: 'KeyF', key: 'F' },
  { action: 'brake', label: 'Brake', code: 'Space', key: 'Space' },
]

export function createPilotInput() {
  const held = new Map<string, PilotAction>()
  return {
    press(source: string, action: PilotAction) { held.set(source, action) },
    release(source: string) { held.delete(source) },
    clear() { held.clear() },
    intent(): PilotIntent {
      const actions = new Set(held.values())
      const axis = (positive: PilotAction, negative: PilotAction) =>
        (Number(actions.has(positive)) - Number(actions.has(negative))) as -1 | 0 | 1
      return { forward: axis('forward', 'backward'), right: axis('right', 'left'), up: axis('up', 'down'), brake: actions.has('brake') }
    },
  }
}
