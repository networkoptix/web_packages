import IDuratedTimeRange from '../timeRanges/IDuratedTimeRange'
import AbstractIntervalSetProvider from './interval_set_providers/AbstractIntervalSetProvider'

// import DegenerateCanvasRegularLenghtSingleWeightIntervalSetProvider from './interval_set_providers/DegenerateCanvasRegularLenghtSingleWeightIntervalSetProvider'
// import CanvasRegularLenghtSingleWeightIntervalSetProvider from './interval_set_providers/CanvasRegularLenghtSingleWeightIntervalSetProvider'
// import CanvasRegularLenghtMultipleWeighstIntervalSetProvider from './interval_set_providers/CanvasRegularLenghtMultipleWeighstIntervalSetProvider'
// import CanvasIrregularLenghtSingleWeightIntervalSetProvider from './interval_set_providers/CanvasIrregularLenghtSingleWeightIntervalSetProvider'
import CanvasIrregularLenghtMultipleWeightsIntervalSetProvider from './interval_set_providers/canvas/CanvasIrregularLenghtMultipleWeightsIntervalSetProvider'

// import RegularLengthIntervalSetExpander from './interval_set_expanders/RegularLengthIntervalSetExpander'
// import IrregularLengthIntervalSetExpander from './interval_set_expanders/IrregularLengthIntervalSetExpander'
import DynamicWeightIrregularLengthIntervalSetExpander from './interval_set_expanders/DynamicWeightIrregularLengthIntervalSetExpander'

import AbstractRuler from './AbstractRuler'
import AbstractIntervalSetExpander from './interval_set_expanders/AbstractIntervalSetExpander'
import WeightedRegularIntervalSerif from './serifs/WeightedRegularIntervalSerif'

import CanvasPrimaryRulerRenderer from './renderers/canvas/CanvasPrimaryRulerRenderer'
import CanvasTopRulerRenderer from './renderers/canvas/CanvasTopRulerRenderer'
import IrregularLengthInterval from './intervals/IrregularLengthInterval'

import {
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  ROUGH_MONTH,
  ROUGH_YEAR,
} from './intervals/regularLengthIntervals'

import AnimatedFloat from '../timeRanges/animations/AnimatedFloat'


export class AnimatedCanvasRuler extends AbstractRuler {

  protected primaryRenderer: CanvasPrimaryRulerRenderer
  protected topRenderer: CanvasTopRulerRenderer

  constructor (
    protected visibleRange: IDuratedTimeRange,
    protected ctx: CanvasRenderingContext2D,
    protected intervalSetProvider: AbstractIntervalSetProvider =
      // new DegenerateCanvasRegularLenghtSingleWeightIntervalSetProvider(
      // new CanvasRegularLenghtSingleWeightIntervalSetProvider(
      // new CanvasRegularLenghtMultipleWeighstIntervalSetProvider(
      // new CanvasIrregularLenghtSingleWeightIntervalSetProvider(
      new CanvasIrregularLenghtMultipleWeightsIntervalSetProvider(
        visibleRange,
        ctx.canvas,
      ),

    protected intervalSetExpander: AbstractIntervalSetExpander =
    // new RegularLengthIntervalSetExpander(
    new DynamicWeightIrregularLengthIntervalSetExpander(
        visibleRange,
      ),
  ) {
    super(visibleRange)
    this.primaryRenderer = new CanvasPrimaryRulerRenderer(this.visibleRange, this.ctx)
    this.topRenderer = new CanvasTopRulerRenderer(this.visibleRange, this.ctx)
  }

  protected _prevIntervals: Array<IrregularLengthInterval> = []
  protected _lastIntervalChanges = {}
  protected _intervalWeightAnimations = {}

  protected _haveIntervalsChanged (newIntervals: Array<IrregularLengthInterval>) {
    if (this._prevIntervals.length !== newIntervals.length) {
      return true
    }
    for (let i = 0; i < this._prevIntervals.length; i++) {
      if (this._prevIntervals[i] !== newIntervals[i]) {
        return true
      }
    }
    return false
  }

