import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import type { APIDocType } from '@services/nx-config/base-config';
import type { LogLevel, RebuildArchiveResponse } from '@services/system-api.types';
import * as t from '@services/system-api.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { paramSortFunc } from '@utils/general';

import { NxCloudApiService } from '../../nx-cloud-api';
import { NxSystemAPIService } from '../../system-api.service';
import type { ResourceParam } from '../../system-api.types';
import { NxSystemAPI } from '../../system-legacy-api.service';
import { NxSystem } from '../system';
import { NxSystemServer, ModuleInfo, IParams } from '../system-types';

export class ServerManager {
    mediaserverConnections: {
        [serverId: string]: NxSystemAPI | NxSystemRestAPI;
    };

    servers: NxSystemServer[] = [];
    moduleInfo: ModuleInfo;
    serverSubscription: Observable<any>;

    constructor(
        public mediaserver: NxSystemAPI | NxSystemRestAPI,
        private systemApiService: NxSystemAPIService,
        private currentUserEmail: string,
        private systemId: string,
        private cloudApi: NxCloudApiService,
        private system: NxSystem
    ) {}

    initSystemMediaServers() {
        if (this.mediaserverConnections && this.servers.every(({ id }) => id in this.mediaserverConnections)) {
            return Promise.resolve(this.mediaserverConnections);
        }

        if (this.servers.length) {
            this.mediaserverConnections = this.servers.reduce((mediaserverConnections, server) => {
                let unauthorizedCallback = () => Promise.resolve(true);
                if (!environment.isLocal) {
                    unauthorizedCallback = this.system.useRest
                        ? () => this.cloudApi.getSystemToken(this.systemId).toPromise().then(tokens => {
                            (<NxSystemRestAPI> this.mediaserver)
                                .setTokens(tokens, true)
                                .subscribe(() => {});
                            return Promise.resolve(true);
                        })
                        : () => this.cloudApi.getSystemAuth(this.systemId).toPromise().then((authKeys: any) => {
                            this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
                            return Promise.resolve(true);
                        });
                }
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

    getForceServers(useCache: boolean, servers?: NxSystemServer[]) {
        if (!servers) {
            if (!this.serverSubscription) {
                this.serverSubscription = this.mediaserver.getMediaServers(useCache);
                this.serverSubscription.subscribe((res: any) => {
                    if (!res) {
                        return Promise.reject(new Error(`Request to server has failed ${res}`));
                    }

                    this.servers = res.sort(
                        paramSortFunc((server: any) => server.name)
                    );
                    return this.servers;
                });
            }
            return this.serverSubscription;
        } else {
            this.servers = servers.sort(paramSortFunc((server: any) => server.name));
        }
    }

    getPreviewUrl(cameraId, time, width, height, rotate, auth?) {
        return this.mediaserver.previewUrl(cameraId, time, width, height, rotate, auth);
    }

    setCameraUserSettings(serverId: string, id: string, params: Record<string, string>) {
        return this.mediaserverConnections[serverId].saveCameraUserSettings(id, params);
    }

    setServerUserSettings(serverId: string, params: Record<string, string>) {
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

    getModuleInfoUsingUrl(url: string) {
        return this.mediaserver.getModuleInfoUsingUrl(url);
    }

    changeServerPort(port: number, serverId: string) {
        return this.mediaserverConnections[serverId].changePort(port)
            .catch(err => Promise.reject(err));
    }

    logLevel(serverId: string): Promise<LogLevel> {
        return this.mediaserverConnections[serverId].logLevel().toPromise();
    }

    setLogLevels(
        serverId: string,
        loggers: IParams[]
    ): Promise<void> {
        const promises = loggers.map<Promise<LogLevel>>(logger =>
            this.mediaserverConnections[serverId]
                .logLevel(undefined, logger.key, logger.value)
                .toPromise()
        );

        return Promise.all(promises)
            .then(() => {
                return Promise.resolve();
            })
            .catch(error => {
                return Promise.reject(new Error(error));
            });
    }

    activateLicense(serverId: string, key: string) {
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
        return this.mediaserverConnections[serverId].restartServer(serverId)
            .catch(err => Promise.reject(err));
    }

    detachFromSystem(serverId: string, currentPassword: string) {
        return this.mediaserverConnections[serverId].detachFromSystem(currentPassword, serverId);
    }

    removeMediaserver(anotherServerId: string, serverIdToRemove: string) {
        return this.mediaserverConnections[anotherServerId].removeResource(serverIdToRemove);
    }

    restoreFactorySettings(serverId: string, currentPassword: string) {
        return this.mediaserverConnections[serverId].restoreFactorySettings(currentPassword, serverId);
    }

    /**
     * Storage endpoints
     */

    getStorageAnalytics(serverId: string) {
        return this.mediaserverConnections[serverId].getStorageAnalytics();
    }

    rebuildArchive(
        serverId: string,
        type: number,
        action?: string
    ): Observable<RebuildArchiveResponse> {
        return this.mediaserverConnections[serverId].rebuildArchive(type, action);
    }

    checkForAnalyticsData(serverId: string) {
        return this.mediaserverConnections[serverId].checkForAnalyticsData();
    }

    getApiDoc(serverId: string, type: APIDocType = 'main') {
        return this.mediaserverConnections[serverId].getApiDoc(type);
    }

    getApiChangelog(serverId: string) {
        const connection = this.mediaserverConnections[serverId] as NxSystemRestAPI;
        return connection.getApiChangelog();
    }

    getApiPreamble(serverId: string) {
        const connection = this.mediaserverConnections[serverId] as NxSystemRestAPI;
        return connection.getApiPreamble();
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

    getStatistics(serverId: string) {
        return this.mediaserverConnections[serverId].getStatistics();
    }

    createEvent(params: t.EventParams) {
        return this.mediaserver.createEvent(params);
    }

    parseLicense({ key, licenseBlock }: { key: string; licenseBlock: string; }) {
        const parsedBlock: any = licenseBlock.split('\n').reduce((parsed, current) => {
            const [curKey, curVal] = current.split('=');
            return { ...parsed, [curKey]: curVal };
        }, {});
        return { key, ...parsedBlock };
    }
}
