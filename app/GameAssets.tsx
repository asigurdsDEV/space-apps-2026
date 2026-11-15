import { useEffect, useRef, useState, type ReactNode } from 'react'
import { prepareGame, type AssetProgress } from './assets-download'
import { hasWebGL } from './Walk'
import './assets-download.css'

const WORLD_3D = typeof location !== 'undefined' && new URLSearchParams(location.search).get('world') !== 'classic' && hasWebGL()

export function GameAssets({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [progress, setProgress] = useState<AssetProgress>({ completed: 0, total: 0, phase: 'download' })
  const controller = useRef<AbortController | null>(null)
  const continueButton = useRef<HTMLButtonElement>(null)
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => { if (status === 'ready') continueButton.current?.focus() }, [status])

  const download = async () => {
    const job = new AbortController()
    controller.current = job
    setStatus('loading')
    setProgress({ completed: 0, total: 0, phase: 'download' })
    try {
      await prepareGame(job.signal, setProgress)
      setStatus('ready')
    } catch {
      if (job.signal.aborted) return
      job.abort()
      setStatus('error')
    }
  }

  if (!WORLD_3D || entered) return children
  const ready = status === 'ready'
  const percent = ready ? 100 : Math.floor(progress.completed / (progress.total + 1) * 100)
  return (
    <main className="game-theme ga-page" data-theme="dark">
      <section className="game-panel ga-card" aria-labelledby="ga-title">
        <p className="game-eyebrow">GO / NO-GO · Flight preparation</p>
        <h1 id="ga-title">Prepare your mission</h1>
        <p>Download the spacecraft, rooms and cutscenes before you play.</p>
        <p className="game-muted">Saved files are reused next time. You stay in control of when the game starts.</p>
        <div className="ga-progress" aria-busy={status === 'loading'}>
          <label htmlFor="ga-download">{ready ? 'Ready to play' : status === 'loading' ? progress.phase === 'prepare' ? 'Preparing 3D models' : 'Downloading game files' : 'Game download'} <span>{percent}%</span></label>
          <progress id="ga-download" max={100} value={percent} />
          <p role="status">{progress.total > 0 ? `${progress.completed} / ${progress.total} files checked` : 'Cached files count toward your download.'}</p>
        </div>
        {status === 'error' && <p role="alert">Download interrupted. Check your connection and try again. Completed files will be reused.</p>}
        {!ready && <button type="button" className="game-button ga-primary" disabled={status === 'loading'} onClick={download}>{status === 'error' ? 'Retry download' : status === 'loading' ? 'Downloading…' : 'Download game'}</button>}
        <button ref={continueButton} type="button" className="game-button" disabled={!ready} onClick={() => setEntered(true)}>Continue to game</button>
        <p className="ga-controls"><kbd>W A S D</kbd> walk · mouse / arrows look · <kbd>E</kbd> interact · <kbd>Esc</kbd> menu<br />Look at a part or alarm choice to see what it does.</p>
      </section>
    </main>
  )
}
