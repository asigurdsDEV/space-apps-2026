import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AnomalyScene, ArrivalScene, EndingScene, OrbitArrivalScene, type CutsceneSceneId } from './index'

const ORDER: Array<{ id: string; scene: CutsceneSceneId; body?: 'moon' | 'mars' }> = [
  { id: 'arrival', scene: 'arrival' },
  { id: 'orbit moon', scene: 'orbit', body: 'moon' },
  { id: 'orbit mars', scene: 'orbit', body: 'mars' },
  { id: 'anomaly', scene: 'anomaly' },
  { id: 'ending success', scene: 'ending-success' },
  { id: 'ending loss', scene: 'ending-loss' },
]

function Preview() {
  const [pick, setPick] = useState(ORDER[0]!)
  const [run, setRun] = useState(0)
  const play = (next: (typeof ORDER)[number]) => {
    setPick(next)
    setRun((n) => n + 1)
  }
  return (
    <main>
      <div style={{ position: 'fixed', inset: 0 }}>
        {pick.scene === 'arrival' && <ArrivalScene key={run} />}
        {pick.scene === 'orbit' && <OrbitArrivalScene key={run} body={pick.body ?? 'moon'} />}
        {pick.scene === 'anomaly' && <AnomalyScene key={run} />}
        {pick.scene === 'ending-success' && <EndingScene key={run} outcome="success" />}
        {pick.scene === 'ending-loss' && <EndingScene key={run} outcome="loss" />}
      </div>
      <nav style={{ position: 'fixed', left: 12, bottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, zIndex: 2 }}>
        {ORDER.map((scene) => (
          <button key={scene.id} type="button" onClick={() => play(scene)} style={{ minHeight: 44, padding: '0 12px' }}>
            {scene.id}
          </button>
        ))}
      </nav>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
