// Preview-only theme selector; the app owns theme preference.
import { createRoot } from 'react-dom/client'
import { scenarios, getScenario, DIFFICULTIES } from '../../data'
import { StartScreen } from './StartScreen'
import '../theme/theme.css'
createRoot(document.getElementById('root')!).render(
  <StartScreen scenarios={scenarios} scenarioPreview={getScenario}
    difficultyLabels={{ easy: DIFFICULTIES.easy.label, normal: DIFFICULTIES.normal.label, hard: DIFFICULTIES.hard.label }}
    onStart={request => { document.getElementById('preview-result')!.textContent = JSON.stringify(request) }} />,
)
const result = document.createElement('output')
result.id = 'preview-result'
result.setAttribute('aria-live', 'polite')
result.style.cssText = 'position:fixed;bottom:0;left:0;background:var(--game-panel);color:var(--game-text);padding:8px;max-width:100%;overflow-wrap:anywhere'
document.body.append(result)

const themeLabel = document.createElement('label')
themeLabel.style.cssText = 'display:block;padding:12px;background:var(--game-panel);color:var(--game-text)'
themeLabel.textContent = 'Preview theme '
const themeSelect = document.createElement('select')
for (const mode of ['dark', 'light']) { const option = document.createElement('option'); option.value = mode; option.textContent = mode; themeSelect.append(option) }
themeSelect.onchange = () => { document.documentElement.dataset.theme = themeSelect.value }
document.documentElement.dataset.theme = 'dark'
themeLabel.append(themeSelect)
document.body.prepend(themeLabel)
