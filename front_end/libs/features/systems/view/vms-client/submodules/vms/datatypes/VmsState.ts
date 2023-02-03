import { GUID } from '@vms-client/utils/type-aliases';

import { ICamera } from './ICamera';
import { IMediaServer } from './IMediaServer';

export enum VMS_MODE {
    NOT_INITIALIZED = -1,
    CAMERA_NOT_SELECTED = 0,
    CAMERA_SELECTED = 1,
}

export interface AbstractVmsState {
    mode: VMS_MODE;
}

export interface NotInitializedVmsState extends AbstractVmsState {
    mode: VMS_MODE.NOT_INITIALIZED;
}

export function createNotInitializedState(): NotInitializedVmsState {
    return {
        mode: VMS_MODE.NOT_INITIALIZED
    };
}

export type CameraDict = {
    // [id: GUID]: ICamera
    // keys can't be a type aliases, sadly, due to TypeScript limitations
    [id: string]: ICamera;
};

export interface CameraNotSelectedVmsState extends AbstractVmsState {
    mode: VMS_MODE.CAMERA_NOT_SELECTED;
    systemId: string;
    mediaServers: Array<IMediaServer>;
    cameras: CameraDict;
}

export function createCameraNotSelectedState(
    systemId: string,
    mediaServers: Array<IMediaServer>
): CameraNotSelectedVmsState {
    return {
        mode: VMS_MODE.CAMERA_NOT_SELECTED,
        systemId,
        mediaServers,
        cameras: (mediaServers || []).reduce((acc, ms) => {
            ms.cameras.forEach(c => {
                acc[c.id] = c;
            });
            return acc;
        }, {})
    };
}

export interface CameraSelectedVmsState extends AbstractVmsState {
    mode: VMS_MODE.CAMERA_SELECTED;
    systemId: string;
    mediaServers: Array<IMediaServer>;
    cameras: CameraDict;
    selectedCameraId: GUID;
    selectedCamera: ICamera;
}

export function createCameraSelectedState(
    currentState: CameraNotSelectedVmsState | CameraSelectedVmsState,
    cameraId: GUID
): CameraSelectedVmsState | CameraNotSelectedVmsState {
    if (cameraId in currentState.cameras) {
        const newState = {
            ...currentState,
            mode: VMS_MODE.CAMERA_SELECTED,
            selectedCameraId: cameraId,
            selectedCamera: currentState.cameras[cameraId]
        };
        // console.log('createCameraSelectedState', currentState, newState)
        return newState as CameraSelectedVmsState;
    } else {
        return currentState;
    }
}

export type VmsState = NotInitializedVmsState | CameraNotSelectedVmsState | CameraSelectedVmsState;
