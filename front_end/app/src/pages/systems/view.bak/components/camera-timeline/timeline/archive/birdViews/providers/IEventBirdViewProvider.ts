import ITimeRange from "../../../time_range/ITimeRange"
import { durationMs, timeStampMs } from "../../../basic_types/time"
import IEventBirdView from '../IEventBirdView'

export interface IEventBirdViewProvider {
  getEventBirdView: (visibleRange: ITimeRange, roughness: durationMs) => IEventBirdView
  getNearestTime (t: timeStampMs): timeStampMs
  eventExists: (t: timeStampMs) => boolean
  getNextEventStart: (t: timeStampMs) => timeStampMs
}

export default IEventBirdViewProvider
