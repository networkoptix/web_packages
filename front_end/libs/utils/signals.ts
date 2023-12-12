/**
 * See note on Immutable type before moving this file.
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
import { effect, EventEmitter, Signal } from '@angular/core';

/**
 * A class that binds signals to component outputs.
 * @param signal$$ - A signal that you want to emit on change.
 * @param skipFirstIfUndefined - prevents the signal's initial value from emitting.
 */
export class SignalEventEmitter<T> extends EventEmitter<T> {
    constructor(signal$$: Signal<T>, skipFirstIfUndefined = true) {
        super();
        effect(
            () => {
                const value = signal$$();
                if (value || !skipFirstIfUndefined) {
                    this.emit(value);
                }
                skipFirstIfUndefined = false;
            },
            { allowSignalWrites: true },
        );
    }
}

// eslint-disable-next-line @typescript-eslint/ban-types
type ImmutablePrimitive = undefined | null | boolean | string | number | Function;

// Don't move this type from this file. It's used within the patch within @angular/core/index.d.ts WritableSignal.update
// If this needs to be moved then the patch will need to be updated.
export type Immutable<T> = T extends ImmutablePrimitive
    ? T
    : T extends Array<infer U>
      ? ImmutableArray<U>
      : T extends Map<infer K, infer V>
        ? ImmutableMap<K, V>
        : T extends Set<infer M>
          ? ImmutableSet<M>
          : ImmutableObject<T>;

export type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
export type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

export type Mutable<T> = T extends ImmutablePrimitive
    ? T
    : T extends ImmutableArray<infer U>
      ? MutableArray<U>
      : T extends ImmutableMap<infer K, infer V>
        ? MutableMap<K, V>
        : T extends ImmutableSet<infer M>
          ? MutableSet<M>
          : MutableObject<T>;

export type MutableArray<T> = Array<Mutable<T>>;
export type MutableMap<K, V> = Map<Mutable<K>, Mutable<V>>;
export type MutableSet<T> = Set<Mutable<T>>;
export type MutableObject<T> = T extends ImmutableObject<infer U> ? U : never;

const isObject = (value: unknown): value is object => value instanceof Object;

/**
 * Helper function that creates a proxy for non-primitive values.
 *
 * The proxy changes the ref of the value, so that mutations return
 * a changed reference.
 *
 * @param value - Immutable<T>
 * @returns - Mutable<T>
 */
export function makeProxy<T>(value: T): Mutable<T> {
    if (isObject(value)) {
        // Create proxy to change references
        try {
            return new Proxy(value, {}) as Mutable<T>;
        } catch (error) {
            console.error('ProxyObjectError', { error, value });
        }
    }

    // Return primitives directly
    return value as Mutable<T>;
}
