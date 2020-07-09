import { timeStampMs, durationMs } from '../../basic_types/time'
import IEvent from './IEvent'


export class Event implements IEvent {

  constructor (
    public startTime: timeStampMs,
    public endTime: timeStampMs,
  ) {
  }

  static fromEvent (event: IEvent): Event {
    return new Event(event.startTime, event.endTime)
  }
}

export default Event
