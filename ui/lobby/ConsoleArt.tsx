import type { Role } from '../../shared'

const paths: Record<Role, string> = {
  'mission-planning': 'M12 36C12 13 52 13 52 36S12 59 12 36M32 8v10M32 46v10M8 32h10M46 32h10M26 38l6-18 6 18-6-3z',
  spacecraft: 'M24 23h16v24H24zM8 25h16v18H8zM40 25h16v18H40zM16 25v18M48 25v18M8 34h16M40 34h16M32 23V12M23 10q9 16 18 0',
  science: 'M26 10h12M30 10v15L16 47q-3 6 4 6h24q7 0 4-6L34 25V10M23 37h18M26 45h1M36 42h1',
  'comms-resources': 'M15 25q0 26 26 26zM28 38l17-17M39 12q13 0 13 13M36 5q23 0 23 23M27 49l-5 8M17 57h20',
}
export function ConsoleArt({ role }: { role: Role }) {
  return <svg className="ls-console-art" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d={paths[role]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
