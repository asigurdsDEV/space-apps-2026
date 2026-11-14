export const NAME_KEY = 'space-apps-2026:player-name:v1'
export const DEFAULT_NAME = 'Mission planner'

function storage(): Storage | undefined {
  try { return globalThis.localStorage } catch { return undefined }
}
export function readName(store: Pick<Storage, 'getItem'> | undefined = storage()): string {
  try {
    const name = store?.getItem(NAME_KEY)?.trim()
    return name && name.length <= 40 ? name : DEFAULT_NAME
  } catch { return DEFAULT_NAME }
}
export function rememberName(name: string, store: Pick<Storage, 'setItem'> | undefined = storage()): void {
  try { store?.setItem(NAME_KEY, name) } catch { /* A blocked preference must never block play. */ }
}
