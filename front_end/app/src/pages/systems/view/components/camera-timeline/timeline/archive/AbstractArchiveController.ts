import IDuratedTimeRange from '../timeRanges/IDuratedTimeRange';
import { timeStampMs } from '../numberTypeAliases';


export abstract class AbstractArchiveController {

  constructor (
    protected archiveRange: IDuratedTimeRange,
    protected visibleRange: IDuratedTimeRange,
  ) {
  }

  public abstract dispose ()

  public abstract render (debug: boolean)

  public abstract getNearestTime (t: timeStampMs)
}

export default AbstractArchiveController
