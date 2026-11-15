// Set dressing for the mission control you play in (Sarah's request: "look like the inside of where the
// mission is"). Static and decorative only: nothing here is interactable or collidable, so layout.ts,
// the stations and the controller are unchanged. Modelled on NASA's Flight Control Room (front display
// wall, carpeted console floor, acoustic walls, tiled ceiling). claude@sarah. The clean-room crane, sign and
// floor square went when the craft became a hologram in the middle of the hall (control.ts).

import * as THREE from 'three'
import { CALL_WALL, ROOM } from './layout'

type Canvas = { c: HTMLCanvasElement; g: CanvasRenderingContext2D }

function canvas(w: number, h: number): Canvas {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, g: c.getContext('2d')! }
}

function texture({ c }: Canvas, repeat?: [number, number]): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
  }
  t.anisotropy = 4
  return t
}

/** Acoustic wall: dark fabric panels with thin reveals, a darker skirting band. Repeats every 1.2 m. */
export function wallMaterial(): THREE.MeshStandardMaterial {
  const k = canvas(256, 512)
  const { g } = k
  g.fillStyle = '#1b2234'
  g.fillRect(0, 0, 256, 512)
  for (let y = 0; y < 512; y += 4) {
    g.fillStyle = `rgba(255,255,255,${0.012 + ((y * 7) % 5) * 0.003})`
    g.fillRect(0, y, 256, 2)
  }
  g.fillStyle = '#0f1422'
  g.fillRect(0, 0, 6, 512) // panel reveal
  g.fillRect(0, 440, 256, 72) // skirting band
  g.fillStyle = '#2b3550'
  g.fillRect(0, 438, 256, 3)
  const t = texture(k, [16, 1])
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })
}

/** Ceiling: 0.6 m acoustic tiles with a recessed light every few tiles. */
export function ceilingMaterial(): THREE.MeshStandardMaterial {
  const k = canvas(256, 256)
  const { g } = k
  g.fillStyle = '#22293a'
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = '#151b29'
  g.lineWidth = 4
  for (let i = 0; i <= 256; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke()
    g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke()
  }
  g.fillStyle = '#cfdcff'
  g.fillRect(70, 70, 52, 52) // one recessed light per 4×4 tiles
  const t = texture(k, [(ROOM.max[0] - ROOM.min[0]) / 2.4, (ROOM.max[2] - ROOM.min[2]) / 2.4])
  return new THREE.MeshStandardMaterial({ map: t, roughness: 1, emissiveMap: t, emissive: new THREE.Color(0x30384c) })
}

function carpetTexture(): THREE.CanvasTexture {
  const k = canvas(256, 256)
  const { g } = k
  g.fillStyle = '#1d2433'
  g.fillRect(0, 0, 256, 256)
  // speckled loop pile + a faint diamond, the classic control-room carpet
  for (let i = 0; i < 2600; i++) {
    const v = 30 + ((i * 2654435761) >>> 24) % 24
    g.fillStyle = `rgb(${v},${v + 6},${v + 18})`
    g.fillRect((i * 97) % 256, (i * 57) % 256, 2, 2)
  }
  g.strokeStyle = 'rgba(120,150,210,0.10)'
  g.lineWidth = 3
  g.beginPath(); g.moveTo(128, 8); g.lineTo(248, 128); g.lineTo(128, 248); g.lineTo(8, 128); g.closePath(); g.stroke()
  return texture(k, [10, 4])
}

function signTexture(lines: string[], w: number, h: number, bg: string, fg: string, accent: string): THREE.CanvasTexture {
  const k = canvas(w, h)
  const { g } = k
  g.fillStyle = bg
  g.fillRect(0, 0, w, h)
  g.fillStyle = accent
  g.fillRect(0, 0, 10, h)
  g.textBaseline = 'middle'
  lines.forEach((line, i) => {
    g.fillStyle = i === 0 ? fg : accent
    g.font = `${i === 0 ? 700 : 600} ${Math.round(h * (lines.length === 1 ? 0.48 : i === 0 ? 0.36 : 0.22))}px system-ui, sans-serif`
    g.fillText(line, 34, h * (lines.length === 1 ? 0.5 : 0.36 + i * 0.36), w - 50)
  })
  return texture(k)
}

/**
 * Ground-track display: lat/lon grid, a sine-shaped orbit trace, and the three real Deep Space Network
 * sites (Goldstone 35.4°N 116.9°W, Madrid 40.4°N 4.2°W, Canberra 35.4°S 148.9°E).
 */
