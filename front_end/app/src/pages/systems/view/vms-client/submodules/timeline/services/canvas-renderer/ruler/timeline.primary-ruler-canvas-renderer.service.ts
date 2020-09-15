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

  public render (ctx: CanvasRenderingContext2D, intervalToSkip: IrregularLengthInterval | false = false) {
    this._withContext(ctx, () => {
      const serifs = this._getSerifs()
      // console.log('PRIMARY SERIFS', serifs)
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

    if (!intervals || !intervals.length) return []

    const smallestInterval = intervals[0]
    return this.timeline.visibleRange.iterate(smallestInterval).map(time => {
      const weight = this._getIntervalWeight(time, intervals)
      const interval = intervals[weight - 1]
      return {
        time,
        weight,
        interval,
      }
    }).filter(s => s.interval)
  }

  protected _getIntervalWeight(time: ms, intervals: Array<IrregularLengthInterval>): int {
    const result = MAX_WEIGHT - [...intervals].reverse().findIndex(i => isAlignedByIrregularInterval(time, i))
    // console.log('GIW', time, intervals, result)
    return result <= MAX_WEIGHT ? result : 0
  }

  protected _drawSerif (ctx: CanvasRenderingContext2D, s: RulerSerif) {
    if (s.weight > MAX_WEIGHT || s.weight < MIN_WEIGHT) {
      console.warn('wrong weight', s)
      return
    }
    const drawingConfig = primaryRulerSerifDrawingConfigs[s.weight]
    if (!drawingConfig) {
      console.warn('no drawing config found!', s)
      return
    }

    const x: px = this.timeline.timeToCanvasOffsetX(s.time)

    const y0: px = Math.round(cfg.ruler.top.relativeHeight * this.timeline.canvasGeometry.height)
    const height: px = Math.round(drawingConfig.heightRelative * this.timeline.canvasGeometry.height)
    const y1 = y0 + height

    ctx.strokeStyle = `${drawingConfig.baseColorHex}${percentageToHex(drawingConfig.opacity)}`
    ctx.beginPath()
    ctx.moveTo(x, y0)
    ctx.lineTo(x, y1)
    ctx.stroke()

    const labelCfg = drawingConfig.label
    if (!labelCfg) {
      return
    }
    const fontSize: px = Math.round(labelCfg.fontSize * this.timeline.canvasGeometry.dpr)
    const format: string = primaryRulerDateFormats[s.interval]
    ctx.fillStyle = `${drawingConfig.baseColorHex}${percentageToHex(drawingConfig.opacity)}`
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
