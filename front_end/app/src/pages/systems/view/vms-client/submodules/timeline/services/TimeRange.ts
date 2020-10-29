import { float, ms } from '../../../utils/type-aliases'
import IrregularLengthInterval from './canvas-renderer/ruler/intervals/IrregularLengthInterval'
import alignTimeStamp from './canvas-renderer/ruler/intervals/utils/alignTimeStamp'


export class TimeRange {

  constructor (
    public start: ms,
    public end: ms,
  ) {
  }

  public get duration (): ms {
    return this.end - this.start
  }

  public shift (offset: ms) {
    this.start += offset
    this.end += offset
  }

  public moveStartTo (s: ms) {
    const duration = this.duration
    this.start = s
    this.end = s + duration
  }

  public zoom (durationDelta: ms, offset: float = 0.5, limitingRange: TimeRange) {

    this.start += Math.round(durationDelta * offset)
    this.end -= Math.round(durationDelta * (1.0 - offset))
    if (this.start < limitingRange.start) {
        this.start = limitingRange.start
    }
    if (this.end > limitingRange.end) {
        this.end = limitingRange.end
    }
  }

  public clone () {
    return new TimeRange(this.start, this.end)
  }

  public iterate (interval: IrregularLengthInterval): Array<ms> {
    const start = alignTimeStamp(this.start, interval, 'left')
    const end = alignTimeStamp(this.end, interval, 'right')
    // console.log('ITERATE', interval, this.start, this.end, start, end)
    // console.log(new Date(this.start), new Date(this.end), new Date(start), new Date(end))
    const result = []
    for (let i = start; i <= end; i = alignTimeStamp(i, interval, 'right')) {
      result.push(i)
    }
    return result
  }

}

export default TimeRange
