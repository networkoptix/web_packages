import { inject, Injectable } from '@angular/core';
import { isEqual } from 'lodash-es';
import {
    BehaviorSubject,
    distinctUntilChanged,
    map,
    Observable,
    shareReplay,
    switchMap,
    timer,
} from 'rxjs';

import { NxSystemService } from '@services/system.service/system.service';

import {
    aggregateTimeDetailFactory,
    separatePeriodsByMainAndOtherCameras,
} from './timeline-helpers';
import { createTimeLineSystemsProxy } from './timeline-proxy-factories';
import {
    CameraAndSystemId,
    CameraAndSystemIds,
    PeriodDetailByMainAndOther,
    SubscriberCount,
} from './timeline-service.types';

const TEN_SEC_IN_MS = 10_000 as const;

@Injectable({
    providedIn: 'root',
})
export class NxTimelineService {
    private syncTimeline$ = new BehaviorSubject('sync' as const);

    private timelineSyncTimer$ = this.syncTimeline$.pipe(
        switchMap(() => timer(0, TEN_SEC_IN_MS)),
        shareReplay({ refCount: false, bufferSize: 1 }),
    );

    private state = createTimeLineSystemsProxy(
        inject(NxSystemService).createSystemById,
        this.timelineSyncTimer$,
    );

    public aggregateTimeDetail = aggregateTimeDetailFactory(this.state, (): void =>
        this.syncTimeline$.next('sync'),
    );

    public groupByMainAndOtherCameras = (
        cameras: CameraAndSystemIds,
        focusCamera: CameraAndSystemId,
    ): Observable<PeriodDetailByMainAndOther | null> =>
        this.aggregateTimeDetail(cameras).pipe(
            map(timeDetail =>
                !timeDetail ? null : separatePeriodsByMainAndOtherCameras(timeDetail, focusCamera),
            ),
            distinctUntilChanged(isEqual),
            shareReplay({ refCount: true, bufferSize: 1 }),
        );

    /**
     * Get the total subscriber count for a system or camera. Mostly for debugging.
     * @param systemId System id to get subscriber count
     * @param cameraId Optional camera id to get subscriber count
     * @returns total subscriber count for system or camera
     */
    public getSubscriberCount = (systemId: string, cameraId?: string): number => {
        const subscriberCount = this.state[systemId].subscriberCount;
        return cameraId ? subscriberCount[cameraId] || 0 : subscriberCount.totalSubscribers;
    };

    /**
     * Get a subscriber count summary for all cameras on a system that have had observables created.
     *
     * This is mostly for debugging.
     *
     * @returns A record with systemId for the key and SubscriberCount for the value.
     */
    public getSubscriberCountSummary(): Record<string, SubscriberCount>;
    /**
     * Get a subscriber count summary for all systems that have had observables created.
     *
     * @param systemId
     * @returns A record with cameraId for cameras in the system that have observables creates as the key and
     * the current subscriber count for each observable as the value.
     */
    public getSubscriberCountSummary(systemId: string): SubscriberCount;
    public getSubscriberCountSummary(
        systemId?: string,
    ): SubscriberCount | Record<string, SubscriberCount> {
        const subscriberCountSummary = this.state.subscriberCountSummary;
        return systemId ? subscriberCountSummary[systemId] : subscriberCountSummary;
    }
}
