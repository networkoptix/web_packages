import type { Params, GetStorages } from '../system-api.types';
// import type { NxSystemWithUserInfo } from '../systems.service';

import type { NxSystem } from './system';

export interface IParams<Value = any> {
    [key: string]: Value;
}

export interface NxSystemServer {
    addParams: Params;
    allowAutoRedundancy: boolean;
    authKey: string;
    // backupBitrate: number;
    // backupDaysOfTheWeek: string;
    backupBitrateBytesPerSecond: unknown[]; // Doesn't appear anywhere
    // backupDuration: number;
    // backupStart: number;
    backupType?: string;
    flags: string;
    id: string;
    internalStatus: string;
    ip: string;
    maxCameras: number;
    metadataStorageId: string;
    name: string;
    networkAddresses: string;
    osInfo: string;
    osName: string;
    parentId: string;
    port: string;
    shownStatus?: string;
    status: string;
    storages: GetStorages[];
    systemInfo: string;
    typeId: string;
    url: string;
    version: string;
}
/**
 * This type needs to be defined
 */
interface IMergeInfo {
    [key: string]: any;
}
export class SystemInterface {
    canMerge: boolean;
    cloudStorageCapable: boolean;
    id: string;
    info: Partial<NxSystemWithUserInfo>;
    isOnline: boolean;
    mergeInfo: IMergeInfo;
    stateMessage: string;
    servers: NxSystemServer[];
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

export interface NxMediaServer {
    id: string;
    name: string;
    networkAddresses: string;
    status: string;
    timeInfo: ServerTimeInfo;
    ip?: string,
    port?: string,

    // considered obligatory for now, though may change later on (@gbezyuk)
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

export class System extends SystemInterface {
    protected _isAvailable = false;
    cloudStorageSystemEnabled = false;
    canMerge = false;
    id = '';
    info = undefined;
    isOnline = false;
    mergeInfo = undefined;
    stateMessage = '';

    mediaservers: NxMediaServer[] = null;
    resourceTypes: any[] = null;
}

/* TODO: Fix NxSystemWithUserInfo parent type (shouldn't be NxSystem) */
export interface NxSystemWithUserInfo extends NxSystem {
    ownerAccountEmail: string;
    ownerFullName: string;
    name: string;
    systemName: string;
    isMine: boolean;
    capabilities: IParams;
    state: string;
    stateOfHealth: string;
    system2faEnabled: boolean;
}
