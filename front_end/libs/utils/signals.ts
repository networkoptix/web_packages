/**
 * See note on Immutable type before moving this file.
 */

/* eslint-disable @typescript-eslint/no-use-before-define */

import {
    effect,
    EventEmitter,
    inject,
    signal,
    Signal,
    untracked,
    WritableSignal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { identity } from 'lodash-es';
import { debounceTime, Observable } from 'rxjs';

import { NxParamStateService } from '@services/param-state/param-state.service';

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

export const pipeSignal = <Source, Piped>(
    source: Signal<Source>,
    sourceMapper: (sourceAsObservable: Observable<Source>) => Observable<Piped>,
    initialValue: Piped,
): Signal<Piped> => toSignal(sourceMapper(toObservable(source)), { initialValue });

export const debounceSignal = <Source>(
    source: Signal<Source>,
    debounceDuration = 500,
): Signal<Source> =>
    pipeSignal(source, source$ => source$.pipe(debounceTime(debounceDuration)), source());

export class Transformer<T, U> {
    constructor(
        public serialize: (value: T) => U,
        public deserialize: (value: U) => T,
    ) {}
}

export function bindSignals<T, U>(
    unserialized$$: WritableSignal<T>,
    serialized$$: WritableSignal<U>,
    transformer: Transformer<T, U>,
): {
    cleanup: () => void;
    unserialized$$: WritableSignal<T>;
    serialized$$: WritableSignal<U>;
} {
    const updating$$ = signal<typeof unserialized$$ | typeof serialized$$ | false>(false);
    const updatedUnserialized = effect(
        () => {
            const beingUpdated = untracked(updating$$);

            if (beingUpdated === unserialized$$) {
                return;
            }

            const serializedValue = serialized$$();

            updating$$.set(unserialized$$);
            const updated = untracked(() => transformer.deserialize(serializedValue));
            unserialized$$.set(updated);
            updating$$.set(false);
        },
        { allowSignalWrites: true },
    );

    const updateSerialized = effect(
        () => {
            const beingUpdated = untracked(updating$$);

            if (beingUpdated === serialized$$) {
                return;
            }

            updating$$.set(serialized$$);
            const unserializedValue = unserialized$$();
            const updated = untracked(() => transformer.serialize(unserializedValue));
            serialized$$.set(updated);
            updating$$.set(false);
        },
        { allowSignalWrites: true },
    );
    return {
        cleanup: () => {
            updateSerialized.destroy();
            updatedUnserialized.destroy();
        },
        unserialized$$,
        serialized$$,
    };
}

export function createBoundSignal<T, U>(
    source$$: WritableSignal<T>,
    transformer: Transformer<T, U>,
): WritableSignal<U> {
    return bindSignals(source$$, signal(transformer.serialize(source$$())), transformer)
        .serialized$$;
}

export const multiParamTransformer = new Transformer<string[], string[]>(identity, identity);

export const defaultParamTransformer = new Transformer<string, string[]>(
    val => [val],
    val => val[0] || '',
);

const noop = (): [] => [];

export class ParamDeserializer<T> extends Transformer<T, string[]> {
    constructor(deserialize: (value: string[]) => T) {
        super(noop, deserialize);
    }
}

const normalizeParams = (params: string | string[]): string[] =>
    Array.isArray(params) ? params : [params];

function paramSignalParser<Deserialized>(
    param: string,
    initialValue: Deserialized,
    transformer: Transformer<Deserialized, string[]>,
): WritableSignal<Deserialized> {
    return bindSignals(
        signal(initialValue),
        inject(NxParamStateService).getStateHandler().state$$,
        {
            serialize: paramValue => ({
                queryParams: { [param]: transformer.serialize(paramValue) },
            }),
            deserialize: ({ queryParams }) =>
                transformer.deserialize(normalizeParams(queryParams?.[param] || [])),
        },
    ).unserialized$$;
}

export function paramModel(param: string): WritableSignal<string>;
export function paramModel<Deserialized>(
    param: string,
    initialValue: Deserialized,
    transformer: Transformer<Deserialized, string[]>,
): WritableSignal<Deserialized>;
export function paramModel<Deserialized>(
    param: string,
    initialValue?: Deserialized,
    transformer?: Transformer<Deserialized, string[]>,
): unknown {
    if (!transformer) {
        return paramSignalParser(param, '', defaultParamTransformer);
    }

    return paramSignalParser(param, initialValue!, transformer);
}

export function paramSignal(param: string): Signal<string>;
export function paramSignal<Deserialized>(
    param: string,
    initialValue: Deserialized,
    deserializer: (paramValue: string[]) => Deserialized,
): Signal<Deserialized>;
export function paramSignal<Deserialized>(
    param: string,
    initialValue?: Deserialized,
    deserializer?: (paramValue: string[]) => Deserialized,
): unknown {
    if (!deserializer) {
        return paramModel(param).asReadonly();
    }
    const transformer = new ParamDeserializer(deserializer);
    return paramModel(param, initialValue!, transformer).asReadonly();
}

/**
 * A decorator that converts a property into a signal.
 *
 * Example:
 *
 * ```
 * .@AsSignal
 * .@ViewChild('checkAllContainer', { static: false })
 * .checkAll$$: Signal<NxCheckAllContainerDirective>;
 * ```
 */
export function AsSignal(target: unknown, propertyKey: string): void {
    const value$$ = signal<unknown>(undefined);
    Object.defineProperty(target, propertyKey, {
        get: function () {
            return value$$.asReadonly();
        },
        set: function (value: unknown) {
            value$$.set(value);
        },
        enumerable: true,
        configurable: true,
    });
}
