// 2D orbit diagram for the `body-centered` frame (see sim/README.md "Mission view"):
// the body at the origin, the spacecraft on a circle in the x-y plane.

import type { Entity } from '../../shared'

const SIZE = 320
const CENTER = SIZE / 2

const BODY_COLOR: Record<string, string> = {
  earth: 'var(--mv-earth)',
  moon: 'var(--mv-moon)',
  mars: 'var(--mv-mars)',
}

export interface OrbitDiagramProps {
  entities: readonly Entity[]
  /** Final orbit altitude, used to draw the target ring while the spacecraft is still climbing. */
  targetAltitudeKm?: number
}

export function OrbitDiagram({ entities, targetAltitudeKm }: OrbitDiagramProps) {
  const body = entities.find((e) => e.kind === 'body')
  const craft = entities.find((e) => e.kind === 'spacecraft')

  if (!body || !craft || !craft.position) {
    return (
      <div className="mv-orbit mv-orbit--empty" role="img" aria-label="No spacecraft in flight yet">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={CENTER} cy={CENTER} r={70} className="mv-orbit__ghost" />
        </svg>
        <p>Launch to see your spacecraft here.</p>
      </div>
    )
  }

  const bodyRadius = typeof body.props.radius_m === 'number' ? body.props.radius_m : 6.371e6
  const [x, y] = craft.position
  const craftR = Math.hypot(x, y)
  const targetR = targetAltitudeKm !== undefined && targetAltitudeKm > 0 ? bodyRadius + targetAltitudeKm * 1000 : craftR
  const outer = Math.max(craftR, targetR, bodyRadius)

  // Real low orbits sit almost on the surface. Stretch altitude so the orbit is visibly apart from the body:
  // the body keeps a fixed share of the drawing and altitude fills the rest.
  const bodyPx = SIZE * 0.22
  const maxPx = SIZE * 0.44
  const altSpan = Math.max(1, outer - bodyRadius)
  const toPx = (r: number) => bodyPx + ((Math.max(r, bodyRadius) - bodyRadius) / altSpan) * (maxPx - bodyPx)

  const angle = Math.atan2(y, x)
  const craftPx = toPx(craftR)
  const cx = CENTER + craftPx * Math.cos(angle)
  const cy = CENTER - craftPx * Math.sin(angle) // SVG y points down
  const bodyId = typeof craft.props.body === 'string' ? craft.props.body : body.id
  const altitudeKm = Math.max(0, (craftR - bodyRadius) / 1000)

  return (
    <figure className="mv-orbit">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${craft.name} orbiting ${body.name} at ${Math.round(altitudeKm).toLocaleString('en-US')} km`}
      >
        <circle cx={CENTER} cy={CENTER} r={toPx(targetR)} className="mv-orbit__ring" />
        <circle cx={CENTER} cy={CENTER} r={bodyPx} fill={BODY_COLOR[bodyId] ?? 'var(--mv-earth)'} className="mv-orbit__body" />
        <line x1={CENTER} y1={CENTER} x2={cx} y2={cy} className="mv-orbit__radius" />
        <circle cx={cx} cy={cy} r={7} className="mv-orbit__craft" />
      </svg>
      <figcaption>
        <strong>{body.name}</strong> · {Math.round(altitudeKm).toLocaleString('en-US')} km up
        <span className="mv-muted"> (altitude not to scale)</span>
      </figcaption>
    </figure>
  )
}
