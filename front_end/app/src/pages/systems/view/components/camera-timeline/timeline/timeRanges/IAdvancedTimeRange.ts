import { durationMs, float, timeStampMs, percentage } from '../numberTypeAliases'
import IDuratedTimeRange from './IDuratedTimeRange'
import ITimeRange from './ITimeRange'


export interface IAdvancedTimeRange extends IDuratedTimeRange {

  toString (): string

  getSubRange (relativeOffset: percentage, zoomFactor: float): IAdvancedTimeRange

  shift (offsetMs: durationMs): IAdvancedTimeRange

  trim (trimmer: ITimeRange): IAdvancedTimeRange

  expand (extensionMs: durationMs, distribution: percentage): IAdvancedTimeRange
  contract (contractionMs: durationMs, distribution: percentage): IAdvancedTimeRange

  moveToStart (startMs: timeStampMs): IAdvancedTimeRange
  // moveToStart (range: ITimeRange): IAdvancedTimeRange

  moveToEnd (endMs: timeStampMs): IAdvancedTimeRange
  // moveToEnd (range: ITimeRange): IAdvancedTimeRange
}

export default IAdvancedTimeRange
