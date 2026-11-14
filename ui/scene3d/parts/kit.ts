// Shared materials, canvas textures and small mesh helpers for every part model.
// Everything is drawn in code: no image files. Materials and their textures are made once and shared
// by every part and every rebuild; only geometry is made (and disposed) per craft.
import * as THREE from 'three'

// Tests run without a DOM: there the materials simply have no texture maps.
const hasDom = typeof document !== 'undefined'

function rng(seed: number): () => number {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

function texture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, srgb = true): THREE.CanvasTexture | null {
  if (!hasDom) return null
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

/** Crinkled foil as a tangent-space normal map: random overlapping facets, then a Sobel pass. Tiles. */
function crinkleNormal(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    const rnd = rng(11)
    g.fillStyle = '#808080'
    g.fillRect(0, 0, s, s)
    for (let i = 0; i < 170; i++) {
      const x = rnd() * s
      const y = rnd() * s
      const r = 14 + rnd() * 48
      const v = Math.floor(rnd() * 255)
      g.fillStyle = `rgba(${v},${v},${v},0.42)`
      const pts = [0, 1, 2].map(() => [x + (rnd() - 0.5) * 2 * r, y + (rnd() - 0.5) * 2 * r] as const)
      // Drawn nine times so facets wrap around the edges.
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
        g.beginPath()
        pts.forEach(([px, py], n) => (n ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy)))
        g.fill()
      }
    }
    const src = g.getImageData(0, 0, s, s).data
    const out = g.createImageData(s, s)
    const h = (x: number, y: number) => src[(((y + s) % s) * s + ((x + s) % s)) * 4]! / 255
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 1.7
      const dy = (h(x, y + 1) - h(x, y - 1)) * 1.7
      const l = Math.hypot(dx, dy, 1)
      const i = (y * s + x) * 4
      out.data[i] = (-dx / l * 0.5 + 0.5) * 255
      out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255
      out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255
      out.data[i + 3] = 255
    }
    g.putImageData(out, 0, 0)
  }, false)
}

/** Blanket seams: quilted patches with stitched edges and tie-down buttons. Multiplies any foil colour. */
function quiltMap(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    const rnd = rng(5)
    g.fillStyle = '#fff'
    g.fillRect(0, 0, s, s)
    // Blankets are cut to fit: patches of different sizes, each a slightly different shade.
    const cuts: [number, number, number, number][] = [[0, 0, 150, 96], [150, 0, 106, 160], [0, 96, 150, 160], [150, 160, 106, 96]]
    for (const [x, y, w, h] of cuts) {
      const v = 232 + Math.floor(rnd() * 23)
      g.fillStyle = `rgb(${v},${v},${v})`
      g.fillRect(x, y, w, h)
      // Seam: a strip of tape over the join, with a dark edge where the layers overlap.
      g.strokeStyle = 'rgba(60,45,20,0.6)'
      g.lineWidth = 2
      g.strokeRect(x + 1, y + 1, w, h)
      g.strokeStyle = 'rgba(255,255,255,0.5)'
      g.lineWidth = 3
      g.strokeRect(x + 4.5, y + 4.5, w, h)
    }
    g.fillStyle = 'rgba(40,30,15,0.6)'
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.beginPath()
      g.arc(32 + i * 64, 32 + j * 64, 2.2, 0, 7)
      g.fill()
    }
  })
}

