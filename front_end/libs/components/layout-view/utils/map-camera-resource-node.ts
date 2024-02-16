import {
    NxSystemCameraWithMappedFields,
    ResourceNode,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';

import { getCameraAspectRatio } from './get-camera-aspect-ratio';
import { isIoOnly } from './is-io-only';
import type { mapAdditionalCameraFieldsFactory } from './map-additional-camera-fields-factory';

export const mapCameraResourceNode = (
    camera: NxSystemCamera,
    aspectRatio: number,
    mapAdditionalCameraFields: ReturnType<typeof mapAdditionalCameraFieldsFactory>,
): ResourceNode<NxSystemCameraWithMappedFields> => ({
    type: isIoOnly(camera) ? ResourceType.IO_DEVICE : ResourceType.CAMERA,
    name: camera.name,
    aspectRatio: getCameraAspectRatio(camera, aspectRatio),
    details: mapAdditionalCameraFields(camera),
});
