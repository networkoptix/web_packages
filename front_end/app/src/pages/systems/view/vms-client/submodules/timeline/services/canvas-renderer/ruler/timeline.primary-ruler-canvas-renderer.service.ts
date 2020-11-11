import { Injectable } from '@angular/core'

import IrregularLengthInterval from './intervals/IrregularLengthInterval'
import irregularLengthIntervals from './intervals/irregularLengthIntervals'
import estimateIrregularLengthIntervalPessimistically from './intervals/utils/estimateIrregularLengthIntervalPessimistically'
import isAlignedByIrregularInterval from './intervals/utils/isAlignedByIrregularInterval'
import { MAX_WEIGHT, MIN_WEIGHT, MIN_WIDTHS_FOR_INTERVALS } from './intervals/MIN_WIDTH_FOR_INTERVALS'

import * as df from 'dateformat'
const dateformat = df.default || df

import cfg from '../../timeline.config'
import TimelineService from '../../timeline.service'
import { ms, int, px } from '../../../../../utils/type-aliases'
import primaryRulerSerifDrawingConfigs from './primaryRulerSerifDrawingConfigs'
import primaryRulerDateFormats from './dateformats/primary_ruler_date_formats'

import percentageToHex from './percentageToHex'

import AnimatedFloat from './animation_primitives/AnimatedFloat'

export interface RulerSerif {
  interval: IrregularLengthInterval,
  time: ms,
  weight: int,
}


@Injectable({
  providedIn: 'root',
 })
export class TimelinePrimaryRulerCanvasRendererService {

