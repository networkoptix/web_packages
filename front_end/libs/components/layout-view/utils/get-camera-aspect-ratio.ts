import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';

export const getCameraAspectRatio = (
    camera: Pick<NxSystemCamera, 'parameters' | 'defaultRatio'>,
    fallbackAspectRatio = 16 / 9,
): number => camera.parameters.overrideAr || camera.defaultRatio || fallbackAspectRatio;
