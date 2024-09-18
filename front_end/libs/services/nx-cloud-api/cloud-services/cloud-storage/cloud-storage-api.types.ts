/** Swagger on {{cloudInstance}}/cs/v1/docs/api/v1/swagger/index.html */
import { email, int, url, uuid } from '../base-cloud-service-api.types';

export interface StorageId {
    storageId: uuid;
}

export interface SlaveStorageId {
    slaveStorageId: uuid;
}

export interface SystemId {
    systemId: uuid;
}

export interface TotalSpace {
    totalSpace: int;
}

export interface Systems {
    systems: uuid[];
}

export interface Region {
    region: string;
}

export enum StorageType {
    AWSS3 = 'awss3',
    WASABI = 'wasabi',
}

export interface StorageDevice extends Region {
    type: StorageType;
    dataUrl: url;
}

export interface StorageCreate extends TotalSpace, Systems, Region {}

export interface StorageInfo extends TotalSpace, Systems {
    id: uuid;
    freeSpace: int;
    ioDevices: StorageDevice[];
    owner: email;
}

export interface StorageStatistics {
    spaceUsed: int;
    currentRecordingBitrate: int;
    maxLiveDelay: int;
    maxCameraRetention: int;
    cameraCount: int;
}

export interface StorageCredentials {
    urls: url[];
    locations: StorageDevice[];
    login: string;
    password: string;
    sessionToken: string;
    durationSeconds: int;
}

export interface BoundSystem extends StorageId, SystemId {}
