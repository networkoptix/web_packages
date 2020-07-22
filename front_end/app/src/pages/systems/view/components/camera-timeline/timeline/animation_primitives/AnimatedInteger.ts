import { int } from '../basic_types/numbers'
import { durationMs } from '../basic_types/time'
import IAnimated from './IAnimated'
import AnimatedFloat from './AnimatedFloat'


export class AnimatedInteger extends AnimatedFloat implements IAnimated<int> {

  static DEFAULT_VALUE = 0
  static DEFAULT_ANIMATION_DURATION = 200

  constructor (
    initialValue: int = AnimatedInteger.DEFAULT_VALUE,
    protected _animationDuration: durationMs = AnimatedInteger.DEFAULT_ANIMATION_DURATION,
    protected _easing: 'linear' = AnimatedInteger.DEFAULT_EASING
  ) {
    super(initialValue, _animationDuration, _easing)
  }

  public set (v: int) {
    super.set(v)
    this._target = Math.round(v)
  }
  
  public reset (v: int) {
    this._target = this._value = Math.round(v)
    this._lastChange = Date.now()
  }
  
  public forceShift (delta: durationMs) {
    delta = Math.round(delta)
    super.forceShift(delta)
  }

  protected _getCurrentValue (dt: durationMs = Date.now() - this._lastChange) {
    return Math.round(super._getCurrentValue(dt))
  }

}

export default AnimatedInteger
