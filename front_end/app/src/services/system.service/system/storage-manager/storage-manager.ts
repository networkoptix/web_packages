import { ServerManager }    from '../server-manager/server-manager';
import { NxSystem } from '../system';
import { StorageState }     from './storage-state';

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

    rebuildArchive(serverId: string, type: number, action?: string) {
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

    async getBackupState(serverId: string, hasOnlineBackups: boolean) {
        const backupType = this.serverManager.servers.find(({ id }) => id === serverId).backupType;
        const backup = hasOnlineBackups && backupType !== 'BackupManual';
        const settings = (await this.system.updateOrGetSystemSettings().toPromise()).reply?.settings;
        const custom = backup && (
            backupType === 'BackupSchedule' ||
                !this.system.cameraManager.cameras.every(({ backupType }) => ['CameraBackupLowQuality', 'CameraBackupDefault'].includes(backupType)) ||
                settings?.backupNewCamerasByDefault !== 'true' ||
                 !['CameraBackupDefault', 'CameraBackupLowQuality'].includes(settings?.backupQualities)
        );
        return { backup, custom };
    }

    updateOrGetSystemStorage<T extends any>(updateParams?: any, useCache = false, customTimeout = 8000) {
        if (!updateParams?.serverId) {
            return this.serverManager.mediaserver.updateStorages(updateParams, customTimeout);
        }
        return this.serverManager.getStorages(updateParams.serverId, useCache, customTimeout);
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
