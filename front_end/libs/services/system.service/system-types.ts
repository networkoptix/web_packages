export * from './system-server-types';
// TODO: Un-barrelize after organization is complete

export interface ModuleInfo {
    brand: string;
    cloudHost: string;
    cloudOwnerId?: string;
    cloudSystemId: string;
    customization: string;
    ecDbReadOnly: boolean;
    hwPlatform: string;
    id: string;
    localSystemId: string;
    name: string;
    osInfo: {
        platform: string;
        variant: string;
        variantVersion: string;
    };
    port: number;
    protoVersion: number;
    realm?: string;
    remoteAddresses: string[];
    runtimeId: string;
    serverFlags: string;
    sslAllowed: boolean;
    status?: string;
    systemName: string;
    type: string;
    version: string;
}

export interface License {
    type: string;
    count: number;
    countAvail: number;
    inUse?: number | string;
    required: number;
}
