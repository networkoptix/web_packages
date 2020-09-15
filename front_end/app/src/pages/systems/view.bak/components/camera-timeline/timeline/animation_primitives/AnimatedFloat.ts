import { float } from '../basic_types/numbers'
import { durationMs, timeStampMs } from '../basic_types/time'
import IAnimated from './IAnimated'


export class AnimatedFloat implements IAnimated<float> {

  protected _value: float
  protected _target: float
  protected _lastChange: timeStampMs

  static DEFAULT_VALUE = 0.0
  static DEFAULT_ANIMATION_DURATION = 200
  static DEFAULT_EASING: 'linear' = 'linear'

  constructor (
    initialValue: float = AnimatedFloat.DEFAULT_VALUE,
    protected _animationDuration: durationMs = AnimatedFloat.DEFAULT_ANIMATION_DURATION,
    protected _easing: 'linear' = AnimatedFloat.DEFAULT_EASING
  ) {
    this.reset(initialValue)
    this._lastChange = 0
  }

  public get value () {
    return this._value
  }

  public get target () {
    return this._target
  }

  public get lastChange () {
    return this._lastChange
  }

  public get animationDuration () {
    return this._animationDuration
  }

  public set animationDuration (newDuration: durationMs) {
    this._animationDuration = newDuration
  }

  public get easing () {
    return this._easing
  }

  public set (v: float) {
    this._value = this._getCurrentValue()
    this._target = v
    this._lastChange = Date.now()
  }

  public get (): float {
    if (this._value === this._target) {
      return this._value
    } else {
      const dt = Date.now() - this._lastChange
      if (dt < this._animationDuration) {
        return this._getCurrentValue(dt)
      } else {
        return this._value = this._target
      }
    }
  }

  public reset (v: float) {
    this._target = this._value = v
    this._lastChange = Date.now()
  }

  public abort () {
    this._target = this._value = this._getCurrentValue()
    this._lastChange = Date.now()
  }

  public force () {
    this._value = this._target
    this._lastChange = Date.now()
  }

  public forceShift (dt: durationMs) {
    this._value += dt
    this._target += dt
  }

  protected _getCurrentValue (dt: durationMs = Date.now() - this._lastChange) {
    switch (this._easing) {
      case 'linear':
      default:
        return this._value + (this._target - this._value) * dt / this._animationDuration
    }
  }

}

export default AnimatedFloat
