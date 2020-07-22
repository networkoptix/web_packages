/**
 * IScrollTask is a unifiying helper interface for all possible scroll task variations.
 */
export interface IScrollTask {
  mode: 'fine' | 'screens' | 'max',
  steps: number,
}

export default IScrollTask