  public render (debug: boolean = false) {
    const ANIMATION_DURATION = 100
    const _intervals = this.intervalSetProvider.getIntervals()

    const intervals = _intervals.slice(0, _intervals.length - 1)
    // const primarySerifs = this.intervalSetExpander.expand(primaryIntervals, topIntervals) as Array<WeightedRegularIntervalSerif>

    if (this._haveIntervalsChanged(intervals)) {
      // const prevSerifs = this.intervalSetExpander.expand(this._prevIntervals, []) as Array<WeightedRegularIntervalSerif>
      const intervalDiffDict = getIntervalDiffDict(this._prevIntervals, intervals)
      Object.keys(intervalDiffDict).map(k => {
        const v = intervalDiffDict[k]
        if (v.length) {
          this._lastIntervalChanges[k] = Date.now()
          // HERE animations
          if (k in this._intervalWeightAnimations) {
            this._intervalWeightAnimations[k].abort()
            this._intervalWeightAnimations[k].set(v[1])
          } else {
            this._intervalWeightAnimations[k] = new AnimatedFloat(v[0], ANIMATION_DURATION)
            this._intervalWeightAnimations[k].set(v[1])
          }
        }
      })
      // console.log(
      //   'intervals changed',
      //   stringifyIntervalDiffDict(intervalDiffDict),
      //   stringifyIntervalChangeTimeStamps(this._lastIntervalChanges)
      // )
      this._prevIntervals = [...intervals]
    } else {
      let stabilized = true
      Object.keys(this._intervalWeightAnimations).map(k => {
        const v = this._intervalWeightAnimations[k] as AnimatedFloat
        if (v.target !== v.get()) {
          // console.log('animating weight', k, v.get())
          stabilized = false
        }
      })
      if (stabilized) {
        // console.log('all weights stabilized')
      }
      // const sicts = stringifyIntervalChangeTimeStamps(this._lastIntervalChanges)
      // let noChanges = true
      // Object.keys(sicts).filter(k => {
      //   const v = sicts[k]
      //   const dt = v
      //   if (dt < ANIMATION_DURATION) {
      //     console.log('animating', stringifyInterval(k), dt / ANIMATION_DURATION)
      //     noChanges = false
      //   }
      // })
      // if (noChanges) {
      //   console.log('all animations are already done')
      // }
    }

    const topIntervals = _intervals.length ? [_intervals[_intervals.length - 1]] : []

    const targetSerifs = this.intervalSetExpander.expand(intervals, topIntervals, this._intervalWeightAnimations) as Array<WeightedRegularIntervalSerif>

    this.primaryRenderer.render(targetSerifs, debug)
    const topSerifs = this.intervalSetExpander.expand(topIntervals) as Array<WeightedRegularIntervalSerif>
    this.topRenderer.render(topSerifs, debug)
  }

  public dispose () {
  }
}

function getWeightArrayFromIntervalList (arr: Array<any>) {
  return arr.reduce((acc, v, k) => {
    acc[v] = k + 1
    return acc
  }, {})
}

function getIntervalDiffDict (a1: Array<IrregularLengthInterval>, a2: Array<IrregularLengthInterval>) {
  const d1 = getWeightArrayFromIntervalList(a1)
  const d2 = getWeightArrayFromIntervalList(a2)
  const result = {}
  Object.keys(d1).map(d1k => {
    if (d1[d1k] !== d2[d1k]) {
      result[d1k] = [d1[d1k], d2[d1k] || 0]
    } else {
      result[d1k] = d1[d1k]
    }
  })
  Object.keys(d2).filter(d2k => !(d2k in result)).map(d2k => {
    result[d2k] = [0, d2[d2k]]
  })
  return result
}

function stringifyIntervalChangeTimeStamps (d) {
  return Object.keys(d).reduce((acc, k) => {
    acc[stringifyInterval(k)] = Date.now() - d[k]
    return acc
  }, {})
}

function stringifyIntervalDiffDict (idd) {
  let result = '{\n'
  Object.keys(idd).map(k => {
    const v = idd[k]
    if (v.length) {
      result += `\t${stringifyInterval(k)}: ${v[0]} -> ${v[1]},\n`
    } else {
      result += `\t${stringifyInterval(k)}: ${v},\n`
    }
  })
  result += '}'
  return result
}

function stringifyInterval (i) {
  const ii = parseInt(i)
  switch (ii) {
    case SECOND:
      return '1s'
    case 5 * SECOND:
      return '5s'
    case 10 * SECOND:
      return '10s'
    case 30 * SECOND:
      return '30s'
    case MINUTE:
      return '1m'
    case 5 * MINUTE:
      return '5m'
    case 10 * MINUTE:
      return '10m'
    case 30 * MINUTE:
      return '30m'
    case HOUR:
      return '1h'
    case 3 * HOUR:
      return '3h'
    case 6 * HOUR:
      return '6h'
    case 12 * HOUR:
      return '12h'
    case DAY:
      return '1d'
    case ROUGH_MONTH:
      return '1m(r)'
    case 3 * ROUGH_MONTH:
      return '3m(r)'
    case 6 * ROUGH_MONTH:
      return '6m(r)'
    case ROUGH_YEAR:
      return '1y(r)'
    case 10 * ROUGH_YEAR:
      return '10y(r)'
    case 100 * ROUGH_YEAR:
      return '1c(r)'
    case 1000 * ROUGH_YEAR:
      return '1m(r)'
    default:
      console.log('default')
      return i
  }
}

export default AnimatedCanvasRuler
