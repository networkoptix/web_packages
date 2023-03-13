import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, filter, Observable, switchMap } from 'rxjs';

import { memoizeAsyncPersistent } from '@utils/memoize';

import { WithFreshSession } from '../../nx-cloud-api.types';
import {
    BaseCloudServiceAPI,
    CreateApiFactory,
    disabledMethod,
    implementsCloudServiceApi,
} from '../base-cloud-service-api';
import { uuid } from '../base-cloud-service-api.types';

import {
    BoundSystem,
    SlaveStorageId,
    StorageCreate,
    StorageCredentials,
    StorageId,
    StorageInfo,
    StorageStatistics,
} from './cloud-storage-api.types';

@implementsCloudServiceApi
export class CloudStorageAPI extends BaseCloudServiceAPI {
    /**
     * Api base for supported cloud storage service version. Future versions of cloud storage service can be supported by extending CloudStorageAPI.
     */
    static readonly API_BASE = '/cs/v1';

    static INSTANCES: Record<string, CloudStorageAPI> = {};

    /**
     * Create's a factory for instancating a CloudStorageAPI.
     *
     * @param config IConfig
     * @param http HttpClient
     * @param withFreshSession WithFreshSession
     * @returns (serverUrl?: string, cloudHost?: string) => CloudStorageAPI
     */
    static createApiFactory: CreateApiFactory<CloudStorageAPI> = (http: HttpClient, withFreshSession: WithFreshSession) => (serverUrl: string = '', cloudHost: () => string = () => '') => {
        CloudStorageAPI.INSTANCES[serverUrl] ||= new CloudStorageAPI(serverUrl, cloudHost, http, withFreshSession);
        return CloudStorageAPI.INSTANCES[serverUrl];
    };

    constructor(
        serverUrl: string,
        cloudHost: () => string,
        http: HttpClient,
        withFreshSession: WithFreshSession,
    ) {
        super(serverUrl, CloudStorageAPI.API_BASE, cloudHost, http, withFreshSession);
    }

    private endpoint(): string;
    private endpoint(storageId: string): string;
    private endpoint(storageId: string, endpoint: string): string;
    private endpoint(storageId: string, endpoint: string, systemId: string): string;
    private endpoint(...args: string[]): string {
        return ['/storages', ...args].join('/');
    }

    /** Cloud Storage Endpoints */

    /**
     * Creates new storage owned by the requesting account.
     *
     * @param body StorageCreate
     * @returns Observable<StorageInfo>
     */
    @disabledMethod
    public createStorage(body: StorageCreate): Observable<StorageInfo> {
        return this.post(this.endpoint(), { body });
    }

    private storageUpdater$ = new BehaviorSubject('');

    /**
     * Returns all storages owned by requestor. If systemId is provided then only storages for that system are returned.
     * @param systemId? uuid
     * @returns Observable<StorageInfo[]>
     */
    public getStorages(systemId: uuid = ''): Observable<StorageInfo[]> {
        this.storageUpdater$.next(systemId);
        return this.handleGetStorages(systemId);
    }

    @memoizeAsyncPersistent
    private handleGetStorages(systemId: uuid = ''): Observable<StorageInfo[]> {
        return this.storageUpdater$.pipe(
            filter(updatedId => !updatedId || updatedId === systemId),
            switchMap(() => this.get<StorageInfo[]>(this.endpoint(), { params: systemId ? { systemId } : {} }))
        );
    }

    /**
     * Get info for specific storage.
     *
     * @param storageId uuid
     * @returns Observable<StorageInfo>
     */
    @disabledMethod
    public getStorage(storageId: uuid): Observable<StorageInfo> {
        return this.get(this.endpoint(storageId));
    }

    /**
     * WARNING: This request will most likely be removed or refactored heavily to prevent data loss by mistake.
     * @param storageId uuid
     * @returns unkown
     */
    @disabledMethod
    public deleteStorage(storageId: uuid): Observable<unknown> {
        return this.delete(this.endpoint(storageId));
    }

    /**
     * Merge a slave storage into a master. The resulting storage contains data of both storages. No data is moved during the merge. The resulting storage has an additional data location as a result.
     * @param param StorageId & SlaveStorageId
     * @returns Observable<StorageInfo>
     */
    @disabledMethod
    public mergeStorages({ storageId, ...body }: StorageId & SlaveStorageId): Observable<StorageInfo> {
        return this.post(this.endpoint(storageId, 'merged-storages'), { body });
    }

    /**
     * WARNING: This request will most likely be refactored since it does not support multiple data locations properly.
     *
     * @param storageId uuid
     * @returns Observable<StorageCredentials>
     */
    @disabledMethod
    public getCredentials(storageId: uuid): Observable<StorageCredentials> {
        return this.get(this.endpoint(storageId, 'credentials'));
    }

    public getStatistics(storageId: uuid): Observable<StorageStatistics> {
        return this.get(this.endpoint(storageId, 'statistics'));
    }

    /**
     * Bind the given system to the cloud storage with the given storageId. Both storage and system must belong to the requestor
     *
     * @param param BoundSystem
     * @returns Observable<BoundSystem>
     */
    public bindSystem({ storageId, ...body }: BoundSystem, replaceExisting = true): Observable<BoundSystem> {
        return this.post(this.endpoint(storageId, 'systems'), { body, params: { 'replace-existing': replaceExisting } });
    }

    /**
     * Unbind a cloud system from a cloud storage.
     *
     * @param param BoundSystem
     * @returns Observable<unknown>
     */
    @disabledMethod
    public unbindSystem({ storageId, systemId }: BoundSystem): Observable<unknown> {
        return this.delete(this.endpoint(storageId, 'systems', systemId));
    }
}