/** Triple-junction solar cells: 2 x 4 dark blue cells per tile with cropped corners, grid fingers and bus bars. */
function cellMap(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    g.fillStyle = '#6f7690'
    g.fillRect(0, 0, s, s)
    const cw = s / 2
    const ch = s / 4
    for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) {
      const x = i * cw + 3
      const y = j * ch + 3
      const w = cw - 6
      const h = ch - 6
      const k = 9
      const grad = g.createLinearGradient(x, y, x + w, y + h)
      grad.addColorStop(0, '#1a2a6c')
      grad.addColorStop(0.5, '#0d1740')
      grad.addColorStop(1, '#16235c')
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(x + k, y)
      g.lineTo(x + w - k, y)
      g.lineTo(x + w, y + k)
      g.lineTo(x + w, y + h - k)
      g.lineTo(x + w - k, y + h)
      g.lineTo(x + k, y + h)
      g.lineTo(x, y + h - k)
      g.lineTo(x, y + k)
      g.fill()
      g.strokeStyle = 'rgba(170,185,230,0.28)'
      g.lineWidth = 1
      for (let f = 1; f < 12; f++) g.strokeRect(x + (f * w) / 12, y + 2, 0, h - 4)
      g.strokeStyle = 'rgba(205,210,225,0.7)'
      g.lineWidth = 2
      g.strokeRect(x + 4, y + h / 2, w - 8, 0)
    }
  })
}

/** Back of a solar panel: carbon-fibre face sheet, stiffeners and the harness that collects the current. */
function backMap(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    g.fillStyle = '#22252b'
    g.fillRect(0, 0, s, s)
    g.strokeStyle = 'rgba(255,255,255,0.05)'
    for (let i = -s; i < s; i += 6) {
      g.beginPath()
      g.moveTo(i, 0)
      g.lineTo(i + s, s)
      g.stroke()
    }
    g.fillStyle = '#3b3f48'
    g.fillRect(0, 60, s, 6)
    g.fillRect(0, 190, s, 6)
    g.fillStyle = '#b5762a'
    g.fillRect(0, 124, s, 8)
    g.fillStyle = '#8d939e'
    for (const x of [30, 128, 226]) g.fillRect(x - 5, 120, 10, 16)
  })
}

/** CubeSat side panel: black anodised plate with screws, an access port and a connector. One tile per unit. */
function cubePanelMap(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    g.fillStyle = '#23262d'
    g.fillRect(0, 0, s, s)
    g.strokeStyle = '#0c0d10'
    g.lineWidth = 3
    g.strokeRect(10, 10, s - 20, s - 20)
    g.fillStyle = '#17191e'
    g.fillRect(40, 70, 176, 96)
    g.strokeStyle = '#555b66'
    g.lineWidth = 2
    g.strokeRect(40, 70, 176, 96)
    g.fillStyle = '#c9a23a'
    g.fillRect(150, 190, 46, 22)
    g.fillStyle = '#0c0d10'
    g.fillRect(156, 196, 34, 10)
    g.fillStyle = '#aab0bb'
    for (const [x, y] of [[22, 22], [234, 22], [22, 234], [234, 234], [128, 22], [128, 234]] as const) {
      g.beginPath()
      g.arc(x, y, 5, 0, 7)
      g.fill()
    }
    g.fillStyle = '#b3261e'
    g.fillRect(50, 196, 40, 10)
  })
}

/** Honeycomb equipment deck: bare aluminium with rows of bolt inserts. */
function deckMap(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    g.fillStyle = '#b9bdc6'
    g.fillRect(0, 0, s, s)
    g.fillStyle = '#7d828d'
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      g.beginPath()
      g.arc(16 + i * 32, 16 + j * 32, 2.5, 0, 7)
      g.fill()
    }
    g.strokeStyle = 'rgba(70,75,85,0.5)'
    g.lineWidth = 2
    g.strokeRect(1, 1, s - 2, s - 2)
  })
}

/** Radiator: small second-surface mirror tiles. */
function osrMap(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    const rnd = rng(3)
    g.fillStyle = '#6f7682'
    g.fillRect(0, 0, s, s)
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const v = 205 + Math.floor(rnd() * 45)
      g.fillStyle = `rgb(${v},${v + 3},${Math.min(255, v + 8)})`
      g.fillRect(i * 32 + 1.5, j * 32 + 1.5, 29, 29)
    }
  })
}

