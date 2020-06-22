import ITimeRange from "../../../timeRanges/ITimeRange"
import TimeRange from "../../../timeRanges/TimeRange"
import IEvent from '../../events/IEvent'
import Event from "../../events/Event"
import AbstractEventBirdViewProvider from "./AbstractEventBirdViewProvider"
import IEventBirdView from "../IEventBirdView"
import { timeStampMs } from "../../../numberTypeAliases"


export class ProxyEventBirdViewProvider extends AbstractEventBirdViewProvider {

  constructor (
    protected birdView: IEventBirdView
  ) {
    super(birdView.range)
    console.log('right after the abstract constructor')
  }

  public getEventBirdView (visibleRange: ITimeRange): IEventBirdView {
    return {
      range: TimeRange.fromRange(visibleRange),
      roughness: 0,
      events: this.limitEventsByRange(visibleRange)
    }
  }

  protected get _events () {
    return this.birdView.events
  }

  protected get _fullRange () {
    return this.birdView.range
  }

  protected set _fullRange (_: ITimeRange) {
    // do nothing, it's for abstract class consistency's sake only
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

export default ProxyEventBirdViewProvider
