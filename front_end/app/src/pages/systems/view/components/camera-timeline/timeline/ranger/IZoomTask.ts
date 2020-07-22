import { int, float } from '../basic_types/numbers'

/**
 * IZoomTask is a unifiying helper interface for all possible zoom task variations.
 */
export interface IZoomTask {
  position: float | 'center' | 'left' | 'right',
  steps: number,
  mode: 'fine' | 'screens' | 'max',
}

export default IZoomTask
