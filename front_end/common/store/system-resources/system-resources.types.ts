import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { CameraManager } from '@services/system.service/camera-manager/camera-manager';
import { ServerManager } from '@services/system.service/server-manager/server-manager';
import { ReturnedObservableValueType } from '@utils/general';

export class SystemResourceState<T> {
    constructor(public value: T, public lastUpdated: number = 0) {}
}

export enum SystemResourceTypeEnums {
    CAMERAS = 'cameras',
    SERVERS = 'servers',
    LAYOUTS = 'layouts',
    WEB_PAGES = 'webPages',
}

export interface SystemResourcesTypeMap {
    [SystemResourceTypeEnums.CAMERAS]: CameraManager['cameras'];
    [SystemResourceTypeEnums.SERVERS]: ServerManager['servers'];
    [SystemResourceTypeEnums.LAYOUTS]: ReturnedObservableValueType<NxSystemRestAPI['getLayouts']>;
    [SystemResourceTypeEnums.WEB_PAGES]: ReturnedObservableValueType<
        NxSystemRestAPI['getWebPages']
    >;
}

export class SystemResources {
    [SystemResourceTypeEnums.CAMERAS]: SystemResourceState<
        SystemResourcesTypeMap[SystemResourceTypeEnums.CAMERAS]
    > = new SystemResourceState(null);
    [SystemResourceTypeEnums.SERVERS]: SystemResourceState<
        SystemResourcesTypeMap[SystemResourceTypeEnums.SERVERS]
    > = new SystemResourceState(null);
    [SystemResourceTypeEnums.LAYOUTS]: SystemResourceState<
        SystemResourcesTypeMap[SystemResourceTypeEnums.LAYOUTS]
    > = new SystemResourceState(null);
    [SystemResourceTypeEnums.WEB_PAGES]: SystemResourceState<
        SystemResourcesTypeMap[SystemResourceTypeEnums.WEB_PAGES]
    > = new SystemResourceState(null);
}

export type LoadSystemResources = {
    [key in keyof SystemResources]: boolean;
};

export interface LoadAllSystemResources {
    all: true;
}

export type LoadPartialSystemResources = Partial<LoadSystemResources>;

export type RefreshSystemResources = LoadPartialSystemResources | LoadAllSystemResources;

export interface SystemResourcesBySystemId {
    [systemId: string]: SystemResources;
}
