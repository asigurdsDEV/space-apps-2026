import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { CampaignBoard, CampaignResult } from './CampaignBoard'

it('shows the funded mission, locks later grants and explains persistence without hiding free play', () => {
  const html = renderToStaticMarkup(<CampaignBoard progress={[]} persistent onStart={() => {}} onFreePlay={() => {}} />)
  expect(html).toContain('Start guided mission')
  expect(html).toContain('$12M')
  expect(html.match(/disabled=""/g)).toHaveLength(2)
  expect(html).toContain('Free play, Daily &amp; online')
  const ready = renderToStaticMarkup(<CampaignBoard progress={['demo']} persistent={false} onStart={() => {}} onFreePlay={() => {}} />)
  expect(ready).toContain('Continue campaign')
  expect(ready).toContain('Progress lasts for this visit')
  expect(ready.match(/disabled=""/g)).toHaveLength(1)
})
it('awards the next grant on success and keeps the same grant on a retry', () => {
  const props = { missionId: 'demo', onContinue: () => {}, onBoard: () => {} }
  const won = renderToStaticMarkup(<CampaignResult {...props} success />)
  expect(won).toContain('Moon Mapper unlocked')
  expect(won).toContain('$300M')
  expect(won).toContain('Continue to next mission')
  const lost = renderToStaticMarkup(<CampaignResult {...props} success={false} />)
  expect(lost).toContain('same $12M grant')
  expect(lost).not.toContain('Moon Mapper unlocked')
  const done = renderToStaticMarkup(<CampaignResult {...props} missionId="mars" success />)
  expect(done).toContain('Space program complete')
  expect(done).not.toContain('Continue to next mission')
})
