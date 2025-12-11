// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { MonoTypeOperatorFunction, Observable, Subject, animationFrames, combineLatest, defer, exhaustMap, filter, firstValueFrom, map, mergeMap, pairwise, repeat, scan, share, shareReplay, skip, switchMap, take, tap, throttle, timer, toArray, windowTime } from "rxjs";
import { AvailableStreams, IntRange, Stream } from "./types";

/**
 * Get normalized focus value for a given element.
 *
 * @param element - HTMLVideoElement
 * @param upperBound - Focus value upper bound
 * @returns 0 | 1 | 2 | 3 | 4 | 5
 */
export const calculateElementFocus = (element: HTMLVideoElement, upperBound = 6): IntRange<0, 6> => {
    const { innerHeight, innerWidth } = window;
    const xMid = innerWidth / 2;
    const yMid = innerHeight / 2;
    const { width = xMid, height = yMid, y = yMid, x = xMid } = element?.getBoundingClientRect() || {};
    const getPositionScore = () => {
        const centerY = y + height / 2;
        const centerX = x + width / 2;
        const getDeviation = (val: number): number => 1 - Math.abs(val - 0.5);
        const relativeY = getDeviation(centerY / innerHeight);
        const relativeX = getDeviation(centerX / innerWidth);
        return relativeX + relativeY;
    }

    const getSizeScore = () => {
        const windowArea = innerHeight * innerWidth;
        const elementArea = width * height;
        return elementArea / windowArea;
    }

    upperBound = Math.min(upperBound, 20);

    const focusScore = Math.min(10 * getPositionScore() * getSizeScore(), upperBound);

    const normalizedScore = focusScore / (upperBound / 5) as IntRange<0, 6>;

    return normalizedScore
}

/**
 * Calculate normalized score for window size.
 *
 * @param baseline - number
 * @returns threshold - number
 */
export const calculateWindowFocusThreshold = (baseline: number): number => {
    const { innerHeight, innerWidth } = window;
    const area = innerHeight * innerWidth;
    const threshold = baseline * baseline
    return Math.round(100 / (area / threshold))
}

export const createConnectionKey = ({ id, systemId}: { id: string, systemId: string }): string => `${cleanId(systemId)}_${cleanId(id)}`;

export const getConnectionKey = (webRtcUrl: string): string => {
    const id = webRtcUrl.includes('devices') ? webRtcUrl.split('devices/')[1].split('/')[0] : webRtcUrl.split('camera_id=')[1].split('&')[0]
    const systemId = webRtcUrl.split('.')[0];
    return createConnectionKey({ id, systemId });
}

export const generateWebRtcUrlFactory = (relayUrl: string, camera_id: string, serverId: string, version: number) => (additionalParams: Record<string, unknown> = {}) => {
    const useV2 = version >= 6.0;
    additionalParams['x-server-guid'] = serverId;
    const queryParams = new URLSearchParams(useV2 ? { api: 'v2', deliveryMethod: 'mse', ...additionalParams } : { camera_id, ...additionalParams }).toString();
    const v1Endpoint = `webrtc-tracker/`
    const v2Endpoint = `rest/v3/devices/${camera_id}/webrtc?api`
    return `wss://${relayUrl}/${useV2 ? v2Endpoint : v1Endpoint}?${queryParams}`
}

export class WithSkip<T> {
    constructor(public value: T, public skip: boolean = false) {}
}

export class ConnectionQueue {
    static MAX_CONCURRENCY = 4;
    static GROUP: Record<string, ConnectionQueue> = {};
    #queue$ = new Subject<Observable<unknown>>();
    #concurrencyUpdater$ = new Subject<number>();
    #runningTasks$ = this.#concurrencyUpdater$.pipe(scan((acc, curr) => acc + curr, 0));

    static runTask(task: Parameters<ConnectionQueue['runTask']>[0], groupName: string = 'common', concurrency =ConnectionQueue.MAX_CONCURRENCY, requeueDelay = 500, taskTimeout = 10000, logger: Console | undefined = undefined): void {
        ConnectionQueue.GROUP[groupName] ||= new ConnectionQueue(groupName, logger, concurrency);
        ConnectionQueue.GROUP[groupName].runTask(task, requeueDelay, taskTimeout);
    }

