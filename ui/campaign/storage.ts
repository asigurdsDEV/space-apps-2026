import { validProgress, type CampaignProgress } from './model'

const KEY = 'space-apps-2026:campaign:v1'

export function readCampaign(): CampaignProgress {
  try { return validProgress(JSON.parse(globalThis.localStorage.getItem(KEY) ?? '[]')) }
  catch { return [] }
}

/** Storage is optional: a denied/quota-limited browser can still finish this visit. */
export function saveCampaign(progress: CampaignProgress): boolean {
  try {
    // Another tab may already have earned a later assignment; never lower its progress.
    if (readCampaign().length <= progress.length) globalThis.localStorage.setItem(KEY, JSON.stringify(progress))
    return true
  }
  catch { return false }
}
