import { durationMs } from '../../numberTypeAliases'
import Event from './Event'
import IEvent from './IEvent'


export class DuratedEvent extends Event {

  public get duration (): durationMs {
    return this.endTime - this.startTime
  }

  static fromEvent (event: IEvent): Event {
    return new DuratedEvent(event.startTime, event.endTime)
  }
}

export default Event
