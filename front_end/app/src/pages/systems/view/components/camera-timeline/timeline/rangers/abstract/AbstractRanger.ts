import TimeRange from '../../timeRanges/TimeRange'
import IRangerControls from './IRangerControls'
import IRangerStatus from './IRangerStatus'


export abstract class AbstractRanger {

  public readonly fullRange: TimeRange
  public readonly visibleRange: TimeRange

  public readonly controls: IRangerControls
  public readonly status: IRangerStatus

  public abstract dispose ()

}

export default AbstractRanger
