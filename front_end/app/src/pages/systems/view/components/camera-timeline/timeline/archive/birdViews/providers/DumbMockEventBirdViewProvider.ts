import ITimeRange from "../../../timeRanges/ITimeRange"
import TimeRange from "../../../timeRanges/TimeRange"
import IEvent from '../../events/IEvent'
import Event from "../../events/Event"
import IEventBirdView from "../IEventBirdView"
import { durationMs, timeStampMs } from "../../../numberTypeAliases"
import AbstractEventBirdViewProvider from './AbstractEventBirdViewProvider'


export class DumbMockEventBirdViewProvider extends AbstractEventBirdViewProvider {

  protected _events:Array<IEvent> = []

  constructor (
    protected _fullRange: ITimeRange,
    eventDuration: durationMs = 60 * 1000,
    gapDuration: durationMs = 60 * 1000,
  ) {
    super(_fullRange)
    this.fillEvents(eventDuration, gapDuration)
  }

  public getEventBirdView (visibleRange: ITimeRange, roughness: durationMs = 0): IEventBirdView {
    return {
      range: TimeRange.fromRange(visibleRange),
      roughness: 0,
      events: this.limitEventsByRange(visibleRange)
    }
  }

  public expand (t: timeStampMs) {
    if (this._events.length && this._events[this._events.length - 1].endTime === this._fullRange.endTime) {
      this._events[this._events.length - 1].endTime += t
    } else {
      this._events.push(new Event(this._fullRange.endTime, this._fullRange.endTime + t))
    }
  }

  public eventExists (t: timeStampMs): boolean {
    const e = this._events.find(e => e.startTime <= t && e.endTime >= t)
    return !!e
  }

  public getNearestTime (t: timeStampMs): timeStampMs {
    if (this.eventExists(t)) return t
    return this.getNextEventStart(t)
  }

  public getNextEventStart(t: timeStampMs): timeStampMs {
    const e = this._events.find(e => t < e.endTime)
    return e ? e.startTime : Infinity
  }

  protected fillEvents (eventDuration: durationMs, gapDuration: durationMs) {
    for (let t = this._fullRange.startTime; t < this._fullRange.endTime; t += (eventDuration + gapDuration)) {
      this._events.push(new Event(t, t + eventDuration))
    }
  }

  protected limitEventsByRange (range: ITimeRange): Array<IEvent> {
    const result = this._events.filter(e => e.endTime >= range.startTime && e.startTime <= range.endTime).map(e => ({ ...e }))
    if (result.length) {
      const firstEvent = result[0]
      const lastEvent = result[result.length - 1]
      firstEvent.startTime = Math.max(firstEvent.startTime, range.startTime)
      lastEvent.endTime = Math.min(lastEvent.endTime, range.endTime)
    }
    return result
  }
}

export default DumbMockEventBirdViewProvider
