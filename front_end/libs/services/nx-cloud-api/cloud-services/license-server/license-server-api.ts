import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, concatMap, filter, firstValueFrom, Observable, tap } from 'rxjs';

import { memoizeAsyncPersistent } from '@utils/memoize';

import { LicenseServerInfo, WithFreshSession } from '../../nx-cloud-api.types';
import { BaseCloudServiceAPI, CreateApiFactory, implementsCloudServiceApi } from '../base-cloud-service-api';
import { uuid } from '../base-cloud-service-api.types';

import { CloudLicenseChange, CloudLicenseUpdate, CloudSystemId, CloudSystemIds, LicenseInfo, StorageActivation, StorageBase, StorageEventParams, SystemLicenseInfo, SystemStorage, UsageReportRequest, ValidateSystemLicense } from './license-server-api.types';

function updateCachedLicenseServer(targetProperty: string) {
    return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            const systemId = args[0]?.[targetProperty];
            return originalMethod.apply(this, args).pipe(tap(() => systemId && this.cacheLicenseServer(systemId)));
        };
    };
}

@implementsCloudServiceApi
export class LicenseServerAPI extends BaseCloudServiceAPI {
    /**
     * Api base for supported license server version. Future versions of license server can be supported by extending LicenseServerAPI.
     */
    static readonly API_BASE = '/nxlicensed/api/v2';

    static INSTANCES: Record<string, LicenseServerAPI> = {};

    /**
     * Create's a factory for instancating a LicenseServerApi pointing to a specific license server instance.
     *
     * @param config IConfig
     * @param http HttpClient
     * @param withFreshSession WithFreshSession
     * @returns  (serverUrl?: string, cloudHost?: string) => LicenseServerAPI
     */
    static createApiFactory: CreateApiFactory<LicenseServerAPI> = (http: HttpClient, withFreshSession: WithFreshSession) => (serverUrl: string, cloudHost: () => string) => {
        LicenseServerAPI.INSTANCES[serverUrl] ||= new LicenseServerAPI(serverUrl, cloudHost, http, withFreshSession);
        return LicenseServerAPI.INSTANCES[serverUrl].update();
    };

    constructor(serverUrl: string, cloudHost: () => string, http: HttpClient, withFreshSession: WithFreshSession) {
        super(serverUrl, LicenseServerAPI.API_BASE, cloudHost, http, withFreshSession);
    }

    public update(): this {
        this.licenseRequestUpdater$.next('');
        firstValueFrom(this.getUserLicenses());
        return this;
    }

    /** Cloud License Helpers */

    cacheLicenseServer(systemId: string): void {
        const endpoint = `/api/systems/${systemId}/licenseServer`;
        this.http.post<LicenseServerInfo>(endpoint, { licenseServer: this.serverUrl }).subscribe();
    }

    /** Cloud License Endpoints */

    /**
     * Activate cloud license.
     *
     * @param body CloudLicenseUpdate
     * @returns Observable<LicenseInfo>
     */
    @updateCachedLicenseServer('cloudSystemId')
    public activateLicense(body: CloudLicenseUpdate): Observable<LicenseInfo> {
        return this.post('/license/cloud/activate', { body });
    }

    /**
     * Deactivate cloud license.
     *
     * @param body CloudLicenseUpdate
     * @returns Observable<LicenseInfo>
     */
    public deactivateLicense(body: CloudLicenseUpdate): Observable<LicenseInfo> {
        return this.post('/license/cloud/deactivate', { body });
    }

    /**
     * Move cloud license.
     *
     * @param body CloudLicenseChange
     * @returns Observable<LicenseInfo>
     */
    @updateCachedLicenseServer('targetCloudSystemId')
    public changeLicense(body: CloudLicenseChange): Observable<LicenseInfo> {
        return this.put('/license/cloud/change', { body });
    }

    private licenseRequestUpdater$ = new BehaviorSubject('');

    /**
    * Licenses for system.
    *
    * @param systemId string
    * @returns OObservable<LicenseInfo[]>
    */
    public getSystemLicenses(systemId: uuid): Observable<LicenseInfo[]> {
        this.licenseRequestUpdater$.next(systemId);
        return this.handleLicenses(systemId);
    }

    /**
    * Licenses for user.
    *
    * @param systemId string
    * @returns OObservable<LicenseInfo[]>
    */
    public getUserLicenses(): Observable<LicenseInfo[]> {
        this.licenseRequestUpdater$.next('');
        return this.handleLicenses();
    }

    @memoizeAsyncPersistent
    private handleLicenses(systemId = ''): Observable<LicenseInfo[]> {
        return this.licenseRequestUpdater$.pipe(
            filter(updatedId => !updatedId || updatedId === systemId),
            concatMap(() => this.get<LicenseInfo[]>(`/license/cloud/licenses${systemId ? `/${systemId}` : ''}`)),
        );
    }

    /**
    * Security check-in for cloud license.
    *
    * @param body UsageReportRequest
    * @returns Observable<unknown>
    */
    public usageReport(body: CloudSystemId): Observable<UsageReportRequest> {
        return this.post('/license/cloud/usage_report', { body });
    }

    /** License Endpoints */

    /**
    * Useful for checking a license before attempting to activate.
    *
    * @param key string
    * @returns Observable<LicenseInfo>
    */
    public inspectLicense(key: uuid): Observable<LicenseInfo> {
        return this.get(`/license/inspect/${key}`);
    }

    /** Cloud Storage Endpoints */

    /**
    * Activate cloud storage license.
    *
    * @param body StorageBase
    * @returns Observable<StorageActivation>
    */
    public activateStorage(body: StorageBase): Observable<StorageActivation> {
        return this.post('/storage/activate', { body });
    }

    /**
    * Get storage activate/deactivation events.
    *
    * @param params StorageEventParams
    * @returns Observable<StorageEvent>
    */
    public getStorageEvents(params: StorageEventParams = {}): Observable<StorageEvent> {
        const MAX_EVENTS = 2000;

        if (params.limit > MAX_EVENTS) {
            params.limit = MAX_EVENTS;
        }

        return this.post('/storage/events', { params });
    }

    /**
    * Get storage activations for system ids.
    *
    * @param body CloudSystemIds
    * @returns Observable<SystemStorage[]>
    */
    public getStorageActivations(body: CloudSystemIds): Observable<SystemStorage[]> {
        return this.post('/storage/systems', { body });
    }

    /**
    * Validate storage activations (10,000 maximum records).
    *
    * @param body ValidateSystemLicense
    * @returns Observable<SystemLicenseInfo[]>
    */
    public validateStorageActivations(body: ValidateSystemLicense): Observable<SystemLicenseInfo[]> {
        return this.post('/storage/validate', { body });
    }
}
