import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';

export const isIoOnly = (camera: NxSystemCamera): boolean =>
    !(!!camera.parameters.mediaStreams?.streams?.length || !camera.parameters.ioSettings?.length);
