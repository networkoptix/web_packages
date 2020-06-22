import AbstractSerifSetProvider from './AbstractSerifSetProvider'
import WeightedSerif from '../serifs/WeightedSerif'


export class DegenerateSerifProvider extends AbstractSerifSetProvider {
  public getSerifs (): Array<WeightedSerif> {
    return [
      {
        weight: 1,
        when: this.visibleRange.startTime
      },
      {
        weight: 1,
        when: this.visibleRange.startTime + this.visibleRange.duration / 3
      },
      {
        weight: 1,
        when: this.visibleRange.endTime - this.visibleRange.duration / 3
      },
      {
        weight: 1,
        when: this.visibleRange.endTime
      }
    ]
  }
}

export default DegenerateSerifProvider
