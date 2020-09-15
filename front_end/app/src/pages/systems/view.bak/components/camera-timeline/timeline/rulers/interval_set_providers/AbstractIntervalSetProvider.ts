import ITimeRange from '../../time_range/ITimeRange'
import IrregularLengthInterval from '../intervals/IrregularLengthInterval'
import RegularLengthInterval from '../intervals/RegularLengthInterval'


export abstract class AbstractIntervalSetProvider {
  constructor (
    protected visibleRange: ITimeRange
  ) {
  }

  public abstract getIntervals (...arg: any[]): Array<RegularLengthInterval> | Array<IrregularLengthInterval>
}

export default AbstractIntervalSetProvider
