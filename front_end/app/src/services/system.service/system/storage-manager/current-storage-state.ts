import { NxUtilsService }   from '@services/utils.service';
import { ServerManager }    from '../server-manager/server-manager';
import {
    StorageResponses, StorageDataStructure, Storage, SaveStoragePayload
}                           from './storage';

export enum STORAGE_TYPES {
    LOCAL = 'local',
    USB = 'usb',
    NETWORK = 'smb',
    SYSTEM_NETWORK = 'network',
    CLOUD = 'cloud'
}

export enum MODE {
    MAIN='main',
    BACKUP='backup',
    NOT_IN_USE='notUsed'
}

/**
 * Add properties and methods here for the current servers storages.
 * Calculated properties like hasAction and onlineMains/onlineBackups should have getters instead of imperatively calculated.
 *
 * CurrentStorageState.locations is an array of Storage's which itself has reference back to the parent on Storage.currentStorageState.
 * This will allow for checking against the parent for things like comparing freeSpace on a storage with total freeSpace on all storages.
 */
export class CurrentStorageState {
    locations: Storage[];
    vmsSpaceLoaded: boolean;
    storageInfoLoaded: boolean;
    storageStatsLoaded: boolean;
    analyticsLoaded: boolean;

    #serverManager: ServerManager;
    #hasAnalyticsData = false;
    #hasPlugins = false;
    #metadataStorageId: string;

    get hasAction() {
        return this.locations.some(location => location.hasAction);
    }

