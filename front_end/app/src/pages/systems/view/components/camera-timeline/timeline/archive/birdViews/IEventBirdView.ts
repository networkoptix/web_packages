import ITimeRange from '../../timeRanges/ITimeRange'
import IEvent from '../events/IEvent'
import { uint } from '../../numberTypeAliases'

export interface IEventBirdView {
  range: ITimeRange,
  roughness: uint,
  events: Array<IEvent>
}

export default IEventBirdView
