import Ranger from './Ranger'
import TimeRange from '../time_range/TimeRange'

const sleep = (t) => new Promise(resolve => {
  setTimeout(resolve, t)
})

const CANVAS_WIDTH = 1000
const TIMESPAN = 10 * 365 * 24 * 60 * 60 * 1000 // approx. 10 years
let fullRange: TimeRange
let ranger: Ranger

describe('Ranger', () => {
  
  beforeEach(() => {
    fullRange = new TimeRange(0, TIMESPAN)
    ranger = new Ranger(fullRange, CANVAS_WIDTH)
  });

  // initialization

  it('can be instantiated and initializes the fullRange correctly', () => {
    expect(typeof Ranger).toEqual('function')
    expect(ranger.fullRange.startTime).toEqual(fullRange.startTime)
    expect(ranger.fullRange.endTime).toEqual(fullRange.endTime)
    expect(ranger.fullRange.duration).toEqual(fullRange.duration)
  })

  it('safely clones the initial fullRange it was fed with', () => {
    const fullRangeClone = fullRange.clone()
    fullRange.startTime += 1000
    fullRange.endTime += 2000
    
    expect(ranger.fullRange.startTime).not.toEqual(fullRange.startTime)
    expect(ranger.fullRange.endTime).not.toEqual(fullRange.endTime)
    expect(ranger.fullRange.duration).not.toEqual(fullRange.duration)
    
    expect(ranger.fullRange.startTime).toEqual(fullRangeClone.startTime)
    expect(ranger.fullRange.endTime).toEqual(fullRangeClone.endTime)
    expect(ranger.fullRange.duration).toEqual(fullRangeClone.duration)
  })

  it('provides zoom status and starts fully zoomed out', () => {
    expect(ranger.status.zoom.factor).toEqual(1.0)
    expect(ranger.status.zoom.isMin).toBeTrue()
    expect(ranger.status.zoom.isMax).toBeFalse()
    expect(ranger.fullRange.startTime).toEqual(ranger.visibleRange.startTime)
    expect(ranger.fullRange.endTime).toEqual(ranger.visibleRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration)
  })

  it('provides scroll status and starts fully zoomed out', () => {
    expect(ranger.status.scroll.offset.relative).toEqual(0.0)
    expect(ranger.status.scroll.offset.absolute).toEqual(0)
    expect(ranger.status.scroll.isMin).toBeTrue()
    expect(ranger.status.scroll.isMax).toBeTrue()
  })

  // zoom

  it('zooms correctly at center', () => {
    expect(ranger.controls.zoom.atCenter.halve(true)).toBeFalse()
    expect(ranger.controls.zoom.atCenter.fine(0, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(1.0)
    expect(ranger.status.zoom.isMin).toBeTrue()
    expect(ranger.status.zoom.isMax).toBeFalse()
    expect(ranger.fullRange.startTime).toEqual(ranger.visibleRange.startTime)
    expect(ranger.fullRange.endTime).toEqual(ranger.visibleRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration)
    
    expect(ranger.controls.zoom.atCenter.double(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration / 4))
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime - Math.round(ranger.fullRange.duration / 4))
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 2)

    expect(ranger.controls.zoom.atCenter.double(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(4.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration * 3 / 8))
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime - Math.round(ranger.fullRange.duration * 3 / 8))
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 4)

    expect(ranger.controls.zoom.atCenter.halve(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration / 4))
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime - Math.round(ranger.fullRange.duration / 4))
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 2)

    expect(ranger.controls.zoom.atCenter.halve(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(1.0)
    expect(ranger.fullRange.startTime).toEqual(ranger.visibleRange.startTime)
    expect(ranger.fullRange.endTime).toEqual(ranger.visibleRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration)

    expect(ranger.controls.zoom.atCenter.halve(true)).toBeFalse()
    expect(ranger.status.zoom.factor).toEqual(1.0)
    expect(ranger.fullRange.startTime).toEqual(ranger.visibleRange.startTime)
    expect(ranger.fullRange.endTime).toEqual(ranger.visibleRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration)
  })

  it('zooms correctly at left', () => {
    expect(ranger.status.zoom.factor).toEqual(1.0)
    
    expect(ranger.controls.zoom.atLeftEdge.double(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime)
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime - Math.round(ranger.fullRange.duration / 2))
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 2)

    expect(ranger.controls.zoom.atLeftEdge.double(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(4.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime)
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime - Math.round(ranger.fullRange.duration * 3 / 4))
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 4)

    expect(ranger.controls.zoom.atLeftEdge.halve(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime)
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime - Math.round(ranger.fullRange.duration / 2))
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 2)

    expect(ranger.controls.zoom.atLeftEdge.halve(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(1.0)
    expect(ranger.fullRange.startTime).toEqual(ranger.visibleRange.startTime)
    expect(ranger.fullRange.endTime).toEqual(ranger.visibleRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration)

    expect(ranger.controls.zoom.atLeftEdge.halve(true)).toBeFalse()
    expect(ranger.status.zoom.factor).toEqual(1.0)
    expect(ranger.fullRange.startTime).toEqual(ranger.visibleRange.startTime)
    expect(ranger.fullRange.endTime).toEqual(ranger.visibleRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration)
  })

  it('zooms correctly at right', () => {
    expect(ranger.status.zoom.factor).toEqual(1.0)
    
    expect(ranger.controls.zoom.atRightEdge.double(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration / 2))
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 2)

    expect(ranger.controls.zoom.atRightEdge.double(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(4.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration * 3 / 4))
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 4)

    expect(ranger.controls.zoom.atRightEdge.halve(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration / 2))
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 2)

    expect(ranger.controls.zoom.atRightEdge.halve(true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(1.0)
    expect(ranger.fullRange.startTime).toEqual(ranger.visibleRange.startTime)
    expect(ranger.fullRange.endTime).toEqual(ranger.visibleRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration)

    expect(ranger.controls.zoom.atRightEdge.halve(true)).toBeFalse()
    expect(ranger.status.zoom.factor).toEqual(1.0)
    expect(ranger.fullRange.startTime).toEqual(ranger.visibleRange.startTime)
    expect(ranger.fullRange.endTime).toEqual(ranger.visibleRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration)
  })

  it('zooms correctly at position', () => {
    ranger.controls.zoom.atCenter.double(true)
    ranger.controls.zoom.atCenter.double(true)
    
    expect(ranger.controls.zoom.atPosition.halve(0.25, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration * 5 / 16)).toEqual(ranger.visibleRange.startTime)
    expect(ranger.fullRange.endTime - Math.round(ranger.fullRange.duration * 3 / 16)).toEqual(ranger.visibleRange.endTime)
    expect(ranger.fullRange.duration / 2).toEqual(ranger.visibleRange.duration)
    
    expect(ranger.controls.zoom.atPosition.double(0.75, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(4.0)
    expect(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration * 8 / 16)).toEqual(ranger.visibleRange.startTime)
    expect(ranger.fullRange.endTime - Math.round(ranger.fullRange.duration * 4 / 16)).toEqual(ranger.visibleRange.endTime)
    expect(ranger.fullRange.duration / 4).toEqual(ranger.visibleRange.duration)
  })

  it('fine-zooms at center correctly', () => {
    const relative_step = Ranger.DEFAULT_CFG.FINE_ZOOM_STEP
    
    expect(ranger.controls.zoom.atCenter.fine(1, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0 + relative_step, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(relative_step / 2, 2)
    
    expect(ranger.controls.zoom.atCenter.fine(-1, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(0.0, 2)

    expect(ranger.controls.zoom.atCenter.fine(2, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0 + relative_step * 2, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(relative_step, 2)
  })

  it('fine-zooms at the left edge correctly', () => {
    const relative_step = Ranger.DEFAULT_CFG.FINE_ZOOM_STEP
    
    expect(ranger.controls.zoom.atLeftEdge.fine(1, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0 + relative_step, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(0.0, 2)
    
    expect(ranger.controls.zoom.atLeftEdge.fine(-1, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(0.0, 2)

    expect(ranger.controls.zoom.atLeftEdge.fine(2, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0 + relative_step * 2, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(0.0, 2)
  })

  it('fine-zooms at the right edge correctly', () => {
    const relative_step = Ranger.DEFAULT_CFG.FINE_ZOOM_STEP
    
    expect(ranger.controls.zoom.atRightEdge.fine(1, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0 + relative_step, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(relative_step, 2)
    
    expect(ranger.controls.zoom.atRightEdge.fine(-1, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(0.0, 2)

    expect(ranger.controls.zoom.atRightEdge.fine(2, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0 + relative_step * 2, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(2 * relative_step, 2)
  })

  it('fine-zooms at position correctly', () => {
    const relative_step = Ranger.DEFAULT_CFG.FINE_ZOOM_STEP
    
    expect(ranger.controls.zoom.atPosition.fine(0.25, 1, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0 + relative_step, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(relative_step * 0.25, 2)
    
    expect(ranger.controls.zoom.atPosition.fine(0.25, -1, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(0.0, 2)

    expect(ranger.controls.zoom.atPosition.fine(0.75, 2, true)).toBeTrue()
    expect(ranger.status.zoom.factor).toBeCloseTo(1.0 + relative_step * 2, 2)
    expect(ranger.status.scroll.offset.relative).toBeCloseTo(2 * relative_step * 0.75, 2)
  })

  it('max-zooms at center correctly', () => {
    expect(ranger.controls.zoom.atCenter.max(true)).toBeTrue()
    expect(ranger.status.zoom.isMax).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(TIMESPAN / CANVAS_WIDTH)
    expect(ranger.visibleRange.duration).toEqual(CANVAS_WIDTH)
    expect(ranger.status.scroll.offset.absolute).toEqual((TIMESPAN - CANVAS_WIDTH) / 2)
  })

  it('max-zooms at left edge correctly', () => {
    expect(ranger.controls.zoom.atLeftEdge.max(true)).toBeTrue()
    expect(ranger.status.zoom.isMax).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(TIMESPAN / CANVAS_WIDTH)
    expect(ranger.visibleRange.duration).toEqual(CANVAS_WIDTH)
    expect(ranger.status.scroll.offset.absolute).toEqual(0)
  })

  it('max-zooms at right edge correctly', () => {
    expect(ranger.controls.zoom.atRightEdge.max(true)).toBeTrue()
    expect(ranger.status.zoom.isMax).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(TIMESPAN / CANVAS_WIDTH)
    expect(ranger.visibleRange.duration).toEqual(CANVAS_WIDTH)
    expect(ranger.status.scroll.offset.absolute).toEqual(TIMESPAN - CANVAS_WIDTH)
  })

  it('max-zooms at position correctly', () => {
    expect(ranger.controls.zoom.atPosition.max(0.25, true)).toBeTrue()
    expect(ranger.status.zoom.isMax).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(TIMESPAN / CANVAS_WIDTH)
    expect(ranger.visibleRange.duration).toEqual(CANVAS_WIDTH)
    expect(ranger.status.scroll.offset.absolute).toEqual((TIMESPAN - CANVAS_WIDTH) / 4)
  })

  // sroll

  it('scrolls correctly', () => {
    expect(ranger.controls.scroll.screens(1, true)).toBeFalse()
    expect(ranger.controls.scroll.screens(-1, true)).toBeFalse()
    expect(ranger.controls.scroll.fine(0, true)).toBeTrue()
    expect(ranger.status.scroll.offset.relative).toEqual(0.0)
    expect(ranger.status.scroll.offset.absolute).toEqual(0)
    expect(ranger.status.scroll.isMin).toBeTrue()
    expect(ranger.status.scroll.isMax).toBeTrue()

    ranger.controls.zoom.atCenter.double(true)
    expect(ranger.status.scroll.offset.relative).toEqual(0.25)
    expect(ranger.status.scroll.offset.absolute).toEqual(Math.round(TIMESPAN / 4))
    expect(ranger.status.scroll.isMin).toBeFalse()
    expect(ranger.status.scroll.isMax).toBeFalse()

    ranger.controls.scroll.screens(1, true)
    expect(ranger.status.scroll.offset.relative).toEqual(0.5)
    expect(ranger.status.scroll.offset.absolute).toEqual(Math.round(TIMESPAN / 2))
    expect(ranger.status.scroll.isMin).toBeFalse()
    expect(ranger.status.scroll.isMax).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration / 2))
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 2)

    ranger.controls.scroll.screens(-1, true)
    expect(ranger.status.scroll.offset.relative).toEqual(0)
    expect(ranger.status.scroll.offset.absolute).toEqual(0)
    expect(ranger.status.scroll.isMin).toBeTrue()
    expect(ranger.status.scroll.isMax).toBeFalse()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime)
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime - Math.round(ranger.fullRange.duration / 2))
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 2)

    ranger.controls.scroll.jump.relative(0.25, true)
    expect(ranger.status.scroll.offset.relative).toEqual(0.25)
    expect(ranger.status.scroll.offset.absolute).toEqual(Math.round(TIMESPAN / 4))
    expect(ranger.status.scroll.isMin).toBeFalse()
    expect(ranger.status.scroll.isMax).toBeFalse()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration / 4))
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime - Math.round(ranger.fullRange.duration / 4))
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 2)

    ranger.controls.scroll.max(1, true)
    expect(ranger.status.scroll.offset.relative).toEqual(0.5)
    expect(ranger.status.scroll.offset.absolute).toEqual(Math.round(TIMESPAN / 2))
    expect(ranger.status.scroll.isMin).toBeFalse()
    expect(ranger.status.scroll.isMax).toBeTrue()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration / 2))
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 2)

    ranger.controls.scroll.jump.relative(0.25, true)
    ranger.controls.scroll.screens(-1, true)
    expect(ranger.controls.scroll.fine(0, true)).toBeTrue()
    expect(ranger.status.scroll.offset.relative).toEqual(0.0)
    expect(ranger.status.scroll.offset.absolute).toEqual(0)
    expect(ranger.status.scroll.isMin).toBeTrue()
    expect(ranger.status.scroll.isMax).toBeFalse()

    ranger.controls.scroll.jump.duration(TIMESPAN / 4, true)
    expect(ranger.status.scroll.offset.relative).toEqual(0.25)
    expect(ranger.status.scroll.offset.absolute).toEqual(Math.round(TIMESPAN / 4))
    expect(ranger.status.scroll.isMin).toBeFalse()
    expect(ranger.status.scroll.isMax).toBeFalse()
    expect(ranger.status.zoom.factor).toEqual(2.0)
    expect(ranger.visibleRange.startTime).toEqual(ranger.fullRange.startTime + Math.round(ranger.fullRange.duration / 4))
    expect(ranger.visibleRange.endTime).toEqual(ranger.fullRange.endTime - Math.round(ranger.fullRange.duration / 4))
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration * 2)

  })

  // resolution

  it('has correct initial resolution status', () => {
    expect(ranger.status.resolution.msPerPx).toEqual(TIMESPAN / CANVAS_WIDTH)
    expect(ranger.status.resolution.pxPerMs).toEqual(CANVAS_WIDTH / TIMESPAN)
  })

  it('handles canvas width change correctly', () => {
    ranger.canvasWidth = 2000
    expect(ranger.status.resolution.msPerPx).toEqual(TIMESPAN / 2000)
    expect(ranger.status.resolution.pxPerMs).toEqual(2000 / TIMESPAN)
    expect(ranger.status.zoom.factor).toEqual(1.0)
    expect(ranger.status.zoom.isMin).toBeTrue()
    expect(ranger.status.zoom.isMax).toBeFalse()
    expect(ranger.fullRange.startTime).toEqual(ranger.visibleRange.startTime)
    expect(ranger.fullRange.endTime).toEqual(ranger.visibleRange.endTime)
    expect(ranger.fullRange.duration).toEqual(ranger.visibleRange.duration)
    expect(ranger.status.scroll.offset.relative).toEqual(0.0)
    expect(ranger.status.scroll.offset.absolute).toEqual(0)
    expect(ranger.status.scroll.isMin).toBeTrue()
    expect(ranger.status.scroll.isMax).toBeTrue()
  })

  it('reflects on resolution status correctly on zoom', () => {
    ranger.controls.zoom.atCenter.double(true)
    expect(ranger.status.resolution.msPerPx).toEqual(0.5 * TIMESPAN / CANVAS_WIDTH)
    expect(ranger.status.resolution.pxPerMs).toEqual(2 * CANVAS_WIDTH / TIMESPAN)
    
    ranger.controls.zoom.atCenter.double(true)
    expect(ranger.status.resolution.msPerPx).toEqual(0.25 * TIMESPAN / CANVAS_WIDTH)
    expect(ranger.status.resolution.pxPerMs).toEqual(4 * CANVAS_WIDTH / TIMESPAN)
    
    ranger.controls.scroll.max(1, true)
    expect(ranger.status.resolution.msPerPx).toEqual(0.25 * TIMESPAN / CANVAS_WIDTH)
    expect(ranger.status.resolution.pxPerMs).toEqual(4 * CANVAS_WIDTH / TIMESPAN)
    
    ranger.controls.scroll.max(-1, true)
    expect(ranger.status.resolution.msPerPx).toEqual(0.25 * TIMESPAN / CANVAS_WIDTH)
    expect(ranger.status.resolution.pxPerMs).toEqual(4 * CANVAS_WIDTH / TIMESPAN)

    ranger.controls.scroll.jump.relative(0.5, true)
    expect(ranger.status.resolution.msPerPx).toEqual(0.25 * TIMESPAN / CANVAS_WIDTH)
    expect(ranger.status.resolution.pxPerMs).toEqual(4 * CANVAS_WIDTH / TIMESPAN)
    
    ranger.controls.zoom.atCenter.halve(true)
    expect(ranger.status.resolution.msPerPx).toEqual(0.5 * TIMESPAN / CANVAS_WIDTH)
    expect(ranger.status.resolution.pxPerMs).toEqual(2 * CANVAS_WIDTH / TIMESPAN)

    ranger.controls.zoom.reset()
    expect(ranger.status.resolution.msPerPx).toEqual(TIMESPAN / CANVAS_WIDTH)
    expect(ranger.status.resolution.pxPerMs).toEqual(CANVAS_WIDTH / TIMESPAN)
  })

})
