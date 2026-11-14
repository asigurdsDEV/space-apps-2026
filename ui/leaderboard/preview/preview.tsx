import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LocalLeaderboard } from '../index'

function Preview() {
  const [scenario, setScenario] = useState('preview-earth')
  const [score, setScore] = useState('60')
  const [bus, setBus] = useState('cubesat-6u')
  const [run, setRun] = useState({ scenarioId: 'preview-earth', score: 60, bus: 'cubesat-6u' })
  return (
    <main className="game-theme" style={{ minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 600, margin: 'auto' }}>
        <h1>Personal best preview</h1>
        <p className="game-muted">Sample results only. Save a higher/lower score, switch scenarios, then reload to check persistence.</p>
        <form className="game-panel" style={{ marginBottom: 24 }} onSubmit={(event) => {
          event.preventDefault()
          setRun({ scenarioId: scenario, score: Number(score), bus })
        }}>
          <label>Scenario<select className="game-field" value={scenario} onChange={(event) => setScenario(event.target.value)}><option value="preview-earth">Earth</option><option value="preview-moon">Moon</option></select></label>
          <label>Score<input className="game-field" type="number" required min="0" max="100" value={score} onChange={(event) => setScore(event.target.value)} /></label>
          <label>Bus<select className="game-field" value={bus} onChange={(event) => setBus(event.target.value)}><option>cubesat-6u</option><option>cubesat-12u</option></select></label>
          <button className="game-button game-button--primary" style={{ marginTop: 16 }}>Save sample result</button>
        </form>
        <LocalLeaderboard scenarioId={run.scenarioId} summary={{ score: run.score }} design={{ bus: run.bus }} />
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
