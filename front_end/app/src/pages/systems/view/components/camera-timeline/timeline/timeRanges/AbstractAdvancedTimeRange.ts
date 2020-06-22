import IAdvancedTimeRange from './IAdvancedTimeRange'
import ITimeRange from './ITimeRange'
import { timeStampMs, durationMs, float } from '../numberTypeAliases'
import * as df from 'dateformat'
const dateformat = df.default || df


export abstract class AbstractAdvancedTimeRange implements IAdvancedTimeRange {

  public abstract get startTime(): timeStampMs
  public abstract get endTime(): timeStampMs

  public abstract set startTime(v: timeStampMs)
  public abstract set endTime(v: timeStampMs)

  public get duration (): durationMs {
    return this.endTime - this.startTime
  }

  // toString-related
  protected cfg = {
    stringification: {
      dateFormat: undefined // default date format
    }
  }

  public get startTimeString () {
    return dateformat(this.startTime, this.cfg.stringification.dateFormat)
  }

  public get endTimeString () {
    return dateformat(this.endTime, this.cfg.stringification.dateFormat)
  }

  public toString () {
    return `(${this.startTimeString} - ${this.endTimeString}), ${this.duration}ms`
  }


  // IAdvancedTimeRange

  public reset (range: ITimeRange): AbstractAdvancedTimeRange {
    this.startTime = range.startTime
    this.endTime = range.endTime
    return this
  }

  public abstract getSubRange (relativeOffset: float, zoomFactor: float): AbstractAdvancedTimeRange

  public shift (offsetMs: durationMs, skipAnimation: boolean = false): AbstractAdvancedTimeRange {
    this.startTime += offsetMs
    this.endTime += offsetMs
    return this
  }

  public trim (trimmer: ITimeRange): AbstractAdvancedTimeRange {
    if (this.startTime < trimmer.startTime) {
      this.startTime = trimmer.startTime
    }
    if (this.endTime > trimmer.endTime) {
      this.endTime = trimmer.endTime
    }
    return this
  }

  public expand (extensionMs: durationMs, distribution: float = 0.5): AbstractAdvancedTimeRange {
    this.startTime -= Math.round(extensionMs * distribution)
    this.endTime += Math.round(extensionMs * (1.0 - distribution))
    return this
  }

  public contract (contractionMs: durationMs, distribution: float = 0.5): AbstractAdvancedTimeRange {
    return this.expand(-contractionMs, distribution)
  }

  public moveToStart (startMs: timeStampMs): AbstractAdvancedTimeRange {
    const duration = this.duration
    this.startTime = startMs
    this.endTime = startMs + duration
    return this
  }
  // public moveToStart (range: ITimeRange): AbstractAdvancedTimeRange {
  //   this.moveToStart(range.startTime)
  //   return this
  // }

  public moveToEnd (endMs: timeStampMs): AbstractAdvancedTimeRange {
    const duration = this.duration
    this.endTime = endMs
    this.startTime = endMs - duration
    return this
  }
  // public moveToEnd (range: ITimeRange): AbstractAdvancedTimeRange {
  //   this.moveToEnd(range.endTime)
  //   return this
  // }
}

export default AbstractAdvancedTimeRange
