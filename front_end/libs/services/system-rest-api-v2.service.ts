import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { combineLatest, forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { NxHealthService } from '@pages/health/health.service';
import { getSystemMetricsAlarmsV2 } from '@services/mediaserver-apis/endpoints/system-metrics-alarms';
import { getSystemMetricsManifestV2 } from '@services/mediaserver-apis/endpoints/system-metrics-manifest';
import { getSystemMetricsValuesV2 } from '@services/mediaserver-apis/endpoints/system-metrics-values';
import { NxSystemAPI } from '@services/system-legacy-api.service';
import { buildTopLevelKeyMap } from '@utils/general';
import { memoizeAsyncLong, memoizeAsyncMedium } from '@utils/memoize';
import { ZERO_ID, type NxRecursiveKeyMap, type NxRecursivePick } from '@utils/nx';

import { NxAppStateService } from './nx-app-state.service';
import type {
    HealthReport,
    StorageAnalytics,
    ViewMediaServersAndCameras,
} from './system-api.aggregated-types';
import * as t from './system-api.types';
import { cameraKeyMapV2 } from './system-api.types';
import { NxSystemRestAPI } from './system-rest-api.service';
import { type RestV2CameraCompat } from './system.service/camera-manager/camera-manager-types';
import {
    RestV2ServerCompat,
    serverKeyMapV2,
    ViewBaseCamera,
    ViewPreprocessServer,
} from './system.service/system-server-types';
import { NxUriCacheService } from './uri-cache.service';

interface CustomFilter {
    filter?: string;
    level?: unknown;
}

interface LogV2 {
    fileName?: string;
    predefinedFilters?: string[];
    primaryLevel?: string;
    customFilters?: CustomFilter[];
}

interface LogLevelV2Response {
    [key: string]: LogV2;
}

interface PeerInfo {
    id: string;
    persistentId: string;
    instanceId: string;
    peerType: string;
    dataFormat?: string;
}

interface OsInfo {
    platform: string;
    variant: string;
    variantVersion: string;
}

interface RuntimeData {
    activeAnalyticsEngines: string[];
    brand: string;
    customization: string;
    flags: string;
    hardwareIds: string[];
    peer: PeerInfo;
    platform: string;
    publicIP: string;
    version: number;
    box?: string;
    nx1mac?: string;
    nx1serial?: string;
    prematureLicenseExpirationDate?: string;
    prematureVideoWallLicenseExpirationDate?: string;
    updateStarted?: boolean;
    userId?: string;
    videoWallInstanceGuid?: string;
    videoWallControlSession?: string;
}

interface RuntimeInfo {
    port: number;
    id: string;
    osInfo: OsInfo;
    osTimeMs: number;
    timeZoneOffsetMs?: number;
    timeZoneId: string;
    runtimeData: RuntimeData;
}

interface ServerTimes {
    serversRunTimeInfo: RuntimeInfo[];
    serversInfo: t.ModuleInformationReply[];
}

interface ModuleInfoRest extends t.ModuleInformationReply {
    osTimeMs: number;
    timeZoneOffsetMs: number;
}

export class NxSystemRestAPI2 extends NxSystemRestAPI {
    static VERSION = 5.1;
    readonly version: number;

    private readonly defaultLogLevel = 'info';

    constructor(
        http: HttpClient,
        location: Location,
        userEmail: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: t.UnauthorizedCallback,
        cacheService: NxUriCacheService,
        cookieService: CookieService,
        healthService: NxHealthService,
        appState: NxAppStateService,
        injector: Injector,
    ) {
        super(
            http,
            location,
            userEmail,
            systemId,
            serverId,
            unauthorizedCallback,
            cacheService,
            cookieService,
            healthService,
            appState,
            injector,
        );
        this.version = NxSystemRestAPI2.VERSION;
    }

    private responseWrapper = <D>(data: D): t.NormalResponse<D> => ({
        error: '0',
        errorString: 'ok',
        reply: data,
    });

    // Logger functions
    private parseLogData = (data: LogLevelV2Response): t.LogLevel =>
        this.responseWrapper(
            Object.entries(data)
                .filter(([key, _]: [string, LogV2]) => key.includes('Log'))
                .reduce((levels, [key, logInfo]: [string, LogV2]) => {
                    const modifiedKey = key.replace(/Log/, '').toUpperCase();
                    levels[modifiedKey] = logInfo?.primaryLevel || this.defaultLogLevel;
                    return levels;
                }, <t.LogLevelReply>{}),
        );

    logLevel(): Observable<t.LogLevel> {
        return this.get<LogLevelV2Response>('/rest/v2/servers/this/logSettings').pipe(
            map(this.parseLogData),
        );
    }

    /* // Removed until we either add/update the log endpoint. One solution is the blob route.
    logUrl(params: { name?: string; lines?: number }) {
        return this.get<string>(
            '/rest/v2/servers/this/logArchive',
            { names: [params.name] },
            { 'Content-Type': 'text', responseType: 'text' }
        ).toPromise();
    }
    */

    updateLogLevel(logLevel: LogLevelV2Response): Observable<t.LogLevel> {
        const parsedLogLevels = Object.entries(logLevel).reduce(
            (data, [key, value]) => ({
                ...data,
                [`${key.toLowerCase()}Log`]: value,
            }),
            {},
        );
        return this.patch<LogLevelV2Response>(
            '/rest/v2/servers/this/logSettings',
            parsedLogLevels,
        ).pipe(map(this.parseLogData));
    }

    // Servers
    // Todo: Type storage calls after fixing them
    // getStorages(useCache = false, customTimeout = 8000): any {
    //     return this.get('/rest/v2/servers/this/storages',
    //         undefined,
    //         { [useCache ? 'cache-request' : 'reset-cache']: 'true' },
    //         customTimeout)
    //         .pipe(map(res => this.responseWrapper({ storages: res })));
    // }
    //
    // getServerStats(useCache = false): any {
    //     return this.get('/rest/v2/system/metrics/values',
    //         undefined,
    //         { [useCache ? 'cache-request' : 'reset-cache']: 'true' })
    //         .pipe(map(res => this.responseWrapper(res)));
    // }
    private getRuntimeInfo(serverId: '*'): Observable<RuntimeInfo[]>;
    private getRuntimeInfo(serverId: string): Observable<RuntimeInfo>;
    private getRuntimeInfo(serverId: string) {
        return this.get(`/rest/v2/servers/${serverId}/runtimeInfo`);
    }

    // TODO: Clean up once VMS-35650 is implemented
    private getServerTimesHelper(): Observable<ModuleInfoRest[]> {
        return forkJoin({
            serversInfo: this.getServerInfo('*'),
            serversRunTimeInfo: this.getRuntimeInfo('*'),
        }).pipe(
            map(({ serversInfo, serversRunTimeInfo }: ServerTimes): ModuleInfoRest[] =>
                serversInfo.map(serverInfo => {
                    const runTimeInfo = serversRunTimeInfo.find(({ id }) => id === serverInfo.id);
                    return {
                        ...serverInfo,
                        osTimeMs: runTimeInfo?.osTimeMs || 0,
                        timeZoneOffsetMs: runTimeInfo?.timeZoneOffsetMs || 0,
                    };
                }),
            ),
        );
    }

    getHardwareIdsOfServers(): Observable<t.ServerHardareIdsResp> {
        return this.getRuntimeInfo('*').pipe(
            map(servers =>
                this.responseWrapper(
                    servers.map(({ runtimeData: { hardwareIds }, id }) => ({
                        hardwareIds,
                        serverId: id,
                    })),
                ),
            ),
        );
    }

    getServerTimes(): Observable<t.NormalResponse<t.ServerTime[]>> {
        const timeToString = time => time?.toString() || '0';
        return this.getServerTimesHelper().pipe(
            map(servers =>
                this.responseWrapper(
                    servers.map(({ id, osTimeMs, synchronizedTimeMs, timeZoneOffsetMs }) => ({
                        serverId: id,
                        osTime: timeToString(osTimeMs),
                        vmsTime: timeToString(synchronizedTimeMs),
                        timeZoneOffset: timeToString(timeZoneOffsetMs),
                    })),
                ),
            ),
        );
    }

    configureServer(configureParams: t.ConfigureParams): Promise<any> {
        return this.patch(
            '/rest/v2/servers/this/runtimeInfo',
            configureParams as Record<string, string>,
        ).toPromise();
    }

    rebuildArchive(location: number, action?: string): Observable<t.RebuildArchiveResponse> {
        let url = `/rest/v2/servers/this/rebuildArchive/${location ? 'main' : 'backup'}`;
        switch (action) {
            case 'start':
                return this.post(url);
            case 'update':
                url += '?_keepDefault=true';
                return this.get(url);
            case 'stop':
                return this.delete(url);
        }
    }

    // Licenses
    activateLicense(key): Observable<any> {
        return this.put(`/rest/v2/licenses/${key}`).pipe(map(res => this.responseWrapper(res)));
    }

    /** Start of Health Monitoring **/
    protected _getHealthAlarms = getSystemMetricsAlarmsV2;
    protected _getHealthManifest = getSystemMetricsManifestV2;
    protected _getHealthValues = getSystemMetricsValuesV2;
    @NxSystemAPI.memoizeHM
    getHealthAlarms() {
        return this._getHealthAlarms();
    }

    @NxSystemAPI.memoizeHM
    getHealthManifest() {
        return this._getHealthManifest();
    }

    @NxSystemAPI.memoizeHM
    getHealthValues() {
        return this._getHealthValues();
    }

    // TODO: Create a health manager and move this there for legacy and rest.
    @NxSystemAPI.memoizeHM
    getAggregateHealthReport(forceUpdate = false): Observable<HealthReport> {
        return forkJoin([
            this.getHealthAlarms(),
            this.getHealthManifest(),
            this.getHealthValues(),
        ]).pipe(
            map(([alarms, manifest, values]) => ({
                error: '',
                errorString: '',
                reply: {
                    '/ec2/metrics/alarms': alarms,
                    '/ec2/metrics/manifest': manifest,
                    '/ec2/metrics/values': values,
                },
            })),
        );
    }

    getCameraStreamMetrics(cameraId: string) {
        return this.get('/rest/v2/system/metrics/values', {
            params: {
                _with: `cameras.${cameraId}.primaryStream,cameras.${cameraId}.secondaryStream`,
            },
        }).pipe(
            map(
                (res: t.ValuesReply) =>
                    res.cameras[cameraId] as Pick<
                        t.CameraValue,
                        'primaryStream' | 'secondaryStream'
                    >,
            ),
        );
    }

    /** End of Health Monitoring **/

    private patchCameraCompatibilityV2(
        camera: NxRecursivePick<t.DeviceV2Full, typeof cameraKeyMapV2>,
    ): RestV2CameraCompat {
        const { serverId, options, parameters, motion, schedule, ...rest } = camera;
        const {
            isAudioEnabled: audioEnabled,
            isControlEnabled: controlEnabled,
            isDualStreamingEnabled,
            ...backupOpts
        } = options;
        const { type: motionType, mask: motionMask } = motion;
        const { isEnabled: scheduleEnabled, tasks: scheduleTasks } = schedule;
        return {
            ...rest,
            parentId: serverId,
            audioEnabled,
            controlEnabled,
            disableDualStreaming: !isDualStreamingEnabled,
            ...backupOpts,
            parameters,
            motionType,
            motionMask,
            scheduleEnabled,
            scheduleTasks,
        };
    }

    getCamera(id: string): Observable<RestV2CameraCompat> {
        return this.getWith('/rest/v2/devices', cameraKeyMapV2, {
            params: { id: this.cleanId(id) },
        }).pipe(map(cameras => this.patchCameraCompatibilityV2(cameras[0])));
    }

    getCameras(): Observable<RestV2CameraCompat[]> {
        return this.getWith('/rest/v2/devices', cameraKeyMapV2).pipe(
            map(cameras => cameras.map(this.patchCameraCompatibilityV2)),
        );
    }

    getMediaServers(useCache: boolean): Observable<RestV2ServerCompat[]> {
        const endpoint = '/rest/v2/servers';
        return this.getWith(endpoint, serverKeyMapV2, {
            headers: this.cacheHeader(useCache),
        });
    }

    @memoizeAsyncLong
    public getStorageAnalytics(): Observable<StorageAnalytics> {
        const getAnalytics = this.get<unknown[]>('/ec2/analyticsLookupObjectTracks', {
            params: { limit: 1 },
        });
        const cameraKeyMap = {
            serverId: true,
            parameters: { compatibleAnalyticsEngines: true },
        } satisfies NxRecursiveKeyMap<t.DeviceV2Full>;
        const getCameras = this.getWith('/rest/v2/devices', cameraKeyMap);
        const getServer = this.getWith(
            '/rest/v2/servers',
            { parameters: { metadataStorageId: true } },
            {
                params: { id: this.serverId },
            },
        ).pipe(map(([server]) => server));

        return combineLatest([getAnalytics, getCameras, getServer]).pipe(
            map(([analytics, cameras, server]) => ({
                hasAnalyticsData: !!analytics.length,
                hasPlugins: cameras.some(
                    c =>
                        c.serverId === this.serverId &&
                        !!c.parameters.compatibleAnalyticsEngines?.length,
                ),
                metadataStorageId: server.parameters.metadataStorageId,
            })),
        );
    }

    protected getViewMediaServers(): Observable<ViewPreprocessServer[]> {
        return this.getWith('/rest/v2/servers', ['id', 'name', 'status', 'endpoints']);
    }

    protected getViewCameras(): Observable<ViewBaseCamera[]> {
        const viewCamKeyMap = {
            ...buildTopLevelKeyMap(['id', 'model', 'name', 'status', 'url', 'serverId']),
            options: {
                isDualStreamingEnabled: true,
                preferredServerId: true,
            },
            schedule: {
                isEnabled: true,
            },
            parameters: {
                mediaStreams: true,
                rotation: true,
            },
        } as const;

        return this.getWith('/rest/v2/devices', viewCamKeyMap).pipe(
            map(cameras =>
                cameras.map(
                    ({
                        options: { isDualStreamingEnabled, preferredServerId },
                        schedule: { isEnabled: scheduleEnabled },
                        serverId,
                        parameters = {},
                        ...camera
                    }) => {
                        return {
                            ...camera,
                            scheduleEnabled,
                            parentId: serverId,
                            disableDualStreaming: !isDualStreamingEnabled,
                            preferredServerId:
                                preferredServerId !== ZERO_ID ? preferredServerId : serverId,
                            rotation: parameters.rotation || 0,
                            mediaStreams: parameters.mediaStreams?.streams ?? [],
                        };
                    },
                ),
            ),
        );
    }

    @memoizeAsyncMedium
    getViewMediaServersAndCameras(): Observable<ViewMediaServersAndCameras> {
        return combineLatest([this.getViewMediaServers(), this.getViewCameras()]).pipe(
            map(([mediaServers, cameras]) => ({
                mediaServers,
                cameras,
            })),
        );
    }
}
