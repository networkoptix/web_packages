import ITimeRange from "../../../timeRanges/ITimeRange"
import TimeRange from "../../../timeRanges/TimeRange"
import IEvent from '../../events/IEvent'
import Event from "../../events/Event"
import IEventBirdViewProvider from "./IEventBirdViewProvider"
import IEventBirdView from "../IEventBirdView"
import { durationMs, timeStampMs } from "../../../numberTypeAliases"


export abstract class AbstractEventBirdViewProvider implements IEventBirdViewProvider {

  constructor (
    protected _fullRange: ITimeRange,
  ) {
    console.log('abstract constructor')
  }

  public abstract getEventBirdView (visibleRange: ITimeRange, roughness: durationMs): IEventBirdView

  public abstract getNearestTime (t: timeStampMs): timeStampMs
  public abstract eventExists (t: timeStampMs): boolean
  public abstract getNextEventStart (t: timeStampMs): timeStampMs
}

export default AbstractEventBirdViewProvider
