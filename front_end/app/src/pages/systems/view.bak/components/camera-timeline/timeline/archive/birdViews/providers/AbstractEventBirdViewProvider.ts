import ITimeRange from "../../../time_range/ITimeRange"
import IEventBirdViewProvider from "./IEventBirdViewProvider"
import IEventBirdView from "../IEventBirdView"
import { durationMs, timeStampMs } from "../../../basic_types/time"
import TimeRange from "../../../time_range/TimeRange"


export abstract class AbstractEventBirdViewProvider implements IEventBirdViewProvider {

  protected _fullRange

  constructor (
    fullRange: ITimeRange,
  ) {
    this._fullRange = TimeRange.fromRange(fullRange)
  }

  public get fullRange (): TimeRange {
    return this._fullRange.clone()
  }

  public abstract getEventBirdView (visibleRange: ITimeRange, roughness: durationMs): IEventBirdView

  public abstract getNearestTime (t: timeStampMs): timeStampMs
  public abstract eventExists (t: timeStampMs): boolean
  public abstract getNextEventStart (t: timeStampMs): timeStampMs
}

export default AbstractEventBirdViewProvider
