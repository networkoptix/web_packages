import ITimeRange from "../../../time_range/ITimeRange"
import TimeRange from "../../../time_range/TimeRange"
import IDuratedEvent from "../../events/IDuratedEvent"
import DuratedEvent from "../../events/DuratedEvent"
import IEventBirdView from "../IEventBirdView"
import { durationMs, timeStampMs } from "../../../basic_types/time"
import AbstractEventBirdViewProvider from './AbstractEventBirdViewProvider'


export class DumbMockEventBirdViewProvider extends AbstractEventBirdViewProvider {

  protected _events:Array<IDuratedEvent> = []

  static DEFAULT_EVENT_DURATION = 60 * 1000
  static DEFAULT_GAP_DURATION = 60 * 1000

  constructor (
    _fullRange: ITimeRange,
    eventDuration: durationMs = DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION,
    gapDuration: durationMs = DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION,
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
      this._events.push(new DuratedEvent(this._fullRange.endTime, this._fullRange.endTime + t))
    }
    this._fullRange.endTime += t
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
      this._events.push(new DuratedEvent(t, t + eventDuration))
    }
  }

  protected limitEventsByRange (range: ITimeRange): Array<IDuratedEvent> {
    const result = this._events.filter(
      e => e.endTime >= range.startTime && e.startTime <= range.endTime
    ).map(e => DuratedEvent.fromEvent(e))
    if (result.length) {
      const firstEvent = result[0]
      const lastEvent = result[result.length - 1]
      firstEvent.startTime = Math.max(firstEvent.startTime, range.startTime)
      lastEvent.endTime = Math.min(lastEvent.endTime, range.endTime)
    }
    return result.filter(e => e.duration)
  }
}

export default DumbMockEventBirdViewProvider
