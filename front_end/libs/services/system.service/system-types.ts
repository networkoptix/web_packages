import type { ParsedNetworkAddresses } from '@utils/nx';

import type { ec2CameraEx, ec2MediaServer, ec2MediaServerEx, RestPartialServer } from '../system-api.types';

export interface AddResponseTypeHere extends IParams {}

export interface IParams<Value = any> {
    [key: string]: Value;
}

export type NxSystemServer = ParsedNetworkAddresses<ec2MediaServerEx> |
    ParsedNetworkAddresses<RestPartialServer>;

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

export interface ServerTimeInfo {
    vmsTime: any;
    vmsTimeOffset: number;
    osTimeOffset: number;
    serverId: string; // supposed to be stripped of {} around the UUID
    timeZoneOffset: number;
}

export interface NxMediaServer extends ParsedNetworkAddresses<ec2MediaServer> {
    cameras: ec2CameraEx[];
}

export interface Condition {
    paramId: string;
    type: string;
    value: string;
}

export interface Dependency {
    conditions: Condition[];
    id: string;
    internalRange: string;
    range: string;
    type: string;
    valuesToAddToRange: any[];
    valuesToRemoveFromRange: any[];
}

export interface Param {
    aux: string;
    availableInOffline: boolean;
    bindDefaultToMinimum: boolean;
    compact: boolean;
    confirmation: string;
    dataType: string;
    dependencies: Dependency[];
    description: string;
    group: string;
    id: string;
    internalRange: string;
    keepInitialValue: boolean;
    name: string;
    notes: string;
    range: string;
    readCmd: string;
    readOnly: boolean;
    resync: boolean;
    showRange: boolean;
    tag: string;
    unit: string;
    writeCmd: string;
}

export interface Group2 {
    aux: string;
    description: string;
    groups: any[];
    name: string;
    params: Param[];
}

export interface Group {
    aux: string;
    description: string;
    groups: Group2[];
    name: string;
    params: any[];
}

export interface CameraAdvancedParams {
    groups: Group[];
    name: string;
    // eslint-disable-next-line camelcase
    packet_mode: boolean;
    // eslint-disable-next-line camelcase
    unique_id: string;
    version: string;
}

export interface License {
    type: string;
    count: number;
    countAvail: number;
    inUse?: number | string;
    required: number;
}
