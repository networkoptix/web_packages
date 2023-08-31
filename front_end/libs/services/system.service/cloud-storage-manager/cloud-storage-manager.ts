import {
    BehaviorSubject,
    switchMap,
    filter,
    catchError,
    shareReplay,
    Observable,
    from,
    map,
    throwError,
} from 'rxjs';

import staticLang from '@language_static';
import { Translatable, TranslateObject } from '@pipes/nx-translate.types';
import { uuid } from '@services/nx-cloud-api/cloud-services/base-cloud-service-api.types';
import {
    BoundSystem,
    StorageInfo,
} from '@services/nx-cloud-api/cloud-services/cloud-storage/cloud-storage-api.types';
import { Destroyable } from '@utils/Destroyable';
import { bitsToString } from '@utils/bits-to-string';

import { CloudStorageAPI } from '../../nx-cloud-api/cloud-services/cloud-storage/cloud-storage-api';
import { LicenseTranslationBaseKeys } from '../license-manager/license-manager.types';
import { NxSystem } from '../system';

export enum CloudStorageUpdate {
    SYSTEM = 'system',
    USER = 'user',
    STATISTICS = 'statistics',
    ACTIVATE = 'activate',
}

export interface Usage {
    size: number;
    sizeText: Translatable;
    color: string;
    title: Translatable;
}

export class CloudStorageManager extends Destroyable {
    static readonly TRANSLATION_BASE = staticLang.cloudStorage.fromServer;

    static INSTANCES = new WeakMap<NxSystem, CloudStorageManager>();

    static getInstance(cloudStorageApi: CloudStorageAPI, system: NxSystem): CloudStorageManager {
        if (!CloudStorageManager.INSTANCES.has(system)) {
            CloudStorageManager.INSTANCES.set(
                system,
                new CloudStorageManager(cloudStorageApi, system),
            );
        }
        return CloudStorageManager.INSTANCES.get(system).update();
    }

