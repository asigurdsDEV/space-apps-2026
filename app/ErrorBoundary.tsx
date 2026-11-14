// Crash safety for judging (claude@aiden, taken over from claude@ethan's board task):
// if a screen throws while rendering, show a calm message with a way out instead of a white page.
import { Component, type ErrorInfo, type ReactNode } from 'react'

export interface CrashAction {
  label: string
  run: () => void
}

/** The full-page message shown instead of a crashed screen. */
export function CrashScreen({ actions }: { actions: CrashAction[] }) {
  return (
    <main className="app-closed">
      <div className="game-panel">
        <h1>Something went wrong</h1>
        <p role="alert">This screen hit a bug. The rest of the game still works.</p>
        <div className="app-crash-actions">
          {actions.map((a, i) => (
            <button key={a.label} type="button" className={`game-button${i === 0 ? ' game-button--primary' : ''}`} onClick={a.run}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

interface Props {
  /** First one is the main way out. Each action also clears the error so the screen can render again. */
  actions: CrashAction[]
  /** When this changes (a new screen), the boundary forgets an old error. */
  resetKey?: unknown
  children: ReactNode
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A screen crashed:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    const actions = this.props.actions.map((a) => ({
      label: a.label,
      run: () => {
        this.setState({ error: null })
        a.run()
      },
    }))
    return <CrashScreen actions={actions} />
  }
}
