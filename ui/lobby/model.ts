import { ROLES, type Player, type Role } from '../../shared'

export const ROLE_DETAILS: Record<Role, { title: string; description: string }> = {
  'mission-planning': { title: 'Mission planning', description: 'Choose the orbit and launcher. Coordinate launch and mission controls.' },
  spacecraft: { title: 'Spacecraft', description: 'Choose the bus and power systems that keep your mission running.' },
  science: { title: 'Science', description: 'Choose the instruments that turn your mission into discoveries.' },
  'comms-resources': { title: 'Communications & resources', description: 'Choose communications and ground support to bring your science home.' },
}

/** True when the room has someone in it and every one of them holds a role. */
export function crewReady(players: readonly Pick<Player, 'role'>[]): boolean {
  return players.length > 0 && players.every((player) => player.role !== null)
}

/** Why the host can't start yet ("Waiting for Sam to pick a role"), or null once everyone has picked. */
export function waitingForRoles(players: readonly Pick<Player, 'name' | 'role'>[]): string | null {
  const names = players.filter((player) => player.role === null).map((player) => player.name)
  if (!names.length) return null
  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return `Waiting for ${who} to pick a role`
}

export function roleChoices(players: readonly Player[], selfId: string) {
  return ROLES.map(role => {
    const owner = players.find(player => player.role === role)
    return { role, ...ROLE_DETAILS[role], owner, mine: owner?.player_id === selfId, taken: !!owner && owner.player_id !== selfId }
  })
}
