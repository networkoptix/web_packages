import AbstractRanger from "../abstract/AbstractRanger"
import TimeRange from "../../timeRanges/TimeRange"
import IRangerControls from "../abstract/IRangerControls"
import IRangerStatus from "../abstract/IRangerStatus"
import DegenerateRangerControls from "./DegenerateRangerControls"
import DegenerateRangerStatus from "./DegenerateRangerStatus"
// import DebugRenderer from "../../renderers/DebugRenderer"


export class DegenerateRanger extends AbstractRanger {

  public readonly fullRange: TimeRange
  public readonly visibleRange: TimeRange  

  public readonly controls: IRangerControls
  public readonly status: IRangerStatus
  
  constructor (
    protected archiveRange: TimeRange,
    protected ctx: CanvasRenderingContext2D,
  ) {
    super()
    this.fullRange = archiveRange
    this.visibleRange = TimeRange.fromRange(this.fullRange)
    this.controls = new DegenerateRangerControls(this)
    this.status = new DegenerateRangerStatus(this)
  }  

  public dispose () {    
  }

  public render (debug: boolean = true) {
    if (debug) {
      // DebugRenderer.render(this.ctx, this.visibleRange, this.status)
    }
  }

}

export default DegenerateRanger
