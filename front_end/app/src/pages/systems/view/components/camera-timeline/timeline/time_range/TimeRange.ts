import ITimeRange from './ITimeRange'
import { float } from '../basic_types/numbers'
import { timeStampMs, durationMs } from '../basic_types/time'
import * as df from 'dateformat'
const dateformat = df.default || df


/**
 * This is the no-transition-animations version of the time range class.
 * It's rather simple both in terms of understanding and computations.
 */
export class TimeRange implements ITimeRange {

  static DEFAULT_CONFIG = {
    stringification: {
      dateFormat: undefined
    }
  }

  constructor (
    public startTime: timeStampMs = 0,
    public endTime: timeStampMs = 0,
    protected cfg = TimeRange.DEFAULT_CONFIG
  ) {
  }

  public clone (): TimeRange {
    return new TimeRange(this.startTime, this.endTime, this.cfg)
  }

  public static fromRange (range: ITimeRange): TimeRange {
    return new TimeRange(range.startTime, range.endTime)
  }

  public getSubRange (relativeOffset: float, zoomFactor: float): TimeRange {
    // assume arguments are vetted
    // TODO: add reasonable guards, handle edge cases
    const startTime = this.startTime + relativeOffset * this.duration
    const endTime = startTime + this.duration / zoomFactor
    return new TimeRange(startTime, endTime)
  }

  public get duration (): durationMs {
    return this.endTime - this.startTime
  }
  
  public get startTimeString () {
    return dateformat(new Date(this.startTime), this.cfg.stringification.dateFormat)
  }

  public get endTimeString () {
    return dateformat(new Date(this.endTime), this.cfg.stringification.dateFormat)
  }

  public toString () {
    return `(${this.startTimeString} - ${this.endTimeString}), ${this.duration}ms`
  }


  public reset (range: TimeRange): TimeRange {
    this.startTime = range.startTime
    this.endTime = range.endTime
    return this
  }

  
  public shift (offsetMs: durationMs, skipAnimation: boolean = false): TimeRange {
    this.startTime += offsetMs
    this.endTime += offsetMs
    return this
  }

  public trim (trimmer: ITimeRange, skipAnimation: boolean = false): TimeRange {
    if (this.startTime < trimmer.startTime) {
      this.startTime = trimmer.startTime
    }
    if (this.endTime > trimmer.endTime) {
      this.endTime = trimmer.endTime
    }
    return this
  }

  public expand (extensionMs: durationMs, distribution: float = 0.5, skipAnimation: boolean = false): TimeRange {
    this.startTime -= Math.round(extensionMs * distribution)
    this.endTime += Math.round(extensionMs * (1.0 - distribution))
    return this
  }

  public contract (contractionMs: durationMs, distribution: float = 0.5, skipAnimation: boolean = false): TimeRange {
    return this.expand(-contractionMs, distribution, skipAnimation)
  }

  public moveToStart (startMs: timeStampMs, skipAnimation: boolean = false): TimeRange {
    const duration = this.duration
    this.startTime = startMs
    this.endTime = startMs + duration
    return this
  }  

  public moveToEnd (endMs: timeStampMs, skipAnimation: boolean = false): TimeRange {
    const duration = this.duration
    this.endTime = endMs
    this.startTime = endMs - duration
    return this
  }
}

export default TimeRange
