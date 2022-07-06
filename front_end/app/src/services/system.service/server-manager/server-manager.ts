import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { APIDoc } from '@pages/api-tool/api-tool-types';
import type {
    Logger
} from '@pages/systems/settings/servers/logger/logger.component.types';
import type { APIDocType, MenuManifest } from '@services/nx-config/base-config';
import type { LogLevel, RebuildArchiveResponse } from '@services/system-api.types';
import * as t from '@services/system-api.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { paramSortFunc } from '@utils/general';

import { NxCloudApiService } from '../../nx-cloud-api';
import { NxSystemAPIService } from '../../system-api.service';
import { NxSystemAPI } from '../../system-legacy-api.service';
import { NxSystem } from '../system';
import { NxSystemServer, ModuleInfo } from '../system-types';

export class ServerManager {
    mediaserverConnections: {
        [serverId: string]: NxSystemAPI | NxSystemRestAPI;
    };

    servers: NxSystemServer[] = [];
    moduleInfo: ModuleInfo;
    serverSubscription: Observable<NxSystemServer[]>;

    constructor(
        public mediaserver: NxSystemAPI | NxSystemRestAPI,
        private systemApiService: NxSystemAPIService,
        private currentUserEmail: string,
        private systemId: string,
        private cloudApi: NxCloudApiService,
        private system: NxSystem
    ) {}

    initSystemMediaServers(): Promise<Record<string, NxSystemAPI | NxSystemRestAPI>> {
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
                        : () => this.cloudApi.getSystemAuth(this.systemId).toPromise().then(authKeys => {
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

    // TODO: Remove servers arg from here and getForceServers, not used anywhere
    getServers(servers?: NxSystemServer[]): Observable<NxSystemServer[]> {
        return this.getForceServers(true, servers);
    }

    getForceServers(useCache: boolean, servers?: NxSystemServer[]): Observable<NxSystemServer[]> {
        if (!servers) {
            if (!this.serverSubscription || !useCache) {
                // @ts-expect-error TODO: Fix mismatch between NxSystemServer and GetMediaServers
                this.serverSubscription = this.mediaserver.getMediaServers(useCache);
                this.serverSubscription.subscribe(res => {
                    if (!res) {
                        return Promise.reject(new Error(`Request to server has failed ${res}`));
                    }

                    this.servers = res.sort(paramSortFunc(server => server.name));
                    return this.servers;
                });
            }
            return this.serverSubscription;
        } else {
            this.servers = servers.sort(paramSortFunc(server => server.name));
        }
    }

    getPreviewUrl(
        cameraId: string,
        time: number | string,
        width: number,
        height: number,
        rotate: number,
        auth?: string
    ): string {
        return this.mediaserver.previewUrl(cameraId, time, width, height, rotate, auth);
    }

    setCameraUserSettings(
        serverId: string,
        id: string,
        params: Record<string, string>
    ): Promise<t.ChangedIdReturned> {
        return this.mediaserverConnections[serverId]
            .saveCameraUserSettings(id, params);
    }

    setServerUserSettings(
        serverId: string,
        params: Record<string, string>
    ): Promise<t.ChangedIdReturned> {
        return this.mediaserverConnections[serverId]
            .saveServerUserSettings(serverId, params);
    }

    getAnalyticsEngines(serverId: string) {
        return this.mediaserverConnections[serverId].getAnalyticsEngines();
    }

    updateResource(resourceId: string, params: Record<string, string>): Promise<t.EmptyObjectReturned> {
        const mappedParams = Object.entries(params)
            .map<t.ResourceParam>(([name, value]) => ({
                name,
                value,
                resourceId
            }));
        return this.mediaserver.setResourceParams(mappedParams).toPromise();
    }

    updateOrGetBackupControl(serverId: string, action?: 'start' | 'stop') {
        return this.mediaserverConnections[serverId].backupControl(action);
    }

    getLicenses() {
        return this.mediaserver.getLicenses().toPromise();
    }

    getModuleInfo(serverId?: string): Observable<t.ModuleInformation> {
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

    getModuleInfoUsingUrl(url: string): Observable<t.ModuleInformation> {
        return this.mediaserver.getModuleInfoUsingUrl(url);
    }

    changeServerPort(port: number, serverId: string) {
        return this.mediaserverConnections[serverId].changePort(port)
            .catch(err => Promise.reject(err));
    }

    logLevel(serverId: string): Promise<LogLevel> {
        return this.mediaserverConnections[serverId].logLevel().toPromise();
    }

    setLogLevels(serverId: string, loggers: Logger[]): Promise<void> {
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

    renameServer(serverId: string, serverName: string): Promise<t.ChangedIdReturned> {
        const cleanServerId = serverId.replace(/[{}]/g, '');
        return this.mediaserverConnections[serverId].saveServerUserSettings(cleanServerId, { serverName });
    }

    restartServer(serverId: string): Promise<t.RestartServer> {
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

    getApiDoc(type: APIDocType = 'main'): Promise<APIDoc> {
        return this.mediaserver.getApiDoc(type);
    }

    fetchApiToolJSON(route: string): Promise<APIDoc> {
        return this.mediaserver.fetchApiToolJSON(route);
    }

    getApiToolManifest(): Promise<MenuManifest> {
        const mediaServer = this.mediaserver as NxSystemRestAPI;
        return mediaServer.getAPIToolManifest();
    }

    getApiChangelog(): Promise<string> {
        const mediaServer = this.mediaserver as NxSystemRestAPI;
        return mediaServer.getApiChangelog();
    }

    getApiPreamble(): Promise<string> {
        const mediaServer = this.mediaserver as NxSystemRestAPI;
        return mediaServer.getApiPreamble();
    }

    getStorages(serverId: string, useCache: boolean = false, customTimeout: number = 8000) {
        return this.mediaserverConnections[serverId].getStorages(useCache, customTimeout);
    }

    getRecordStats(serverId: string, useCache: boolean = false) {
        return this.mediaserverConnections[serverId].getRecordStats(useCache);
    }

    getServerStats(serverId: string, useCache: boolean = false) {
        return this.mediaserverConnections[serverId].getServerStats(useCache);
    }

    getStatistics(serverId: string) {
        return this.mediaserverConnections[serverId].getStatistics();
    }

    getLogs(serverId: string, params) {
        return this.mediaserverConnections[serverId].logUrl(params);
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