  constructor (
    protected timeline: TimelineService,
  ) {
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

  public render (ctx: CanvasRenderingContext2D, intervalToSkip: IrregularLengthInterval | false = false) {
    this._withContext(ctx, () => {
      const serifs = this._getSerifs().filter(s => s.weight > 0)
      // console.log('PRIMARY SERIFS', serifs.map(s => s.weight))
      if (intervalToSkip) {
        serifs.map(s => !isAlignedByIrregularInterval(s.time, intervalToSkip) && this._drawSerif(ctx, s))
      } else {
        serifs.map(s => this._drawSerif(ctx, s))
      }
    })
  }

  protected _withContext(ctx, actualDrawing: () => void) {
    const oldStrokeStyle = ctx.strokeStyle
    const oldFillStyle = ctx.fillStyle
    const oldTextAlign = ctx.textAlign
    const oldTextBaseline = ctx.textBaseline
    const oldFont = ctx.font
    actualDrawing()
    ctx.strokeStyle = oldStrokeStyle
    ctx.fillStyle = oldFillStyle
    ctx.textAlign = oldTextAlign
    ctx.textBaseline = oldTextBaseline
    ctx.font = oldFont
  }

  protected _getIntervals (): Array<IrregularLengthInterval> {
    const result = []
    for (let interval of irregularLengthIntervals) {
      const displayWidth = this.timeline.durationToDomWidth(estimateIrregularLengthIntervalPessimistically(interval))
      const requiredWidth = MIN_WIDTHS_FOR_INTERVALS[interval][result.length]
      if (displayWidth >= requiredWidth) {
        result.push(interval)
        if (result.length >= MAX_WEIGHT) {
          break
        }
      }
    }
    return result
  }

  protected _getSerifs (): Array<RulerSerif> {
    const intervals = this._getIntervals()

    const ANIMATION_DURATION = 200

    if (this._haveIntervalsChanged(intervals)) {
      const intervalDiffDict = getIntervalDiffDict(this._prevIntervals, intervals)
      // console.log('intervals changed', this._prevIntervals, intervals, intervalDiffDict)
      Object.keys(intervalDiffDict).map(k => {
        const v = intervalDiffDict[k]
        if (v.length) {
          this._lastIntervalChanges[k] = Date.now()
          // HERE animations happen
          if (k in this._intervalWeightAnimations) {
            // this._intervalWeightAnimations[k].abort()
            this._intervalWeightAnimations[k].set(v[1])
          } else {
            this._intervalWeightAnimations[k] = new AnimatedFloat(v[0], ANIMATION_DURATION)
            this._intervalWeightAnimations[k].set(v[1])
          }
        }
      })
      this._prevIntervals = [...intervals]
    }

    if (!intervals || !intervals.length) return []

    const smallestInterval = intervals[0]
    return this.timeline.visibleRange.iterate(smallestInterval).map(time => {
      const weight = this._getIntervalWeight(time, intervals)
      // const interval = intervals[~~weight - 1]
      const interval = [...intervals].reverse().find(i => isAlignedByIrregularInterval(time, i))
      const result = {
        time,
        weight,
        interval,
      }
      // if (weight != ~~weight) console.log('GS', weight, result)
      return result
    }).filter(s => s.interval)
  }

  protected _getIntervalWeight(time: ms, intervals: Array<IrregularLengthInterval>): int {
    const interval = [...intervals].reverse().find(i => isAlignedByIrregularInterval(time, i))
    // console.log(interval, this._intervalWeightAnimations[interval], this._intervalWeightAnimations[interval].get())
    const result = this._intervalWeightAnimations[interval]?.get() || 0
    if (!this._intervalWeightAnimations[interval]) {
      console.warn('_getIntervalWeight', 'no animation for the interval', time, intervals, this._intervalWeightAnimations)
    }
    // if (result != ~~result) console.log('GIW', result)
    return result
    // const result = MAX_WEIGHT - [...intervals].reverse().findIndex(i => isAlignedByIrregularInterval(time, i))
    // return result <= MAX_WEIGHT ? result : 0
  }

  protected _drawSerif (ctx: CanvasRenderingContext2D, s: RulerSerif) {
    // if (s.weight != ~~s.weight) {
    //   console.log('Draw SW', s.weight, s.interval)
    // }
    if (s.weight > MAX_WEIGHT || s.weight < MIN_WEIGHT) {
      // console.warn('wrong weight', s)
      return
    }

    const lowerWeight = Math.floor(s.weight)
    const upperWeight = Math.ceil(s.weight)

    const lowerDrawingConfig = primaryRulerSerifDrawingConfigs[lowerWeight]
    const upperDrawingConfig = primaryRulerSerifDrawingConfigs[upperWeight]
    if (!lowerDrawingConfig || !upperDrawingConfig) {
      // console.warn('no drawing config found!', s, lowerWeight, upperWeight, lowerDrawingConfig, upperDrawingConfig)
      return
    }

    const x: px = this.timeline.timeToCanvasOffsetX(s.time)

    const y0: px = Math.round(cfg.ruler.top.relativeHeight * this.timeline.canvasGeometry.height)
    const lowerHeight: px = Math.round(lowerDrawingConfig.heightRelative * this.timeline.canvasGeometry.height)
    const upperHeight: px = Math.round(upperDrawingConfig.heightRelative * this.timeline.canvasGeometry.height)
    const height = lowerHeight + (upperHeight - lowerHeight) * (s.weight - lowerWeight)
    const y1 = y0 + height

    const color = upperDrawingConfig.baseColorHex // TODO: allow color transition, too
    const lowerOpacity = lowerDrawingConfig.opacity
    const upperOpacity = upperDrawingConfig.opacity
    const opacity = lowerOpacity + (upperOpacity - lowerOpacity) * (s.weight - lowerWeight)
    ctx.strokeStyle = `${color}${percentageToHex(opacity)}`
    ctx.beginPath()
    ctx.moveTo(x, y0)
    ctx.lineTo(x, y1)
    ctx.stroke()

    const lowerLabelCfg = lowerDrawingConfig.label
    const upperLabelCfg = upperDrawingConfig.label
    if (!upperLabelCfg || !lowerLabelCfg) {
      return
    }
    const lowerRelativeFontSize = lowerLabelCfg.fontSize
    const upperRelativeFontSize = upperLabelCfg.fontSize
    const relativeFontSize = lowerRelativeFontSize + (upperRelativeFontSize - lowerRelativeFontSize) * (s.weight - lowerWeight)
    const fontSize: px = Math.round(relativeFontSize * this.timeline.canvasGeometry.dpr)
    const format: string = primaryRulerDateFormats[s.interval]
    ctx.fillStyle = `${color}${percentageToHex(opacity)}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const fontFace = 'Roboto, robotoregular, "Helvetica Neue", Arial, sans-serif'
    const dateStr = dateformat(s.time, format)
    // console.log(dateStr, s)
    ctx.font = `${fontSize}px ${fontFace}`
    ctx.fillText(dateStr, x, y1 + 5)
  }
}

export default TimelinePrimaryRulerCanvasRendererService



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
