import { createRoot } from 'react-dom/client'
import { BuilderTutorial } from './BuilderTutorial'
import { TUTORIAL_STEPS, TUTORIAL_STORAGE_KEY } from './model'
import '../theme/theme.css'

createRoot(document.getElementById('root')!).render(
  <main className="preview">
    <h1>Builder tips preview</h1>
    <p>These are demonstration targets, not a mission simulation.</p>
    <p><button className="game-button" onClick={() => { try { localStorage.removeItem(TUTORIAL_STORAGE_KEY) } catch { /* Preview can still reload. */ } location.reload() }}>Replay tips (preview only)</button></p>
    <BuilderTutorial onShowStep={step => {
      const target = document.getElementById(`preview-${step}`)
      target?.focus(); target?.scrollIntoView({ block: 'center' })
    }} />
    {TUTORIAL_STEPS.map(step => <section key={step.id} id={`preview-${step.id}`} className="preview-target" tabIndex={-1} aria-label={step.title}><h2>{step.title}</h2></section>)}
  </main>,
)