/** Radiator with louvers: white blades in a frame, a few of them open. */
function louverMap(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    g.fillStyle = '#9aa0ab'
    g.fillRect(0, 0, s, s)
    for (let j = 0; j < 16; j++) {
      g.fillStyle = j % 5 === 2 ? '#3a3e47' : '#eceef2'
      g.fillRect(12, j * 16 + 3, s - 24, 11)
    }
    g.fillStyle = '#9aa0ab'
    g.fillRect(124, 0, 8, s)
  })
}

/** Phased-array radar face: cream radiating tiles in modules. */
function radarMap(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    g.fillStyle = '#8c8372'
    g.fillRect(0, 0, s, s)
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      g.fillStyle = (i >> 1) % 2 === (j >> 2) % 2 ? '#e9e2cf' : '#e0d8c2'
      g.fillRect(i * 32 + 2, j * 32 + 2, 28, 28)
      g.fillStyle = '#b9ad90'
      g.fillRect(i * 32 + 13, j * 32 + 6, 6, 20)
    }
    g.strokeStyle = '#5d5648'
    g.lineWidth = 3
    g.strokeRect(0, 0, s, s)
    g.strokeRect(0, 128, s, 0)
  })
}

/** Knitted gold wire mesh stretched over a web of triangles (NISAR's reflector): see-through, so it has an alpha channel. */
function meshMap(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    g.clearRect(0, 0, s, s)
    g.fillStyle = 'rgba(232,190,96,0.2)'
    g.fillRect(0, 0, s, s)
    g.strokeStyle = 'rgba(240,205,120,0.55)'
    g.lineWidth = 1
    for (let i = 0; i < s; i += 8) {
      g.strokeRect(i + 0.5, 0, 0, s)
      g.strokeRect(0, i + 0.5, s, 0)
    }
    // The cable web the mesh is tied to: triangles, two per tile.
    g.strokeStyle = 'rgba(255,236,170,0.95)'
    g.lineWidth = 2.5
    g.strokeRect(1, 1, s, s)
    for (const [x0, y0, x1, y1] of [[0, 0, s, s], [s / 2, 0, s / 2, s], [0, s / 2, s, s / 2], [0, s, s, 0]] as const) {
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x1, y1)
      g.stroke()
    }
  })
}

/** MarCO's reflectarray: a circuit board printed with rows of copper patches whose sizes vary to focus the beam. */
function reflectarrayMap(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    g.fillStyle = '#c9b98a'
    g.fillRect(0, 0, s, s)
    const n = 16
    const c = s / n
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      // Patch size cycles with distance from the feed, which draws the rings seen on the real panel.
      const k = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(Math.hypot(i - n / 2 + 0.5, j + 3) * 1.9))
      g.fillStyle = '#b06a32'
      g.fillRect(i * c + (c * (1 - k)) / 2, j * c + (c * (1 - k)) / 2, c * k, c * k)
    }
  })
}

/** Dish reflector face: white paint over the petals the reflector is laid up from. u runs round the dish, v from hub to rim. */
function petalMap(): THREE.CanvasTexture | null {
  return texture(256, (g, s) => {
    g.fillStyle = '#eceef1'
    g.fillRect(0, 0, s, s)
    g.strokeStyle = 'rgba(120,128,140,0.55)'
    g.lineWidth = 2
    for (let i = 0; i < 12; i++) g.strokeRect(i * (s / 12) + 1, 0, 0, s)
    g.lineWidth = 1.5
    for (const v of [0.34, 0.67]) g.strokeRect(0, v * s, s, 0)
  })
}

