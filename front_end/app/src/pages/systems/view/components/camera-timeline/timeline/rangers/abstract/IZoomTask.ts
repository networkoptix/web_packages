import { float } from '../../numberTypeAliases';

export interface IZoomTask {
  position: float | 'center' | 'left' | 'right',
  steps: number,
  mode: 'fine' | 'screens' | 'max',
}

export default IZoomTask
