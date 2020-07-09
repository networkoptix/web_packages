import ITimeRange from '../time_range/ITimeRange';
import { timeStampMs } from '../basic_types/time';


export abstract class AbstractArchiveController {

  constructor (
    protected archiveRange: ITimeRange,
    protected visibleRange: ITimeRange,
  ) {
  }

  public abstract dispose ()

  public abstract render (debug: boolean)

  public abstract getNearestTime (t: timeStampMs)
}

export default AbstractArchiveController