     private runTask(task: (complete: () => void, requeue: () => void | Promise<void>) => unknown, requeueDelay = 500, taskTimeout = 10000): void {
        this.#queue$.next(defer(() => new Promise<void>(async resolve => {
            this.#concurrencyUpdater$.next(1);
            const cancelTimedOut$ = new Subject<string>();
            const completed$ = new Subject<string>();

            const complete = () => {
                completed$.next('completed')
            }

            const requeue = () => {
                complete();
                setTimeout(() => this.runTask(task), requeueDelay)
            };

            completed$.pipe(take(1)).subscribe(() => {
                cancelTimedOut$.next('cancel');
                cancelTimedOut$.complete();
                completed$.complete();
                setTimeout(resolve, 250)
                this.#concurrencyUpdater$.next(-1);
            })

            try {
                await task(complete, requeue)
            } catch(e) {
                this.logger?.error(e);
                requeue();
            }
        })));
    }

    private constructor(private origin: string, private logger?: Console, concurrency = ConnectionQueue.MAX_CONCURRENCY) {
        this.#queue$.pipe(mergeMap(notifier => notifier, concurrency)).subscribe(state => this.logger?.info(state));
        this.#runningTasks$.subscribe(count => this.logger?.info(`[${this.origin}] Running tasks: ${count}`));
    }
}

export function cleanId(id: unknown): string | undefined {
    return (id as string)?.replace(/{|}/g, '');
}

/**
 * Adds a random prefix to a URL if the original URL had a prefix.
 * Preserves the prefix pattern from the original request on redirected URLs.
 */
const addPrefixToUrl = (url: string, originalUrl: string): string => {
    try {
        // Only add prefix if original URL had one (contained ---)
        const originalHost = new URL(originalUrl).host;
        if (!originalHost.includes('---')) {
            return url;
        }

        const urlObj = new URL(url);
        // Check if redirect URL already has a prefix
        if (urlObj.host.includes('---')) {
            return url;
        }

        // Add a new random prefix to the redirected URL
        const prefix = generateRandomString();
        urlObj.host = `${prefix}---${urlObj.host}`;
        return urlObj.toString();
    } catch {
        return url;
    }
};

export const fetchWithRedirectAuthorization = async (input: string, init: RequestInit, retries = 10): Promise<Response> => {
    const response = await fetch(input, init);
    const unauthorized = response.status === 401;
    const unavailable = response.status === 503;

    // Fixed: Added parentheses to clarify operator precedence
    // Handle: (redirected AND unauthorized) OR unavailable
    if ((response.redirected && unauthorized) || unavailable) {
        /**
         * If response is redirected and unauthorized that means that the browser followed
         * a cross-origin redirect and stripped the Authorization header (standard security behavior).
         * We retry the final URL with the original auth headers.
         *
         * If response is unavailable (503) that means there's an issue with the relay
         * that was chosen so we retry the original url to get a redirect to a different relay.
         */
        const baseUrl = unavailable ? input : response.url;
        // Add prefix to retry URL if original had one (for connection multiplexing)
        const urlToTry = addPrefixToUrl(baseUrl, input);
        return retries ? fetchWithRedirectAuthorization(urlToTry, init, retries - 1) : fetch(urlToTry, init)
    }

    // Also handle non-redirected 401 (direct auth failure) with retry
    if (unauthorized && retries > 0) {
        // Small delay before retry to allow for token refresh
        await new Promise(resolve => setTimeout(resolve, 100));
        return fetchWithRedirectAuthorization(input, init, retries - 1);
    }

    return response;
}


/**
 * LRU Cache with TTL for HTTP Response caching
 * Prevents unbounded memory growth by limiting cache size and entry lifetime
 */
class LRUResponseCache {
    private cache = new Map<string, { response: Promise<Response>; timestamp: number }>();
    private stats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        expired: 0,
        totalSize: 0,
        maxSize: 0
    };

    constructor(
        private maxSize = 100,
        private ttlMs = 5 * 60 * 1000 // 5 minutes default TTL
    ) {}

    /**
     * Get cached response or execute request
     */
    async get(key: string, request: () => Promise<Response>): Promise<Response> {
        const now = Date.now();
        const entry = this.cache.get(key);

        // Check if entry exists and is not expired
        if (entry) {
            const isExpired = now - entry.timestamp > this.ttlMs;
            if (isExpired) {
                this.cache.delete(key);
                this.stats.expired++;
            } else {
                this.stats.hits++;
                return (await entry.response).clone();
            }
        }

        // Cache miss - execute request
        this.stats.misses++;

        // Evict oldest entry if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.stats.evictions++;
        }

        // Store new entry with error handling
        const responsePromise = request().then(res => {
            const cloned = res.clone();

            if (!res.ok) {
                // Remove failed responses from cache
                this.cache.delete(key);
            }

            return cloned;
        });

        this.cache.set(key, { response: responsePromise, timestamp: now });
        this.stats.totalSize = this.cache.size;
        this.stats.maxSize = Math.max(this.stats.maxSize, this.cache.size);

        return (await responsePromise).clone();
    }

    /**
     * Manually clear expired entries
     */
    cleanExpired(): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttlMs) {
                this.cache.delete(key);
                cleaned++;
                this.stats.expired++;
            }
        }

        this.stats.totalSize = this.cache.size;
        return cleaned;
    }

    /**
     * Get cache statistics for monitoring
     */
    getStats() {
        return {
            ...this.stats,
            currentSize: this.cache.size,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
        };
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.stats.totalSize = 0;
    }
}

