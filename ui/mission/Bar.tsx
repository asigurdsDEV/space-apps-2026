import type { ReactNode } from 'react'
import { fillShare, type Tone } from './format'

export interface BarProps {
  label: string
  value: number
  /** 0 or less = no limit: the bar stays empty and only the text shows. */
  max: number
  /** Text on the right, e.g. "1,200 / 3,000". */
  detail: ReactNode
  tone?: Tone
}

/** A labelled progress bar. */
export function Bar({ label, value, max, detail, tone = 'info' }: BarProps) {
  const share = fillShare(value, max)
  return (
    <div className={`mv-bar mv-tone-${tone}`}>
      <div className="mv-bar__head">
        <span>{label}</span>
        <span className="mv-bar__detail">{detail}</span>
      </div>
      <div
        className="mv-bar__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(share * 100)}
      >
        <div className="mv-bar__fill" style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  )
}
