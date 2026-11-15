// Other players in a first-person room. Poses arrive a few times a second; the bodies ease toward them.

import * as THREE from 'three'
import { createAstronaut } from './astronaut'

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
  x: number
  z: number
  yaw: number
  tx: number
  tz: number
  tyaw: number
}

export interface CrewView {
  set(members: readonly CrewPose[]): void
  /** Move toward the latest poses. True while someone is still catching up, so the room keeps drawing. */
  update(dt: number): boolean
  dispose(): void
}

function yawDelta(from: number, to: number): number {
  let d = to - from
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

export function mountCrew(scene: THREE.Scene): CrewView {
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
          if (body) drop(body)
          const obj = createAstronaut(member.name)
          group.add(obj)
          body = { obj, name: member.name, x: member.x, z: member.z, yaw: member.yaw, tx: member.x, tz: member.z, tyaw: member.yaw }
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
      const k = 1 - Math.exp(-Math.min(dt, 0.1) * 12)
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
      }
      const show = dirty || moving
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