// Create singleton instance with reasonable defaults
// Max 100 entries, 5 minute TTL - prevents unbounded growth
const responseCache = new LRUResponseCache(100, 5 * 60 * 1000);

// Periodic cleanup of expired entries (every 2 minutes)
if (typeof setInterval !== 'undefined') {
    setInterval(() => responseCache.cleanExpired(), 2 * 60 * 1000);
}

export const cacheSuccess = async (request: () => Promise<Response>, key: string): Promise<Response> => {
    return responseCache.get(key, request);
};

/**
 * Get cache statistics for monitoring and debugging
 * Useful for tracking cache effectiveness and memory usage
 */
export const getResponseCacheStats = () => responseCache.getStats();

/**
 * Clear response cache (useful for testing or manual cache invalidation)
 */
export const clearResponseCache = () => responseCache.clear();

const extractContent = (source: string, delimiter: string, identifier: string): string => {
    const lines = source.split(delimiter);
    const targetLine = lines.find(l => l.startsWith(identifier));
    const content = targetLine?.split(identifier)?.[1]?.trim();
    return content
}

const readSdpLine = (sdp: RTCSessionDescription | RTCSessionDescriptionInit | string, identifier: string, property?: string): string | undefined => {
    const sdpString = (typeof sdp === 'string' ? sdp : sdp.sdp);
    const content = extractContent(sdpString, '\r\n', identifier);

    if (!property) {
        return content;
    }

    return  extractContent(content, ';', property.endsWith('=') ? property : `${property}=`);
}

export const streamSupported = (answer: Parameters<typeof readSdpLine>[0]
): boolean => {
    const mid = readSdpLine(answer, 'a=mid:');
    const group = readSdpLine(answer, 'a=group:');
    return group?.includes(mid) && !readSdpLine(answer, 'a=inactive')
}

interface FramesPerSecondOptions {
    sampleSizeSeconds?: number;
    updateIntervalSeconds?: number;
    precision?: number;
}

let maxFpsOnBootstrap: number;

const animationFrames$ = animationFrames().pipe(shareReplay({ bufferSize: 0, refCount: false }));

export const setMaxFpsOnBootstrap = async () => {
    const times = await firstValueFrom(animationFrames$.pipe(map(() => Date.now()), pairwise(), take(10), toArray()));
    maxFpsOnBootstrap = times.reduce((acc, [start, end]) => Math.max(acc, 1000 / end - start), 0)
    return maxFpsOnBootstrap;
}

export const framesPerSecondFactory =
    ({
        sampleSizeSeconds = 3,
        updateIntervalSeconds = 1,
    }: FramesPerSecondOptions = {}): Observable<number> => {
        setMaxFpsOnBootstrap();
        return animationFrames$.pipe(
            windowTime(sampleSizeSeconds * 1000, updateIntervalSeconds * 1000),
            mergeMap(frames$ => frames$.pipe(toArray())),
            map(frames => Math.round(frames.length / sampleSizeSeconds)),
            shareReplay({ bufferSize: 1, refCount: false }),
        )
    }

export const frameRateTracker$ = framesPerSecondFactory().pipe(
    filter(() => document.visibilityState === 'visible'),
    scan(
        (acc, currentFps) => {
            const previousFps = [...acc.previousFps, currentFps].slice(acc.previousFps.length - 10);
            const currentScore = Math.min(Math.round((currentFps / acc.maxFps) * 100), 100);
            const previousScores = [...acc.previousScores, currentScore].slice(acc.previousScores.length - 10);
            const maxFps = Math.max(previousScores.length ? Math.max(acc.maxFps, currentFps) : currentFps, maxFpsOnBootstrap || 0);
            const score = !previousScores.length ? 100 : Math.round(previousScores.reduce((acc, curr) => acc + curr, 0) / previousScores.length);
            const fps = Math.round(previousFps.reduce((acc, curr) => acc + curr, 0) / previousFps.length)
            return {
                fps,
                maxFps,
                score,
                previousScores,
                previousFps
            };
        },
        { fps: 0, maxFps: 0, score: 100, previousScores: <number[]>[], previousFps: <number[]>[] },
    ),
    share({ resetOnRefCountZero: false }),
);

