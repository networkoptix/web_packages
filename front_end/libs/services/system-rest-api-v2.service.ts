import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { NxHealthService } from '@pages/health/health.service';
import { SettingsConfig } from '@services/nx-config/base-config';
import { NxSystemUser } from '@services/system.service/user-manager/user-manager-types';

import { NxAppStateService } from './nx-app-state.service';
import { IConfig } from './nx-config/config-types';
import * as t from './system-api.types';
import { ChangedIdReturned } from './system-api.types';
import { NxSystemRestAPI } from './system-rest-api.service';
import { IParams } from './system.service/system-types';
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
    readonly version: number;

    private readonly defaultLogLevel = 'info';

    constructor(
        http: HttpClient,
        configService: IConfig,
        location: Location,
        userEmail: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (params: IParams<any>) => Promise<any>,
        cacheService: NxUriCacheService,
        cookieService: CookieService,
        healthService: NxHealthService,
        appState: NxAppStateService,
        injector: Injector
    ) {
        super(
            http,
            configService,
            location,
            userEmail,
            systemId,
            serverId,
            unauthorizedCallback,
            cacheService,
            cookieService,
            healthService,
            appState,
            injector
        );
        this.version = 5.1;
    }

    private responseWrapper = (data): t.NormalResponse<any> => ({
        error: '0',
        errorString: 'ok',
        reply: data
    });

    // Logger functions
    private parseLogData = (data: LogLevelV2Response): t.LogLevel => this.responseWrapper(Object.entries(data)
        .filter(([key, _]: [string, LogV2]) => key.includes('Log'))
        .reduce((levels, [key, logInfo]: [string, LogV2]) => {
            const modifiedKey = key.replace(/Log/, '').toUpperCase();
            levels[modifiedKey] = logInfo?.primaryLevel || this.defaultLogLevel;
            return levels;
        }, <t.LogLevelReply>{}));

    logLevel(): Observable<t.LogLevel> {
        return this.get<LogLevelV2Response>('/rest/v2/servers/this/logSettings')
            .pipe(map(this.parseLogData));
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

    updateLogLevel(
        logLevel: LogLevelV2Response
    ): Observable<t.LogLevel> {
        const parsedLogLevels = Object.entries(logLevel)
            .reduce((data, [key, value]) => ({
                ...data,
                [`${key.toLowerCase()}Log`]: value
            }), {});
        return this.patch<LogLevelV2Response>('/rest/v2/servers/this/logSettings', parsedLogLevels)
            .pipe(map(this.parseLogData));
    }
    // Setup wizard calls
    wizardGetSystemSettings(): Observable<SettingsConfig> {
        return this.get('/rest/v2/system/settings?_keepDefault');
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
            serversRunTimeInfo: this.getRuntimeInfo('*')
        }).pipe(
            map(({ serversInfo, serversRunTimeInfo }: ServerTimes): ModuleInfoRest[] => (
                serversInfo.map(serverInfo => {
                    const runTimeInfo = serversRunTimeInfo.find(({ id }) => id === serverInfo.id);
                    return { ...serverInfo, osTimeMs: runTimeInfo?.osTimeMs || 0, timeZoneOffsetMs: runTimeInfo?.timeZoneOffsetMs || 0 };
                })
            ))
        );
    }

    getHardwareIdsOfServers(): Observable<t.NormalResponse<t.HardwareIds>> {
        return this.getRuntimeInfo('*')
            .pipe(map(servers => this.responseWrapper(
                servers.map(({ runtimeData: { hardwareIds }, id }) => ({ hardwareIds, serverId: id })))
            ));
    }

    getServerTimes(): Observable<t.NormalResponse<t.ServerTime[]>> {
        const timeToString = time => time?.toString() || '0';
        return this.getServerTimesHelper()
            .pipe(map(servers => this.responseWrapper(
                servers.map(({ id, osTimeMs, synchronizedTimeMs, timeZoneOffsetMs }) => ({
                    serverId: id,
                    osTime: timeToString(osTimeMs),
                    vmsTime: timeToString(synchronizedTimeMs),
                    timeZoneOffset: timeToString(timeZoneOffsetMs)
                }))
            )));
    }

    configureServer(configureParams: t.ConfigureParams): Promise<any> {
        return this.patch('/rest/v2/servers/this/runtimeInfo', configureParams).toPromise();
    }

    rebuildArchive(
        location: number,
        action?: string
    ): Observable<t.RebuildArchiveResponse> {
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
        return this.put(`/rest/v2/licenses/${key}`)
            .pipe(map(res => this.responseWrapper(res)));
    }

    addUser(user: NxSystemUser): Observable<ChangedIdReturned> {
        user.type = user.isCloud ? 'cloud' : 'local'; // TODO: add LDAP
        user.isHttpDigestEnabled = !user.isCloud;

        return this.post<t.ChangedIdReturned>(
            '/rest/v1/users',
            this.cleanUserObject(user)
        );
    }

    saveUser(user: NxSystemUser): Observable<ChangedIdReturned> {
        user.type = user.isCloud ? 'cloud' : 'local'; // TODO: add LDAP
        user.isHttpDigestEnabled = !user.isCloud;

        if (!user.isCloud) {
            user.name && delete user.name;
            user.isHttpDigestEnabled && delete user.isHttpDigestEnabled;
        }

        return this.patch<t.ChangedIdReturned>(
            `/rest/v1/users/${user.id}`,
            this.cleanUserObject(user)
        );
    }

    deleteUser(userId: string): Observable<ChangedIdReturned> {
        return this.delete<t.ChangedIdReturned>(`/rest/v1/users/${this.cleanId(userId)}`);
    }

    // Health Monitoring
    // private getMetricsHealth(metricType: string): any {
    //     return this.get(`/rest/v2/system/metrics/${metricType}`,
    //         undefined)
    //         .pipe(map(res => this.responseWrapper(res)));
    // }
    //
    // getHealthAlarms(): any {
    //     return this.getMetricsHealth('alarms');
    // }
    //
    // getHealthManifest(): any {
    //     return this.getMetricsHealth('manifest')
    // }
    //
    // getHealthValues(): any {
    //     return this.getMetricsHealth('values');
    // }
}
