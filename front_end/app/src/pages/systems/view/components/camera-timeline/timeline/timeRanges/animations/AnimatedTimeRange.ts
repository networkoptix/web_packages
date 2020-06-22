import AbstractAdvancedTimeRange from '../AbstractAdvancedTimeRange'
import ITimeRange from '../ITimeRange'
import { timeStampMs, float, durationMs } from '../../numberTypeAliases'
import { AnimatedInteger as AnimatedTimeStampMs } from './AnimatedInteger'


export class AnimatedTimeRange extends AbstractAdvancedTimeRange {

  protected _startTime: AnimatedTimeStampMs
  protected _endTime: AnimatedTimeStampMs

  public get startTime () {
    return this._startTime.get()
  }
  public set startTime (v: timeStampMs) {
    this._startTime.set(v)
  }

  public get endTime () {
    return this._endTime.get()
  }
  public set endTime (v: timeStampMs) {
    this._endTime.set(v)
  }

  constructor (
    startTime: timeStampMs,
    endTime: timeStampMs,
    protected _animationDuration: durationMs = 100,
    protected _easing: 'linear' = 'linear'
  ) {
    super()
    this._startTime = new AnimatedTimeStampMs(startTime, _animationDuration, _easing)
    this._endTime = new AnimatedTimeStampMs(endTime, _animationDuration, _easing)
  }

  static fromRange (range: ITimeRange): AnimatedTimeRange {
    return new AnimatedTimeRange(range.startTime, range.endTime)
  }

  public getSubRange (relativeOffset: float, zoomFactor: float): AnimatedTimeRange {
    // assert arguments are vetted
    const startTime = this.startTime + relativeOffset * this.duration
    const endTime = startTime + this.duration / zoomFactor
    return new AnimatedTimeRange(startTime, endTime)
  }

  public shift (offsetMs: durationMs, skipAnimation: boolean = false): AbstractAdvancedTimeRange {
    if (!skipAnimation) {
      super.shift(offsetMs)
      return this
    }
    this._startTime.forceShift(offsetMs)
    this._endTime.forceShift(offsetMs)
    return this
  }

  public trim (trimmer: ITimeRange): AbstractAdvancedTimeRange {
    if (this._startTime.target < trimmer.startTime) {
      this.startTime = trimmer.startTime
    }
    if (this._endTime.target > trimmer.endTime) {
      this.endTime = trimmer.endTime
    }
    return this
  }
}

export default AnimatedTimeRange
