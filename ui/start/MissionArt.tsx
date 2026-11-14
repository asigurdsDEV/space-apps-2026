import { useId } from 'react'

const destinations: Record<string, { name: string; color: string; light: string; label: string }> = {
  demo: { name: 'Earth', color: '#287fa6', light: '#8bf0de', label: 'Observe our home' },
  moon: { name: 'Moon', color: '#6f7e99', light: '#e9e9db', label: 'Map a new frontier' },
  mars: { name: 'Mars', color: '#ab4c32', light: '#ffc08c', label: 'Read the red planet' },
}

/** An illustrative mission patch, not a simulated orbit or NASA photograph. */
export function MissionArt({ scenarioId }: { scenarioId: string }) {
  const id = useId()
  const target = destinations[scenarioId]
  const color = target?.color ?? '#485a9d'
  const light = target?.light ?? '#abbcff'
  return <figure className="ss-art">
    <svg viewBox="0 0 560 370" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-glow`}><stop stopColor={light} stopOpacity=".2" /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-planet`} cx="30%" cy="24%" r="80%"><stop stopColor={light} /><stop offset=".45" stopColor={color} /><stop offset="1" stopColor="#0b172c" /></radialGradient>
        <clipPath id={`${id}-clip`}><circle cx="280" cy="185" r="100" /></clipPath>
        <pattern id={`${id}-solar`} width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#245278" /><path d="M0 0H12V12" fill="none" stroke="#86d9ed" strokeWidth=".7" /></pattern>
      </defs>
      <circle cx="280" cy="185" r="180" fill={`url(#${id}-glow)`} />
      <g fill="#c3d6ef">{[[34,53],[92,172],[142,32],[197,304],[352,39],[451,90],[514,239],[463,315],[52,286],[407,258],[330,330]].map(([x,y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} opacity={i % 2 ? .35 : .7} />)}</g>
      <g fill="none" stroke="#779dbb" opacity=".22"><circle cx="280" cy="185" r="143" strokeDasharray="2 8" /><path d="M280 20V350M70 185H490" strokeDasharray="4 8" /></g>
      <ellipse cx="280" cy="185" rx="228" ry="65" transform="rotate(-24 280 185)" fill="none" stroke="#7dbbcd" strokeOpacity=".35" />
      <circle cx="280" cy="185" r="102" fill="none" stroke={light} strokeOpacity=".35" />
      <circle cx="280" cy="185" r="100" fill={`url(#${id}-planet)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {scenarioId === 'demo' && <>
          <path d="M196 108l30-8 22 16-4 20 25 7 2 20-24 8-3 24-23 4-13-22-21-4-8-35zM270 200l29-9 19 16-5 23-20 31-13-11-3-24-13-10zM323 103l51 5 22 41-20 9-17-13-27 9-18-20z" fill="#a8dec2" opacity=".6" />
          <path d="M180 154q57-29 100-15t95-5M216 249q65 20 132-11M231 106q40-12 73 4" fill="none" stroke="#e5f7f5" strokeWidth="7" strokeLinecap="round" opacity=".35" />
        </>}
        {scenarioId === 'moon' && <g fill="#344158" opacity=".4">{[[238,150,23],[317,203,31],[268,247,12],[333,126,13],[208,210,10],[286,113,8]].map(([cx,cy,r], i) => <circle key={i} cx={cx} cy={cy} r={r} stroke="#dce2eb" strokeOpacity=".5" strokeWidth="2" />)}</g>}
        {scenarioId === 'mars' && <>
          <path d="M180 164q62-31 115 0t100 10l-8 32q-62 15-100-6t-110-5zM220 229l40-6 31 13 30-5 23 11-34 20-51-9z" fill="#6f342c" opacity=".38" />
          <ellipse cx="267" cy="89" rx="37" ry="17" fill="#f4e3cd" opacity=".8" />
        </>}
      </g>
      <path d="M72 243q42 62 207 4t206-118" fill="none" stroke="#a6efdc" strokeWidth="1.5" strokeDasharray="4 5" opacity=".7" />
      <g transform="translate(420 122) rotate(-24)">
        <path d="M-62 0H62" stroke="#d2e2ec" strokeWidth="3" />
        <rect x="-68" y="-21" width="46" height="42" rx="2" fill={`url(#${id}-solar)`} stroke="#8cd6e5" />
        <rect x="22" y="-21" width="46" height="42" rx="2" fill={`url(#${id}-solar)`} stroke="#8cd6e5" />
        <path d="M-17-20H10L20-9V20H-17Z" fill="#edc67b" stroke="#ffe8ba" strokeWidth="2" />
        <path d="M10-20V-9H20M-17 6H20" fill="none" stroke="#82652e" />
        <circle cx="1" cy="1" r="7" fill="#1b344c" stroke="#ffe3ac" />
        <path d="M0-20V-36M-12-36Q0-20 12-36Z" fill="#dfebf2" stroke="#c9d9e8" />
      </g>
      <g fill="none" stroke="#a6efdc" opacity=".45"><path d="M436 85q20-14 43-10M443 73q21-14 43-8" /><path d="M132 282h43l20-25" /></g>
      <circle cx="132" cy="282" r="3" fill="#a6efdc" />
      <text x="70" y="305" fill="#b4c8dc" fontFamily="monospace" fontSize="10" letterSpacing="2">SCIENCE → EARTH</text>
    </svg>
    <figcaption><span><b>{target?.name ?? 'Deep space'}</b>{target?.label ?? 'Design your next discovery'}</span><small>Mission concept<br />Not to scale</small></figcaption>
  </figure>
}
