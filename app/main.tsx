import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Placeholder screen. The app loop (init/step per CONTRACTS.md) and ui/ components replace this.
function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Space Mission Design Game</h1>
      <p>Scaffold is running. Build the sim in <code>sim/</code>, the screens in <code>ui/</code>, and the data in <code>data/</code>.</p>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
