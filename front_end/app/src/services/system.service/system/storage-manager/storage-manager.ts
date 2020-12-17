import { ServerManager } from '../server-manager/server-manager'

export class StorageManager {
    constructor(
        private serverManager: ServerManager
    ) {}

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

    updateOrGetSystemStorage<T extends any>(updateParams?: any, useCache = false, customTimeout = 8000) {
        if (!updateParams?.serverId) {
            return this.serverManager.mediaserver.updateStorages(updateParams, customTimeout);
        }
        return this.serverManager.getStorages(updateParams.serverId, useCache, customTimeout);
    }
}
