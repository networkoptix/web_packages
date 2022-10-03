import { NxUtilsService } from '@services/utils.service';

import { ServerManager } from '../server-manager/server-manager';

import {
    StorageResponses,
    StorageDataStructure,
    Storage,
    CurrentStorageState
} from './storage';

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
    const vmsSpace = metrics &&
        Object.entries(metrics?.reply?.storages || {})
            .reduce((storages, [storageId, value]: [string, any]) => {
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
            urlWithCredentials: info.url,
            totalSpace: addParams.find(({
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
        [storageId !== '{00000000-0000-0000-0000-000000000000}'
            ? NxUtilsService.cleanId(storageId)
            : storageStats.url
        ]: {
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
        reservedSpace: +(reservedSpace || 0),
        freeSpace: +(freeSpace || 0),
        totalSpace: +(totalSpace || 0),
        serverId: serverId || storageServerId,
        ...input
    }));

    const storages = {
        locations,
        vmsSpaceLoaded: !!vmsSpace,
        storageInfoLoaded: !!storageInfo,
        storageStatsLoaded: !!storageStats,
        analyticsLoaded: !!analytics
    };

    return new CurrentStorageState(storages, analytics, serverManager);
};
