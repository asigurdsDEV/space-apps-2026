import type { Decision, Entity } from '../../shared'

export interface InspectionHelp { title: string; text: string }

/** Reuse the catalog's explanation; the short in-world label need not carry all the science. */
export function partHelp(part: Entity | undefined): InspectionHelp | undefined {
  if (!part) return undefined
  return {
    title: part.name,
    text: typeof part.props.description === 'string' ? part.props.description : 'Check the resource gauges before fitting this part.',
  }
}

export function flightHelp(id: string | undefined, decision: Decision | null): InspectionHelp | undefined {
  if (id === 'pause') return { title: 'Mission clock', text: 'Pause to inspect your spacecraft. Resume when you are ready to keep collecting science.' }
  if (id === 'speed') return { title: 'Time speed', text: 'Cycle through 1×, 5×, 20× and 60×. An alarm stops mission time until your crew makes a choice.' }
  const option = decision?.options.find((o) => id === `option:${decision.decision_id}:${o.id}`)
  if (option) return { title: option.label, text: option.effect_text }
  return undefined
}
