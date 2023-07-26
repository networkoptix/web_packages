import type { NormalResponse, Param } from './system-api.types';

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

export interface RestServer {
    endpoints: string[];
    flags: string;
    id: string;
    maxCameras: number;
    metadataStorageId: string;
    name: string;
    osInfo: {
        platform: string;
        variant: string;
        variantVersion: string;
    };
    status: string;
    storages: ec2Storage[];
    url: string;
    version: string;
    parameters: Record<string, unknown>;
}

export type ServerHardareIdsResp = NormalResponse<ServerHardwareIds[]>;

export interface RestartServer extends NormalResponse<null> {}

export interface ModuleInformationReply {
    brand: string;
    cloudHost: string;
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
