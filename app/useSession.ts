import { useSyncExternalStore } from 'react'
import type { Session, SessionSnapshot } from './session'

/** Re-renders the component whenever the session's snapshot changes. */
export function useSession(session: Session): SessionSnapshot {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
}
