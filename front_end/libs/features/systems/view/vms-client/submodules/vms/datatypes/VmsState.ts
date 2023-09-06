import { GUID } from '@vms-client/utils/type-aliases';

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
    selectedCamera: ViewCamera;
}

export const initializeVmsState = (): VmsState => ({
    mode: VMS_MODE.NOT_INITIALIZED,
    systemId: '',
    mediaServers: [],
    cameras: {},
    selectedCameraId: '',
    selectedCamera: undefined,
});
