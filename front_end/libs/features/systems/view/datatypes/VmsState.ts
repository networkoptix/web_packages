import { GUID } from '@view/datatypes/type-aliases';

import { ViewCamera } from './Camera';
import { ViewMediaServer } from './IMediaServer';

export enum VMS_MODE {
    NOT_INITIALIZED = -1,
    CAMERA_NOT_SELECTED = 0,
    CAMERA_SELECTED = 1,
}

export interface VmsState {
    mode: VMS_MODE;
    systemId: string;
    mediaServers: Array<ViewMediaServer>;
    cameras: Record<string, ViewCamera>;
    selectedCameraId: GUID;
    selectedCamera: ViewCamera | undefined;
}

export interface VmsServerTimeInfo {
    vmsTime: number;
    vmsTimeOffset: number;
    osTimeOffset: number;
    serverId: string; // supposed to be stripped of {} around the UUID
    timeZoneOffset: number;
}
