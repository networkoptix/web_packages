import { int, durationMs, timeStampMs } from '../../numberTypeAliases'
import IAnimated from './IAnimated'


export class AnimatedInteger implements IAnimated<int> {

  protected _value: int
  protected _targetValue: int
  protected _lastChange: timeStampMs

  constructor (
    initialValue: int,
    protected _animationDuration: durationMs = 100,
    protected _easing: 'linear' = 'linear'
  ) {
    this.reset(initialValue)
  }

  public set (v: int) {
    this._value = this._getCurrentValue()
    this._targetValue = Math.round(v)
    this._lastChange = performance.now()
  }

  public get (): int {
    if (this._value === this._targetValue) {
      return this._value
    } else {
      const now = performance.now()
      const dt = performance.now() - this._lastChange
      if (dt < this._animationDuration) {
        return this._getCurrentValue(dt)
      } else {
        return this._value = this._targetValue
      }
    }
  }

  public reset (v: int) {
    this._targetValue = this._value = Math.round(v)
    this._lastChange = performance.now()
  }

  public abort () {
    this._targetValue = this._value = this._getCurrentValue()
    this._lastChange = performance.now()
  }

  public force () {
    this._value = this._targetValue
    this._lastChange = performance.now()
  }

  public forceShift (dt: durationMs) {
    this._value += dt
    this._targetValue += dt
  }

  public get target () {
    return this._targetValue
  }


  protected _getCurrentValue (dt: durationMs = performance.now() - this._lastChange) {
    switch (this._easing) {
      case 'linear':
      default:
        return this._value + (this._targetValue - this._value) * dt / this._animationDuration
    }
  }

}

export default AnimatedInteger
