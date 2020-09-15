import ITimeRange from '../time_range/ITimeRange'
import IRangerControls from './IRangerControls'
import IRangerStatus from './IRangerStatus'
import { int } from '../basic_types/numbers'

/**
 * Ranger class handles both full and visible *range*,
 * handling zooming, scrolling and similar matters.
 * 
 * It is implemented as a top-level wrapper, exporting
 * * two interfaces: *status*, for reading the current situation,
 * * and *controls* for requesting changes
 */
export abstract class AbstractRanger {

  public readonly fullRange: ITimeRange
  public readonly visibleRange: ITimeRange
  public canvasWidth: int

  public readonly controls: IRangerControls
  public readonly status: IRangerStatus

  public abstract dispose ()

}

export default AbstractRanger
