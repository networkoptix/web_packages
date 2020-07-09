import ITimeRange from '../../../time_range/ITimeRange'
import { percentage, int } from '../../../basic_types/numbers';
import WeightedRegularIntervalSerif from '../../serifs/WeightedRegularIntervalSerif'
import primaryRulerDateFormats from '../../dateformats/primary_ruler_date_formats'
import WeightedIrregularIntervalSerif from '../../serifs/WeightedIrregularIntervalSerif'
import { percentageToHex } from './utils/colors'
import * as df from 'dateformat'
const dateformat = df.default || df


export class CanvasPrimaryRulerRenderer {

  constructor (
    protected visibleRange: ITimeRange,
    protected ctx: CanvasRenderingContext2D,
    protected Y_0_RELATIVE: percentage = 0.2,
    protected H_BASE_RELATIVE: percentage = 0.1,
    protected LABEL_OFFSET_PX: int = 5,
  ) {
  }

  public render (serifs: Array<WeightedRegularIntervalSerif>, debug: boolean = false) {
    serifs.map(s => this.drawSerif(s))
  }

  public get canvas () {
    return this.ctx.canvas
  }

  protected get pxPerMs () {
    return this.canvas.width / this.visibleRange.duration
  }

  protected serifDrawingConfigs = {
    0: {
      baseColorHex: '#adbdc5',
      heightRelative: 0.0,
      opacity: 0.0,
      label: {
        fontSize: 0,
      },
    },
    1: {
      baseColorHex: '#adbdc5',
      heightRelative: 0.0705, // used to be .06
      opacity: 0.3,
      label: {
        fontSize: 0,
      },
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

  protected _isSerifStable (serif: WeightedIrregularIntervalSerif) {
    return Math.round(serif.weight) === serif.weight
  }

  protected drawSerif (serif: WeightedIrregularIntervalSerif) {
    if (this._isSerifStable(serif)) {
      this.drawStabilizedSerif(serif)
    } else {
      this.drawTransitioningSerif(serif)
    }
  }

  protected drawTransitioningSerif (serif: WeightedIrregularIntervalSerif) {
    if (serif.weight < 0) {
      console.error('negative serif weight')
      return
    }
    // console.log('drawTransitioningSerif', serif)
    const lowerWeight = Math.floor(serif.weight)
    const upperWeight = Math.ceil(serif.weight)
    const animationProgress = serif.weight - lowerWeight

    const lowerDrawingConfig = this.serifDrawingConfigs[lowerWeight]
    const upperDrawingConfig = this.serifDrawingConfigs[upperWeight]
    const diffDrawingConfig = {
      heightRelative: upperDrawingConfig.heightRelative - lowerDrawingConfig.heightRelative,
      baseColorHex: upperDrawingConfig.baseColorHex, // TODO: support color transition as well
      opacity: upperDrawingConfig.opacity - lowerDrawingConfig.opacity,
      label: {
        fontSize: upperDrawingConfig.label.fontSize - lowerDrawingConfig.label.fontSize
      }
    }
    const drawingConfig = {
      heightRelative: lowerDrawingConfig.heightRelative + diffDrawingConfig.heightRelative * animationProgress,
      baseColorHex: upperDrawingConfig.baseColorHex, // TODO: support color transition as well
      opacity: lowerDrawingConfig.opacity + diffDrawingConfig.opacity * animationProgress,
      label: {
        fontSize: lowerDrawingConfig.label.fontSize + diffDrawingConfig.label.fontSize * animationProgress,
      }
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
      this.drawStabilizedLabel(serif, x, y + h + this.LABEL_OFFSET_PX * devicePixelRatio, drawingConfig)
    }

    // const x = (serif.when - this.visibleRange.startTime) * this.pxPerMs
    // const y = this.Y_0_RELATIVE * this.canvas.height
    // const h = (lowerDrawingConfig.heightRelative + diffDrawingConfig.heightRelative) * this.canvas.height

    // const oldStrokeStyle = this.ctx.strokeStyle
    // this.ctx.strokeStyle = `${upperDrawingConfig.baseColorHex}${percentageToHex(lowerDrawingConfig.opacity + diffDrawingConfig.opacity)}`

    // this.ctx.beginPath()
    // this.ctx.moveTo(x, y)
    // this.ctx.lineTo(x, y + h)
    // this.ctx.stroke()
    // this.ctx.strokeStyle = oldStrokeStyle

    // if (diffDrawingConfig.label) {
    //   this.drawTransitioningLabel(serif, x, y + h + this.LABEL_OFFSET_PX * devicePixelRatio, lowerDrawingConfig, upperDrawingConfig, diffDrawingConfig)
    // }

  }

  protected drawStabilizedSerif (serif: WeightedIrregularIntervalSerif) {
    // console.log('drawStabilizedSerif', serif)

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
      this.drawStabilizedLabel(serif, x, y + h + this.LABEL_OFFSET_PX * devicePixelRatio, drawingConfig)
    }
  }

  protected drawStabilizedLabel (serif: WeightedIrregularIntervalSerif, x: int, y: int, drawingConfig) {
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

  protected drawTransitioningLabel (serif: WeightedIrregularIntervalSerif, x: int, y: int, lowerDrawingConfig, upperDrawingConfig, diffDrawingConfig) {
    const oldFillStyle = this.ctx.fillStyle
    const oldFont = this.ctx.font
    const oldTextBaseline = this.ctx.textBaseline
    const oldTextAlign = this.ctx.textAlign

    this.ctx.fillStyle = `${upperDrawingConfig.baseColorHex}${percentageToHex(lowerDrawingConfig.opacity + diffDrawingConfig.opacity)}`
    const fontFace = 'Roboto, robotoregular, "Helvetica Neue", Arial, sans-serif'
    // this.ctx.font = `${10 * devicePixelRatio}px Roboto, Arial, sans-serif`
    this.ctx.font = `${(lowerDrawingConfig.label.fontSize + diffDrawingConfig.label.fontSize) * devicePixelRatio}px ${fontFace}`
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
