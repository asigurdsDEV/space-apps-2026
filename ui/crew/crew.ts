// Other players in a first-person room. Poses arrive a few times a second; the bodies ease toward them.
// They walk on Earth and float in the spacecraft (`./motion`), unless the player asked for reduced motion.

import * as THREE from 'three'
import { createAstronaut, poseAstronaut } from './astronaut'
import { advance, LOOP, newMotion, pose, type Motion, type MoveMode } from './motion'

export interface CrewPose {
  player_id: string
  name: string
  x: number
  z: number
  yaw: number
}

interface Body {
  obj: THREE.Group
  name: string
  /** Which leg-stripe colour this one wears: no two in the room share one (up to four). */
  stripe: number
  x: number
  z: number
  yaw: number
  tx: number
  tz: number
  tyaw: number
  motion: Motion
}

export interface CrewView {
  set(members: readonly CrewPose[]): void
  /** Move toward the latest poses. True while someone is catching up or animating, so the room keeps drawing. */
  update(dt: number): boolean
  dispose(): void
}

function yawDelta(from: number, to: number): number {
  let d = to - from
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

/** `float` is for microgravity (the spacecraft); the default is walking under gravity. */
export function mountCrew(scene: THREE.Scene, options: { float?: boolean } = {}): CrewView {
  const mode: MoveMode = options.float ? 'float' : 'walk'
  const animate = !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const group = new THREE.Group()
  scene.add(group)
  const bodies = new Map<string, Body>()
  let dirty = false

  const drop = (body: Body) => {
    group.remove(body.obj)
    body.obj.traverse((child) => {
      if (child instanceof THREE.Sprite) {
        const material = child.material
        material.map?.dispose()
        material.dispose()
      }
      if (child instanceof THREE.SkinnedMesh) child.skeleton.dispose() // its bone texture; the suit's shapes and materials are shared
    })
  }

  return {
    set(members) {
      const ids = new Set(members.map((m) => m.player_id))
      for (const [id, body] of bodies) {
        if (!ids.has(id)) {
          drop(body)
          bodies.delete(id)
          dirty = true
        }
      }
      for (const member of members) {
        let body = bodies.get(member.player_id)
        if (!body || body.name !== member.name) {
          const taken = new Set([...bodies.values()].map((other) => other.stripe))
          const stripe = body?.stripe ?? [0, 1, 2, 3].find((n) => !taken.has(n)) ?? bodies.size
          if (body) drop(body)
          const obj = createAstronaut(member.name, stripe)
          group.add(obj)
          body = { obj, name: member.name, stripe, x: member.x, z: member.z, yaw: member.yaw, tx: member.x, tz: member.z, tyaw: member.yaw, motion: newMotion(Math.random() * LOOP) }
          bodies.set(member.player_id, body)
          obj.position.set(member.x, 0, member.z)
          obj.rotation.y = member.yaw
          dirty = true
        } else {
          body.tx = member.x
          body.tz = member.z
          body.tyaw = member.yaw
        }
      }
    },
    update(dt) {
      let moving = false
      const step = Math.min(dt, 0.1)
      const k = 1 - Math.exp(-step * 12)
      for (const body of bodies.values()) {
        const dx = body.tx - body.x
        const dz = body.tz - body.z
        const dy = yawDelta(body.yaw, body.tyaw)
        if (Math.hypot(dx, dz) > 0.004 || Math.abs(dy) > 0.004) moving = true
        body.x += dx * k
        body.z += dz * k
        body.yaw += dy * k
        body.obj.position.set(body.x, 0, body.z)
        body.obj.rotation.y = body.yaw
        if (animate && step > 0) {
          // Speed in the body's own frame: it faces -Z turned by yaw.
          const vx = (dx * k) / step, vz = (dz * k) / step
          const sin = Math.sin(body.yaw), cos = Math.cos(body.yaw)
          advance(body.motion, mode, step, -vx * sin - vz * cos, vx * cos - vz * sin, (dy * k) / step)
          poseAstronaut(body.obj, pose(mode, body.motion))
        }
      }
      // A walking idle breathes and a floating one drifts, so with crew in the room every frame is new.
      const show = dirty || moving || (animate && bodies.size > 0)
      dirty = false
      if (show) group.updateMatrixWorld(true)
      return show
    },
    dispose() {
      for (const body of bodies.values()) drop(body)
      bodies.clear()
      scene.remove(group)
    },
  }
}
