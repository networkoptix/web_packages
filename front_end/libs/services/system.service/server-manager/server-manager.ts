import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { APIDoc } from '@pages/api-tool/api-tool-types';
import type { Logger } from '@pages/systems/settings/servers/logger/logger.component.types';
import type { APIDocType, LegacyMenuManifest, MenuManifest } from '@services/nx-config/base-config';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemOldModule } from '@services/system/modules/nx-system-old-module';
import { NxSystemBase } from '@services/system/system-base';
import type { GetLicenses, StorageAnalytics } from '@services/system-api.aggregated-types';
import type {
    ChangedIdReturned,
    EmptyObjectReturned,
    ResourceParam,
} from '@services/system-api.types';
import { EventParams } from '@services/system-api.types/events.types';
import { Licence } from '@services/system-api.types/licenses.types';
import type {
    LogLevel,
    RebuildArchiveResponse,
    ModuleInformationReply,
    ModuleInformation,
    RestartServer,
    StaticWebContentInfo,
    StaticWebContentDownload,
} from '@services/system-api.types/servers.types';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { alphabeticalSort, dirtyId } from '@utils/general';
import { invalidateCache, memoizeAsyncPersistent } from '@utils/memoize';
import { setServerIpAndPort } from '@utils/nx';

import { NxCloudApiService } from '../../nx-cloud-api';
import { NxSystemAPIService } from '../../system-api.service';
import { NxSystemAPI } from '../../system-legacy-api.service';
import { NxSystemServer } from '../types/servers.types';

function VersionCache(
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    target: ServerManager,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    propertyKey: keyof ServerManager,
    descriptor: PropertyDescriptor,
) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args) {
        const build = this.system.build || nxConfig.system?.version?.minor;
        if (!build) {
            return originalMethod.apply(this, args);
        }
        const db = NxSystemBase.INJECTOR.get(NgxIndexedDBService);
        const key = ['api-tool-cache', build, propertyKey, ...args].join('-');
        const existing = await firstValueFrom(db.getByKey('requestCache', key))
            .then((res: { key: string; value: unknown }) => res?.value)
            .catch();
        if (existing) {
            return existing;
        }
        const result = await originalMethod.apply(this, args);
        firstValueFrom(db.update('requestCache', { key, value: result }));
        return result;
    };
}

