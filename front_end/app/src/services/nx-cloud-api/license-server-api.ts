import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { staticImplements } from '@utils/general';

import { BaseCloudServiceAPI, CloudServiceAPI, CreateApiFactory } from './base-cloud-service-api';
import { CloudLicenseChange, CloudLicenseUpdate, CloudSystemId, CloudSystemIds, LicenseInfo, StorageActivation, StorageBase, StorageEventParams, SystemLicenseInfo, SystemStorage, UsageReportRequest, uuid, ValidateSystemLicense } from './license-server-api.types';
import { WithFreshSession } from './nx-cloud-api.types';

@staticImplements<CloudServiceAPI>()
export class LicenseServerAPI extends BaseCloudServiceAPI {
    /**
     * Api base for supported license server version. Future versions of license server can be supported by extending LicenseServerAPI.
     */
    static readonly API_BASE = '/nxlicensed/api/v2';

    /**
     * Create's a factory for instancating a LicenseServerApi pointing to a specific license server instance.
     *
     * @param config IConfig
     * @param http HttpClient
     * @param withFreshSession WithFreshSession
     * @returns (serverUrl: string) => LicenseServerAPI
     */
    static createApiFactory: CreateApiFactory<LicenseServerAPI> = (http: HttpClient, withFreshSession: WithFreshSession) => (serverUrl: string, cloudHost: string) => new LicenseServerAPI(serverUrl, cloudHost, http, withFreshSession);

    constructor(serverUrl: string, cloudHost: string, http: HttpClient, withFreshSession: WithFreshSession) {
        super(serverUrl, LicenseServerAPI.API_BASE, cloudHost, http, withFreshSession);
    }

    /** Cloud License Endpoints */

    /**
     * Activate cloud license.
     *
     * @param body CloudLicenseUpdate
     * @returns Observable<LicenseInfo>
     */
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
    public changeLicense(body: CloudLicenseChange): Observable<LicenseInfo> {
        return this.put('/license/cloud/change', { body });
    }

    /**
     * Licenses for user or system.
     *
     * @param systemId string
     * @returns OObservable<LicenseInfo[]>
     */
    public getLicenses(systemId?: uuid): Observable<LicenseInfo[]> {
        return this.get(`/license/cloud/licenses${systemId ? '/' + systemId : ''}`);
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
