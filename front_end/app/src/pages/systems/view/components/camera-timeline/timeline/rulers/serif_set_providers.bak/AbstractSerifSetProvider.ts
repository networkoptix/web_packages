import IDuratedTimeRange from '../../timeRanges/IDuratedTimeRange'
import AnimatedWeightedSerif from '../serifs/AnimatedWeightedSerif'
import AnimatedWeightedRegularIntervalSerif from '../serifs/AnimatedWeightedRegularIntervalSerif'
import AnimatedWeightedIrregularIntervalSerif from '../serifs/AnimatedWeightedIrregularIntervalSerif'


export abstract class AbstractSerifSetProvider {
  constructor (
    protected visibleRange: IDuratedTimeRange,
    protected canvas: HTMLCanvasElement,
  ) {
  }

  public get msPerPx () {
    return this.visibleRange.duration / this.canvas.width
  }

  public get pxPerMs () {
    return this.canvas.width / this.visibleRange.duration
  }

  public abstract getSerifs (): Array<AnimatedWeightedSerif> |
    Array<AnimatedWeightedRegularIntervalSerif> |
    Array<AnimatedWeightedIrregularIntervalSerif>
}

export default AbstractSerifSetProvider
