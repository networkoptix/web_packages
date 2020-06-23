import AnimatedWeightedSerif from '../serifs/AnimatedWeightedSerif';
import AnimatedWeightedRegularIntervalSerif from '../serifs/AnimatedWeightedRegularIntervalSerif';
import AnimatedWeightedIrregularIntervalSerif from '../serifs/AnimatedWeightedIrregularIntervalSerif';
import RegularLengthInterval from '../intervals/RegularLengthInterval';
import IrregularLengthInterval from '../intervals/IrregularLengthInterval';
import IDuratedTimeRange from '../../timeRanges/IDuratedTimeRange';


export abstract class AbstractIntervalSetExpander {

  constructor (
    protected visibleRange: IDuratedTimeRange
  ) {
  }

  public abstract expand (
    intervals: Array<RegularLengthInterval> | Array<IrregularLengthInterval>,
    skipIntervals?: Array<RegularLengthInterval> | Array<IrregularLengthInterval>,
    weights?
  ):
    Array<AnimatedWeightedSerif> |
    Array<AnimatedWeightedRegularIntervalSerif> |
    Array<AnimatedWeightedIrregularIntervalSerif>
}

export default AbstractIntervalSetExpander
