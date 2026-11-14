// Builds the spacecraft mesh from a CraftSpec. Axes: +y points away from the planet (zenith),
// +z faces the Sun (solar wings), wings stick out along ±x, instruments look down (-y).
import * as THREE from 'three'
import type { CraftSpec, InstrumentShape } from './model'

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Solar cells: deep blue tiles with silver gaps. */
function cellTexture(cols: number, rows: number): THREE.CanvasTexture {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#c9ccd2'
    g.fillRect(0, 0, 256, 256)
    const cw = 256 / cols
    const ch = 256 / rows
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const grad = g.createLinearGradient(i * cw, j * ch, (i + 1) * cw, (j + 1) * ch)
        grad.addColorStop(0, '#16245a')
        grad.addColorStop(1, '#0b1438')
        g.fillStyle = grad
        g.fillRect(i * cw + 2, j * ch + 2, cw - 4, ch - 4)
      }
    }
  })
}

/** Crinkled gold foil, used as a bump map. */
function foilBump(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (g) => {
    const img = g.createImageData(128, 128)
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 110 + rnd() * 90
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
  }, false)
}

export function buildCraft(spec: CraftSpec): THREE.Group {
  const craft = new THREE.Group()
  const [bx, by, bz] = spec.bus
  const s = Math.max(bx, by, bz)

  const foil = new THREE.MeshStandardMaterial({ color: 0xd8a740, metalness: 1, roughness: 0.3, bumpMap: foilBump(), bumpScale: 0.6 })
  const alu = new THREE.MeshStandardMaterial({ color: 0xc3c7cf, metalness: 0.9, roughness: 0.32 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1e24, metalness: 0.4, roughness: 0.55 })
  const white = new THREE.MeshStandardMaterial({ color: 0xc4c8cf, metalness: 0.05, roughness: 0.6 })
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a1430, metalness: 1, roughness: 0.04 })
  const cells = new THREE.MeshStandardMaterial({ map: cellTexture(4, 8), metalness: 0.65, roughness: 0.22 })
  const sideCells = new THREE.MeshStandardMaterial({ map: cellTexture(2, 6), metalness: 0.65, roughness: 0.22 })

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], pos: [number, number, number], parent: THREE.Object3D = craft) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(...pos)
    parent.add(m)
    return m
  }

  // Bus. BoxGeometry face order: +x, -x, +y, -y, +z, -z.
  if (spec.cubesat) {
    const sides = spec.power === 'body' || spec.power === 'wings' ? sideCells : dark
    add(new THREE.BoxGeometry(bx * 0.96, by, bz * 0.96), [sides, sides, alu, dark, sides, sides], [0, 0, 0])
    const rail = new THREE.BoxGeometry(s * 0.035, by * 1.04, s * 0.035)
    for (const x of [-1, 1]) for (const z of [-1, 1]) add(rail, alu, [(x * bx) / 2, 0, (z * bz) / 2])
  } else {
    add(new THREE.BoxGeometry(bx, by, bz), foil, [0, 0, 0])
    add(new THREE.BoxGeometry(bx * 1.02, by * 0.04, bz * 1.02), alu, [0, by / 2, 0])
    add(new THREE.BoxGeometry(bx * 1.02, by * 0.04, bz * 1.02), alu, [0, -by / 2, 0])
  }

  // Solar wings on yokes along ±x, cells facing +z (the Sun).
  if (spec.power === 'wings') {
    const len = spec.wingSpan * s
    const width = Math.min(by * 0.9, len * 0.45)
    const panels = Math.max(1, Math.round(spec.wingSpan / 0.8))
    const panelLen = len / panels
    const panelGeo = new THREE.BoxGeometry(panelLen * 0.97, width, s * 0.015)
    const yokeLen = s * 0.18
    const yoke = new THREE.CylinderGeometry(s * 0.012, s * 0.012, yokeLen, 8).rotateZ(Math.PI / 2)
    for (const side of [-1, 1]) {
      const x0 = (side * bx) / 2
      add(yoke, alu, [x0 + (side * yokeLen) / 2, 0, 0])
      for (let i = 0; i < panels; i++) {
        add(panelGeo, [alu, alu, alu, alu, cells, dark], [x0 + side * (yokeLen + panelLen * (i + 0.5)), 0, 0])
      }
    }
  }

  // RTG: finned cylinder on a boom off the -z side.
  if (spec.power === 'rtg') {
    const boomLen = s * 0.6
    add(new THREE.CylinderGeometry(s * 0.02, s * 0.02, boomLen, 8).rotateX(Math.PI / 2), alu, [0, -by * 0.2, -bz / 2 - boomLen / 2])
    const rtg = new THREE.Group()
    rtg.position.set(0, -by * 0.2, -bz / 2 - boomLen - s * 0.12)
    rtg.rotation.x = Math.PI / 2
    craft.add(rtg)
    add(new THREE.CylinderGeometry(s * 0.12, s * 0.12, s * 0.55, 20), dark, [0, 0, 0], rtg)
    const fin = new THREE.BoxGeometry(s * 0.012, s * 0.5, s * 0.16)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const f = add(fin, dark, [Math.cos(a) * s * 0.18, 0, Math.sin(a) * s * 0.18], rtg)
      f.rotation.y = -a
    }
  }

  // Antenna.
  if (spec.antenna === 'dish') {
    const r = (spec.dishSize * s) / 2
    const pts: THREE.Vector2[] = []
    for (let i = 0; i <= 16; i++) {
      const x = (i / 16) * r
      pts.push(new THREE.Vector2(x, (x * x) / (2.2 * r)))
    }
    const dish = new THREE.Group()
    dish.position.set(0, -by * 0.1, -bz / 2 - r * 0.35)
    dish.rotation.x = -Math.PI * 0.62
    craft.add(dish)
    dish.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: 0xc4c8cf, roughness: 0.6, side: THREE.DoubleSide })))
    add(new THREE.CylinderGeometry(r * 0.03, r * 0.03, r * 0.8, 6), alu, [0, r * 0.4, 0], dish)
    add(new THREE.CylinderGeometry(r * 0.09, r * 0.06, r * 0.12, 12), dark, [0, r * 0.82, 0], dish)
  } else if (spec.antenna === 'patch') {
    add(new THREE.BoxGeometry(bx * 0.5, s * 0.01, bz * 0.5), white, [0, -by / 2 - s * 0.006, bz * 0.18])
  } else if (spec.antenna === 'whip') {
    const whip = new THREE.CylinderGeometry(s * 0.004, s * 0.004, s * 0.9, 4)
    for (const [x, z, rz, rx] of [[1, 0, -1, 0], [-1, 0, 1, 0], [0, 1, 0, 1], [0, -1, 0, -1]] as const) {
      const w = add(whip, alu, [(x * bx) / 2 + x * s * 0.45, by / 2 - s * 0.02, (z * bz) / 2 + z * s * 0.45])
      w.rotation.set((rx * Math.PI) / 2, 0, (rz * Math.PI) / 2)
    }
  }

  // Instruments: spread over the nadir (-y) face; telescopes and booms go elsewhere.
  const nadir = spec.instruments.filter((i) => i === 'lens' || i === 'box')
  const cols = Math.max(1, Math.ceil(Math.sqrt(nadir.length)))
  nadir.forEach((kind, i) => {
    const cx = ((i % cols) + 0.5) / cols - 0.5
    const cz = (Math.floor(i / cols) + 0.5) / Math.ceil(nadir.length / cols) - 0.5
    const x = cx * bx * 0.75
    const z = cz * bz * 0.75 - (spec.antenna === 'patch' ? bz * 0.12 : 0)
    instrument(kind, x, z)
  })
  spec.instruments.filter((i) => i !== 'lens' && i !== 'box').forEach((kind, i) => instrument(kind, 0, 0, i))

  function instrument(kind: InstrumentShape, x: number, z: number, n = 0) {
    const r = Math.min(bx, bz) * 0.16
    if (kind === 'lens') {
      add(new THREE.CylinderGeometry(r, r * 1.1, r * 1.6, 24), dark, [x, -by / 2 - r * 0.8, z])
      add(new THREE.CylinderGeometry(r * 0.8, r * 0.8, r * 0.1, 24), glass, [x, -by / 2 - r * 1.62, z])
    } else if (kind === 'box') {
      add(new THREE.BoxGeometry(r * 2, r * 1.2, r * 2), foil, [x, -by / 2 - r * 0.6, z])
      add(new THREE.CylinderGeometry(r * 0.45, r * 0.45, r * 0.2, 16), glass, [x, -by / 2 - r * 1.25, z])
    } else if (kind === 'telescope') {
      const tr = Math.min(bx, bz) * 0.32
      add(new THREE.CylinderGeometry(tr, tr, by * 1.1, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xc4c8cf, roughness: 0.6, side: THREE.DoubleSide }), [0, by / 2 + by * 0.55, 0])
      add(new THREE.CylinderGeometry(tr * 0.95, tr * 0.95, s * 0.01, 32), glass, [0, by / 2 + by * 0.2, 0])
    } else if (kind === 'radar') {
      add(new THREE.BoxGeometry(s * 1.7, s * 0.03, bz * 0.6), [alu, alu, dark, cells, alu, alu], [0, -by / 2 - s * 0.12, -bz * 0.1])
    } else {
      // Magnetometer: a long boom with a small sensor at the tip, kept away from the bus's own fields.
      const len = s * 1.4
      const dir = n % 2 === 0 ? 1 : -1
      add(new THREE.CylinderGeometry(s * 0.008, s * 0.008, len, 6).rotateX(Math.PI / 2), alu, [bx * 0.3 * dir, by * 0.4, (dir * (bz / 2 + len / 2))])
      add(new THREE.BoxGeometry(s * 0.06, s * 0.06, s * 0.06), white, [bx * 0.3 * dir, by * 0.4, dir * (bz / 2 + len)])
    }
  }

  // Normalize so the whole craft fits in a unit sphere; the scene scales it from there.
  const sphere = new THREE.Box3().setFromObject(craft).getBoundingSphere(new THREE.Sphere())
  const pivot = new THREE.Group()
  craft.position.copy(sphere.center).multiplyScalar(-1)
  pivot.add(craft)
  pivot.scale.setScalar(1 / Math.max(sphere.radius, 1e-6))
  return pivot
}

/** Frees the geometries, materials and textures of a craft (or any object). */
export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    if (!(o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line || o instanceof THREE.Sprite)) return
    // Sprites share one geometry inside three.js; only their materials are ours.
    if (!(o instanceof THREE.Sprite)) o.geometry.dispose()
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
      m.dispose()
    }
  })
}
