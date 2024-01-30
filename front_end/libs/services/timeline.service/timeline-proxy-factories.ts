import { Observable } from 'rxjs';

import { NxSystem } from '@services/system.service/system';

import { registerSubscriberCountUpdater } from './subscriber-count-utilities';
import { initCameraTimeLine } from './timeline-helpers';
import {
    TimelineCameraProxy,
    TimelineCameraTarget,
    TimeLineSystemsProxy,
    TimelineSystemsTarget,
} from './timeline-service.types';

/**
 * Creates a timeline proxy that generates or retrieves a Observable<TimeDetail> on property access.
 *
 * @see {@link initCameraTimeLine} for more details about how Observable<TimeDetail> is created and state in managed.
 *
 * @param system A reference to an NxSystem
 * @param timelineSync$ An observable to used to sync generated observables within proxy
 * @returns TimeLineSystemsProxy which is a record that generates or retrieves a Observable<TimeDetail> on property access
 */
const createSystemCameraTimeLineProxy = (
    system: NxSystem,
    timelineSync$: Observable<number>,
): TimelineCameraProxy =>
    new Proxy({ subscriberCount: { totalSubscribers: 0 } } as TimelineCameraTarget, {
        get(target, prop) {
            if (prop === 'subscriberCount') {
                return target.subscriberCount;
            }

            if (typeof prop !== 'string') {
                return null;
            }

            target[prop] ||= registerSubscriberCountUpdater(
                initCameraTimeLine(system, prop, timelineSync$),
                target.subscriberCount,
                prop,
            );
            return target[prop];
        },
    });

/**
 * Creates a proxy that generates or retrieves a TimelineCameraProxy on property access. The TimelineCameraProxy
 * in turn generates or retrieves a TimelineState on property access.
 *
 * The timelineSync$ observable is only used by individual cameras to sync timeline if there isn't a request currently
 * in progress. Previously the sync was done every 10 seconds because we had to make sure that the previous request
 * has completed. This is no longer the case, if we need to we could sync at much shorter intervals.
 *
 * @example
 * ```ts
 *  // TimeLineSystemsProxy
 *  const timelineSystemsProxy = createTimeLineSystemsProxy(systemFactory, timelineSync$);
 *
 *  // TimelineCameraProxy
 *  const timelineCameraProxy = timelineSystemsProxy[systemId];
 *  }
 *
 *  // Observable<TimeDetail>
 *  const cameraTimeDetail$ = timelineCameraProxy[cameraId];
 *
 *  // Full time detail is fetched on first subscription and incrementally updated based on last chunk and last check.
 *  cameraTimeDetail$.subscribe(toSomethingWithTimeDetail);
 * ```
 *
 * @param systemFactory  A factory function that returns a NxSystem for a given systemId
 * @param timelineSync$ An observable to used to sync generated observables within proxy
 * @returns TimeLineSystemsProxy which is a record that generates or retrieves a TimelineCameraProxy on property access
 */
export const createTimeLineSystemsProxy = (
    systemFactory: (systemId: string) => NxSystem,
    timelineSync$: Observable<number>,
): TimeLineSystemsProxy => {
    const target = { subscriberCountSummary: {} } as TimelineSystemsTarget;

    const registerSummary = (
        systemId: string,
        val: Readonly<TimelineCameraTarget>,
    ): Readonly<TimelineCameraTarget> => {
        target.subscriberCountSummary[systemId] = val.subscriberCount;

        return val;
    };

    return new Proxy(target, {
        get(target, prop, receiver) {
            if (typeof prop !== 'string') {
                return null;
            }

            target[prop] ||= registerSummary(
                prop,
                createSystemCameraTimeLineProxy(systemFactory(prop), timelineSync$),
            );

            return target[prop];
        },
    });
};
