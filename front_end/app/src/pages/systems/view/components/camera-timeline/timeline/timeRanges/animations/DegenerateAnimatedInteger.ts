import { int } from '../../numberTypeAliases'
import IAnimated from './IAnimated'


export abstract class DegenerateAnimatedInteger implements IAnimated<int> {

  protected _value: int

  constructor (
    initialValue: int
    // const animationDuration: durationMs = 0
  ) {
    this._value = initialValue
  }

  public set (v: int) {
    this._value = v
  }

  public get () {
    return this._value
  }

  public reset (v: int) {
    this.set(v)
  }

  public abort () {
    // do nothing
  }

  public force () {
    // do nothing
  }

  public forceShift () {
    // do nothing
  }

  public get target () {
    return this._value
  }

}

export default DegenerateAnimatedInteger
