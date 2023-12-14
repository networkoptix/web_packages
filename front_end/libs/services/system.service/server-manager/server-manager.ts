import { LOCALE_ID } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { APIDoc } from '@pages/api-tool/api-tool-types';
import type { Logger } from '@pages/systems/settings/servers/logger/logger.component.types';
import type { APIDocType, MenuManifest } from '@services/nx-config/base-config';
import { NxSystemOldModule } from '@services/system/modules/nx-system-old-module';
import { NxSystemBase } from '@services/system/system-base';
import type { GetLicenses, StorageAnalytics } from '@services/system-api.aggregated-types';
import type { LogLevel, RebuildArchiveResponse } from '@services/system-api.types';
import * as t from '@services/system-api.types';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { alphabeticalSort, dirtyId } from '@utils/general';
import { memoizeAsyncPersistent } from '@utils/memoize';
import { setServerIpAndPort } from '@utils/nx';

import { NxCloudApiService } from '../../nx-cloud-api';
import { NxSystemAPIService } from '../../system-api.service';
import { NxSystemAPI } from '../../system-legacy-api.service';
import { NxSystemServer, ModuleInfo } from '../system-types';

type PartialSystem = Pick<
    NxSystemOldModule,
    'mediaserver' | 'currentUserEmail' | 'id' | 'useRest' | 'version'
>;

type LicenseBlockNames =
    | 'NAME'
    | 'SERIAL'
    | 'HWID'
    | 'COUNT'
    | 'CLASS'
    | 'VERSION'
    | 'BRAND'
    | 'EXPIRATION'
    | 'SIGNATURE'
    | 'COMPANY'
    | 'SUPPORT'
    | 'DEACTIVATIONS';

type LicenseBlocks = Record<LicenseBlockNames, string>;

export class ServerManager {
    readonly cutOff = 5.0;

    private _mediaserverConnections: {
        [serverId: string]: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2;
    } = {};

    public get mediaserverConnections() {
        return this.handleInitSystemMediaServers();
    }

    servers: NxSystemServer[] = [];
    moduleInfo: ModuleInfo;
    serverSubscription: Observable<NxSystemServer[]>;

    public mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2;
    private systemApiService: NxSystemAPIService;
    private currentUserEmail: string;
    private systemId: string;
    private cloudApi: NxCloudApiService;
    private system: PartialSystem;
    private locale: string;

    constructor(system: PartialSystem) {
        const injector = NxSystemBase.INJECTOR;
        this.mediaserver = system.mediaserver;
        this.systemApiService = injector.get(NxSystemAPIService);
        this.currentUserEmail = system.currentUserEmail;
        this.systemId = system.id;
        this.cloudApi = injector.get(NxCloudApiService);
        this.system = system;
        this.locale = injector.get(LOCALE_ID);
    }

    handleInitSystemMediaServers(): Record<
        string,
        NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2
    > {
        if (
            this._mediaserverConnections &&
            this.servers.every(({ id }) => id in this._mediaserverConnections)
        ) {
            return this._mediaserverConnections;
        }
        if (this.servers.length) {
            this._mediaserverConnections = this.servers.reduce((mediaserverConnections, server) => {
                let unauthorizedCallback = () => Promise.resolve(true);
                if (!environment.isLocal) {
                    unauthorizedCallback = this.system.useRest
                        ? () =>
                              this.cloudApi
                                  .getSystemToken(this.systemId)
                                  .toPromise()
                                  .then(tokens => {
                                      (<NxSystemRestAPI>this.mediaserver)
                                          .setTokens(tokens, true)
                                          .subscribe(() => {});
                                      return Promise.resolve(true);
                                  })
                        : () =>
                              this.cloudApi
                                  .getSystemAuth(this.systemId)
                                  .toPromise()
                                  .then(authKeys => {
                                      this.mediaserver.setAuthKeys(
                                          authKeys.authGet,
                                          authKeys.authPost,
                                          authKeys.authPlay,
                                      );
                                      return true;
                                  });
                }
                mediaserverConnections[server.id] ||= this.systemApiService.createConnection({
                    user: this.currentUserEmail,
                    systemId: this.systemId,
                    serverId: server.id,
                    unauthorizedCallback,
                    version: this.system.version,
                });
                const { authGet, authPost, authPlay } = this.mediaserver.getAuthKeys();
                mediaserverConnections[server.id].setAuthKeys(authGet, authPost, authPlay);
                return mediaserverConnections;
            }, {});
            return this._mediaserverConnections;
        }
        throw new Error('No servers found');
    }

