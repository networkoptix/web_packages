import ITimeRange from '../time_range/ITimeRange'
import AbstractIntervalSetProvider from './interval_set_providers/AbstractIntervalSetProvider'

import CanvasIrregularLenghtMultipleWeightsIntervalSetProvider from './interval_set_providers/canvas/CanvasIrregularLenghtMultipleWeightsIntervalSetProvider'

import IrregularLengthIntervalSetExpander from './interval_set_expanders/IrregularLengthIntervalSetExpander'

import AbstractRuler from './AbstractRuler'
import AbstractIntervalSetExpander from './interval_set_expanders/AbstractIntervalSetExpander'
import WeightedRegularIntervalSerif from './serifs/WeightedRegularIntervalSerif'

import CanvasPrimaryRulerRenderer from './renderers/canvas/CanvasPrimaryRulerRenderer'
import CanvasTopRulerRenderer from './renderers/canvas/CanvasTopRulerRenderer'


export class StaticCanvasRuler extends AbstractRuler {

  protected primaryRenderer: CanvasPrimaryRulerRenderer
  protected topRenderer: CanvasTopRulerRenderer

  constructor (
    protected visibleRange: ITimeRange,
    protected ctx: CanvasRenderingContext2D,
    protected intervalSetProvider: AbstractIntervalSetProvider =
      new CanvasIrregularLenghtMultipleWeightsIntervalSetProvider(
        visibleRange,
        ctx.canvas,
      ),

    protected intervalSetExpander: AbstractIntervalSetExpander =
    new IrregularLengthIntervalSetExpander(
        visibleRange,
      ),
  ) {
    super(visibleRange)
    this.primaryRenderer = new CanvasPrimaryRulerRenderer(this.visibleRange, this.ctx)
    this.topRenderer = new CanvasTopRulerRenderer(this.visibleRange, this.ctx)
  }

  public render (debug: boolean = false) {
    const intervals = this.intervalSetProvider.getIntervals()
    const topIntervals = intervals.length ? [intervals[intervals.length - 1]] : []
    const primaryIntervals = intervals.slice(0, intervals.length - 1)
    const primarySerifs = this.intervalSetExpander.expand(primaryIntervals, topIntervals) as Array<WeightedRegularIntervalSerif>
    const topSerifs = this.intervalSetExpander.expand(topIntervals) as Array<WeightedRegularIntervalSerif>
    this.primaryRenderer.render(primarySerifs, debug)
    this.topRenderer.render(topSerifs, debug)
  }

  public dispose () {
  }
}

export default StaticCanvasRuler
