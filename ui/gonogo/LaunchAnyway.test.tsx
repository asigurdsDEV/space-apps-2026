import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Issue } from '../../shared'
import { LaunchAnyway } from './LaunchAnyway'
import { launchAnywayQuestion } from './model'

const issue = (code: string, severity: Issue['severity'], resource = 'design'): Issue => ({ code, severity, resource, message: code })

describe('launch anyway', () => {
  it('asks with the console and the problem that will decide the flight', () => {
    expect(launchAnywayQuestion([issue('mass_over_limit', 'error', 'mass')])).toBe('PLAN says NO-GO: Too heavy for the rocket. Launch anyway?')
    expect(launchAnywayQuestion([issue('power_negative', 'error', 'power'), issue('delta_v_short', 'error')])).toBe('SPACECRAFT says NO-GO: Not enough power to survive. Launch anyway?')
  })

  it('offers nothing when all is GO, or when a problem means nothing could launch', () => {
    expect(launchAnywayQuestion([])).toBeNull()
    expect(launchAnywayQuestion([issue('downlink_short', 'warning', 'comms')])).toBeNull()
    expect(launchAnywayQuestion([issue('mass_over_limit', 'error', 'mass'), issue('over_budget', 'error', 'budget')])).toBeNull()
    expect(launchAnywayQuestion([issue('missing_bus', 'error')])).toBeNull()
  })

  it('shows one secondary control, and none without a NO-GO it can overrule', () => {
    expect(renderToStaticMarkup(<LaunchAnyway issues={[issue('mass_over_limit', 'error', 'mass')]} onLaunch={() => {}} />)).toMatch(/<button[^>]*>Launch anyway<\/button>/)
    expect(renderToStaticMarkup(<LaunchAnyway issues={[issue('over_budget', 'error', 'budget')]} onLaunch={() => {}} />)).toBe('')
  })
})
