import ITimeRange from './ITimeRange'
import TimeRange from './TimeRange'
import { float, } from '../basic_types/numbers'
import { durationMs, timeStampMs } from '../basic_types/time'
import { AnimatedInteger as AnimatedTimeStampMs } from '../animation_primitives/AnimatedInteger'


/**
 * This version of the time range class supports transition animation.
 * Time and duration values here are guaranteed to always be integer.
 */
export class AnimatedTimeRange extends TimeRange {

  static DEFAULT_ANIMATION_DURATION = 200
  static DEFAULT_EASING: 'linear' = 'linear'

  protected _startTime: AnimatedTimeStampMs
  protected _endTime: AnimatedTimeStampMs

  public get startTime () {
    return this._startTime.get()
  }
  public set startTime (v: timeStampMs) {
    // the seemingly redundant guard is added because of the super() call in the constructor
    this._startTime && this._startTime.set(v)
  }

  public get endTime () {
    return this._endTime.get()
  }
  public set endTime (v: timeStampMs) {
    // the seemingly redundant guard is added because of the super() call in the constructor
    this._endTime && this._endTime.set(v)
  }

  constructor (
    startTime: timeStampMs = 0,
    endTime: timeStampMs = 0,
    protected cfg = TimeRange.DEFAULT_CONFIG,
    protected _animationDuration: durationMs = AnimatedTimeRange.DEFAULT_ANIMATION_DURATION,
    protected _easing: 'linear' = AnimatedTimeRange.DEFAULT_EASING,    
  ) {
    super()
    this._startTime = new AnimatedTimeStampMs(startTime, _animationDuration, _easing)
    this._endTime = new AnimatedTimeStampMs(endTime, _animationDuration, _easing)
  }

  public clone (): TimeRange {
    return new AnimatedTimeRange(this.startTime, this.endTime, this.cfg, this._animationDuration, this._easing)
  }

  public static fromRange (
    range: ITimeRange,
    cfg = TimeRange.DEFAULT_CONFIG,
    animationDuration: durationMs = AnimatedTimeRange.DEFAULT_ANIMATION_DURATION,
    easing: 'linear' = AnimatedTimeRange.DEFAULT_EASING,    
  ): TimeRange {
    return new AnimatedTimeRange(range.startTime, range.endTime, cfg, animationDuration, easing)
  }

  public getSubRange (relativeOffset: float, zoomFactor: float): AnimatedTimeRange {    
    const staticSubRange = super.getSubRange(relativeOffset, zoomFactor)
    return new AnimatedTimeRange(staticSubRange.startTime, staticSubRange.endTime, this.cfg, this._animationDuration, this._easing)
  }

  public shift (offsetMs: durationMs, skipAnimation: boolean = false): AnimatedTimeRange {
    if (!skipAnimation) {
      super.shift(offsetMs)
      return this
    }
    this._startTime.forceShift(offsetMs)
    this._endTime.forceShift(offsetMs)
    return this
  }

  public trim (trimmer: TimeRange, skipAnimation: boolean = false): AnimatedTimeRange {
    if (this._startTime.target < trimmer.startTime) {
      this._startTime[skipAnimation ? 'reset' : 'set'](trimmer.startTime)
    }
    if (this._endTime.target > trimmer.endTime) {
      this._endTime[skipAnimation ? 'reset' : 'set'](trimmer.endTime)
    }
    return this
  }

  public expand (extensionMs: durationMs, distribution: float = 0.5, skipAnimation: boolean = false): TimeRange {
    if (!skipAnimation) {
      super.expand(extensionMs, distribution)
      return this
    }
    this._startTime.forceShift(-Math.round(extensionMs * distribution))
    this._endTime.forceShift(Math.round(extensionMs * (1.0 - distribution)))
    return this
  }

  public reset (range: TimeRange): TimeRange {
    this._startTime.reset(range.startTime)
    this._endTime.reset(range.endTime)
    return this
  }  

  public moveToStart (startMs: timeStampMs, skipAnimation: boolean = false): TimeRange {
    if (!skipAnimation) {
      super.moveToStart(startMs)
      return this
    }
    const duration = this.duration
    this._startTime.reset(startMs)
    this._endTime.reset(startMs + duration)
    return this
  }  

  public moveToEnd (endMs: timeStampMs, skipAnimation: boolean = false): TimeRange {
    if (!skipAnimation) {
      super.moveToEnd(endMs)
      return this
    }
    const duration = this.duration
    this._endTime.reset(endMs)
    this._startTime.reset(endMs - duration)
    return this
  }
}

export default AnimatedTimeRange
