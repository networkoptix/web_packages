// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

/**
 * Legacy compatibility utilities ported verbatim from v1's `utils.ts`.
 *
 * These exist solely to preserve the 0.1.x public API contract for consumers
 * of `@networkoptix/webrtc-stream-manager`. Scheduled for removal in 0.2.0.
 *
 * Do not import from this file for new v2 code — use v2's native utils in
 * sibling files (frame-rate, streams, relay-fetch, etc.) instead.
 */

import {
    Observable,
    animationFrames,
    firstValueFrom,
    map,
    mergeMap,
    pairwise,
    shareReplay,
    take,
    toArray,
    windowTime,
} from 'rxjs';

// === Ported from v1 utils.ts line 63 ================================
export const generateWebRtcUrlFactory = (relayUrl: string, camera_id: string, serverId: string, version: number) => (additionalParams: Record<string, unknown> = {}) => {
    const useV2 = version >= 6.0;
    additionalParams['x-server-guid'] = serverId;
    const queryParams = new URLSearchParams(useV2 ? { api: 'v2', deliveryMethod: 'mse', ...additionalParams } : { camera_id, ...additionalParams }).toString();
    const v1Endpoint = `webrtc-tracker/`
    const v2Endpoint = `rest/v3/devices/${camera_id}/webrtc?api`
    return `wss://${relayUrl}/${useV2 ? v2Endpoint : v1Endpoint}?${queryParams}`
}

// === Ported from v1 utils.ts line 72 ================================
export class WithSkip<T> {
    constructor(public value: T, public skip: boolean = false) {}
}

// === Ported from v1 utils.ts lines 346-374 ==========================
//
// NOTE: v1's `setMaxFpsOnBootstrap` helper collides with v2's own public
// `setMaxFpsOnBootstrap` export in `src/utils/frame-rate.ts`. To avoid
// clobbering v2's public API, v1's version is kept file-local and NOT
// re-exported from this module.

interface FramesPerSecondOptions {
    sampleSizeSeconds?: number;
    updateIntervalSeconds?: number;
    precision?: number;
}

let maxFpsOnBootstrap: number;

const animationFrames$ = animationFrames().pipe(shareReplay({ bufferSize: 0, refCount: false }));

const setMaxFpsOnBootstrap = async () => {
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
