import { tap } from 'rxjs/operators';

import { environment }                                      from '@environments/environment';
import { NxCloudApiService }                                from '../../../nx-cloud-api';
import { NxSystemAPIService, NxSystemAPI, ResourceParam }   from '../../../system-api.service';
import { NxUtilsService }                                   from '../../../utils.service';
import { NxSystemServer, ModuleInfo, IParams }              from '../system-types';
import { NxSystemRestAPI }                                  from '@services/system-rest-api.service';
import { NxSystem }                                         from '../system';
export class ServerManager {
    mediaserverConnections: {
        [serverId: string]: NxSystemAPI | NxSystemRestAPI;
    };

    servers: NxSystemServer[] = []
    moduleInfo: ModuleInfo;

    constructor(
        public mediaserver: NxSystemAPI,
        private systemApiService: NxSystemAPIService,
        private currentUserEmail: string,
        private systemId: string,
        private cloudApi: NxCloudApiService,
        private system: NxSystem
    ) {}

    initSystemMediaServers() {
        if (this.servers.length) {
            this.mediaserverConnections = this.servers.reduce((mediaserverConnections, server) => {
                const unauthorizedCallback = environment.isLocal
                    ? () => Promise.resolve()
                    : () => this.cloudApi.getSystemAuth(this.systemId).toPromise().then((authKeys: any) => {
                        this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
                        return Promise.resolve(true);
                    });
                mediaserverConnections[server.id] = this.systemApiService
                    .createConnection(
                        this.currentUserEmail,
                        this.systemId,
                        server.id,
                        unauthorizedCallback,
                        this.system.useRest
                    );
                const { authGet, authPost, authPlay } = this.mediaserver.getAuthKeys();
                mediaserverConnections[server.id].setAuthKeys(authGet, authPost, authPlay);
                return mediaserverConnections;
            }, {});
            return Promise.resolve(this.mediaserverConnections);
        }
        return Promise.reject();
    }

    getServers(servers?) {
        return this.getForceServers(true, servers);
    }

    getForceServers(useCache, servers?) {
        if (!servers) {
            const serverSubscription = this.mediaserver.getMediaServers(useCache);
            serverSubscription.subscribe((res: any) => {
                if (!res) {
                    return Promise.reject(new Error(`Request to server has failed ${res}`));
                }

                this.servers = res.sort(NxUtilsService.byParam((server: any) => server.name, NxUtilsService.sortASC));
                return this.servers;
            });
            return serverSubscription;
        } else {
            this.servers = servers.sort(NxUtilsService.byParam((server: any) => server.name, NxUtilsService.sortASC));
        }
    }

    getPreviewUrl(cameraId, time, width, height, rotate) {
        return this.mediaserver.previewUrl(cameraId, time, width, height, rotate);
    }

    setCameraUserSettings(serverId: string, id: string, params: { [key: string]: string; }) {
        return this.mediaserverConnections[serverId].saveCameraUserSettings(id, params);
    }

    setServerUserSettings(serverId: string, params: { [key: string]: string; }) {
        return this.mediaserverConnections[serverId].saveServerUserSettings(serverId, params);
    }

    getAnalyticsEngines(serverId: string) {
        return this.mediaserverConnections[serverId].getAnalyticsEngines();
    }

    updateResource(resourceId: string, params: IParams) {
        const mappedParams: ResourceParam[] = Object.entries(params).map(([name, value]) => ({ name, value, resourceId }));
        return this.mediaserver.setResourceParams(mappedParams).toPromise();
    }

    updateOrGetBackupControl(serverId: string, action?: 'start' | 'stop') {
        return this.mediaserverConnections[serverId].backupControl(action);
    }

    getLicenses() {
        return this.mediaserver.getLicenses().toPromise();
    }

    getModuleInfo(serverId?: string) {
        if (serverId) {
            return this.mediaserverConnections[serverId].getModuleInfo()
                .pipe(tap(moduleInfo => {
                    this.moduleInfo = moduleInfo.reply;
                }));
        } else {
            return this.mediaserver.getModuleInfo()
                .pipe(tap(moduleInfo => {
                    this.moduleInfo = moduleInfo.reply;
                }));
        }
    }

    changeServerPort(port: number, serverId: string) {
        return this.mediaserverConnections[serverId].changePort(port)
            .catch(err => Promise.reject(err));
    }

    logLevel(serverId: string) {
        return this.mediaserverConnections[serverId].logLevel().toPromise();
    }

    setLogLevels(serverId: string, loggers: IParams) {
        const promises = [];

        loggers.forEach((logger) => {
            promises.push(this.mediaserverConnections[serverId].logLevel(undefined, logger.key, logger.value).toPromise());
        });

        return Promise.all(promises)
            .then(() => {
                return Promise.resolve({});
            })
            .catch((error) => {
                return Promise.reject(new Error(error));
            });
    };

    activateLicense(serverId, key) {
        if (!this.mediaserverConnections) {
            return this.initSystemMediaServers()
                .then(() => {
                    return this.mediaserverConnections[serverId].activateLicense(key).toPromise();
                });
        } else {
            return this.mediaserverConnections[serverId].activateLicense(key).toPromise();
        }
    }

    renameServer(serverId: string, serverName: string) {
        const cleanServerId = serverId.replace(/[{}]/g, '');
        return this.mediaserverConnections[serverId].saveServerUserSettings(cleanServerId, { serverName });
    }

    restartServer(serverId: string) {
        return this.mediaserverConnections[serverId].restartServer()
            .catch(err => Promise.reject(err));
    }

    detachFromSystem(serverId: string, currentPassword: string) {
        return this.mediaserverConnections[serverId].detachFromSystem(currentPassword);
    }

    removeMediaserver(anotherServerId: string, serverIdToRemove: string) {
        return this.mediaserverConnections[anotherServerId].removeResource(serverIdToRemove);
    }

    restoreFactorySettings(serverId: string, currentPassword: string) {
        return this.mediaserverConnections[serverId].restoreFactorySettings(currentPassword);
    }

    /**
     * Storage endpoints
     */

    getStorageAnalytics(serverId: string) {
        return this.mediaserverConnections[serverId].getStorageAnalytics();
    }

    rebuildArchive(serverId: string, type: number, action?: string) {
        return this.mediaserverConnections[serverId].rebuildArchive(type, action);
    }

    checkForAnalyticsData(serverId: string) {
        return this.mediaserverConnections[serverId].checkForAnalyticsData();
    }

    getApiDoc(serverId: string) {
        return this.mediaserverConnections[serverId].getApiDoc();
    }

    getStorages(serverId, useCache = false, customTimeout = 8000) {
        return this.mediaserverConnections[serverId].getStorages(useCache, customTimeout);
    }

    getRecordStats(serverId, useCache = false) {
        return this.mediaserverConnections[serverId].getRecordStats(useCache);
    }

    getServerStats(serverId, useCache = false) {
        return this.mediaserverConnections[serverId].getServerStats(useCache);
    }

    parseLicense({ key, licenseBlock }: { key: string; licenseBlock: string; }) {
        const parsedBlock: any = licenseBlock.split('\n').reduce((parsed, current) => {
            const [curKey, curVal] = current.split('=');
            return { ...parsed, [curKey]: curVal };
        }, {});
        return { key, ...parsedBlock };
    }
}
