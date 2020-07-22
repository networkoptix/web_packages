import { durationMs } from '../../basic_types/time'
import Event from './Event'
import IEvent from './IEvent'
import IDuratedEvent from './IDuratedEvent'


export class DuratedEvent extends Event implements IDuratedEvent {

  public get duration (): durationMs {
    return this.endTime - this.startTime
  }

  static fromEvent (event: IEvent): DuratedEvent {
    return new DuratedEvent(event.startTime, event.endTime)
  }
}

export default DuratedEvent
