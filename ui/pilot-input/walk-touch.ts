export type WalkVector = [number, number]

/** Pad x is right; pad up is forward. Diagonals never move faster. */
export function walkingVector(dx: number, dy: number, radius: number): WalkVector {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(radius) || radius <= 0) return [0, 0]
  const length = Math.hypot(dx, dy)
  if (length < radius * .12) return [0, 0]
  const scale = Math.max(radius, length)
  return [dx / scale, -dy / scale]
}

/** Each pad owns one finger; a second finger never replaces an active gesture. */
export function createWalkTouch() {
  let move: number | null = null
  let look: { id: number; x: number; y: number } | null = null
  return {
    startMove(id: number) { if (move !== null) return false; move = id; return true },
    move(id: number, dx: number, dy: number, radius: number): WalkVector | null {
      return move === id ? walkingVector(dx, dy, radius) : null
    },
    startLook(id: number, x: number, y: number) {
      if (look !== null) return false
      look = { id, x, y }
      return true
    },
    look(id: number, x: number, y: number): WalkVector | null {
      if (!look || look.id !== id || !Number.isFinite(x) || !Number.isFinite(y)) return null
      const delta: WalkVector = [x - look.x, y - look.y]
      look = { id, x, y }
      return delta
    },
    release(id: number) {
      const stoppedMove = move === id
      if (stoppedMove) move = null
      if (look?.id === id) look = null
      return stoppedMove
    },
    clear() { move = null; look = null },
  }
}