    #updater$ = new BehaviorSubject<CloudStorageUpdate[]>(
        Object.values(CloudStorageUpdate).filter(val => val !== CloudStorageUpdate.ACTIVATE),
    );

    /** State */

    /**
     * Storages for current system.
     */
    public readonly systemStorages$ = this.#updater$.pipe(
        filter(
            updates =>
                updates.includes(CloudStorageUpdate.SYSTEM) ||
                updates.includes(CloudStorageUpdate.ACTIVATE),
        ),
        switchMap(updates =>
            this.cloudStorageApi.getStorages(this.system.id).pipe(
                catchError(
                    () =>
                        new Promise<StorageInfo[]>(resolve =>
                            setTimeout(() => {
                                const retries = !updates.every(
                                    update => update === CloudStorageUpdate.SYSTEM,
                                )
                                    ? -1
                                    : updates.findIndex(
                                          update => update === CloudStorageUpdate.SYSTEM,
                                      );
                                if (retries !== -1) {
                                    updates.splice(retries);
                                    this.updateState(updates);
                                }
                                resolve([] as StorageInfo[]);
                            }, 2500),
                        ),
                ),
            ),
        ),
        catchError(() => Promise.resolve([] as StorageInfo[])),
        shareReplay({ bufferSize: 1, refCount: false }),
        this.onDestroyed,
    );

    public readonly activating$ = this.#updater$.pipe(
        map(
            updates =>
                updates.includes(CloudStorageUpdate.ACTIVATE) ||
                updates.filter(update => update === CloudStorageUpdate.SYSTEM).length > 1,
        ),
    );

    /**
     * Triggers fetching updated state from cloud storage service
     *
     * @param target CloudStorageUpdate[] | CloudStorageUpdate
     */
    public updateState(
        target: CloudStorageUpdate[] | CloudStorageUpdate = CloudStorageUpdate.SYSTEM,
    ): void {
        if (target === CloudStorageUpdate.ACTIVATE) {
            target = Array(10).fill(CloudStorageUpdate.SYSTEM);
        } else if (typeof target === 'string') {
            target = this.#updater$.value.includes(target) ? this.#updater$.value : [target];
        }
        this.#updater$.next(target);
    }

    public update(): this {
        this.updateState();
        return this;
    }

    /** Actions */

    /**
     * Handles binding existing storage to new system.
     *
     * @param systemId uuid
     * @returns Observable<BoundSystem>
     */
    public move(systemId: uuid): Observable<BoundSystem> {
        return this.systemStorages$.pipe(
            switchMap(([storage]) =>
                storage?.id
                    ? this.cloudStorageApi.bindSystem({ storageId: storage.id, systemId })
                    : Promise.resolve(null),
            ),
        );
    }

    /** Cloud Storage Manager Helpers */

    #translateMessage = (
        key: LicenseTranslationBaseKeys,
        params?: TranslateObject['params'],
    ): TranslateObject => ({
        value: CloudStorageManager.TRANSLATION_BASE[key],
        params: params || {},
    });

    #getSizeText = (usageSpace: number, percentage: number): TranslateObject =>
        this.#translateMessage('usedSpace', {
            usageSpace: bitsToString(usageSpace),
            percentage: percentage.toString(),
        });

    /**
     * Gets plain text usage message.
     *
     * Example:
     *
     * 5 GB of 100GB (5%) is used
     *
     * @param totalSpace number
     * @returns Observable<string>
     */
    public getUsageMessage(totalSpace: number): Observable<Translatable> {
        if (!totalSpace) {
            return from([' ']);
        }

        return this.systemStorages$.pipe(
            map(storages =>
                storages.reduce(
                    (total, { totalSpace, freeSpace }) => total + totalSpace - freeSpace,
                    0,
                ),
            ),
            map(usedSpace => {
                const total = bitsToString(totalSpace);
                const used = usedSpace === 0 ? `0 ${total.split(' ')[1]}` : bitsToString(usedSpace);
                const percent = Math.round((usedSpace / totalSpace) * 100);

                return this.#translateMessage('used', { used, total, percent: percent.toString() });
            }),
        );
    }

    /**
     * Calculates storage usage broken down by server using data from system.
     *
     * @param totalSpace number
     * @returns Observable<Usage[]>
     */
    #getUsageFromSystem(totalSpace: number): Observable<Usage[]> {
        return throwError(
            () =>
                new Error(
                    `TODO: Need to find out how the server team will provide this information. Total Space: ${totalSpace}`,
                ),
        );
    }

    /**
     * Calculates storage total usage by system using data from cloud storage service.
     *
     * @param totalSpace number
     * @returns Observable<Usage[]>
     */
    #getUsagesFromCloudStorageService(totalSpace: number): Observable<Usage[]> {
        return this.systemStorages$.pipe(
            map(storages => ({
                usedSpace: storages.reduce(
                    (total, { totalSpace, freeSpace }) => total + totalSpace - freeSpace,
                    0,
                ),
                storages: storages.length,
            })),
            map(({ usedSpace, storages }) => {
                const usages: Usage[] = [];
                if (storages) {
                    const usedSpacePercentage = Math.round((usedSpace / totalSpace) * 100);
                    const freeSpacePercentage = 100 - usedSpacePercentage;
                    const freeSpace = totalSpace - usedSpace;

                    usages.push({
                        size: usedSpacePercentage,
                        color: 'var(--new-brand-core)',
                        title: this.system.info.name,
                        sizeText: this.#getSizeText(usedSpace, usedSpacePercentage),
                    });

                    usages.push({
                        size: freeSpacePercentage,
                        color: 'transparent',
                        title: this.#translateMessage('available'),
                        sizeText: this.#getSizeText(freeSpace, freeSpacePercentage),
                    });
                }
                return usages;
            }),
        );
    }

    /**
     * Attempts to retrieve detailed usage from system. Fallback to summarized usage by system if request to system for detailed usage fails.
     *
     * @param totalSpace number
     * @returns Observable<Usage[]>
     */
    public getUsages(totalSpace: number): Observable<Usage[]> {
        return !totalSpace
            ? from([])
            : this.#getUsageFromSystem(totalSpace).pipe(
                  catchError(() => this.#getUsagesFromCloudStorageService(totalSpace)),
              );
    }

    constructor(private cloudStorageApi: CloudStorageAPI, private system: NxSystem) {
        super();
    }
}
