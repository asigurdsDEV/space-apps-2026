import { afterEach, expect, it, vi } from 'vitest'
import { readCampaign, saveCampaign } from './storage'

afterEach(() => vi.unstubAllGlobals())
it('saves unlocks across reloads without lowering progress earned by another tab', () => {
  let raw: string | null = null
  vi.stubGlobal('localStorage', { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value } })
  expect(readCampaign()).toEqual([])
  expect(saveCampaign(['demo'])).toBe(true)
  expect(readCampaign()).toEqual(['demo'])
  saveCampaign([])
  expect(readCampaign()).toEqual(['demo'])
  raw = '{broken'
  expect(readCampaign()).toEqual([])
})
it('keeps play available when storage is blocked or full', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw Error('blocked') }, setItem: () => { throw Error('quota') } })
  expect(readCampaign()).toEqual([])
  expect(saveCampaign(['demo'])).toBe(false)
})
