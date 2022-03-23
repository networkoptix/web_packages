import { combineLatest, Observable, Subject } from 'rxjs';
import {
    filter,
    map,
    retry,
    startWith,
    switchMap,
    takeUntil,
    catchError,
} from 'rxjs/operators';

import { NxLogger } from '@utils/logger';
import { StateManager } from '@utils/state-manager';

import { BaseManager } from '../base/base-manager';
import { ServerManager } from '../server-manager/server-manager';

import { currentStorageStateFactory } from './current-storage-state';
import { CurrentStorageState } from './storage';

/**
* Provides a fallback value for errors.
*/
const fallback = <T>(value: T) => catchError(() => Promise.resolve(value));

export enum UpdateTriggers {
    INFO = 'info',
    METRICS = 'metrics',
    STATS = 'stats',
    ANALYTICS = 'analytics'
}

export type TriggerUpdateCallback = () => void;

/**
 * StorageState class should only handle managing the storage state data stream.
 * If the initial stream structure or logic needs to be updated it's done here.
 *
 * The StorageState class has an update method that is used to trigger updating.
 * StorageInfo, StorageStats, and StorageMetrics can be individually updated or all can be updated.
 */
export class StorageState extends BaseManager {
    /**
     * Trigger updates, leave blank to update all or add UpdateTrigger to update specific data.
     */
    update = (dataToRefresh?: UpdateTriggers) => {
        if (!dataToRefresh) {
            Object.values(UpdateTriggers).forEach(this.update);
        } else {
            this.#updater$.next(dataToRefresh);
        }
        return this.storageState$;
    };

    poll = (dataToPoll: UpdateTriggers): [Observable<CurrentStorageState>, TriggerUpdateCallback] => {
        return [this.storageState$, () => this.update(dataToPoll)];
    };

    /**
     * Triggers update events, similar to redux action/reducer pattern.
     */
    #updater$ = new Subject<UpdateTriggers>();

    #updateOn = (trigger: UpdateTriggers) => this.#updater$.pipe(startWith(trigger), filter(updater => updater === trigger), switchMap(() => this.serverId$));

    // State update handlers - These need to be arrow functions because "this" is fun.
    #getStorageInfoHandler = id => this.serverManager.mediaserver.getStoragesInfo({ id }).pipe(startWith(false), map(info => typeof info === 'boolean' ? info : info.map(({ typeId, name, ...store }) => ({ ...store, canUpdate: true }))));
    #getStorageStatsHandler = id => this.serverManager.getStorages(id, false, 60000).pipe(retry(5), startWith(false));
    #getStorageMetricsHandler = id => this.serverManager.getServerStats(id).pipe(startWith(false));
    #getAnalyticsHandler = id => this.serverManager.getStorageAnalytics(id).pipe(startWith(false));

    /**
     * StateManagers:
     *
     * Updates on serverId$ change or by triggering updater.
     *
     * Fetches storage info from /ec2/getStorages.
     *
     * Fetches metrics info from /api/metrics/values, used to get mediaSpaceB for vms usage.
     *
     * Fetches storage stats from /api/storageSpace, used to get stats for each storage. Could take a long time.
     */

    #storageInfoStateManager = new StateManager(this.#getStorageInfoHandler, this.#updateOn(UpdateTriggers.INFO));
    #storageStatsStateManager = new StateManager(this.#getStorageStatsHandler, this.#updateOn(UpdateTriggers.STATS));
    #storageMetricsStateManager = new StateManager(this.#getStorageMetricsHandler, this.#updateOn(UpdateTriggers.METRICS));
    #storageAnalyticsStateManager = new StateManager(this.#getAnalyticsHandler, this.#updateOn(UpdateTriggers.ANALYTICS));

    storageState: CurrentStorageState;

    refresh$ = new Subject<boolean>();

    /**
     * The storageState$ contains an instance of the CurrentStorageState which has a locations property with an array of Storage.
     * The remaining properties on the CurrentStorage state are for properties that apply to the storages as a whole and not an individual storage.
     * The individual storages should be updated from methods on the StorageState class.
     * This way edge cases can be checked before calling the appropriate update method on the individual Storage.
     */
    storageState$ = combineLatest(
        [
            this.#storageInfoStateManager.state$.pipe(fallback([])),
            this.#storageMetricsStateManager.state$.pipe(fallback({})),
            this.#storageStatsStateManager.state$.pipe(fallback({ storages: [] })),
            this.#storageAnalyticsStateManager.state$.pipe(fallback({ hasAnalyticsData: false, hasPlugins: false, metadataStorageId: '' }))
        ]
    ).pipe(
        takeUntil(this.refresh$),
        filter((res: any) => res[2]),
        map((res: any) => currentStorageStateFactory(res, this.serverId, this.serverManager)),
        map(cur => {
            if (
                this.storageState &&
                (this.storageState.storageStatsLoaded && this.storageState.vmsSpaceLoaded) &&
                !cur.storageStatsLoaded &&
                this.storageState.storageInfoLoaded
            ) {
                return this.storageState;
            }
            this.storageState = cur;
            return cur;
        })
    );

    statsUpdated$ = new Subject<any>();

    /**
     * A hack specifically for an edge case in server-storage-standard.component.ts
     * Reinitializes in the situation when previous server was offline, but still loaded
     * Only addresses and should only be used for this edge case where
     *   previous offline server was loaded and update tick also occurred
     */
    reinitializeForOfflineToOnlineServer() {
        this.#storageInfoStateManager = new StateManager(this.#getStorageInfoHandler, this.#updateOn(UpdateTriggers.INFO));
        this.#storageStatsStateManager = new StateManager(this.#getStorageStatsHandler, this.#updateOn(UpdateTriggers.STATS));
        this.#storageMetricsStateManager = new StateManager(this.#getStorageMetricsHandler, this.#updateOn(UpdateTriggers.METRICS));
        this.#storageAnalyticsStateManager = new StateManager(this.#getAnalyticsHandler, this.#updateOn(UpdateTriggers.ANALYTICS));

        this.refresh$.next(true);
        this.refresh$ = new Subject<boolean>();

        this.storageState$ = combineLatest(
            [
                this.#storageInfoStateManager.state$.pipe(fallback([])),
                this.#storageMetricsStateManager.state$.pipe(fallback({})),
                this.#storageStatsStateManager.state$.pipe(fallback({ storages: [] })),
                this.#storageAnalyticsStateManager.state$.pipe(fallback({ hasAnalyticsData: false, hasPlugins: false, metadataStorageId: '' }))
            ]
        ).pipe(
            takeUntil(this.refresh$),
            filter((res: any) => res[2]),
            map((res: any) => currentStorageStateFactory(res, this.serverId, this.serverManager)),
            map(cur => {
                if (
                    this.storageState &&
                    (this.storageState.storageStatsLoaded && this.storageState.vmsSpaceLoaded) &&
                    !cur.storageStatsLoaded &&
                    this.storageState.storageInfoLoaded
                ) {
                    return this.storageState;
                }
                this.storageState = cur;
                return cur;
            })
        );
        this.storageState$.subscribe(NxLogger.logCustom({
            logIdentifier: 'Storage State',
            prettyPrint: false
        }));

        this.statsUpdated$ = new Subject<any>();
    }

    constructor(public serverManager: ServerManager) {
        super();
        this.storageState$.subscribe(NxLogger.logCustom({
            logIdentifier: 'Storage State',
            prettyPrint: false
        }));
        this.#storageStatsStateManager.state$.subscribe(this.statsUpdated$);
    }
}
