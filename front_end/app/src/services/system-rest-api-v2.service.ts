import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { NxHealthService } from '../pages/health/health.service';

import { NxAppStateService } from './nx-app-state.service';
import { IConfig } from './nx-config/config-types';
import * as t from './system-api.types';
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

    getHardwareIdsOfServers(): Observable<t.NormalResponse<t.HardwareIds>> {
        return this.getServerInfo('*')
            .pipe(map(servers => this.responseWrapper(
                servers.map(({ hardwareIds, id }) => ({ hardwareIds, serverId: id })))
            ));
    }

    getServerTimes(): Observable<t.NormalResponse<t.ServerTime[]>> {
        return this.getServerInfo('*')
            .pipe(map(servers => this.responseWrapper(
                servers.map(({ id, osTimeMs, synchronizedTimeMs, timeZoneOffsetMs }) => ({
                    serverId: id,
                    osTime: osTimeMs.toString(),
                    vmsTime: synchronizedTimeMs.toString(),
                    timeZoneOffset: timeZoneOffsetMs.toString()
                }))
            )));
    }

    configureServer(configureParams: t.ConfigureParams): Promise<any> {
        return this.patch('/rest/v2/servers/*/info', configureParams).toPromise();
    }

    // Licenses
    activateLicense(key): Observable<any> {
        return this.put(`/rest/v2/licenses/${key}`)
            .pipe(map(res => this.responseWrapper(res)));
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
