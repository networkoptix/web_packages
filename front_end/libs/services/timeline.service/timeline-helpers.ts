import { isEqual } from 'lodash-es';
import {
    Observable,
    catchError,
    combineLatest,
    defer,
    distinctUntilChanged,
    map,
    of,
    repeat,
    scan,
    shareReplay,
    skip,
    startWith,
    tap,
} from 'rxjs';

import { TimeDetail } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystem } from '@services/system.service/system';
import { cleanId, dirtyId } from '@utils/general';

import {
    CameraAndSystemId,
    PeriodDetailByMainAndOther,
    TimePeriod,
    TimelineState,
    TimeLineSystemsProxy,
    CameraAndSystemIds,
} from './timeline-service.types';

export const separatePeriodsByMainAndOtherCameras = (
    timeDetail: TimeDetail[],
    focusCameraId: CameraAndSystemId | string,
): PeriodDetailByMainAndOther => {
    const mainCameraIndex = timeDetail.findIndex(
        ({ guid }) =>
            cleanId(guid) ===
            cleanId(typeof focusCameraId === 'string' ? focusCameraId : focusCameraId.id),
    );

    const main = mainCameraIndex === -1 ? [] : timeDetail.splice(mainCameraIndex, 1)[0].periods;

    const other = timeDetail.map(({ periods }) => periods).flat();

    return { main, other };
};

const timePeriodOrder = (a: TimePeriod, b: TimePeriod): number => +a.startTimeMs - +b.startTimeMs;

const sortTimeDetail = ({ periods, ...rest }: TimeDetail): TimeDetail => ({
    ...rest,
    periods: periods.sort(timePeriodOrder),
});

const sortTimeDetails = (timeDetails: TimeDetail[]): TimeDetail[] =>
    timeDetails.map(sortTimeDetail);

/**
 * A factory to generate a Observable<TimeDetail> for a single camera.
 *
 * On initial load it requests all available timeline data for the camera. On subsequent requests it will request
 * additional timeline data starting from the last period in the previous request or the timestamp of the last request.
 *
 * This is a cold observable that will only make requests when there are active subscribers. When there aren't any
 * subscribers the previous state is preserved.
 *
 * The timelineSync$ observable is used to throttle the subsequent requests. After a request is completed the following
 * request is delayed until notified by the timelineSync$ observable. This is to prevent multiple requests from being
 * triggered even if timelineSync$ emits while a request is in progress.
 *
 * @param system A reference to an NxSystem
 * @param cameraId Camera id to generate timeline state
 * @param timelineSync$ An observable to trigger fetching additional chunks of timeline
 * @returns Observable<TimeDetail>
 */
export const initCameraTimeLine = (
    system: NxSystem,
    cameraId: string,
    timelineSync$: Observable<number>,
): TimelineState => {
    let time = 0;

    const getTimeDetail = (startTimeMs: number = 0): Observable<TimePeriod[]> => {
        const requestTime = Date.now() - 500;
        return system.cameraManager.getRecordedTimes([cameraId], startTimeMs).pipe(
            map(sortTimeDetails),
            map(([times]: TimeDetail[]) => times?.periods || []),
            tap(periods => {
                const lastPeriod = periods[periods.length - 1];
                const lastPeriodTime = lastPeriod
                    ? +lastPeriod.startTimeMs + +lastPeriod.durationMs
                    : requestTime;
                time = Math.max(lastPeriodTime, time);
            }),
            catchError(() => of([])),
        );
    };

    const fetchInitial$ = defer(() => getTimeDetail(time)).pipe(
        repeat({ delay: () => timelineSync$.pipe(skip(1)) }),
        scan((acc, curr) => [...acc, ...curr], []),
        map(periods => ({
            periods: periods.filter(
                (period, index, arr) => +period.durationMs !== -1 || index === arr.length - 1,
            ),
            guid: dirtyId(cameraId),
        })),
    );

    return fetchInitial$.pipe(shareReplay({ refCount: false, bufferSize: 1 }));
};

export const aggregateTimeDetailFactory =
    (timelineSystemsProxy: TimeLineSystemsProxy, sync: () => void) =>
    (cameras: CameraAndSystemIds): Observable<TimeDetail[] | null> => {
        sync();
        return combineLatest(
            cameras.map(({ id, systemId }) => timelineSystemsProxy[systemId][id]),
        ).pipe(
            startWith(null),
            distinctUntilChanged(isEqual),
            shareReplay({ refCount: true, bufferSize: 1 }),
        );
    };
