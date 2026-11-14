// First-person controls (decision 007). No three.js import at runtime: the place brings its own camera.
import './fps.css'
export { createFps, type Fps, type FpsOptions } from './controller'
export { FpsPrompt, type FpsPromptProps } from './Prompt'
export { aimAt, EYE, lookDir, REACH, step, type Interactable, type Obstacle, type Vec3 } from './model'