export const throttleByFrameRateScheduler$ = frameRateTracker$.pipe(take(1), exhaustMap(({ fps }) => timer(1000 / fps)), switchMap(() => animationFrames$), shareReplay({ bufferSize: 1, refCount: false }));

export const throttleByFrameRate = <T>() => throttle<T>(() => throttleByFrameRateScheduler$, { leading: false, trailing: true });

export const generateRandomString = () => Math.random().toString(36).slice(2)

export const releaseLock = <T extends { cooldownLock: ReturnType<typeof setTimeout> }>(target: T): void => {
    clearTimeout(target.cooldownLock);
    target.cooldownLock = undefined;
}

export const acquireLock = <T extends { cooldownLock: ReturnType<typeof setTimeout> }>(target: T, cooldownTime: number, force = false): boolean => {
    if (force) {
        clearTimeout(target.cooldownLock);
        target.cooldownLock = undefined;
    }

    if (target.cooldownLock) {
        return false;
    }

    target.cooldownLock = setTimeout(() => releaseLock(target), cooldownTime * 1000);

    return true;
}

/**
 * LRU Cache for WebRTC Stream Manager connections
 * Prevents unbounded memory growth by limiting maximum connections
 * Evicts least recently used connections when limit is reached
 */
export class LRUConnectionCache<T> {
    private cache = new Map<string, { value: T; timestamp: number }>();
    private stats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        totalSize: 0,
        maxSize: 0
    };

    constructor(private maxSize = 100) {}

    /**
     * Get value from cache or return undefined
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);

        if (entry) {
            this.stats.hits++;
            // Update timestamp to mark as recently used
            entry.timestamp = Date.now();
            // Move to end of map (most recent)
            this.cache.delete(key);
            this.cache.set(key, entry);
            return entry.value;
        }

        this.stats.misses++;
        return undefined;
    }

    /**
     * Set value in cache, evicting LRU entry if at max size
     */
    set(key: string, value: T): void {
        // If updating existing entry, remove it first (will re-add at end)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Evict least recently used (first entry in map)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.stats.evictions++;
        }

        this.cache.set(key, { value, timestamp: Date.now() });
        this.stats.totalSize = this.cache.size;
        this.stats.maxSize = Math.max(this.stats.maxSize, this.cache.size);
    }

    /**
     * Check if key exists in cache
     */
    has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Delete specific entry from cache
     */
    delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        this.stats.totalSize = this.cache.size;
        return deleted;
    }

    /**
     * Get all keys in cache
     */
    keys(): string[] {
        return Array.from(this.cache.keys());
    }

    /**
     * Get all values in cache
     */
    values(): T[] {
        return Array.from(this.cache.values()).map(entry => entry.value);
    }

    /**
     * Get all entries as Record
     */
    toRecord(): Record<string, T> {
        const record: Record<string, T> = {};
        for (const [key, entry] of this.cache.entries()) {
            record[key] = entry.value;
        }
        return record;
    }

    /**
     * Get cache size
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Get cache statistics for monitoring
     */
    getStats() {
        return {
            ...this.stats,
            currentSize: this.cache.size,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
        };
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.stats.totalSize = 0;
    }
}

/**
 * TTL Cache for authentication host tracking
 * Entries automatically expire after TTL duration
 * Prevents unbounded memory growth with automatic cleanup
 */
export class TTLCache<T> {
    private cache = new Map<string, { value: T; expiresAt: number }>();
    private stats = {
        hits: 0,
        misses: 0,
        expired: 0,
        totalSize: 0,
        maxSize: 0
    };

    constructor(private ttlMs: number) {}

    /**
     * Get value from cache if not expired
     */
    get(key: string): T | undefined {
        const now = Date.now();
        const entry = this.cache.get(key);

        if (entry) {
            const isExpired = now >= entry.expiresAt;
            if (isExpired) {
                this.cache.delete(key);
                this.stats.expired++;
                this.stats.totalSize = this.cache.size;
                this.stats.misses++;
                return undefined;
            }

            this.stats.hits++;
            return entry.value;
        }

        this.stats.misses++;
        return undefined;
    }

