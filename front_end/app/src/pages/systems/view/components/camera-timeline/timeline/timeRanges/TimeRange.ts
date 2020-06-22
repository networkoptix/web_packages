import AbstractAdvancedTimeRange from './AbstractAdvancedTimeRange'
import ITimeRange from './ITimeRange'
import { timeStampMs, float } from '../numberTypeAliases'


export class TimeRange extends AbstractAdvancedTimeRange {

  constructor (
    public startTime: timeStampMs,
    public endTime: timeStampMs,
  ) {
    super()
  }

  static fromRange (range: ITimeRange): TimeRange {
    return new TimeRange(range.startTime, range.endTime)
  }

  public getSubRange (relativeOffset: float, zoomFactor: float): TimeRange {
    // assert arguments are vetted
    const startTime = this.startTime + relativeOffset * this.duration
    const endTime = startTime + this.duration / zoomFactor
    return new TimeRange(startTime, endTime)
  }
}

export default TimeRange
