import IDuratedTimeRange from '../../timeRanges/IDuratedTimeRange'
import IrregularLengthInterval from '../intervals/IrregularLengthInterval'
import RegularLengthInterval from '../intervals/RegularLengthInterval'


export abstract class AbstractIntervalSetProvider {
  constructor (
    protected visibleRange: IDuratedTimeRange
  ) {
  }

  public abstract getIntervals (...arg: any[]): Array<RegularLengthInterval> | Array<IrregularLengthInterval>
}

export default AbstractIntervalSetProvider
