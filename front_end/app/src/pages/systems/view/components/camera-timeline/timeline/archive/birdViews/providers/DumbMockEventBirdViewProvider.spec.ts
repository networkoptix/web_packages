import DumbMockEventBirdViewProvider from './DumbMockEventBirdViewProvider'
import TimeRange from '../../../time_range/TimeRange';

describe('DumbMockEventBirdViewProvider', () => {

  const TIMESPAN = 60 * 60 * 1000 // a single hour

  let fr: TimeRange
  let bvp: DumbMockEventBirdViewProvider
  
  beforeEach(() => {
    fr = new TimeRange(0, TIMESPAN)
    bvp = new DumbMockEventBirdViewProvider(fr)
  });

  // initialization

  it('can be instantiated with correct range', () => {
    expect(typeof DumbMockEventBirdViewProvider).toEqual('function')
    expect(fr.startTime).toEqual(bvp.fullRange.startTime)
    expect(fr.endTime).toEqual(bvp.fullRange.endTime)
    expect(fr.duration).toEqual(bvp.fullRange.duration)
  })

  it('returns the expected bird view', () => {
    let bw = bvp.getEventBirdView(fr)
    expect(bw.range.startTime).toEqual(fr.startTime)
    expect(bw.range.endTime).toEqual(fr.endTime)
    expect(bw.range.duration).toEqual(fr.duration)
    expect(bw.roughness).toEqual(0)
    expect(bw.events.length).toEqual(30)
    bw.events.map(e => {
      expect(e.startTime % (
        DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
        DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION
      )).toEqual(0)
      expect(e.duration).toEqual(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION)
    })
    
    bw = bvp.getEventBirdView(new TimeRange(-2, -1))
    expect(bw.events.length).toEqual(0)

    bw = bvp.getEventBirdView(new TimeRange(
      DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION,
      DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
      DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION
    ))
    expect(bw.events.length).toEqual(0)
    
    bw = bvp.getEventBirdView(new TimeRange(TIMESPAN + 1000, TIMESPAN + 2000))
    expect(bw.events.length).toEqual(0)
  })

  it('basically ignores the roughness param', () => {
    const bw = bvp.getEventBirdView(fr, Infinity)
    expect(bw.range.startTime).toEqual(fr.startTime)
    expect(bw.range.endTime).toEqual(fr.endTime)
    expect(bw.range.duration).toEqual(fr.duration)
    expect(bw.roughness).toEqual(0)
    expect(bw.events.length).toEqual(30)
    bw.events.map(e => {
      expect(e.startTime % (
        DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
        DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION
      )).toEqual(0)
      expect(e.duration).toEqual(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION)
    })    
  })

  it('respects the range param', () => {
    const bw = bvp.getEventBirdView(fr.getSubRange(0, 2.0))
    expect(bw.range.startTime).toEqual(fr.startTime)
    expect(bw.range.endTime).toEqual(Math.round(fr.endTime / 2.0))
    expect(bw.range.duration).toEqual(Math.round(fr.duration / 2))
    expect(bw.roughness).toEqual(0)
    expect(bw.events.length).toEqual(15)
    bw.events.map(e => {
      expect(e.startTime % (
        DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
        DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION
      )).toEqual(0)
      expect(e.duration).toEqual(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION)
    })    
  })

  it('expands correctly after the gap', () => {    
    const prevFrEndTime = fr.endTime
    bvp.expand(TIMESPAN)    
    expect(fr.startTime).toEqual(bvp.fullRange.startTime)
    expect(fr.endTime).toEqual(prevFrEndTime)
    expect(fr.endTime * 2).toEqual(bvp.fullRange.endTime)
    expect(fr.duration * 2).toEqual(bvp.fullRange.duration)
    const bw = bvp.getEventBirdView(bvp.fullRange)
    expect(bw.events.length).toEqual(31)
    expect(bw.events.filter(e =>
      e.startTime % (
        DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
        DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION
      ) || e.duration != DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION
    ).length).toEqual(1)
    expect(bw.events[30].startTime).toEqual(prevFrEndTime)
    expect(bw.events[30].duration).toEqual(TIMESPAN)
  })

  it('expands correctly via the last event extension', () => {    
    const prevFrEndTime = fr.endTime
    bvp = new DumbMockEventBirdViewProvider(fr, TIMESPAN, 0)
    let bw = bvp.getEventBirdView(bvp.fullRange)
    expect(bw.events.length).toEqual(1)
    bvp.expand(TIMESPAN)
    expect(fr.startTime).toEqual(bvp.fullRange.startTime)
    expect(fr.endTime).toEqual(prevFrEndTime)
    expect(fr.endTime * 2).toEqual(bvp.fullRange.endTime)
    expect(fr.duration * 2).toEqual(bvp.fullRange.duration)
    bw = bvp.getEventBirdView(bvp.fullRange)
    expect(bw.events.length).toEqual(1)
    expect(bw.events[0].startTime).toEqual(0)
    expect(bw.events[0].duration).toEqual(TIMESPAN * 2)
  })
  
  it('indicates whether event exists correctly', () => {
    expect(bvp.eventExists(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION / 2)).toBeTrue()
    expect(bvp.eventExists(DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
      DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION / 2)).toBeFalse()
    expect(bvp.eventExists(-1000)).toBeFalse()
    expect(bvp.eventExists(TIMESPAN * 2)).toBeFalse()
  })

  it('get nearest time correctly', () => {
    expect(bvp.getNearestTime(
      DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION / 2)
    ).toEqual(
      DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION / 2
    )
    expect(bvp.getNearestTime(
      DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
      DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION / 2)
    ).toEqual(
      DumbMockEventBirdViewProvider.DEFAULT_EVENT_DURATION +
      DumbMockEventBirdViewProvider.DEFAULT_GAP_DURATION
    )
    expect(bvp.getNearestTime(-1000)).toEqual(0)
    expect(bvp.getNearestTime(TIMESPAN * 2)).toEqual(Infinity)
  })

})
