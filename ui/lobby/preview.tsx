import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Player } from '../../shared'
import { LobbyScreen } from './LobbyScreen'
function Preview() {
  const [players, setPlayers] = useState<Player[]>([
    { player_id: 'host', name: 'Jamie', role: null, is_host: true },
    { player_id: 'guest', name: 'Ethan', role: 'spacecraft', is_host: false },
  ])
  const [message, setMessage] = useState('')
  const [guest, setGuest] = useState(false)
  const me = players.find(player => player.player_id === (guest ? 'guest' : 'host'))!
  return <>
    <div style={{ background: '#141b33', color: '#fff', padding: 12 }}><label><input type="checkbox" checked={guest} onChange={event => setGuest(event.target.checked)} />Preview guest view</label></div>
    <LobbyScreen code="peer-AbC-123" players={players} me={me}
      onClaimRole={role => setPlayers(current => current.map(player => player.player_id === me.player_id ? { ...player, role } : player))}
      onContinue={() => setMessage('Continue to briefing requested')} onLeave={() => setMessage('Leave room requested')} />
    <output aria-live="polite" style={{ position: 'fixed', bottom: 0, background: '#fff', color: '#000', padding: 8 }}>{message}</output>
  </>
}
createRoot(document.getElementById('root')!).render(<Preview />)
