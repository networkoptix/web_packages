import ITimeRange from '../../time_range/ITimeRange'
import { uint } from '../../basic_types/numbers'
import IDuratedEvent from '../events/IDuratedEvent'

export interface IEventBirdView {
  range: ITimeRange,
  roughness: uint,
  events: Array<IDuratedEvent>
}

export default IEventBirdView
