import { float, percentage } from '../basic_types/numbers'
import { durationMs, timeStampMs } from '../basic_types/time'


/**
 * TimeRange is a rather obvious name. 
 * The interface is here so that we could support both static and animated implementation.
 */
interface ITimeRange {

  // one of these three is supposed to be implemented via getter
  startTime: timeStampMs
  endTime: timeStampMs
  duration: durationMs

  toString (): string

  clone (): ITimeRange  
  // public static abstract fromRange (range: ITimeRange): ITimeRange;

  reset (range: ITimeRange): ITimeRange
  getSubRange (relativeOffset: percentage, zoomFactor: float): ITimeRange
  shift (offsetMs: durationMs, skipAnimation: boolean): ITimeRange
  trim (trimmer: ITimeRange, skipAnimation: boolean): ITimeRange
  expand (extensionMs: durationMs, distribution: percentage, skipAnimation: boolean): ITimeRange
  contract (contractionMs: durationMs, distribution: percentage, skipAnimation: boolean): ITimeRange
  moveToStart (startMs: timeStampMs, skipAnimation: boolean): ITimeRange
  moveToEnd (endMs: timeStampMs, skipAnimation: boolean): ITimeRange
}

export default ITimeRange