    /**
     * Set value in cache with TTL
     */
    set(key: string, value: T): void {
        const expiresAt = Date.now() + this.ttlMs;
        this.cache.set(key, { value, expiresAt });
        this.stats.totalSize = this.cache.size;
        this.stats.maxSize = Math.max(this.stats.maxSize, this.cache.size);
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        const isExpired = Date.now() >= entry.expiresAt;
        if (isExpired) {
            this.cache.delete(key);
            this.stats.expired++;
            this.stats.totalSize = this.cache.size;
            return false;
        }

        return true;
    }

    /**
     * Delete specific entry from cache
     */
    delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        this.stats.totalSize = this.cache.size;
        return deleted;
    }

    /**
     * Manually clean expired entries
     */
    cleanExpired(): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now >= entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
                this.stats.expired++;
            }
        }

        this.stats.totalSize = this.cache.size;
        return cleaned;
    }

    /**
     * Get cache size
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Get cache statistics for monitoring
     */
    getStats() {
        return {
            ...this.stats,
            currentSize: this.cache.size,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
        };
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.stats.totalSize = 0;
    }
}

export const targetPlaybackRateStrategies = {
    conservative: (currentPlaybackRate: number, bufferedTime: number, lastChunk: number): number => {
        const maxBehind = 4;
        const maxPlayback = 2;
        const minPlayback = 0.5;

        if (bufferedTime > maxBehind) {
            return (bufferedTime - maxPlayback) * lastChunk;
        }

        const targetPlayback = Math.max(minPlayback, Math.min(maxPlayback, bufferedTime + lastChunk));
        const variance = Math.abs(currentPlaybackRate - targetPlayback);

        if (bufferedTime > minPlayback && bufferedTime < maxPlayback) {
            return 1;
        }

        if (variance < 0.1) {
            return currentPlaybackRate;
        }
        return +((currentPlaybackRate + targetPlayback) / 2).toFixed(2);
    },
    default: (__currentPlaybackRate: number, bufferedTime: number, lastChunk: number): number => {
        const depleteBufferTo = 0.15;
        const chunkFraction = 1 / lastChunk;
        const bufferToDeplete = bufferedTime - depleteBufferTo;
        return Math.max(bufferToDeplete * chunkFraction, 1);
    },
    drainIt: (_currentPlaybackRate: number, _bufferedTime: number, _lastChunk: number) => 10
} as const

/**
 * Determines actual available streams from camera mediaStreams data.
 * This utility provides a unified way to detect stream availability,
 * preventing attempts to connect to non-existent streams on single-stream cameras.
 *
 * @param mediaStreams - Array of Stream objects from camera parameters
 * @returns Array of available streams, or undefined if detection should be delegated to API
 *
 * @example
 * // In Angular component
 * const streams = getActualAvailableStreams(camera?.parameters?.mediaStreams?.streams);
 * if (streams) {
 *   WebRTCStreamManager.connect({ availableStreams: streams, ... });
 * }
 *
 * @example
 * // In WebRTC manager for API-based detection
 * const detected = getActualAvailableStreams(apiResponse.parameters?.mediaStreams?.streams);
 * if (detected && detected.length < this._availableStreams.length) {
 *   this._availableStreams = detected;
 * }
 */
export function getActualAvailableStreams(mediaStreams: Stream[] | undefined | null): AvailableStreams[] | undefined {
    if (!mediaStreams?.length) {
        // No data available - delegate detection to API or use defaults
        return undefined;
    }

    const streams: AvailableStreams[] = [];

    // Check for PRIMARY (encoderIndex 0) and SECONDARY (encoderIndex 1) streams
    const hasStream0 = mediaStreams.some(s => s.encoderIndex === AvailableStreams.PRIMARY);
    const hasStream1 = mediaStreams.some(s => s.encoderIndex === AvailableStreams.SECONDARY);

    if (hasStream0) streams.push(AvailableStreams.PRIMARY);
    if (hasStream1) streams.push(AvailableStreams.SECONDARY);

    // Ensure at least PRIMARY if streams data exists but no valid encoderIndex found
    // This handles edge cases where API returns streams but with unexpected encoderIndex values
    return streams.length > 0 ? streams : [AvailableStreams.PRIMARY];
}

/**
 * Determines available streams with fallback for backward compatibility.
 * Use this variant when you need a guaranteed non-undefined result.
 *
 * @param mediaStreams - Array of Stream objects from camera parameters
 * @returns Array of available streams (defaults to both PRIMARY and SECONDARY if no data)
 */
export function getActualAvailableStreamsWithFallback(mediaStreams: Stream[] | undefined | null): AvailableStreams[] {
    const detected = getActualAvailableStreams(mediaStreams);
    // Fallback: assume both streams if no data available (backward compatibility)
    return detected ?? [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY];
}
