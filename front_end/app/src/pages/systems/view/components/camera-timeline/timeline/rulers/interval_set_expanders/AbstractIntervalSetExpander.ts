import AnimatedWeightedSerif from '../serifs/AnimatedWeightedSerif';
import AnimatedWeightedRegularIntervalSerif from '../serifs/AnimatedWeightedRegularIntervalSerif';
import AnimatedWeightedIrregularIntervalSerif from '../serifs/AnimatedWeightedIrregularIntervalSerif';
import RegularLengthInterval from '../intervals/RegularLengthInterval';
import IrregularLengthInterval from '../intervals/IrregularLengthInterval';
import ITimeRange from '../../time_range/ITimeRange';


/**
 * what enters is a list of intervals
 * ("[per 1s, per 5s, per 10s, per 30s]")
 * what comes out is a list of timestamps and serif weights
 * ("[(0, small tick), (1, ditto), ..., (5, medium tick), ...")
 */
export abstract class AbstractIntervalSetExpander {

  constructor (
    protected visibleRange: ITimeRange
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
