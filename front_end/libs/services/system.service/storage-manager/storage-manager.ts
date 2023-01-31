import { firstValueFrom, Observable } from 'rxjs';

import type { RebuildArchiveResponse } from '@services/system-api.types';

import { NxSystem } from '../system';

import { StorageState } from './storage-state';

/**
 * StorageManager extends StorageState which extends StorageBase.
 *
 * StorageManager class should contain storage related request methods and any static helper methods.
 * Maybe update the request methods to not need a serverId and to use this.serverId$.
 *
 * StorageState should contain all state management for storage.
 *
 * BaseManager should contain any base properties and methods that don't belong in any of the child classes.
 *
 * **USAGE EXAMPLE:**
 *
 * **Update the serverId on the storageManager triggers a state update:**
 * this.system.storageManager.serverId = this.selectedServer.id;
 *
 * This will start updating storageManager.storageState$ to the latest CurrentStorageState.
 * The vmsSpaceLoaded, storageInfoLoaded, and storageStatsLoaded properties initialize to false and get set true once loaded.
 *
 * **To refresh data:**
 * this.system.storageManager.update() - Leave empty to update all or use UpdateTriggers enum to update specific data.
 *
 * **Recommended way to use in a component:**
 * As much of the storage related logic as possible should be moved into either the Storage, CurrentStorageState, or StorageState classes.
 * This will allow the most reusability and would allow any bugs to be fixed in only one place.
 * See getter and setter on Storage, or the serialized getter on Storage and CurrentStorageState as examples.
 *
 * Most common way that this will probably be used is to subscribe to storageState$, UI can be updated as data is fetched.
 * Once all required data has been loaded, assign the CurrentStorageState to the component.
 * Use the Storage's getters and setters to make the changes to storages.
 *
 * To save pass the currentStorageState.serialized to the NxSystemAPI.updateStorages method.
 *
 * **TODO:**
 * There are probably methods and other getters and setters that are missing from Storage and CurrentStorageState.
 * Could probably just add a save() method to CurrentStorageState.
 * We're currently doing some polling on the server-storage-standard component. Might make sense to add that logic to the StorageState class.
 */
export class StorageManager extends StorageState {
    // Public storage methods

    rebuildArchive(
        serverId: string,
        type: number,
        action?: string
    ): Observable<RebuildArchiveResponse> {
        return this.serverManager.rebuildArchive(serverId, type, action);
    }

    updateOrGetBackupControl(serverId: string, action?: 'start' | 'stop') {
        return this.serverManager.updateOrGetBackupControl(serverId, action);
    }

    getServerStats(serverId, useCache = false) {
        return this.serverManager.getServerStats(serverId, useCache);
    }

    checkForAnalyticsData(serverId: string) {
        return this.serverManager.checkForAnalyticsData(serverId);
    }

    async getBackupState(serverId: string) {
        const settings = (await firstValueFrom(this.system.updateOrGetSystemSettings())).reply?.settings;
        try {
            const { quality, backupNewCameras } = JSON.parse((<any>settings).backupSettings);
            await this.system.cameraManager.updateSystemServersCameras();
            const backup = this.system.cameraManager.cameras.some(
                ({ backupPolicy }: any) => ['byDefault', 'on'].includes(backupPolicy)
            );
            const camerasHaveDefaults = this.system.cameraManager.cameras.every(
                ({ backupPolicy, backupQuality, backupType, backupContentType }: any) => (
                    ['on', 'CameraBackupDefault', 'byDefault'].includes(backupPolicy) &&
                    ['CameraBackupBoth', 'CameraBackupDefault'].includes(backupQuality) &&
                    ['CameraBackupBoth', 'CameraBackupDefault'].includes(backupType) &&
                    ['archive'].includes(backupContentType)
                )
            );
            const custom = (!backupNewCameras && settings.backupNewCamerasByDefault !== 'true') ||
                quality !== 'CameraBackupBoth' ||
                !camerasHaveDefaults;
            return { backup, custom };
        } catch (_) {
            console.info('getting backup state for legacy system');
        }
        const backupType = this.serverManager.servers.find(({ id }) => id === serverId).backupType;
        const backup = backupType !== 'BackupManual';
        const custom = backup && (
            backupType === 'BackupSchedule' ||
            !this.system.cameraManager.cameras.every(({ backupType }) => ['CameraBackupLowQuality', 'CameraBackupDefault'].includes(backupType)) ||
            settings?.backupNewCamerasByDefault !== 'true' ||
            !['CameraBackupDefault', 'CameraBackupLowQuality'].includes(settings?.backupQualities)
        );
        return { backup, custom };
    }

    getStoragesInfo() {
        return this.serverManager.mediaserver.getStoragesInfo();
    }

    getStorageStatus(queryParams) {
        return this.serverManager.mediaserver.getStorageStatus(queryParams);
    }

    saveStorage<T>(updateParams?: T) {
        const typeId = '{f8544a40-880e-9442-b78a-9da6db6862b4}';
        return this.serverManager.mediaserver.saveStorage({ ...updateParams, typeId });
    }

    constructor(
        public system: NxSystem
    ) {
        super(system.serverManager);
    }
}
