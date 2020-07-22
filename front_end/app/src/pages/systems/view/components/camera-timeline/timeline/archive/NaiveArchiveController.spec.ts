import NaiveArchiveController from './NaiveArchiveController'
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

describe('NaiveArchiveController', () => {

  const TIMESPAN = 60 * 60 * 1000 // a single hour

  let p: DumbMockEventBirdViewProvider
  let fr: TimeRange
  let vr: TimeRange
  let nac: NaiveArchiveController

  beforeEach(() => {
    fr = new TimeRange(0, TIMESPAN)
    vr = fr.clone()
    p = new DumbMockEventBirdViewProvider(fr)
    // @ts-ignore
    nac = new NaiveArchiveController(fr, vr, mockCtx as CanvasRenderingContext2D, p)
  });

  it('can be instantiated', () => {
    expect(typeof NaiveArchiveController).toEqual('function')
  })

  it('proxies getNearestTime', () => {    
    expect(nac.getNearestTime(-1000)).toEqual(p.getNearestTime(-1000))
    expect(nac.getNearestTime(0)).toEqual(p.getNearestTime(0))
    expect(
      nac.getNearestTime(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION / 2)
    ).toEqual(
      p.getNearestTime(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION / 2)
    )
    expect(
      nac.getNearestTime(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
        DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION / 2)
    ).toEqual(
      p.getNearestTime(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
        DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION / 2)
    )
    expect(nac.getNearestTime(TIMESPAN + 1000)).toEqual(p.getNearestTime(TIMESPAN + 1000))
  })

  it('seems to render correctly', () => {    
    spyOn(mockCtx, 'fillRect')
    nac.render()
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(30)
    expect(mockCtx.fillStyle).toEqual('original_fill_style')
  })

})
