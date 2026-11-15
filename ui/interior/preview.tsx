// Preview: npm run dev, then /ui/interior/preview.html. Query: scenario=demo|moon|mars (the world outside),
// card=spacecraft|comms-resources|science|mission-planning (an anomaly card at that console), days=<sim days flown>.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getDatasets, getScenario } from '../../data'
import { CARDS, init, step } from '../../sim'
import type { Decision } from '../../shared'
import '../theme/theme.css'
import { SpacecraftRoom } from './index'

const q = new URLSearchParams(location.search)
const config = getScenario(q.get('scenario') ?? 'demo')!
let flown = step(init(config, getDatasets(config.datasets)), [{ type: 'launch', payload: {} }], 1).state
for (let i = 0; i < Number(q.get('days') ?? 4) * 24; i++) flown = step(flown, [], 3600).state
const card = CARDS.find((c) => c.console === q.get('card'))
const decision: Decision | null = card ? { decision_id: 'preview', card_id: card.id, title: card.title, body: card.body, console: card.console, options: card.options.map(({ id, label, effect_text }) => ({ id, label, effect_text })) } : null

function Preview() {
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [open, setOpen] = useState(decision)
  return (
    <div className="game-theme" data-theme="dark" style={{ position: 'fixed', inset: 0, display: 'grid' }}>
      <SpacecraftRoom state={flown} paused={paused} speed={speed} decision={open} send={(c) => {
        if (c.type === 'pause' || c.type === 'resume') setPaused(c.type === 'pause')
        if (c.type === 'set_speed') setSpeed(c.payload.multiplier)
        if (c.type === 'resolve_decision') setOpen(null)
      }} />
    </div>
  )
}

// The game has loaded its font long before this room; here, wait for it so plates are printed in it.
addEventListener('load', () => void Promise.all([400, 500].map((w) => document.fonts.load(`${w} 32px "Inter Tight"`))).finally(() => createRoot(document.getElementById('root')!).render(<Preview />)))
