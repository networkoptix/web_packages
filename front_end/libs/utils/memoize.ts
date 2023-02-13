import { memoize, pick, wrap } from 'lodash-es';
import { firstValueFrom, from, Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';
import stringify from 'safe-stable-stringify';
import { v4 as uuid } from 'uuid';

type HashFunction = (invalidationKey: string, ...args: unknown[]) => string;
type UUID = string;
type LastUpdate = number;
type TTL = number;
type Hash = string;
interface InvalidationParams {
    uuid: UUID;
    lastUpdate: LastUpdate;
    ttl: TTL;
}
type InvalidateReturn = boolean | InvalidationParams;
type InvalidateFunction = (...args: unknown[]) => InvalidateReturn;
type WrapperFunctionFactory = (invaldiationKey: string) => (originalFunc: (...args: unknown[]) => unknown, ...args: unknown[]) => unknown;
const memoizationId = uuid();

export function objectRef(this: Record<string, string>): string {
    this[memoizationId] ||= uuid();
    const fromThis = pick(this, [memoizationId, 'systemId', 'serverId']);
    return stringify(fromThis);
}

export function defaultHashFunction(this: { memoizationId: string }, ...args: unknown[]): Hash {
    try {
        // Issue with Proxy objects from IConfig. Ignore first hashes.
        return stringify(args);
    } catch (e) {
        return uuid();
    }
}

export const defaultInvalidateFunction = (): false => false;
function defaultWrapperFunctionFactory(invalidiationKey: string) {
    return function (originalFunc: (...args: unknown[]) => unknown, ...args: unknown[]) {
        return originalFunc.apply(this, args);
    };
}

export function memoizeDecorator(hashFunction?: HashFunction, invalidateFunction?: InvalidateFunction, wrapperFunctionFactory?: WrapperFunctionFactory): MethodDecorator;
export function memoizeDecorator(invalidateFunction: InvalidateFunction): MethodDecorator;
export function memoizeDecorator(
    hashOrInvalidFunction: HashFunction | InvalidateFunction = defaultHashFunction,
    invalidateFunction: InvalidateFunction = defaultInvalidateFunction,
    wrapperFunctionFactory: WrapperFunctionFactory = defaultWrapperFunctionFactory
): MethodDecorator {
    return function (target: unknown, functionName: string, descriptor: PropertyDescriptor) {
        const invalidiationKey = functionName + 'InvalidationKey';
        if (descriptor.get) {
            descriptor.get = memoize(wrap(descriptor.get, wrapperFunctionFactory(invalidiationKey)), function <T>(this: T): T {
                return this;
            });
        } else {
            descriptor.value = memoize(
                wrap(descriptor.value, wrapperFunctionFactory(invalidiationKey)),
                function (...args: unknown[]) {
                    if (functionName === 'getCloudStorageManager') {
                        console.log('pause');
                    }
                    const hashOrInvalidation = hashOrInvalidFunction.apply(this, args);
                    let hash = '';
                    let invalidate = false;

                    if (typeof hashOrInvalidation === 'string') {
                        hash = hashOrInvalidation;
                        invalidate = invalidateFunction.apply(this, [target[invalidiationKey], ...args]);
                    } else {
                        invalidate = hashOrInvalidation;
                        hash = defaultHashFunction.apply(this, args);
                    }

                    if (invalidate || !target[invalidiationKey]) {
                        target[invalidiationKey] = invalidate || { uuid: uuid() };
                    } else if ((target[invalidiationKey] as InvalidationParams).ttl) {
                        if (Date.now() - target[invalidiationKey].lastUpdate > target[invalidiationKey].ttl) {
                            target[invalidiationKey].lastUpdate = Date.now();
                        }
                    }

                    return hash + stringify(target[invalidiationKey]) + objectRef.apply(this);
                });
        }
    };
}
function invalidateByTtlFactory(ttl: TTL, invaldiateByCallback: (...args: unknown[]) => InvalidateReturn) {
    return function (current: InvalidateReturn, ...args: unknown[]): InvalidateReturn {
        const invaldiateCallbackResult = invaldiateByCallback(...args);
        if (typeof invaldiateCallbackResult !== 'boolean') {
            return invaldiateCallbackResult;
        }
        return invaldiateCallbackResult || typeof current !== 'boolean' && (!current || current.ttl !== ttl) ? { uuid: uuid(), lastUpdate: Date.now(), ttl } : false;
    };
}
function asyncWrapperFunctionFactory(invalidationKey: string): (originalFunc: (...args: unknown[]) => unknown, ...args: unknown[]) => unknown {
    return function (originalFunc: (...args: unknown[]) => unknown, ...args: unknown[]): unknown {
        const res = originalFunc.apply(this, args);

        const pipeObservable = (observable: Observable<unknown>): Observable<unknown> => observable.pipe(
            shareReplay({ bufferSize: 1, refCount: false }),
            tap(() => { }, () => {
                delete this[invalidationKey];
            })
        );

        if (res instanceof Promise) {
            return firstValueFrom(pipeObservable(from(res)));
        }

        if (res instanceof Observable) {
            return pipeObservable(res);
        }

        return res;
    };
}

export function memoizeAsync(ttl?: number): MethodDecorator;
export function memoizeAsync(hashFunction: HashFunction, ttl: TTL): MethodDecorator;
export function memoizeAsync(hashFunction: HashFunction, invalidateFunction: InvalidateFunction, ttl?: TTL): MethodDecorator;
export function memoizeAsync(
    hashFunctionOrTTL: HashFunction | TTL = defaultHashFunction,
    invalidateFunctionOrTTL: InvalidateFunction | TTL = defaultInvalidateFunction,
    ttl: TTL = Infinity
): MethodDecorator {
    const firstIsTtl = typeof hashFunctionOrTTL === 'number';
    const seccondIsTtl = typeof invalidateFunctionOrTTL === 'number';
    if (firstIsTtl) {
        ttl = hashFunctionOrTTL;
    }
    const hashFunction = firstIsTtl ? defaultHashFunction : hashFunctionOrTTL;
    const invalidateFunction = firstIsTtl || seccondIsTtl ? invalidateByTtlFactory(ttl, seccondIsTtl ? defaultInvalidateFunction : invalidateFunctionOrTTL) : ttl === Infinity ? invalidateFunctionOrTTL : invalidateByTtlFactory(ttl, invalidateFunctionOrTTL);
    return memoizeDecorator(hashFunction, invalidateFunction, asyncWrapperFunctionFactory);
}

export const memoizeAsyncShort = memoizeAsync(5 * 1000);

export const memoizeAsyncMedium = memoizeAsync(60 * 1000);

export const memoizeAsyncLong = memoizeAsync(5 * 60 * 1000);

export const memoizeAsyncPersistent = memoizeAsync(Infinity);
