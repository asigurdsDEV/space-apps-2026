// Dev-only: npm run dev, then open /ui/intercept/preview.html
import { createRoot } from 'react-dom/client'
import { getDatasets, getScenario } from '../../data'
import { catalogEntities } from '../../sim/parts'
import { InterceptView } from './InterceptView'

const sandbox = getScenario('sandbox')!
const entities = [...sandbox.entities, ...catalogEntities(getDatasets(sandbox.datasets))]

createRoot(document.getElementById('root')!).render(
  <InterceptView
    className="preview-full"
    state={{ entities, params: sandbox.params }}
    onDesign={() => {}}
  />,
)
