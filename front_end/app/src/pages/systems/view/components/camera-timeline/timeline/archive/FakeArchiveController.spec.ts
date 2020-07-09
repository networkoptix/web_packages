import FakeArchiveController from './FakeArchiveController'
import DumbMockEventBirdViewProvider from './birdViews/providers/DumbMockEventBirdViewProvider'
import { int, uint } from '../basic_types/numbers';
import TimeRange from '../time_range/TimeRange';

const mockCtx = {
  canvas: {
    width: 1000,
    height: 100,
  },
  fillStyle: 'original_fill_style',
  fillRect: (x: int, y: int, w: uint, h: uint) => {}
}

describe('FakeArchiveController', () => {

  const TIMESPAN = 60 * 60 * 1000 // a single hour

  let fr: TimeRange
  let vr: TimeRange
  let fac: FakeArchiveController

  beforeEach(() => {
    fr = new TimeRange(0, TIMESPAN)
    vr = fr.clone()
    // @ts-ignore
    fac = new FakeArchiveController(fr, vr, mockCtx as CanvasRenderingContext2D)
  });

  it('can be instantiated', () => {
    expect(typeof FakeArchiveController).toEqual('function')
  })

  it('proxies getNearestTime', () => {
    const p = new DumbMockEventBirdViewProvider(fr)
    expect(fac.getNearestTime(-1000)).toEqual(p.getNearestTime(-1000))
    expect(fac.getNearestTime(0)).toEqual(p.getNearestTime(0))
    expect(
      fac.getNearestTime(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION / 2)
    ).toEqual(
      p.getNearestTime(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION / 2)
    )
    expect(
      fac.getNearestTime(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
        DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION / 2)
    ).toEqual(
      p.getNearestTime(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
        DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION / 2)
    )
    expect(fac.getNearestTime(TIMESPAN + 1000)).toEqual(p.getNearestTime(TIMESPAN + 1000))
  })

  it('seems to render correctly', () => {    
    spyOn(mockCtx, 'fillRect')
    fac.render()
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(30)
    expect(mockCtx.fillStyle).toEqual('original_fill_style')
  })

})
