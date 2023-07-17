import { GUID } from '@vms-client/utils/type-aliases';

import { ICamera } from './ICamera';
import { IMediaServer } from './IMediaServer';

export enum VMS_MODE {
    NOT_INITIALIZED = -1,
    CAMERA_NOT_SELECTED = 0,
    CAMERA_SELECTED = 1,
}

export type CameraDict = {
    // [id: GUID]: ICamera
    // keys can't be a type aliases, sadly, due to TypeScript limitations
    [id: string]: ICamera;
};

export interface VmsState {
    mode: VMS_MODE;
    systemId: string;
    mediaServers: Array<IMediaServer>;
    cameras: CameraDict;
    selectedCameraId: GUID;
    selectedCamera: ICamera;
}

export const initializeVmsState = (): VmsState => ({
    mode: VMS_MODE.NOT_INITIALIZED,
    systemId: '',
    mediaServers: [],
    cameras: {},
    selectedCameraId: '',
    selectedCamera: undefined
});
