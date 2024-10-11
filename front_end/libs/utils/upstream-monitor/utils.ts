import { isEqual, memoize } from 'lodash-es';
import {
    defer,
    distinctUntilChanged,
    filter,
    fromEvent,
    map,
    merge,
    Observable,
    of,
    repeat,
    scan,
    shareReplay,
    startWith,
    switchMap,
    tap,
    timer,
} from 'rxjs';
import stringify from 'safe-stable-stringify';

const hash = (...args: unknown[]): string => stringify(args);

/**
 * Narrowed type for upstream monitor status stream.
 *
 * Type T is inferred as a constant e.g. 'host', 'cdb', 'cloudPortal', etc.
 */
type UpstreamMonitor<T extends string> = Observable<readonly [T, boolean]>;

/**
 * Observable that emits current navigator.online status and changes.
 */
const navigatorOnlineChanged$: Observable<boolean> = merge(
    fromEvent(window, 'online').pipe(map(() => true)),
    fromEvent(window, 'offline').pipe(map(() => false)),
).pipe(shareReplay({ bufferSize: 0, refCount: true }), startWith(navigator.onLine));

/**
 * Factory function to create an observable that emits tuples
 * where the first value is the tag and the second is the online state.
 *
 * This can be used directly as a stream of updates used with the helper functions.
 *
 * @see summarizeUpstreamMonitors - Combines multiple upstream monitors into a summarized object.
 * @see mapUpstreamStatus - Maps the upstream status to a string representation in the format `tagOnline` or `tagOffline`.
 */
export const upstreamMonitorFactory = memoize(
    <Tag extends string>(
        upstreamUrl: string,
        tag: Tag,
        method: 'HEAD' | 'GET' = 'HEAD',
        heartBeatIntervalMs: number = 5_000,
    ): Observable<readonly [Tag, boolean]> => {
        let lastOnline = true;
        return navigatorOnlineChanged$.pipe(
            switchMap(navigatorOnline =>
                navigatorOnline
                    ? defer(() =>
                          fetch(upstreamUrl || '/', {
                              method,
                          })
                              .then(res => res.status < 500)
                              .catch(() => false),
                      ).pipe(
                          tap(online => {
                              lastOnline = online;
                          }),
                          repeat({
                              delay: () => timer(lastOnline ? heartBeatIntervalMs : 1_000),
                          }),
                      )
                    : of(false),
            ),
            distinctUntilChanged(),
            map(online => [tag, online] as const),
            shareReplay({ bufferSize: 1, refCount: true }),
        );
    },
    hash,
);

/**
 * Combines multiple upstream monitor streams into a single stream that emits a summarized object.
 *
 * The object contains the tag as the key and the online status as the value.
 *
 * The type signature of the returned observable is inferred from the input streams.
 */
export const summarizeUpstreamMonitors = <T extends string>(
    ...monitors: UpstreamMonitor<T>[]
): Observable<Record<T, boolean>> => {
    return merge(...monitors).pipe(
        scan(
            (acc, [tag, online]) => ({
                ...acc,
                [tag]: online,
            }),
            {} as Record<T, boolean>,
        ),
        distinctUntilChanged((a, b) => isEqual(a, b)),
        shareReplay({ bufferSize: 1, refCount: false }),
    );
};

/**
 * Maps the upstream status to a string representation in the format `tagOnline` or `tagOffline`.
 */
export const mapUpstreamStatus = <UpstreamTag extends string>(
    ...upstreamMonitors$: Observable<readonly [UpstreamTag, boolean]>[]
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) =>
    merge(...upstreamMonitors$).pipe(
        map(
            ([tag, online]) =>
                `${tag}${online ? 'Online' : 'Offline'}` as `${typeof tag}${'Online' | 'Offline'}`,
        ),
        distinctUntilChanged(),
        shareReplay({ bufferSize: 0, refCount: true }),
    );

/**
 * Factory that accepts one or more upstream monitors and emits the timestamp if any of the upstream go offline.
 */
export const disconnectedFactory = <T extends string>(
    ...monitors: UpstreamMonitor<T>[]
): Observable<number> =>
    summarizeUpstreamMonitors(...monitors).pipe(
        filter(status => Object.values(status).some(v => !v)),
        map(() => Date.now()),
    );

/**
 * Factory that accepts one or more upstream monitors and emits the timestamp if all upstream go back online.
 */
export const reconnectedFactory = <T extends string>(
    ...monitors: UpstreamMonitor<T>[]
): Observable<number> =>
    summarizeUpstreamMonitors(...monitors).pipe(
        filter(status => Object.values(status).every(Boolean)),
        map(() => Date.now()),
    );

/**
 * Initialized both disconnected$ and reconnected$ observables since they're commonly used together.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const statusChangedFactory = <T extends string>(...monitors: UpstreamMonitor<T>[]) => ({
    disconnected$: disconnectedFactory(...monitors),
    reconnected$: reconnectedFactory(...monitors),
});
