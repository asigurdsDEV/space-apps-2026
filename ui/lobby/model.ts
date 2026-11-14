import { ROLES, type Player, type Role } from '../../shared'

export const ROLE_DETAILS: Record<Role, { title: string; description: string }> = {
  'mission-planning': { title: 'Mission planning', description: 'Choose the orbit and launcher. Coordinate launch and mission controls.' },
  spacecraft: { title: 'Spacecraft', description: 'Choose the bus and power systems that keep your mission running.' },
  science: { title: 'Science', description: 'Choose the instruments that turn your mission into discoveries.' },
  'comms-resources': { title: 'Communications & resources', description: 'Choose communications and ground support to bring your science home.' },
}

export function roleChoices(players: readonly Player[], selfId: string) {
  return ROLES.map(role => {
    const owner = players.find(player => player.role === role)
    return { role, ...ROLE_DETAILS[role], owner, mine: owner?.player_id === selfId, taken: !!owner && owner.player_id !== selfId }
  })
}
