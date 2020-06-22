import { durationMs } from '../numberTypeAliases'
import ITimeRange from './ITimeRange'

export interface IDuratedTimeRange extends ITimeRange {
  duration: durationMs
}

export default IDuratedTimeRange
