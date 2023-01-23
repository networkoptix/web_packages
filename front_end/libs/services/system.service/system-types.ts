import type { ec2MediaServer } from '../system-api.types';

export interface AddResponseTypeHere extends IParams {}

export interface IParams<Value = any> {
    [key: string]: Value;
}

export interface NxSystemServer extends ec2MediaServer {
    port: string;
    ip: string;
}

export interface ModuleInfo {
    brand: string;
    cloudHost: string;
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

interface NameValue {
    name: string;
    value: string;
}

type AdditionalParam = NameValue;

export interface NxCamera {
    id: string;
    preferredServerId: string;
    name: string;
    url: string;
    status: string; // TODO: enum (@gbezyuk)
    scheduleEnabled: boolean;
    disableDualStreaming: boolean;
    addParams: Array<AdditionalParam>;
}

export interface NxMediaServer extends ec2MediaServer {
    ip: string,
    port: string,
    timeInfo?: ServerTimeInfo,
    cameras: NxCamera[];
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
    type: string,
    count: number,
    countAvail: number,
    inUse?: number | string,
    required: number
}