function build() {
  const normalMap = crinkleNormal()
  const quilt = quiltMap()
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o)
  const foil = (color: number, roughness: number, metalness = 1) =>
    std({ color, metalness, roughness, map: quilt, normalMap, normalScale: new THREE.Vector2(0.5, 0.5) })
  return {
    goldMLI: foil(0xf0b84a, 0.26),
    goldDouble: Object.assign(foil(0xf0b84a, 0.26), { side: THREE.DoubleSide }),
    blackMLI: foil(0x3a3c46, 0.32, 0.85),
    silverMLI: foil(0xe6e9f0, 0.22),
    alu: std({ color: 0xc3c7cf, metalness: 0.9, roughness: 0.34 }),
    aluDark: std({ color: 0x24262c, metalness: 0.6, roughness: 0.5 }),
    tape: std({ color: 0xd8d2b4, metalness: 0.45, roughness: 0.4 }),
    steel: std({ color: 0x8c919b, metalness: 1, roughness: 0.25 }),
    white: std({ color: 0xe6e8ec, metalness: 0, roughness: 0.65 }),
    whiteDouble: std({ color: 0xe6e8ec, metalness: 0, roughness: 0.6, side: THREE.DoubleSide }),
    greyDouble: std({ color: 0x9aa0aa, metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide }),
    black: std({ color: 0x08090b, metalness: 0, roughness: 0.9, side: THREE.DoubleSide }),
    glass: std({ color: 0x0a1430, metalness: 1, roughness: 0.04 }),
    mirror: std({ color: 0xf0d58a, metalness: 1, roughness: 0.03 }),
    gold: std({ color: 0xe0b050, metalness: 1, roughness: 0.2, side: THREE.DoubleSide }),
    copper: std({ color: 0xc27a45, metalness: 1, roughness: 0.3 }),
    pcb: std({ color: 0x1d5a38, metalness: 0.1, roughness: 0.55 }),
    kapton: std({ color: 0xc98a2a, metalness: 0.4, roughness: 0.4 }),
    ceramic: std({ color: 0xe9e4d4, metalness: 0, roughness: 0.5 }),
    cellWrap: std({ color: 0x1f7f8c, metalness: 0.3, roughness: 0.4 }),
    cellCase: std({ color: 0x8fa3b8, metalness: 0.85, roughness: 0.35 }),
    orange: std({ color: 0xe8731c, metalness: 0, roughness: 0.6 }),
    red: std({ color: 0xb3261e, metalness: 0, roughness: 0.6 }),
    rtgCore: std({ color: 0x2d2f35, metalness: 0.5, roughness: 0.6 }),
    mesh: std({ map: meshMap(), color: hasDom ? 0xffffff : 0xe8be60, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide, transparent: true, depthWrite: false }),
    reflectarray: std({ map: reflectarrayMap(), color: hasDom ? 0xffffff : 0xc9a060, metalness: 0.35, roughness: 0.5 }),
    dishFace: std({ map: petalMap(), color: hasDom ? 0xffffff : 0xe6e8ec, metalness: 0, roughness: 0.6, side: THREE.DoubleSide }),
    nozzle: std({ color: 0x5a524c, metalness: 0.9, roughness: 0.42, side: THREE.DoubleSide }),
    cells: std({ map: cellMap(), color: hasDom ? 0xffffff : 0x16245a, metalness: 0.45, roughness: 0.3 }),
    cellBack: std({ map: backMap(), color: hasDom ? 0xffffff : 0x22252b, metalness: 0.3, roughness: 0.6 }),
    cubePanel: std({ map: cubePanelMap(), color: hasDom ? 0xffffff : 0x23262d, metalness: 0.55, roughness: 0.5 }),
    deck: std({ map: deckMap(), color: hasDom ? 0xffffff : 0xb9bdc6, metalness: 0.85, roughness: 0.4 }),
    osr: std({ map: osrMap(), color: hasDom ? 0xffffff : 0xd6dae2, metalness: 0.9, roughness: 0.12 }),
    louver: std({ map: louverMap(), color: hasDom ? 0xffffff : 0xdfe2e8, metalness: 0.2, roughness: 0.5 }),
    radar: std({ map: radarMap(), color: hasDom ? 0xffffff : 0xe4dcc8, metalness: 0.1, roughness: 0.6 }),
    filterBlue: std({ color: 0x2a5cff, metalness: 0.8, roughness: 0.1 }),
    filterGreen: std({ color: 0x29b34a, metalness: 0.8, roughness: 0.1 }),
    filterRed: std({ color: 0xd43226, metalness: 0.8, roughness: 0.1 }),
    filterNir: std({ color: 0x5a0d1e, metalness: 0.8, roughness: 0.1 }),
  }
}