    get onlineMains() {
        return this.locations.filter(this.#countMainAndBackup(true)).length;
    }

    get onlineBackups() {
        return this.locations.filter(this.#countMainAndBackup(false)).length;
    }

    get reindexing(): MODE[] {
        const reindexingLocations = this.locations.filter(({ reindexing }) => reindexing).map(({ mode }) => mode);
        const unique = new Set(reindexingLocations);
        return [...unique];
    }

    get freeSpace() {
        return this.locations.reduce((
            totalFreeSpace,
            { freeSpace, isBackup, usedForWriting }
        ) => totalFreeSpace + (!isBackup && usedForWriting ? freeSpace : 0), 0);
    }

    get serialized(): SaveStoragePayload[] {
        return this.locations.map(({ serialized }) => serialized).filter(storage => storage);
    }

    get analyticsDbTargetLocations() {
        return this.locations.filter(({ canStoreAnalyticsDb }) => canStoreAnalyticsDb);
    }

    get hasAnalyticsData() {
        return this.#hasAnalyticsData;
    }

    get hasCompatibleAnalyticsPlugins() {
        return this.#hasPlugins;
    }

    get currentAnalyticsDbLocation() {
        return this.locations.find(({ storageId }) => storageId === this.#metadataStorageId);
    }

    get beingChecked() {
        return !!this.locations.find(({ storageStatus }) => storageStatus.includes('beingChecked'));
    }

    // Storage save methods

    /**
     * Saves the serialized version of the current storage state.
     */
    saveStorages() {
        return this.#serverManager.mediaserver.updateStorages(this.serialized);
    }

    /**
     * Saves the current analyticsDb location to server.
     */
    saveAnalyticsDbLocation(metadataStorageId: string = this.currentAnalyticsDbLocation.storageId) {
        return this.#serverManager.updateResource(this.currentAnalyticsDbLocation.serverId, { metadataStorageId });
    }

    constructor(
        state: Partial<CurrentStorageState>,
        analytics: any,
        serverManager: ServerManager
    ) {
        this.#serverManager = serverManager;
        state.locations.forEach(location => {
            location.currentStorageState = this;
        });
        state.locations = state.locations.sort(this.#sortByTypeAndUrl);
        Object.assign(this, state);
        this.#parseAnalytics(analytics);
    }

    // Helpers
    #sortByTypeAndUrl = (
        { storageType: aType, url: aUrl },
        { storageType: bType, url: bUrl }
    ) => {
        const { LOCAL, USB, NETWORK, SYSTEM_NETWORK, CLOUD } = STORAGE_TYPES;
        const typeOrder = [LOCAL, USB, SYSTEM_NETWORK, NETWORK, CLOUD];
        if (aType === bType) {
            return aUrl < bUrl ? -1 : 1;
        }
        return typeOrder.indexOf(aType) - typeOrder.indexOf(bType);
    }

    #countMainAndBackup = (
        main = true
    ) => ({
        isBackup, isOnline, isWritable, usedForWriting
    }) => isBackup === !main && isOnline && isWritable && usedForWriting;

    #parseAnalytics = ({ hasAnalyticsData, hasPlugins, metadataStorageId }) => {
        this.#metadataStorageId = NxUtilsService.cleanId(metadataStorageId || '');
        this.#hasAnalyticsData = hasAnalyticsData;
        this.#hasPlugins = hasPlugins;
    }

    #checkCanStoreAnalytics = ({ storageType }: Storage) => storageType === STORAGE_TYPES.LOCAL;

    checkAnalytics = (storage: Storage) => ({
        analyticsDbLocation : storage.storageId === this.#metadataStorageId,
        canStoreAnalyticsDb : this.#checkCanStoreAnalytics(storage)
    })
}

/**
 * The storageFactory take the StorageResponses array handles munging the data together.
 * This process is by nature fairly imperative, it's best that we try to contain all data processing to just the storageFactory.
 * It's best that we keep the Storage class constructor free from any data processing required to initialize.
 */
export const currentStorageStateFactory = (
    [info, metrics, stats, analytics]: StorageResponses,
    storageServerId: string,
    serverManager: ServerManager
) => {
    const vmsSpace = metrics && Object.entries(metrics?.reply?.storages || {}).reduce((storages, [storageId, value]: [string, any]) => {
        return {
            ...storages,
            [NxUtilsService.cleanId(storageId)]: {
                vmsSpace: value?.space?.mediaSpaceB || 0
            }
        };
    }, {});

    const storageInfo = info && info.reduce((
        allInfo,
        {
            id,
            parentId: serverId,
            spaceLimit: reservedSpace,
            addParams,
            ...info
        }
    ) => ({
        ...allInfo,
        [NxUtilsService.cleanId(id)]: {
            ...info,
            reservedSpace,
            serverId,
            urlWithCredentials : info.url,
            totalSpace         : addParams.find(({
                name
            }) => name === 'space')?.value || 0
        }
    }), {});

    const storageStats = (stats?.reply?.storages || []).reduce((
        storagesStats, {
            storageId,
            isUsedForWriting,
            ...storageStats
        }) => ({
        ...storagesStats,
        [storageId !== '{00000000-0000-0000-0000-000000000000}' ? NxUtilsService.cleanId(storageId) : storageStats.url]: {
            ...storageStats
        }
    }), {});

    const getMungedData = <T extends {}>(...data: T[]): T => {
        const [first, ...remaining] = data;
        const munged = first || {} as T;
        remaining.forEach(entry => {
            Object.entries(entry || {}).forEach(([key, value]) => {
                if (munged[key]) {
                    Object.assign(munged[key], value);
                } else {
                    munged[key] = value;
                }
            });
        });
        return munged;
    };

    const mungedData = getMungedData(storageInfo, vmsSpace, storageStats);
    const locations = Object.entries(mungedData).map(([
        storageId,
        {
            serverId,
            reservedSpace,
            freeSpace,
            totalSpace,
            ...input
        }
    ]: [string, Partial<StorageDataStructure>]) => new Storage({
        storageId,
        reservedSpace : +(reservedSpace || 0),
        freeSpace     : +(freeSpace || 0),
        totalSpace    : +(totalSpace || 0),
        serverId      : serverId || storageServerId,
        ...input
    }));

    const storages = {
        locations,
        vmsSpaceLoaded     : !!vmsSpace,
        storageInfoLoaded  : !!storageInfo,
        storageStatsLoaded : !!storageStats,
        analyticsLoaded    : !!analytics
    };

    return new CurrentStorageState(storages, analytics, serverManager);
};
