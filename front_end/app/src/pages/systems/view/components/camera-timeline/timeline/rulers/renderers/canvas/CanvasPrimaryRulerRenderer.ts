import IDuratedTimeRange from '../../../timeRanges/IDuratedTimeRange'
import { int, percentage } from '../../../numberTypeAliases'
import WeightedRegularIntervalSerif from '../../serifs/WeightedRegularIntervalSerif'
import primaryRulerDateFormats from '../../dateformats/primary_ruler_date_formats'
import WeightedIrregularIntervalSerif from '../../serifs/WeightedIrregularIntervalSerif'
import { percentageToHex } from './utils/colors'
import * as df from 'dateformat'
const dateformat = df.default || df


export class CanvasPrimaryRulerRenderer {

  constructor (
    protected visibleRange: IDuratedTimeRange,
    protected ctx: CanvasRenderingContext2D,
    protected Y_0_RELATIVE: percentage = 0.2,
    protected H_BASE_RELATIVE: percentage = 0.1,
    protected LABEL_OFFSET_PX: int = 5,
  ) {
  }

  public render (serifs: Array<WeightedRegularIntervalSerif>, debug: boolean = false) {
    serifs.filter(s => s.weight > 0).map(s => this.drawSerif(s))
  }

  public get canvas () {
    return this.ctx.canvas
  }

  protected get pxPerMs () {
    return this.canvas.width / this.visibleRange.duration
  }

  protected serifDrawingConfigs = {
    1: {
        baseColorHex: '#adbdc5',
        heightRelative: 0.0705, // used to be .06
        opacity: 0.3,
    },
    2: {
      heightRelative: 0.0705, // used to be .06
        baseColorHex: '#adbdc5',
        opacity: 0.6,
        label: {
            fontSize: 11,
        }
    },
    3: {
      heightRelative: 0.1294, // used to be .11
      baseColorHex: '#adbdc5',
        opacity: 0.8,
        label: {
            fontSize: 13
        }
    },
    4: {
        heightRelative: 0.2, // used to be .17
        baseColorHex: '#adbdc5',
        opacity: 1.0,
        label: {
            fontSize: 14
        }
    },
  }

  protected drawSerif (serif: WeightedIrregularIntervalSerif) {

    const drawingConfig = this.serifDrawingConfigs[serif.weight]
    if (!drawingConfig) {
      console.error('no drawing config for serif', serif)
      return
    }

    const x = (serif.when - this.visibleRange.startTime) * this.pxPerMs
    const y = this.Y_0_RELATIVE * this.canvas.height
    // const h = this.H_BASE_RELATIVE * serif.weight * this.canvas.height
    const h = drawingConfig.heightRelative * this.canvas.height

    const oldStrokeStyle = this.ctx.strokeStyle
    this.ctx.strokeStyle = `${drawingConfig.baseColorHex}${percentageToHex(drawingConfig.opacity)}`
    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(x, y + h)
    this.ctx.stroke()
    this.ctx.strokeStyle = oldStrokeStyle

    if (drawingConfig.label) {
      this.drawLabel(serif, x, y + h + this.LABEL_OFFSET_PX * devicePixelRatio, drawingConfig)
    }
  }

  protected drawLabel (serif: WeightedIrregularIntervalSerif, x: int, y: int, drawingConfig) {
    const oldFillStyle = this.ctx.fillStyle
    const oldFont = this.ctx.font
    const oldTextBaseline = this.ctx.textBaseline
    const oldTextAlign = this.ctx.textAlign
    this.ctx.fillStyle = `${drawingConfig.baseColorHex}${percentageToHex(drawingConfig.opacity)}`
    const fontFace = 'Roboto, robotoregular, "Helvetica Neue", Arial, sans-serif'
    // this.ctx.font = `${10 * devicePixelRatio}px Roboto, Arial, sans-serif`
    this.ctx.font = `${drawingConfig.label.fontSize * devicePixelRatio}px ${fontFace}`
    this.ctx.textBaseline = 'top'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(dateformat(serif.when, primaryRulerDateFormats[serif.interval]), x, y)
    this.ctx.font = oldFont
    this.ctx.textAlign = oldTextAlign
    this.ctx.textBaseline = oldTextBaseline
    this.ctx.fillStyle = oldFillStyle
  }
}

export default CanvasPrimaryRulerRenderer