let cache: ReturnType<typeof build> | null = null
/** The shared material set. Marked `userData.shared`, so disposeObject() keeps it when a craft is replaced. */
export function mats() {
  if (!cache) {
    cache = build()
    for (const m of Object.values(cache)) m.userData.shared = true
  }
  return cache
}
export type Mats = ReturnType<typeof build>

export type PartTag = 'bus' | 'power' | 'comms' | 'instrument'

/** A group tagged so other code can find and highlight a part by traversing the craft. */
export function partGroup(part: PartTag, id: string): THREE.Group {
  const g = new THREE.Group()
  g.name = `${part}:${id}`
  g.userData.part = part
  g.userData.id = id
  return g
}

export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
/** Cylinder along y. `open` leaves the ends off (use a double-sided material). */
export const cyl = (rTop: number, rBottom: number, h: number, seg = 16, open = false) => new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open)

/** Repeats a texture across a geometry by scaling its UVs, so one texture serves every panel size. */
export function tile<T extends THREE.BufferGeometry>(geo: T, u: number, v: number): T {
  const uv = geo.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v)
  return geo
}

/** Repeats a texture on a box by its size in units: ux across x, uy across y, uz across z. */
export function tileBox(geo: THREE.BoxGeometry, ux: number, uy: number, uz: number): THREE.BoxGeometry {
  const uv = geo.getAttribute('uv')
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z, four vertices each.
  const scale = [[uz, uy], [uz, uy], [ux, uz], [ux, uz], [ux, uy], [ux, uy]] as const
  for (let i = 0; i < uv.count; i++) {
    const [u, v] = scale[Math.floor(i / 4)]!
    uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v)
  }
  return geo
}

export function put(
  parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[],
  x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.rotation.set(rx, ry, rz)
  parent.add(m)
  return m
}

const Y = new THREE.Vector3(0, 1, 0)
/** Points an object's +y axis along `dir`. */
export function aim<T extends THREE.Object3D>(o: T, dir: THREE.Vector3): T {
  o.quaternion.setFromUnitVectors(Y, dir.clone().normalize())
  return o
}

/** A round strut from a to b. */
export function strut(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 6): THREE.Mesh {
  const d = b.clone().sub(a)
  const m = put(parent, cyl(r, r, d.length(), seg), mat)
  m.position.copy(a).addScaledVector(d, 0.5)
  return aim(m, d)
}

/** Parabolic reflector opening toward +y, vertex at the origin. Returns the rim height. */
export function dishGeometry(radius: number, focal: number, seg = 36): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 10; i++) {
    const r = (i / 10) * radius
    pts.push(new THREE.Vector2(r, (r * r) / (4 * focal)))
  }
  return new THREE.LatheGeometry(pts, seg)
}

/** Rocket nozzle bell opening toward +y, throat at the origin. */
export function bellGeometry(rExit: number, len: number, seg = 14): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 6; i++) pts.push(new THREE.Vector2(rExit * (0.28 + 0.72 * Math.sqrt(i / 6)), (len * i) / 6))
  return new THREE.LatheGeometry(pts, seg)
}

/** Triangles in an object, for the phone budget. */
export function triangles(obj: THREE.Object3D): number {
  let n = 0
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.getAttribute('position').count) / 3
  })
  return n
}

/** Meshes in an object: one draw call each. */
export function meshes(obj: THREE.Object3D): number {
  let n = 0
  obj.traverse((o) => void (o instanceof THREE.Mesh && n++))
  return n
}
