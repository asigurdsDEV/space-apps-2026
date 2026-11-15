import { describe, expect, it } from 'vitest'
import { init } from '../../sim'
import { demoConfig, fixtureDatasets, goodDesign } from '../../sim/testing/fixtures'
import { engineeringReport } from './report'

function flown(params: Record<string, string | number | boolean>) {
  return init({ ...demoConfig, params: { ...demoConfig.params, ...goodDesign, random_failures: false, ...params } }, fixtureDatasets)
}

describe('engineering report', () => {
  it('does not fail the reference design', () => {
    const report = engineeringReport(flown({}))
    expect(report.rows.filter((row) => row.status === 'red')).toEqual([])
    expect(report.ready).toBe(true)
    expect(report.readiness).toBeGreaterThanOrEqual(80)
  })

  it('names the missing payload instead of a vague fault', () => {
    const report = engineeringReport(flown({ instruments: '' }))
    const payload = report.rows.find((row) => row.id === 'payload')
    expect(report.ready).toBe(false)
    expect(payload?.status).toBe('red')
    expect(payload?.detail.toLowerCase()).toContain('instrument')
  })

  it('marks a power source that is not in the catalog', () => {
    const report = engineeringReport(flown({ solar: 'not-a-panel' }))
    expect(report.rows.find((row) => row.id === 'solar')?.status).toBe('red')
    expect(report.ready).toBe(false)
  })
})