type PartialSystem = Pick<
    NxSystemOldModule,
    'mediaserver' | 'currentUserEmail' | 'id' | 'useRest' | 'version' | 'skipSettingSystem'
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

    servers$ = new BehaviorSubject<NxSystemServer[]>([]);
    /**
     * @deprecated
     *
     * This is a temporary solution to have a reactive version for the servers property.
     *
     * We should move the servers state into either an ngrx store or signal store.
     */
    updateServersSubject = (): void => this.servers$.next(this.servers);

    servers: NxSystemServer[] = [];
    moduleInfo: ModuleInformationReply;
    serverSubscription: Observable<NxSystemServer[]>;

    public mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2;
    private systemApiService: NxSystemAPIService;
    private currentUserEmail: string;
    private systemId: string;
    private cloudApi: NxCloudApiService;
    private system: PartialSystem;
    public version: number;

    constructor(system: PartialSystem) {
        const injector = NxSystemBase.INJECTOR;
        this.mediaserver = system.mediaserver;
        this.systemApiService = injector.get(NxSystemAPIService);
        this.currentUserEmail = system.currentUserEmail;
        this.systemId = system.id;
        this.cloudApi = injector.get(NxCloudApiService);
        this.system = system;
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
                              firstValueFrom(this.cloudApi.getSystemToken(this.systemId)).then(
                                  tokens => {
                                      (<NxSystemRestAPI>this.mediaserver)
                                          .setTokens(tokens, true)
                                          .subscribe(() => {});
                                      return Promise.resolve(true);
                                  },
                              )
                        : () =>
                              firstValueFrom(this.cloudApi.getSystemAuth(this.systemId)).then(
                                  authKeys => {
                                      this.mediaserver.setAuthKeys(
                                          authKeys.authGet,
                                          authKeys.authPost,
                                          authKeys.authPlay,
                                      );
                                      return true;
                                  },
                              );
                }
                mediaserverConnections[server.id] ||= this.systemApiService.createConnection({
                    user: this.currentUserEmail,
                    systemId: this.systemId,
                    serverId: server.id,
                    unauthorizedCallback,
                    version: this.system.version,
                    skipSettingSystem: this.system.skipSettingSystem,
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
                        .sort(alphabeticalSort(server => server.name));
                    this.updateServersSubject();
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
    ): Promise<ChangedIdReturned> {
        return this.mediaserverConnections[serverId].saveCameraUserSettings(id, params);
    }

    setServerUserSettings(
        serverId: string,
        params: Record<string, string>,
    ): Promise<ChangedIdReturned> {
        return this.mediaserverConnections[serverId].saveServerUserSettings(serverId, params);
    }

    getAnalyticsEngines(serverId: string) {
        return this.mediaserverConnections[serverId].getAnalyticsEngines();
    }

    /**
     * @deprecated see deprecation notice on NxSystemAPI.setResourceParams
     *
     * @param resourceId Server or device id
     * @param params Record of params to update
     * @returns EmptyObjectReturned
     */
    updateResource(
        resourceId: string,
        params: Record<string, string>,
    ): Promise<EmptyObjectReturned> {
        /**
         * Only use the new API for 5.1+ systems. Ran into some unexpected behavior on 5.0 when setting metadataStorageId
         * on a server that caused it to disconnect from cloud. Need to investigate further but this seems to be a mediaserver
         * bug. For now, we'll use the old API for 5.0 since it's working as expected, it's only on 5.1+ systems that some
         * parameters are not being set correctly using this method.
         */
        if (this.mediaserver instanceof NxSystemRestAPI2) {
            const isServer = dirtyId(resourceId) in this.mediaserverConnections;
            const updater = isServer
                ? this.mediaserver.updateServerParams
                : this.mediaserver.updateDeviceParams;
            return updater.call(this.mediaserver, resourceId, params).then(() => ({}));
        }

        if (params.id) {
            params.id = dirtyId(params.id);
        }
        const mappedParams = Object.entries(params).map<ResourceParam>(([name, value]) => ({
            name,
            value,
            resourceId,
        }));
        return firstValueFrom(this.mediaserver.setResourceParams(mappedParams));
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

    getModuleInfo(serverId?: string): Observable<ModuleInformation> {
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

    getModuleInfoUsingUrl(url: string): Observable<ModuleInformation> {
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
            firstValueFrom(
                this.mediaserverConnections[serverId].logLevel(undefined, logger.key, logger.value),
            ),
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
            firstValueFrom(this.mediaserverConnections[serverId].updateLogLevel(logLevels))
        );
    }

    setLogLevels(serverId: string, loggers: Logger[]): Promise<void> {
        return this.mediaserverConnections[serverId].version > this.cutOff
            ? this.setLogsV2(serverId, loggers)
            : this.setLogsLegacy(serverId, loggers);
    }

    activateLicense(serverId: string, key: string) {
        return firstValueFrom(this.mediaserverConnections[serverId].activateLicense(key));
    }

    renameServer(serverId: string, serverName: string): Promise<ChangedIdReturned> {
        const cleanServerId = serverId.replace(/[{}]/g, '');
        return this.mediaserverConnections[serverId].renameServer(cleanServerId, serverName);
    }

    restartServer(serverId: string): Promise<RestartServer> {
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

    getCurrentWebadminBuild(serverId: string): Promise<StaticWebContentInfo> {
        return firstValueFrom(this.mediaserverConnections[serverId].getCurrentWebadminBuild());
    }

    updateWebadmin(
        serverId: string,
        url: string,
        checksum?: string,
    ): Promise<StaticWebContentDownload> {
        return firstValueFrom(this.mediaserverConnections[serverId].updateWebadmin(url, checksum));
    }

    /**
     * Storage endpoints
     */

    getStorageAnalytics(serverId: string): Observable<StorageAnalytics> {
        return this.mediaserverConnections[serverId].getStorageAnalytics();
    }

    invalidateStorageAnalytics(serverId: string): void {
        invalidateCache(this.mediaserverConnections[serverId], 'getStorageAnalytics');
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

    @VersionCache
    getApiDoc(type: APIDocType = 'main'): Promise<APIDoc | undefined> {
        return this.mediaserver.getApiDoc(type);
    }

    @VersionCache
    fetchApiToolJSON(route: string): Promise<APIDoc | undefined> {
        return this.mediaserver.fetchApiToolJSON(route);
    }

    @VersionCache
    getApiToolManifest(): Promise<MenuManifest | undefined | LegacyMenuManifest> {
        const mediaServer = this.mediaserver as NxSystemRestAPI;
        return mediaServer.getAPIToolManifest();
    }

    @VersionCache
    getApiMarkdownFile(fileName: string): Promise<string | undefined> {
        const mediaServer = this.mediaserver as NxSystemRestAPI;
        return mediaServer.getApiMarkdownFile(fileName);
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

    createEvent(params: EventParams) {
        return this.mediaserver.createEvent(params);
    }

    private parseLicense({ licenseBlock }: Licence): LicenseBlocks {
        return Object.fromEntries(
            licenseBlock.split('\n').map(block => block.split('=')),
        ) as LicenseBlocks;
    }
}
