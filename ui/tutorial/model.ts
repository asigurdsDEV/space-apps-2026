export const TUTORIAL_STEPS = [
  { id: 'orbit', title: 'Pick an orbit', text: 'Start with where your mission will work. The orbit affects what you can observe, how you communicate, and which launcher can get you there.' },
  { id: 'budgets', title: 'Watch the resource bars', text: 'Choose a spacecraft and instruments, then watch mass, power, cost and downlink change together. A stronger instrument also needs a way to power it and bring its data home.' },
  { id: 'issues', title: 'Fix a red problem', text: 'Read each blocking issue and change the part or choice it names. Red issues prevent launch; warnings let you fly but deserve a look.' },
  { id: 'launch', title: 'Make the GO call', text: 'When there are no blocking issues, review the console calls and launch. The mission results will explain what your design achieved and what you could improve.' },
] as const
export type TutorialStepId = typeof TUTORIAL_STEPS[number]['id']

export const TUTORIAL_STORAGE_KEY = 'space-apps-2026:builder-tips:v1'
type TutorialStorage = Pick<Storage, 'getItem' | 'setItem'>
function browserStorage(): TutorialStorage | undefined {
  try { return globalThis.localStorage } catch { return undefined }
}
export function tutorialDismissed(storage = browserStorage()): boolean {
  try {
    const value = storage?.getItem(TUTORIAL_STORAGE_KEY)
    return value === 'completed' || value === 'skipped'
  } catch { return false }
}
export function rememberTutorial(reason: 'completed' | 'skipped', storage = browserStorage()): boolean {
  if (!storage) return false
  try { storage.setItem(TUTORIAL_STORAGE_KEY, reason); return true } catch { return false }
}
