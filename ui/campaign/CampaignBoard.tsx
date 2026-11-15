import { useState, type FormEvent } from 'react'
import { playSound } from '../audio'
import { SpaceView } from '../scene3d'
import { readName, rememberName } from '../start/name'
import { canStartMission, funding, MISSIONS, nextMission, type CampaignProgress } from './model'
import './campaign.css'

interface Props {
  progress: CampaignProgress
  persistent: boolean
  onStart: (id: string, name: string) => void
  onFreePlay: () => void
}

export function CampaignBoard({ progress, persistent, onStart, onFreePlay }: Props) {
  const next = nextMission(progress)
  const [selected, setSelected] = useState(next?.id ?? MISSIONS[0]!.id)
  const [name, setName] = useState(readName)
  const mission = MISSIONS.find((m) => m.id === selected)!
  const index = MISSIONS.indexOf(mission)
  const title = mission.config.title.split(':')[0].replace(' (Easy)', '')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const player = name.trim() || 'Mission planner'
    if (player.length > 40 || !canStartMission(progress, selected)) return
    rememberName(player)
    onStart(selected, player)
  }
  return (
    <main className="campaign" aria-labelledby="campaign-title">
      <SpaceView className="campaign-bg" state={{ entities: mission.config.entities, params: mission.config.params }} mode="orbit" showCaption={false} />
      <section className="campaign-route">
        <p className="game-eyebrow">GO / NO-GO · Guided missions · Solo</p>
        <h1 id="campaign-title">Build your space program</h1>
        <p>Complete a mission. Earn the next assignment and a larger budget.</p>
        <p className="game-muted">{progress.length} / {MISSIONS.length} missions complete</p>
        <ol aria-label="Campaign missions">
          {MISSIONS.map(({ id, config }, i) => <li key={id}>
            <button type="button" disabled={!canStartMission(progress, id)} aria-pressed={id === selected} onClick={() => (playSound('click'), setSelected(id))}>
              <span className="campaign-number">0{i + 1}</span>
              <span><strong>{config.title.split(':')[0].replace(' (Easy)', '')}</strong><small>{i < progress.length ? 'Complete · Replay available' : i === progress.length ? 'Funded · Ready to fly' : `Complete mission ${i} to unlock`}</small></span>
              <b>{funding(config.params.budget_usd)}</b>
            </button>
          </li>)}
        </ol>
      </section>
      <form className="game-panel campaign-brief" onSubmit={submit}>
        <p className="game-eyebrow">Assignment 0{index + 1}</p>
        <h2>{title}</h2>
        <p>{mission.config.params.objective_text}</p>
        <dl><div><dt>Mission grant</dt><dd>{funding(mission.config.params.budget_usd)}</dd></div><div><dt>Science target</dt><dd>{mission.config.params.target_science_score} points</dd></div></dl>
        <ol className="campaign-steps"><li>Fit parts and check the resource gauges.</li><li>Get GO at all four consoles, then launch.</li><li>Handle alarms and bring the science home.</li></ol>
        <label htmlFor="campaign-name">Your name</label>
        <input id="campaign-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="nickname" />
        <button type="submit" className="game-button game-button--primary">{index < progress.length ? 'Replay mission' : progress.length ? 'Continue campaign' : 'Start guided mission'}</button>
        <p className="game-muted campaign-save" role="status">{persistent ? 'Progress saves in this browser. Retrying keeps your grant.' : 'Browser storage is unavailable. Progress lasts for this visit.'}</p>
        <button type="button" className="game-button" onClick={onFreePlay}>Free play, Daily &amp; online</button>
      </form>
    </main>
  )
}

export function CampaignResult({ missionId, success, onContinue, onBoard }: {
  missionId: string; success: boolean; onContinue?: (id: string) => void; onBoard: () => void
}) {
  const index = MISSIONS.findIndex((m) => m.id === missionId)
  const mission = MISSIONS[index]
  if (!mission) return null
  const next = MISSIONS[index + 1]
  return <section className="campaign-result" aria-label="Campaign funding">
    <p className="game-eyebrow">{success ? next ? 'Next grant approved' : 'Space program complete' : 'Your funding is kept'}</p>
    <p>{success ? next ? `${next.config.title.split(':')[0]} unlocked. Your next mission budget is ${funding(next.config.params.budget_usd)}.` : 'Earth, Moon and Mars complete. Replay any assignment from the mission board.' : `Try again with the same ${funding(mission.config.params.budget_usd)} grant. Check the debrief’s suggested fix.`}</p>
    <p className="game-muted">Each assignment has a fixed grant. Replays do not stack extra money.</p>
    {onContinue && (!success || next) && <button type="button" className="game-button game-button--primary" onClick={() => onContinue(success ? next!.id : mission.id)}>{success ? 'Continue to next mission' : 'Retry guided mission'}</button>}
    <button type="button" className="game-button" onClick={onBoard}>Mission board</button>
  </section>
}
