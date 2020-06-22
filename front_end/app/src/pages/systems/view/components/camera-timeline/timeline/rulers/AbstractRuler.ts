import IDuratedTimeRange from '../timeRanges/IDuratedTimeRange'
import AbstractIntervalSetProvider from './interval_set_providers/AbstractIntervalSetProvider'
import AbstractIntervalSetExpander from './interval_set_expanders/AbstractIntervalSetExpander'


export abstract class AbstractRuler {

  protected intervalSetProvider: AbstractIntervalSetProvider
  protected intervalSetExpander: AbstractIntervalSetExpander

  constructor (
    protected visibleRange: IDuratedTimeRange,
  ) {
  }

  public abstract render (debug: boolean)

  public abstract dispose ()
}

export default AbstractRuler
