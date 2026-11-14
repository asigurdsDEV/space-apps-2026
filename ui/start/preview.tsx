import { createRoot } from 'react-dom/client'
import { StartScreen } from './StartScreen'
createRoot(document.getElementById('root')!).render(
  <StartScreen scenarios={[{ scenario_id: 'demo', title: 'First Light', params: { objective_text: 'Bring home science from your first Earth-observing mission within an $8M budget.' } }]}
    onStart={request => { document.getElementById('preview-result')!.textContent = JSON.stringify(request) }} />,
)
const result = document.createElement('output')
result.id = 'preview-result'
result.setAttribute('aria-live', 'polite')
result.style.cssText = 'position:fixed;bottom:0;left:0;background:#fff;color:#000;padding:8px;max-width:100%;overflow-wrap:anywhere'
document.body.append(result)
