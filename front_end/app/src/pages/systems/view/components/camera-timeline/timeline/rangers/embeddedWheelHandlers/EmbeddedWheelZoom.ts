import IRangerStatus from '../../rangers/abstract/IRangerStatus'
import IRangerControls from '../../rangers/abstract/IRangerControls'


export class EmbeddedWheelZoom {

  constructor (
    protected canvas: HTMLCanvasElement,
    protected status: IRangerStatus,
    protected controls: IRangerControls,
    protected avoidSimultaneousWheelZoomAndScroll: boolean = true,
  ) {
    this.bindEventHandlers()
  }

  public dispose () {
    this.unbindEventHandlers()
  }

  protected bindEventHandlers () {
    this.canvas.addEventListener('wheel', this.eventHandlers.wheel)
  }

  protected unbindEventHandlers () {
    this.canvas.removeEventListener('wheel', this.eventHandlers.wheel)
  }

  protected eventHandlers = {
    wheel: (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const relativeX = e.offsetX / this.canvas.offsetWidth
      if (!this.avoidSimultaneousWheelZoomAndScroll ||
        (Math.abs(e.deltaX) <= Math.abs(e.deltaY))
      ) {
        this.controls.zoom.atPosition.fine(relativeX, -e.deltaY, false)
      }
    },
  }
}


export default EmbeddedWheelZoom