function groundTrackTexture(): THREE.CanvasTexture {
  const w = 1024
  const h = 512
  const k = canvas(w, h)
  const { g } = k
  g.fillStyle = '#04101e'
  g.fillRect(0, 0, w, h)
  const px = (lon: number) => ((lon + 180) / 360) * w
  const py = (lat: number) => ((90 - lat) / 180) * (h - 60) + 50
  g.strokeStyle = 'rgba(95,212,255,0.16)'
  g.lineWidth = 1
  for (let lon = -180; lon <= 180; lon += 30) { g.beginPath(); g.moveTo(px(lon), py(90)); g.lineTo(px(lon), py(-90)); g.stroke() }
  for (let lat = -90; lat <= 90; lat += 30) { g.beginPath(); g.moveTo(0, py(lat)); g.lineTo(w, py(lat)); g.stroke() }
  g.strokeStyle = 'rgba(95,212,255,0.35)'
  g.beginPath(); g.moveTo(0, py(0)); g.lineTo(w, py(0)); g.stroke()
  // three passes of a ~51.6° inclined orbit, each shifted west as Earth turns underneath
  g.strokeStyle = '#ffb547'
  g.lineWidth = 3
  for (let pass = 0; pass < 3; pass++) {
    g.beginPath()
    for (let lon = -180; lon <= 180; lon += 3) {
      const lat = 51.6 * Math.sin(((lon + 180 + pass * 24) / 360) * 2 * Math.PI)
      const x = px(lon)
      if (lon === -180) g.moveTo(x, py(lat))
      else g.lineTo(x, py(lat))
    }
    g.globalAlpha = 1 - pass * 0.3
    g.stroke()
  }
  g.globalAlpha = 1
  const sites: [string, number, number][] = [['GOLDSTONE', 35.4, -116.9], ['MADRID', 40.4, -4.2], ['CANBERRA', -35.4, 148.9]]
  g.font = '600 18px system-ui, sans-serif'
  for (const [name, lat, lon] of sites) {
    g.fillStyle = '#5ee0a8'
    g.beginPath(); g.arc(px(lon), py(lat), 7, 0, Math.PI * 2); g.fill()
    g.strokeStyle = 'rgba(94,224,168,0.35)'
    g.beginPath(); g.arc(px(lon), py(lat), 26, 0, Math.PI * 2); g.stroke()
    g.fillText(name, px(lon) + 12, py(lat) - 14)
  }
  g.fillStyle = '#5fd4ff'
  g.font = '700 26px system-ui, sans-serif'
  g.fillText('GROUND TRACK', 18, 32)
  g.fillStyle = '#9eb0cf'
  g.font = '500 18px system-ui, sans-serif'
  g.fillText('Deep Space Network sites', w - 250, 32)
  return texture(k)
}

/** Observation-gallery glass: dark tinted panes with mullions and a faint reflection. */
function galleryTexture(): THREE.CanvasTexture {
  const k = canvas(1024, 160)
  const { g } = k
  const grad = g.createLinearGradient(0, 0, 0, 160)
  grad.addColorStop(0, '#0d1626')
  grad.addColorStop(1, '#060a14')
  g.fillStyle = grad
  g.fillRect(0, 0, 1024, 160)
  g.fillStyle = 'rgba(160,190,255,0.06)'
  for (let x = -100; x < 1024; x += 170) {
    g.beginPath(); g.moveTo(x, 160); g.lineTo(x + 60, 0); g.lineTo(x + 100, 0); g.lineTo(x + 40, 160); g.fill()
  }
  g.fillStyle = '#2a3348'
  for (let x = 0; x <= 1024; x += 128) g.fillRect(x - 3, 0, 6, 160)
  g.fillRect(0, 0, 1024, 6)
  g.fillRect(0, 154, 1024, 6)
  return texture(k)
}

/** Add the dressing to `scene`. Everything added is plain meshes; `disposeObject(scene)` cleans it up. */
export function addMissionControlDecor(scene: THREE.Scene): void {
  const [x0, , z0] = ROOM.min
  const [x1, y1, z1] = ROOM.max
  const w = x1 - x0
  const basic = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, toneMapped: false })
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(...pos)
    m.rotation.set(...rot)
    scene.add(m)
    return m
  }

  // ---- Floor: carpet where the consoles are.
  const consoleDepth = -4.6 - z0
  add(new THREE.PlaneGeometry(w, consoleDepth), new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 1 }), [0, 0.003, z0 + consoleDepth / 2], [-Math.PI / 2, 0, 0])

  // ---- Front display wall: a dark bezel behind every screen, and the ground-track display on the left.
  add(new THREE.PlaneGeometry(w - 0.2, 4.0), new THREE.MeshStandardMaterial({ color: 0x05070d, roughness: 0.5, metalness: 0.3 }), [0, 2.95, z0 + 0.012])
  add(new THREE.PlaneGeometry(4.4, 1.75), basic(groundTrackTexture()), [-6.9, 3.78, z0 + 0.025])
  const trim = new THREE.MeshStandardMaterial({ color: 0x2b3550, metalness: 0.6, roughness: 0.35 })
  add(new THREE.BoxGeometry(w - 0.2, 0.06, 0.08), trim, [0, 4.98, z0 + 0.04]) // top edge of the video wall
  add(new THREE.BoxGeometry(w - 0.2, 0.06, 0.08), trim, [0, 0.93, z0 + 0.04])
  add(new THREE.BoxGeometry(CALL_WALL.w + 0.2, 0.08, 0.1), new THREE.MeshBasicMaterial({ color: 0xffb547 }), [CALL_WALL.x, CALL_WALL.y - CALL_WALL.h / 2 - 0.06, z0 + 0.05])

  // ---- Back wall: observation-gallery glass and the Deep Space Network strip.
  add(new THREE.PlaneGeometry(12, 1.9), basic(galleryTexture()), [0, 3.3, z1 - 0.02], [0, Math.PI, 0])
  add(new THREE.PlaneGeometry(7.2, 0.62), basic(signTexture(['DEEP SPACE NETWORK  ·  GOLDSTONE  ·  MADRID  ·  CANBERRA'], 1440, 124, '#0a0f1c', '#eef3ff', '#5ee0a8')), [0, 1.95, z1 - 0.02], [0, Math.PI, 0])

  // ---- Ceiling: cable trays running the length of the room.
  const tray = new THREE.MeshStandardMaterial({ color: 0x3a4459, metalness: 0.7, roughness: 0.4 })
  for (const x of [-6.2, 6.2]) add(new THREE.BoxGeometry(0.42, 0.08, ROOM.max[2] - z0 - 0.4), tray, [x, y1 - 0.22, (z0 + z1) / 2])
}
