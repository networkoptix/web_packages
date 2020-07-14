import IRangerStatus from '../ranger/IRangerStatus'
import IRangerControls from '../ranger/IRangerControls'
import AbstractScrollBar from './AbstractScrollBar'


export class CanvasEmbeddedScrollBar extends AbstractScrollBar {

  static DEFAULT_MIN_SCROLL_WIDTH = 50 * (typeof(window) === 'object' ? window.devicePixelRatio || 1 : 1)
  static DEFAULT_SCROLL_BAR_RELATIVE_Y = 0.84
  static DEFAULT_SCROLL_BAR_RELATIVE_H = 0.15
  static DEFAULT_SCROLL_BAR_AS_FINE_STEPS = 3

  constructor (
    protected status: IRangerStatus,
    protected controls: IRangerControls,
    protected canvas: HTMLCanvasElement,
    protected MIN_SCROLL_WIDTH = CanvasEmbeddedScrollBar.DEFAULT_MIN_SCROLL_WIDTH,
    protected SCROLL_BAR_RELATIVE_Y = CanvasEmbeddedScrollBar.DEFAULT_SCROLL_BAR_RELATIVE_Y,
    protected SCROLL_BAR_RELATIVE_H = CanvasEmbeddedScrollBar.DEFAULT_SCROLL_BAR_RELATIVE_H,
    protected SCROLL_BAR_AS_FINE_STEPS = CanvasEmbeddedScrollBar.DEFAULT_SCROLL_BAR_AS_FINE_STEPS,
  ) {
    super(status, controls)
    this.bindEventHandlers()

    if (typeof(requestAnimationFrame) !== 'undefined') {
      const handleScroll = () => {
        requestAnimationFrame(handleScroll)
        this.eventHandlers.scrolling.progress()
      }
      requestAnimationFrame(handleScroll)
    }
  }

  public render (debug: boolean = false) {
    const ctx = this.canvas.getContext('2d')
    const status = this.status
    const MIN_SCROLL_WIDTH = this.MIN_SCROLL_WIDTH


    const fw = ctx.canvas.width
    const aSW = fw / status.zoom.factor // actual scroll width
    const vSW = Math.max(aSW, MIN_SCROLL_WIDTH) // visible scroll width
    const dSW = vSW - aSW // scroll width delta, always non-negative, matters if positive

    const aO = status.scroll.offset.relative // actual offset
    const dO = dSW / fw * aO // offset delta
    const vO = aO - dO // visible offset
    let x = fw * vO

    const y = ctx.canvas.height * this.SCROLL_BAR_RELATIVE_Y
    const h = ctx.canvas.height * this.SCROLL_BAR_RELATIVE_H

    const oldFillStyle = ctx.fillStyle

    ctx.fillStyle = '#95a7b1'
    ctx.fillRect(x, y, vSW, h)

    if (debug && dSW) {
      ctx.fillStyle = 'red'
      ctx.fillRect(fw * aO, y, aSW, h)
    }

    ctx.fillStyle = oldFillStyle

    // drawing texture
    const oldStrokeStyle = ctx.strokeStyle
    ctx.strokeStyle = '#698796'

    const scrollbarCenterX = Math.round(x + vSW / 2)
    const textureStepPx = 4 * (typeof(window) === 'object' ? window.devicePixelRatio || 1 : 1)
    const textureMarginPx = 1 * (typeof(window) === 'object' ? window.devicePixelRatio || 1 : 1)
    ctx.beginPath()
    ctx.moveTo(scrollbarCenterX - textureStepPx, y + textureMarginPx)
    ctx.lineTo(scrollbarCenterX - textureStepPx, y + h - 2 * textureMarginPx)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(scrollbarCenterX, y + textureMarginPx)
    ctx.lineTo(scrollbarCenterX, y + h - 2 * textureMarginPx)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(scrollbarCenterX + textureStepPx, y + textureMarginPx)
    ctx.lineTo(scrollbarCenterX + textureStepPx, y + h - 2 * textureMarginPx)
    ctx.stroke()

    ctx.strokeStyle = oldStrokeStyle
  }

  protected bindEventHandlers () {
    this.canvas.addEventListener('mousedown', this.eventHandlers.mouse.down)
    this.canvas.addEventListener('dblclick', this.eventHandlers.mouse.dblclick)
    if (typeof(document) !== 'undefined') {
      document.body.addEventListener('mousemove', this.eventHandlers.mouse.move)
      document.body.addEventListener('mouseup', this.eventHandlers.mouse.up)
      document.body.addEventListener('mouseleave', this.eventHandlers.mouse.leave)
    }
  }

