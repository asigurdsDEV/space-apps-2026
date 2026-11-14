// Preview-only theme selector; the app owns theme preference.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Player } from '../../shared'
import { LobbyScreen } from './LobbyScreen'
import '../theme/theme.css'
function Preview() {
  const [players, setPlayers] = useState<Player[]>([
    { player_id: 'host', name: 'Jamie', role: null, is_host: true },
    { player_id: 'guest', name: 'Ethan', role: 'spacecraft', is_host: false },
  ])
  const [message, setMessage] = useState('')
  const [guest, setGuest] = useState(false)
  const me = players.find(player => player.player_id === (guest ? 'guest' : 'host'))!
  return <>
    <div style={{ background: 'var(--game-panel)', color: 'var(--game-text)', padding: 12 }}><label><input type="checkbox" checked={guest} onChange={event => setGuest(event.target.checked)} />Preview guest view</label></div>
    <LobbyScreen code="peer-AbC-123" players={players} me={me}
      onClaimRole={role => setPlayers(current => current.map(player => player.player_id === me.player_id ? { ...player, role } : player))}
      onContinue={() => setMessage('Continue to briefing requested')} onLeave={() => setMessage('Leave room requested')} />
    <output aria-live="polite" style={{ position: 'fixed', bottom: 0, background: 'var(--game-panel)', color: 'var(--game-text)', padding: 8 }}>{message}</output>
  </>
}
createRoot(document.getElementById('root')!).render(<Preview />)

const themeLabel = document.createElement('label')
themeLabel.style.cssText = 'display:block;padding:12px;background:var(--game-panel);color:var(--game-text)'
themeLabel.textContent = 'Preview theme '
const themeSelect = document.createElement('select')
for (const mode of ['dark', 'light']) { const option = document.createElement('option'); option.value = mode; option.textContent = mode; themeSelect.append(option) }
themeSelect.onchange = () => { document.documentElement.dataset.theme = themeSelect.value }
document.documentElement.dataset.theme = 'dark'
themeLabel.append(themeSelect)
document.body.prepend(themeLabel)
