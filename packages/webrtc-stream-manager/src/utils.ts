// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Observable, Subject, defer, mergeMap, scan, take, takeUntil, timer } from "rxjs";
import { IntRange } from "./types";

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

export const getConnectionKey = (webRtcUrl: string): string => {
    if (webRtcUrl.includes('devices')) {
        return webRtcUrl.split('devices/')[1].split('/')[0]
    }

    return webRtcUrl.split('camera_id=')[1].split('&')[0]
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
    static GROUP: Record<string, ConnectionQueue> = {};
    #queue$ = new Subject<Observable<unknown>>();
    #concurrencyUpdater$ = new Subject<number>();
    #runningTasks$ = this.#concurrencyUpdater$.pipe(scan((acc, curr) => acc + curr, 0));

    static runTask(task: Parameters<ConnectionQueue['runTask']>[0], groupName: string = 'common', requeueDelay = 500, taskTimeout = 10000): void {
        ConnectionQueue.GROUP[groupName] ||= new ConnectionQueue(groupName);
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

            timer(taskTimeout).pipe(takeUntil(cancelTimedOut$)).subscribe(() => {
                console.info(`[${this.origin}] Running tasks: Timeout`)
                requeue();
            });

            completed$.pipe(take(1)).subscribe(() => {
                cancelTimedOut$.next('cancel');
                resolve();
                this.#concurrencyUpdater$.next(-1);
            })

            try {
                await task(complete, requeue)
            } catch(e) {
                console.error(e);
                requeue();
            }
        })));
    }

    private constructor(private origin: string) {
        this.#queue$.pipe(mergeMap(notifier => notifier, 4)).subscribe(state => console.info(state));
        this.#runningTasks$.subscribe(count => console.info(`[${this.origin}] Running tasks: ${count}`));
    }
}