import { timeStampMs, durationMs } from '../../../numberTypeAliases'
import ITimeRange from '../../../timeRanges/ITimeRange'
import IEventBirdView from '../IEventBirdView'

export interface IEventBirdViewProvider {
  getEventBirdView: (visibleRange: ITimeRange, roughness: durationMs) => IEventBirdView
  getNearestTime (t: timeStampMs): timeStampMs
  eventExists: (t: timeStampMs) => boolean
  getNextEventStart: (t: timeStampMs) => timeStampMs
}

export default IEventBirdViewProvider
