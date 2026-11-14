import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LocalLeaderboard } from '../index'

function Preview() {
  const [scenario, setScenario] = useState('preview-earth')
  const [score, setScore] = useState('60')
  const [bus, setBus] = useState('cubesat-6u')
  const [daily, setDaily] = useState('')
  const [stars, setStars] = useState('1')
  const [run, setRun] = useState<{ scenarioId: string; score: number; bus: string; dailySeed?: number; stars: number }>({ scenarioId: 'preview-earth', score: 60, bus: 'cubesat-6u', stars: 1 })
  return (
    <main className="game-theme" style={{ minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 600, margin: 'auto' }}>
        <h1>Personal best preview</h1>
        <p className="game-muted">Sample results only. Switch daily missions and save different scores/designs/stars, then reload to check persistence. Stars here are supplied test values.</p>
        <form className="game-panel" style={{ marginBottom: 24 }} onSubmit={(event) => {
          event.preventDefault()
          setRun({ scenarioId: scenario, score: Number(score), bus, dailySeed: daily ? Number(daily) : undefined, stars: Number(stars) })
        }}>
          <label>Scenario<select className="game-field" value={scenario} onChange={(event) => setScenario(event.target.value)}><option value="preview-earth">Earth</option><option value="preview-moon">Moon</option></select></label>
          <label>Record scope<select className="game-field" value={daily} onChange={(event) => setDaily(event.target.value)}><option value="">Regular mission</option><option value="20261114">Daily 2026-11-14</option><option value="20261115">Daily 2026-11-15</option></select></label>
          <label>Score<input className="game-field" type="number" required min="0" max="100" value={score} onChange={(event) => setScore(event.target.value)} /></label>
          <label>Stars<select className="game-field" value={stars} onChange={(event) => setStars(event.target.value)}>{[0, 1, 2, 3].map((count) => <option key={count}>{count}</option>)}</select></label>
          <label>Bus<select className="game-field" value={bus} onChange={(event) => setBus(event.target.value)}><option>cubesat-6u</option><option>cubesat-12u</option></select></label>
          <button className="game-button game-button--primary" style={{ marginTop: 16 }}>Save sample result</button>
        </form>
        <LocalLeaderboard scenarioId={run.scenarioId} summary={{ score: run.score }} design={{ bus: run.bus }} dailySeed={run.dailySeed} stars={run.stars} />
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
