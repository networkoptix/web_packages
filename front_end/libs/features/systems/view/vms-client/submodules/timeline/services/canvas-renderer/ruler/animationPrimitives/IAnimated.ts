/**
 * Values of various data types may be animated,
 * that's why we have this generalizing interface.
 */
export interface IAnimated<T> {
    set(v: T): void;

    get(): T;

    reset(v: T): void;

    abort(): void;

    force(): void;

    forceShift(v: T): void;

    target: T;
}
