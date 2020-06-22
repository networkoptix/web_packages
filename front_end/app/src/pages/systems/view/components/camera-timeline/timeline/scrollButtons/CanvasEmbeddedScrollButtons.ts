import IRangerStatus from '../rangers/abstract/IRangerStatus'
import IRangerControls from '../rangers/abstract/IRangerControls'
import AbstractScrollButtons from './AbstractScrollButtons'


export class EmbeddedScrollButtons extends AbstractScrollButtons {

  constructor (
    protected status: IRangerStatus,
    protected controls: IRangerControls,
    protected canvas: HTMLCanvasElement,
    protected SCROLL_BUTTONS_RELATIVE_HEIGHT = 0.9,
    protected SCROLL_BUTTONS_WIDTH = 50,
    protected SCROLL_BUTTON_AS_FINE_STEPS = 5
  ) {
    super(status, controls)
    this.bindEventHandlers()

    const handleScroll = () => {
      requestAnimationFrame(handleScroll)
      this.eventHandlers.scrollButtons.progress()
    }
    requestAnimationFrame(handleScroll)
  }

  public render (debug: boolean = false) {

    const ctx = this.canvas.getContext('2d')
    const status = this.status
    const SCROLL_BUTTONS_WIDTH = this.SCROLL_BUTTONS_WIDTH
    const SCROLL_BUTTONS_RELATIVE_HEIGHT = this.SCROLL_BUTTONS_RELATIVE_HEIGHT

    const h = ctx.canvas.height * SCROLL_BUTTONS_RELATIVE_HEIGHT

    const oldFillStyle = ctx.fillStyle

    ctx.fillStyle = '#000000aa'
    if (!status.scroll.isMin) {
      ctx.fillRect(0, 0, SCROLL_BUTTONS_WIDTH, h)
    }
    if (!status.scroll.isMax) {
      ctx.fillRect(ctx.canvas.width - SCROLL_BUTTONS_WIDTH, 0, SCROLL_BUTTONS_WIDTH, h)
    }

    ctx.fillStyle = oldFillStyle
  }

  protected bindEventHandlers () {
    this.canvas.addEventListener('mousedown', this.eventHandlers.mouse.down)
    document.body.addEventListener('mouseup', this.eventHandlers.mouse.up)
    document.body.addEventListener('mouseleave', this.eventHandlers.mouse.leave)
  }

  protected unbindEventHandlers () {
    this.canvas.removeEventListener('mousedown', this.eventHandlers.mouse.down)
    document.body.removeEventListener('mouseup', this.eventHandlers.mouse.up)
    document.body.removeEventListener('mouseleave', this.eventHandlers.mouse.leave)
  }

  protected isMouseEventInsideScrollButton (e: MouseEvent) {
    if (e.offsetY > this.SCROLL_BUTTONS_RELATIVE_HEIGHT * this.canvas.offsetHeight) {
      return 0
    }
    if (e.offsetX > this.canvas.offsetWidth - this.SCROLL_BUTTONS_WIDTH) {
      return 1
    }
    if (e.offsetX < this.SCROLL_BUTTONS_WIDTH) {
      return -1
    }
    return 0
  }

  protected eventHandlers = {
    mouse: {
      down: (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const direction = this.isMouseEventInsideScrollButton(e)
        if (direction) {
          this.eventHandlers.scrollButtons.start(direction)
        }
      },
      up: (e: MouseEvent) => {
        this.eventHandlers.scrollButtons.finish(e)
      },
      leave: (e: MouseEvent) => {
        this.eventHandlers.scrollButtons.finish(e)
      },
    },

    scrollButtons: {
      start: (direction: -1 | 1) => {
        this.scrollState.direction = direction
      },
      finish: (e: MouseEvent) => {
        this.scrollState.direction = 0
      },
      progress: () => {
        this.controls.scroll.fine(this.scrollState.direction * this.SCROLL_BUTTON_AS_FINE_STEPS, false)
      }
    }
  }

  protected scrollState = {
    direction: 0,
  }
}


export default EmbeddedScrollButtons
