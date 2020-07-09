import ITimeRange from '../../../time_range/ITimeRange'
import { percentage, int } from '../../../basic_types/numbers';
import { timeStampMs } from '../../../basic_types/time';
import WeightedRegularIntervalSerif from '../../serifs/WeightedRegularIntervalSerif'
import topRulerDateFormats from '../../dateformats/top_ruler_date_formats'
import WeightedIrregularIntervalSerif from '../../serifs/WeightedIrregularIntervalSerif'
import { percentageToHex } from './utils/colors'
import isIntervalOdd from '../../intervals/utils/isIntervalOdd'
import * as df from 'dateformat'
const dateformat = df.default || df


export class CanvasTopRulerRenderer {

  constructor (
    protected visibleRange: ITimeRange,
    protected ctx: CanvasRenderingContext2D,
    protected Y_0_RELATIVE: percentage = 0,
    protected H_BASE_RELATIVE: percentage = 0.2,
    protected H_SERIF_RELATIVE: percentage = 0.5,
    protected BOTTOM_LABEL_OFFSET_PX: int = 5,
  ) {
  }

  public render (serifs: Array<WeightedRegularIntervalSerif>, debug: boolean = false) {

    const drawingConfig = {
      serif: {
        heightRelative: 0.3,
        baseColorHex: '#698796', // [105, 135, 150],
        opacity: 1.0,
      },
      topLabel: {
        fontSize: 12,
        baseColorHex: '#2b383f', // [43, 56, 63],
        opacity: 1.0,
      },
      bottomLabel: {
        fontSize: 12,
        baseColorHex: '#2b383f', // [43, 56, 63],
        opacity: 1.0,
      },
      backgroundOddColor: '#f0f3f4', // [240, 243, 244]
    }

    serifs = serifs.filter(s => s.weight > 0)

    for (let i = 0; i < serifs.length - 1; i++) {
      const serif = serifs[i]
      const nextSerif = serifs[i + 1]

      // top label
      {
        // TODO: simplify!
        const x0 = (serif.when - this.visibleRange.startTime) * this.pxPerMs
        const x1 = (nextSerif.when - this.visibleRange.startTime) * this.pxPerMs
        const x = Math.round(
          (x0 < 0 && x1 > this.canvas.width) ?
            this.canvas.width / 2 :
              x0 < 0 ?
                (x1 / 2) :
                x1 > this.canvas.width ?
                (x0 + (this.canvas.width - x0) / 2) :
                (x0 + (x1 - x0) / 2)
        )
        const y0 = this.Y_0_RELATIVE * this.canvas.height
        const H = this.H_BASE_RELATIVE * this.canvas.height
        const y = Math.round(y0 + H / 2)
        const format = topRulerDateFormats[serif.interval] && topRulerDateFormats[serif.interval].top

        const MIN_WIDTH = 60
        if (isIntervalOdd(serif.when, serif.interval)) {
          this.fillTopLabelOddBackground(x0, x1, y0, H, drawingConfig.backgroundOddColor)
        }
        if (x - x0 > MIN_WIDTH * devicePixelRatio && x1 - x > MIN_WIDTH * devicePixelRatio) {
          this.drawTopLabel(x, y, serif.when, format, drawingConfig.topLabel)
        }
      }

      // serif & bottom label
      {
        const x = (serif.when - this.visibleRange.startTime) * this.pxPerMs
        const y = this.Y_0_RELATIVE * this.canvas.height
        // const h = this.H_SERIF_RELATIVE * serif.weight * this.canvas.height
        const h = drawingConfig.serif.heightRelative * this.canvas.height
        this.drawSerif(x, y, h, serif.when, drawingConfig.serif)
        this.drawBottomLabel(serif, x, y + h + this.BOTTOM_LABEL_OFFSET_PX * devicePixelRatio, drawingConfig.bottomLabel)
      }
    }
  }

  public get canvas () {
    return this.ctx.canvas
  }

  protected get pxPerMs () {
    return this.canvas.width / this.visibleRange.duration
  }

  protected fillTopLabelOddBackground (x0, x1, y0, H, fillStyle) {
    const oldFillStyle = this.ctx.fillStyle
    this.ctx.fillStyle = fillStyle
    this.ctx.fillRect(x0, y0, x1 - x0, H)
    this.ctx.fillStyle = oldFillStyle
  }

  protected drawSerif (x: int, y: int, h: int, when: timeStampMs, drawingConfig) {
    const oldStrokeStyle = this.ctx.strokeStyle
    this.ctx.strokeStyle = `${drawingConfig.baseColorHex}${percentageToHex(drawingConfig.opacity)}`
    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(x, y + h)
    this.ctx.stroke()
    this.ctx.strokeStyle = oldStrokeStyle
  }

  protected drawBottomLabel (serif: WeightedIrregularIntervalSerif, x: int, y: int, drawingConfig) {
    const oldFillStyle = this.ctx.fillStyle
    const oldFont = this.ctx.font
    const oldTextBaseline = this.ctx.textBaseline
    const oldTextAlign = this.ctx.textAlign
    this.ctx.fillStyle = `${drawingConfig.baseColorHex}${percentageToHex(drawingConfig.opacity)}`
    const fontFace = 'Roboto, robotoregular, "Helvetica Neue", Arial, sans-serif'
    // this.ctx.font = `${10 * devicePixelRatio}px ${fontFace}`
    this.ctx.font = `${drawingConfig.fontSize * devicePixelRatio}px ${fontFace}`
    this.ctx.textBaseline = 'top'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(
      dateformat(
        serif.when,
        topRulerDateFormats[serif.interval] &&
          topRulerDateFormats[serif.interval].serif
      ),
      x,
      y
    )
    this.ctx.font = oldFont
    this.ctx.textAlign = oldTextAlign
    this.ctx.textBaseline = oldTextBaseline
    this.ctx.fillStyle = oldFillStyle
  }

  protected drawTopLabel (x: int, y: int, t: timeStampMs, format: string, drawingConfig) {
    const oldFillStyle = this.ctx.fillStyle
    const oldFont = this.ctx.font
    const oldTextBaseline = this.ctx.textBaseline
    const oldTextAlign = this.ctx.textAlign
    // this.ctx.fillStyle = 'red'
    // this.ctx.font = `${10 * devicePixelRatio}px Roboto, Arial, sans-serif`
    this.ctx.fillStyle = `${drawingConfig.baseColorHex}${percentageToHex(drawingConfig.opacity)}`
    const fontFace = 'Roboto, robotoregular, "Helvetica Neue", Arial, sans-serif'
    // this.ctx.font = `${10 * devicePixelRatio}px ${fontFace}`
    this.ctx.font = `${drawingConfig.fontSize * devicePixelRatio}px ${fontFace}`
    this.ctx.textBaseline = 'middle'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(dateformat(t, format), x, y)
    this.ctx.font = oldFont
    this.ctx.textAlign = oldTextAlign
    this.ctx.textBaseline = oldTextBaseline
    this.ctx.fillStyle = oldFillStyle
  }
}

export default CanvasTopRulerRenderer
