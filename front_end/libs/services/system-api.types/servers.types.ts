import type { NormalResponse, Param } from '.';

export interface ec2Storage {
    addParams: Param[];
    id: string;
    isBackup: boolean;
    name: string;
    parentId: string;
    spaceLimit: string;
    storageType: string;
    typeId: string;
    url: string;
    usedForWriting: boolean;
}

export interface ServerHardwareIds {
    hardwareIds: string[];
    serverId: string;
}

export interface ServerTime {
    osTime: string;
    serverId: string;
    timeZoneOffset: string;
    vmsTime: string;
}

export type TimeOfServers = NormalResponse<ServerTime[]>;

export interface ec2MediaServer {
    authKey: string;
    flags: string;
    id: string;
    name: string;
    networkAddresses: string;
    osInfo: string;
    parentId: string;
    systemInfo: string;
    typeId: string;
    url: string;
    version: string;
}

export interface ec2MediaServerEx extends ec2MediaServer {
    addParams: Param[];
    allowAutoRedundancy: boolean;
    // backupBitrate: number,
    // backupDaysOfTheWeek: string,
    // backupDuration: number,
    // backupStart: number,
    backupBitrateBytesPerSecond: unknown[];
    backupType?: string;
    locationId: number;
    maxCameras: number;
    metadataStorageId?: string;
    status: string;
    storages: ec2Storage[];
}

// TODO: Figure out final place for this, it's used in multiple places
export interface OsInfo {
    platform: string;
    variant: string;
    variantVersion: string;
}

export interface RestV1ServerFull {
    authkey: string;
    backupBitrateBytesPerSecond: unknown[];
    endpoints: string[];
    flags: string;
    id: string;
    isFailoverEnabled: boolean;
    maxCameras: number;
    metadataStorageId: string;
    name: string;
    osInfo: OsInfo;
    parameters: Partial<{
        analyticsTaxonomyDescriptors: unknown; // Complicated, leaving unknown for now
        certificate: string;
        cpuArchitecture: string;
        cpuModelName: string;
        fullVersion: string;
        guidConflictDetected: boolean;
        hddList: string;
        networkInterfaces: string;
        physicalMemory: number;
        productNameShort: string;
        publicIp: string;
        publicationType: string;
        systemRuntime: string;
        timezoneUtcOffset: string;
        udtInternetTraffic_bytes: number;
        userProvidedCertificate: string;
    }>;
    status: string;
    storages: RestV1Storage[];
    url: string;
    version: string;
}

interface RestV1Storage {
    id: string;
    isBackup: boolean;
    isUsedForWriting: boolean;
    name: string;
    parameters: {
        space: number;
    };
    serverId: string;
    spaceLimitB: number;
    status: string;
    type: string;
}

export interface RestV2ServerFull extends Omit<RestV1ServerFull, 'authKey' | 'metadataStorageId'> {
    parameters: RestV1ServerFull['parameters'] & {
        metadataStorageId: string; // Moved from top level to parameters
    };
}

export type ServerHardareIdsResp = NormalResponse<ServerHardwareIds[]>;

export interface RestartServer extends NormalResponse<null> {}

// Duplicate from system-types, remove after checking module info endpoints
// export interface ModuleInfo {
//     brand: string;
//     cloudHost: string;
//     cloudOwnerId?: string;
//     cloudSystemId: string;
//     customization: string;
//     ecDbReadOnly: boolean;
//     hwPlatform: string;
//     id: string;
//     localSystemId: string;
//     name: string;
//     osInfo: {
//         platform: string;
//         variant: string;
//         variantVersion: string;
//     };
//     port: number;
//     protoVersion: number;
//     realm?: string;
//     remoteAddresses: string[];
//     runtimeId: string;
//     serverFlags: string;
//     sslAllowed: boolean;
//     status?: string;
//     systemName: string;
//     type: string;
//     version: string;
// }

export interface ModuleInformationReply {
    brand: string;
    cloudHost: string;
    cloudOwnerId?: string; // Added from above for merge refactor, needs to be checked
    cloudSystemId: string;
    customization: string;
    ecDbReadOnly: boolean;
    flags?: Record<string, boolean>;
    hardwareIds?: string[];
    hwPlatform: string;
    id: string;
    localSystemId: string;
    name: string;
    osInfo: {
        platform: string;
        variant: string;
        variantVersion: string;
    };
    osTimeMs?: number;
    port: number;
    protoVersion: number;
    realm?: string;
    remoteAddresses: string[];
    runtimeId: string;
    serverFlags: string;
    sslAllowed: true;
    status?: string;
    synchronizedTimeMs?: number;
    systemName: string;
    timeZoneOffsetMs?: number;
    type: string;
    version: string;
}
export type ModuleInformation = NormalResponse<ModuleInformationReply>;

export interface LogLevelReply {
    EC2_TRAN: string;
    HTTP: string;
    HWID: string;
    MAIN: string;
    PERMISSIONS: string;
}
export interface LogLevel extends NormalResponse<LogLevelReply> {}

export interface RebuildResponse<Reply> {
    reply?: Reply;
    main?: Reply;
    backup?: Reply;
}

export type RebuildArchiveResponse = RebuildResponse<{
    state: string;
    totalProgress: number;
}>;

export interface ConfigureParams {
    systemName?: string;
    port?: number;
    password?: string;
    currentPassword?: string;
}
