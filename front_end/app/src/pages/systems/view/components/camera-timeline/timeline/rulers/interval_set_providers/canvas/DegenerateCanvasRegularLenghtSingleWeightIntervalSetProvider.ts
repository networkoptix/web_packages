import AbstractCanvasIntervalSetProvider from './AbstractCanvasIntervalSetProvider'
import RegularLengthInterval from '../../intervals/RegularLengthInterval'
import regularLengthIntervals from '../../intervals/regularLengthIntervals'


export class DegenerateCanvasRegularLenghtSingleWeightIntervalSetProvider extends AbstractCanvasIntervalSetProvider {

  public getIntervals (): Array<RegularLengthInterval> {
    return [regularLengthIntervals[regularLengthIntervals.length / 2]]
  }
}

export default DegenerateCanvasRegularLenghtSingleWeightIntervalSetProvider
