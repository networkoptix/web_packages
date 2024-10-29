import { map, Observable, type OperatorFunction } from 'rxjs';

import type { SaasState } from '@services/system-api.types/system.types';
import type { CleanId, DirtyId } from '@utils/general';

import { MediaserverRestConnection } from '../connections/adapters/adapter-target-types';

/*
 * Define the API response types for different versions as precise as possible.
 */
type ServerInfoApiV1 = {
    brand: string;
    certificatePem: string;
    cloudHost: string;
    cloudOwnerId: DirtyId;
    cloudSystemId: CleanId;
    collectedByThisServer: boolean;
    customization: string;
    id: DirtyId;
    localSystemId: DirtyId;
    name: string;
    port: number;
    protoVersion: number;
    realm: string;
    remoteAddresses: string[];
    runtimeId: DirtyId;
    serverFlags: string;
    synchronizedTimeMs: number;
    systemName: string;
    transactionLogTime: {
        sequence: string;
        ticksMs: number;
    };
    type: string;
    version: string;
};

type ServerInfoApiV3 = ServerInfoApiV1 & {
    ecDbReadOnly: boolean;
    hwPlatform: string;
    organizationId: DirtyId;
    saasState: SaasState;
    sslAllowed: boolean;
    systemIdentityTimeMs: number;
    userProvidedCertificatePem: string;
};

type ServerInfoApiV4 = Omit<
    ServerInfoApiV3,
    'cloudSystemId' | 'systemIdentityTimeMs' | 'localSystemId' | 'systemName'
> & {
    cloudSiteId: CleanId;
    identityTimeMs: number;
    localSiteId: DirtyId;
    siteName: string;
};

interface ApiResObjects {
    1: ServerInfoApiV1;
    3: ServerInfoApiV3;
    4: ServerInfoApiV4;
}

/*
 * Define the types for the response object. Only define the properties that are needed.
 * This format below allows for easy versioning and extensibility, while reducing duplication.
 */
type ApiVersions = 1 | 3 | 4;

interface ServerInfoBase<Version extends ApiVersions> {
    apiVersion: Version;
    cloudSiteId: CleanId;
    id: DirtyId;
    isSaasEnabled: boolean;
    name: string;
    port: number;
    remoteAddresses: string[];
    serverFlags: string;
    synchronizedTimeMs: number;
}

interface ServerInfoV1 extends ServerInfoBase<1> {
    isSaasEnabled: false;
}
interface ServerInfoV3 extends ServerInfoBase<3> {
    ecDbReadOnly: boolean;
}
interface ServerInfoV4 extends ServerInfoBase<4> {
    ecDbReadOnly: boolean;
}

interface AllServerInfoTypes {
    1: ServerInfoV1;
    3: ServerInfoV3;
    4: ServerInfoV4;
}

export type ServerInfo = AllServerInfoTypes[ApiVersions];

/*
 * Create the transformers for each version.
 * A transformer takes the API response and converts it to the internal format.
 * We should try to mold each API version into the most accurate internal representation.
 * Example: If V3 has a new property called "FeatureEnabled", then V1 should return false for that property instead of omitting it.
 */

// This is only needed because the server returns either an array or a single object depending on the request.
type Transformer<V extends ApiVersions> = OperatorFunction<
    ApiResObjects[V] | ApiResObjects[V][],
    ServerInfo | ServerInfo[]
>;
function arrayCheckTransformerFactory<V extends ApiVersions>(
    transform: (resObj: ApiResObjects[V]) => AllServerInfoTypes[V],
): Transformer<V> {
    return source => source.pipe(map(s => (Array.isArray(s) ? s.map(transform) : transform(s))));
}

const baseTransform = <V extends ApiVersions>(
    source: ApiResObjects[V],
): Omit<ServerInfoBase<V>, 'apiVersion' | 'cloudSiteId' | 'isSaasEnabled'> => ({
    id: source.id,
    name: source.name,
    port: source.port,
    remoteAddresses: source.remoteAddresses,
    serverFlags: source.serverFlags,
    synchronizedTimeMs: source.synchronizedTimeMs,
});

const v1Transform = (source: ServerInfoApiV1): ServerInfoV1 => {
    return {
        ...baseTransform(source),
        apiVersion: 1,
        cloudSiteId: source.cloudSystemId,
        isSaasEnabled: false,
    };
};

const v3Transform = (source: ServerInfoApiV3): ServerInfoV3 => {
    return {
        ...baseTransform(source),
        apiVersion: 3,
        cloudSiteId: source.cloudSystemId,
        isSaasEnabled: source.saasState === 'active',
        ecDbReadOnly: source.ecDbReadOnly,
    };
};

const v4Transform = (source: ServerInfoApiV4): ServerInfoV4 => {
    return {
        ...baseTransform(source),
        apiVersion: 4,
        cloudSiteId: source.cloudSiteId,
        isSaasEnabled: source.saasState === 'active',
        ecDbReadOnly: source.ecDbReadOnly,
    };
};

export function getServerInfoRestV1(
    this: MediaserverRestConnection,
    serverId: '*',
): Observable<ServerInfo[]>;
export function getServerInfoRestV1(
    this: MediaserverRestConnection,
    serverId?: string,
): Observable<ServerInfo>;
export function getServerInfoRestV1(
    this: MediaserverRestConnection,
    serverId: string = 'this',
): Observable<ServerInfo | ServerInfo[]> {
    return this.get<ServerInfoApiV1 | ServerInfoApiV1[]>(`/rest/v1/servers/${serverId}/info`).pipe(
        arrayCheckTransformerFactory<1>(v1Transform),
    );
}

export function getServerInfoRestV3(
    this: MediaserverRestConnection,
    serverId: '*',
): Observable<ServerInfo[]>;
export function getServerInfoRestV3(
    this: MediaserverRestConnection,
    serverId?: string,
): Observable<ServerInfo>;
export function getServerInfoRestV3(
    this: MediaserverRestConnection,
    serverId: string = 'this',
): Observable<ServerInfo | ServerInfo[]> {
    return this.get<ServerInfoApiV3 | ServerInfoApiV3[]>(`/rest/v3/servers/${serverId}/info`).pipe(
        arrayCheckTransformerFactory<3>(v3Transform),
    );
}

export function getServerInfoRestV4(
    this: MediaserverRestConnection,
    serverId: '*',
): Observable<ServerInfo[]>;
export function getServerInfoRestV4(
    this: MediaserverRestConnection,
    serverId?: string,
): Observable<ServerInfo>;
export function getServerInfoRestV4(
    this: MediaserverRestConnection,
    serverId: string = 'this',
): Observable<ServerInfo | ServerInfo[]> {
    return this.get<ServerInfoApiV4 | ServerInfoApiV4[]>(`/rest/v4/servers/${serverId}/info`).pipe(
        arrayCheckTransformerFactory<4>(v4Transform),
    );
}

// This is here to satisfy the interface when the V1 API overrides the Legacy API
export function getServerInfoLegacy(
    this: MediaserverRestConnection,
    serverId: '*',
): Observable<ServerInfo[]>;
export function getServerInfoLegacy(
    this: MediaserverRestConnection,
    serverId?: string,
): Observable<ServerInfo>;
export function getServerInfoLegacy(this: MediaserverRestConnection): never {
    throw Error(this.notImplementedMsg);
}