  protected unbindEventHandlers () {
    this.canvas.removeEventListener('mousedown', this.eventHandlers.mouse.down)
    this.canvas.removeEventListener('dblclick', this.eventHandlers.mouse.dblclick)
    if (typeof(document) !== 'undefined') {
      document.body.removeEventListener('mousemove', this.eventHandlers.mouse.move)
      document.body.removeEventListener('mouseup', this.eventHandlers.mouse.up)
      document.body.removeEventListener('mouseleave', this.eventHandlers.mouse.leave)
    }
  }

  protected get scrollWidth () {
    return Math.max(this.canvas.width / this.status.zoom.factor, this.MIN_SCROLL_WIDTH)
  }

  protected get displayScrollOffset () {
    return this.status.scroll.offset.relative * this.canvas.width
      - (this.scrollWidth - this.canvas.width / this.status.zoom.factor) * this.status.scroll.offset.relative
  }

  protected isMouseEventInScrollBarAreaVertically (e) {
    return e.offsetY > this.canvas.offsetHeight * this.SCROLL_BAR_RELATIVE_Y
  }

  protected isMouseEventInScrollbarSliderHorizontally (e) {
    const displayScrollOffset = this.displayScrollOffset
    const x = e.offsetX * (typeof(window) === 'object' ? window.devicePixelRatio || 1 : 1)
    return x > displayScrollOffset && x < displayScrollOffset + this.scrollWidth
  }

  protected eventHandlers = {
    mouse: {
      down: (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (this.isMouseEventInScrollBarAreaVertically(e)) {
          if (this.isMouseEventInScrollbarSliderHorizontally(e)) {
            this.eventHandlers.drag.init(e)
          } else {
            this.eventHandlers.scrolling.start(e)
          }
        }
      },
      move: (e: MouseEvent) => {
        if (this.dragState.isDragging) {
          e.preventDefault()
          e.stopPropagation()
          this.eventHandlers.drag.progress(e)
        }
      },
      up: (e: MouseEvent) => {
        this.eventHandlers.drag.finish(e)
        this.eventHandlers.scrolling.finish(e)
      },
      leave: (e: MouseEvent) => {
        this.eventHandlers.drag.finish(e)
        this.eventHandlers.scrolling.finish(e)
      },
      dblclick: (e: MouseEvent) => {
        if (this.isMouseEventInScrollBarAreaVertically(e)) {
          if (this.isMouseEventInScrollbarSliderHorizontally(e)) {
            this.controls.zoom.reset()
          }
          else {
            this.eventHandlers.scrolling.jump(e)
          }
        }
      }
    },

    drag: {
      init: (e: MouseEvent) => {
        this.dragState.isDragging = true
        this.dragState.dragAnchor = (e.offsetX * (typeof(window) === 'object' ? window.devicePixelRatio || 1 : 1) - this.status.scroll.offset.relative * this.canvas.width) / this.scrollWidth
      },
      finish: (e: MouseEvent) => {
        this.dragState.isDragging = false
      },
      progress: (e: MouseEvent) => {
        if (this.dragState.isDragging) {
          let newOffset = (e.clientX - this.canvas.getBoundingClientRect().x) / this.canvas.offsetWidth
          newOffset -= this.scrollWidth / this.canvas.width * this.dragState.dragAnchor
          this.controls.scroll.jump.relative(newOffset, true)
        }
      }
    },

    scrolling: {
      start: (e: MouseEvent) => {
        this.scrollingState.targetRelativeOffset = Math.max(
          0,
          (e.offsetX - this.scrollWidth / (typeof(window) === 'object' ? window.devicePixelRatio || 1 : 1) * 0.5) / this.canvas.offsetWidth
        )
        this.scrollingState.direction = this.scrollingState.targetRelativeOffset > this.status.scroll.offset.relative ? +1 : -1
      },
      progress: () => {
        const currentRelativeOffset = this.status.scroll.offset.relative
        if ((this.scrollingState.direction > 0 && currentRelativeOffset < this.scrollingState.targetRelativeOffset) ||
          (this.scrollingState.direction < 0 && currentRelativeOffset > this.scrollingState.targetRelativeOffset)
        ) {
          this.controls.scroll.fine(this.scrollingState.direction * this.SCROLL_BAR_AS_FINE_STEPS, false)
        }
      },
      finish: (e: MouseEvent) => {
        this.scrollingState.direction = 0
      },
      jump: (e: MouseEvent) => {
        const scrollWidth = this.canvas.width / this.status.zoom.factor
        const targetRelativeOffset = Math.max(
          0,
          (e.offsetX - (scrollWidth / (typeof(window) === 'object' ? window.devicePixelRatio || 1 : 1)) * 0.5) / this.canvas.offsetWidth
        )
        this.controls.scroll.jump.relative(targetRelativeOffset, false)
      }
    },
  }

  protected dragState = {
    isDragging: false,
    dragAnchor: -1.0,
  }

  protected scrollingState = {
    direction: 0,
    targetRelativeOffset: -1,
  }

}


export default CanvasEmbeddedScrollBar
