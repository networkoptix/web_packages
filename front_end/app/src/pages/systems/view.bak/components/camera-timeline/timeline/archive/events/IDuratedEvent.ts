import IEvent from './IEvent'
import { durationMs } from '../../basic_types/time'

export interface IDuratedEvent extends IEvent {
    duration: durationMs
}
export default IDuratedEvent
