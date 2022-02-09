/**
 * Values of various data types may be animated,
 * that's why we have this generalizing interface.
 */
export interface IAnimated<T> {
    set(v: T)

    get(): T

    reset(v: T)

    abort()

    force()

    forceShift(v: T)

    target: T
}
