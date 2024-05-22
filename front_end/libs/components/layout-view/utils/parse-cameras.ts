import {
    NxSystemCameraWithMappedFields,
    ResourceNode,
} from '@components/layout-grid/layout-grid.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemServer } from '@services/system.service/types/servers.types';

import { mapAdditionalCameraFieldsFactory } from './map-additional-camera-fields-factory';
import { mapCameraResourceNode } from './map-camera-resource-node';

export const parseCameras = (
    cameras: NxSystemCamera[],
    servers: Pick<NxSystemServer, 'id' | 'status' | 'version'>[],
    aspectRatio: number,
): { [id: string]: ResourceNode<NxSystemCameraWithMappedFields> } =>
    cameras.reduce(
        (cameras, camera) => ({
            ...cameras,
            [camera.id]: mapCameraResourceNode(
                camera,
                aspectRatio,
                mapAdditionalCameraFieldsFactory(servers),
            ),
        }),
        {},
    );
