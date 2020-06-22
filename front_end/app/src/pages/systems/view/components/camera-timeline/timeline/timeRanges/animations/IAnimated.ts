export interface IAnimated<T> {
  set (v: T)
  get (): T
  reset (v: T)
  abort ()
  force ()
  forceShift (v: T)
  target: T
}

export default IAnimated
