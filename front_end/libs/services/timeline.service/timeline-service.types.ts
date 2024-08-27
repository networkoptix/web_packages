import { Observable } from 'rxjs';

import {
    NxSystemCamera,
    TimeDetail,
} from '@services/system.service/camera-manager/camera-manager-types';

/**
 * The time detail for a single camera
 */
export type TimelineState = Observable<TimeDetail>;

/**
 * The active subscriber count tracker
 */
export type SubscriberCount = Record<string, number> & { totalSubscribers: number };

interface WithSubscriberCount {
    /**
     * To be used in the future to aggregate getRecordedTimes calls or for debugging
     */
    subscriberCount: SubscriberCount;
}

/**
 * The time detail for all cameras in a system.
 */
export type TimelineCameraTarget = Record<string, TimelineState> & WithSubscriberCount;

/**
 * Readonly proxy version of TimelineCameraTarget
 */
export type TimelineCameraProxy = Readonly<TimelineCameraTarget>;

/**
 * Systems with TimelineCameraTarget
 */
export type TimelineSystemsTarget = Record<string, TimelineCameraProxy> & {
    subscriberCountSummary: Record<string, SubscriberCount>;
};

/**
 * Readonly proxy version of TimelineSystemsTarget
 */
export type TimeLineSystemsProxy = Readonly<TimelineSystemsTarget>;

/**
 * Only the id and systemId of a camera are required for the timeline service.
 *
 * The rest of the NxSystemCamera type is omitted to allow using in places where
 * the full NxSystemCamera type is not available.
 */
export type CameraAndSystemId = Pick<NxSystemCamera, 'id' | 'systemId'>;

/**
 * A list of CameraAndSystemId
 */
export type CameraAndSystemIds = CameraAndSystemId[];

/**
 * A single time period
 */
export type TimePeriod = TimeDetail['periods'][number];

/**
 * Time periods separated into main and other cameras
 */
export type PeriodDetailByMainAndOther = { main: TimePeriod[] | null; other: TimePeriod[] };
