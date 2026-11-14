// Durations match CUTSCENE_MS in ui/story/model.ts (PR #70). That module is not on main yet,
// so these numbers are copied. Pass durationMs from CUTSCENE_MS when mounting so they cannot drift.

/** Cutscenes this folder draws. Launch stays in ui/scene3d until 17:30. */
export type CutsceneSceneId = 'arrival' | 'orbit' | 'anomaly' | 'ending-success' | 'ending-loss'

export interface CutsceneCanvasProps {
  kind: CutsceneSceneId
  /** Moon or Mars for the orbit-arrival shot. Ignored by the other scenes. */
  body?: 'moon' | 'mars'
  /** Defaults to CUTSCENE_SCENE_MS[kind]. The story frame should pass CUTSCENE_MS[id]. */
  durationMs?: number
}

/** Longest each scene animates. Each value is ≤ 10 s, same as the story frame. */
export const CUTSCENE_SCENE_MS: Record<CutsceneSceneId, number> = {
  arrival: 6000,
  orbit: 5000,
  anomaly: 3000,
  'ending-success': 6000,
  'ending-loss': 5000,
}

/** 0 at the start, 1 at durationMs, smooth in between. Reduced motion stays on the first frame. */
export function shotProgress(elapsedMs: number, durationMs: number, reducedMotion: boolean): number {
  if (reducedMotion || durationMs <= 0) return 0
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs))
  return t * t * (3 - 2 * t)
}