    initSystemMediaServers(): Promise<unknown> {
        try {
            const mediaServers = this.handleInitSystemMediaServers();
            return Promise.resolve(mediaServers);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    getServers(): Observable<NxSystemServer[]> {
        return this.getForceServers(true);
    }

    getForceServers(useCache: boolean): Observable<NxSystemServer[]> {
        if (!this.serverSubscription || !useCache) {
            this.serverSubscription = this.mediaserver.getMediaServers(useCache).pipe(
                map(res => {
                    if (!res) {
                        console.error(`Request to server has failed ${res}`);
                        return [];
                    }

                    this.servers = res
                        .map(setServerIpAndPort)
                        .sort(alphabeticalSort(this.locale, server => server.name));
                    return this.servers;
                }),
            );
        }
        return this.serverSubscription;
    }

    getPreviewUrl(
        cameraId: string,
        time: number | string,
        width: number = 640,
        height: number = 480,
        rotate: number = 0,
        auth: string = '',
    ): Observable<string> {
        return this.mediaserver.previewUrl(cameraId, time, width, height, rotate, auth);
    }

    setCameraUserSettings(
        serverId: string,
        id: string,
        params: Record<string, string>,
    ): Promise<t.ChangedIdReturned> {
        return this.mediaserverConnections[serverId].saveCameraUserSettings(id, params);
    }

    setServerUserSettings(
        serverId: string,
        params: Record<string, string>,
    ): Promise<t.ChangedIdReturned> {
        return this.mediaserverConnections[serverId].saveServerUserSettings(serverId, params);
    }

    getAnalyticsEngines(serverId: string) {
        return this.mediaserverConnections[serverId].getAnalyticsEngines();
    }

    updateResource(
        resourceId: string,
        params: Record<string, string>,
    ): Promise<t.EmptyObjectReturned> {
        if (params.id) {
            params.id = dirtyId(params.id);
        }
        const mappedParams = Object.entries(params).map<t.ResourceParam>(([name, value]) => ({
            name,
            value,
            resourceId,
        }));
        return this.mediaserver.setResourceParams(mappedParams).toPromise();
    }

    updateOrGetBackupControl(serverId: string, action?: 'start' | 'stop') {
        return this.mediaserverConnections[serverId].backupControl(action);
    }

    private getLicenses(): Observable<GetLicenses> {
        return this.mediaserver.getLicenses();
    }

    private calcChannelsLegacy(
        cameras,
    ): Observable<{ total: number; used: number; available: number }> {
        return this.getLicenses().pipe(
            map(({ licenses, hwids }) => {
                const parsedLicenses = licenses.map(this.parseLicense);
                const total = parsedLicenses.reduce((qty, { COUNT, EXPIRATION, CLASS, HWID }) => {
                    EXPIRATION = EXPIRATION && EXPIRATION.replace(' ', 'T') + 'Z'; // for Safari compatibility
                    const activeLicense =
                        hwids.includes(HWID) &&
                        (!EXPIRATION || new Date(EXPIRATION).getTime() > Date.now());
                    return activeLicense &&
                        (CLASS === 'digital' || CLASS === 'starter' || CLASS === 'edge')
                        ? qty + parseInt(COUNT)
                        : qty;
                }, 0);
                const used = cameras.filter(
                    ({ scheduleEnabled, status }) => scheduleEnabled,
                ).length; // count all cameras - not just ONLINE ones
                const available = total - used;
                return { total, used, available };
            }),
        );
    }
    private calcChannels(): Observable<{ total: number; used: number; available: number }> {
        return this.system.mediaserver.getLicenseSummaries().pipe(
            map((licenses: any) => {
                return Object.entries(licenses).reduce(
                    (data: any, [_, { inUse, total }]: any) => {
                        data.inUse += inUse;
                        data.total += total;
                        if (inUse > 0) {
                            data.available += total - inUse;
                        }
                        return data;
                    },
                    {
                        available: 0,
                        inUse: 0,
                        total: 0,
                    },
                );
            }),
        );
    }

    private updateLicenseChannels$ = new BehaviorSubject('');

    getLicenseChannels(cameras): Observable<{ total: number; used: number; available: number }> {
        this.updateLicenseChannels$.next('update');
        return this.handleGetLicenseChannels(cameras);
    }

    @memoizeAsyncPersistent
    private handleGetLicenseChannels(cameras) {
        return this.updateLicenseChannels$.pipe(
            switchMap(() =>
                this.system.version > this.cutOff
                    ? this.calcChannels()
                    : this.calcChannelsLegacy(cameras),
            ),
            shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    getModuleInfo(serverId?: string): Observable<t.ModuleInformation> {
        if (serverId) {
            return this.mediaserverConnections[serverId].getModuleInfo().pipe(
                tap(moduleInfo => {
                    this.moduleInfo = moduleInfo.reply;
                }),
            );
        } else {
            return this.mediaserver.getModuleInfo().pipe(
                tap(moduleInfo => {
                    this.moduleInfo = moduleInfo.reply;
                }),
            );
        }
    }

    getModuleInfoUsingUrl(url: string): Observable<t.ModuleInformation> {
        return this.mediaserver.getModuleInfoUsingUrl(url);
    }

    changeServerPort(port: number, serverId: string) {
        return this.mediaserverConnections[serverId]
            .changePort(port)
            .catch(err => Promise.reject(err));
    }

    async logLevel(serverId: string): Promise<LogLevel> {
        return firstValueFrom(this.mediaserverConnections[serverId].logLevel());
    }

    private setLogsLegacy(serverId: string, loggers: Logger[]): Promise<void> {
        const promises = loggers.map<Promise<LogLevel>>(logger =>
            this.mediaserverConnections[serverId]
                .logLevel(undefined, logger.key, logger.value)
                .toPromise(),
        );

        return Promise.all(promises)
            .then(() => {
                return Promise.resolve();
            })
            .catch(error => {
                return Promise.reject(new Error(error));
            });
    }

    private setLogsV2(serverId: string, loggers: Logger[]): Promise<void> {
        const logLevels = loggers.reduce(
            (logs, log) => ({
                ...logs,
                [log.key]: {
                    primaryLevel: log.value,
                },
            }),
            {},
        );
        return <Promise<void>>(
            this.mediaserverConnections[serverId].updateLogLevel(logLevels).toPromise()
        );
    }

    setLogLevels(serverId: string, loggers: Logger[]): Promise<void> {
        return this.mediaserverConnections[serverId].version > this.cutOff
            ? this.setLogsV2(serverId, loggers)
            : this.setLogsLegacy(serverId, loggers);
    }

    activateLicense(serverId: string, key: string) {
        return this.mediaserverConnections[serverId].activateLicense(key).toPromise();
    }

    renameServer(serverId: string, serverName: string): Promise<t.ChangedIdReturned> {
        const cleanServerId = serverId.replace(/[{}]/g, '');
        return this.mediaserverConnections[serverId].renameServer(cleanServerId, serverName);
    }

    restartServer(serverId: string): Promise<t.RestartServer> {
        return this.mediaserverConnections[serverId]
            .restartServer(serverId)
            .catch(err => Promise.reject(err));
    }

    detachFromSystem(serverId: string, currentPassword: string) {
        return this.mediaserverConnections[serverId].detachFromSystem(currentPassword, serverId);
    }

    removeMediaserver(anotherServerId: string, serverIdToRemove: string) {
        return this.mediaserverConnections[anotherServerId].removeResource(serverIdToRemove);
    }

    restoreFactorySettings(serverId: string, currentPassword: string) {
        return this.mediaserverConnections[serverId].restoreFactorySettings(
            currentPassword,
            serverId,
        );
    }

    /**
     * Storage endpoints
     */

    getStorageAnalytics(serverId: string): Observable<StorageAnalytics> {
        return this.mediaserverConnections[serverId].getStorageAnalytics();
    }

    rebuildArchive(
        serverId: string,
        type: number,
        action?: string,
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

    getStorages(serverId: string, useCache: boolean = false, customTimeout?: number) {
        return this.mediaserverConnections[serverId].getStorages(useCache, customTimeout);
    }

    getServerStats(serverId: string, useCache: boolean = false) {
        return this.mediaserverConnections[serverId].getServerStats(useCache);
    }

    getStatistics(serverId: string, pollingInterval = 0) {
        return this.mediaserverConnections[serverId]?.getStatistics(Math.round(Date.now() / 1000));
    }

    getLogs(serverId: string, params) {
        return this.mediaserverConnections[serverId].logUrl(params);
    }

    createEvent(params: t.EventParams) {
        return this.mediaserver.createEvent(params);
    }

    private parseLicense({ licenseBlock }: t.Licence): LicenseBlocks {
        return Object.fromEntries(
            licenseBlock.split('\n').map(block => block.split('=')),
        ) as LicenseBlocks;
    }
}
