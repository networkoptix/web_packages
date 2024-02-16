import {
    ResourceLeafNode,
    ResourceNode,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';

import { parseCameraGroup } from './parse-camera-group';
import { sortByName } from './sort-by-name';
import { sortCameraGroups } from './sort-camera-groups';

export const generateCamerasForTree = (parsedCameras: {
    [id: string]: ResourceNode<NxSystemCamera>;
}): ResourceLeafNode<NxSystemCamera>[] => {
    let camerasForTree = Object.values(parsedCameras)
        .sort(sortByName)
        .filter(
            ({ type }) => nxConfig.featureFlags.layoutsIoDevices || type !== ResourceType.IO_DEVICE,
        ) as ResourceLeafNode<NxSystemCamera>[];

    if (nxConfig.featureFlags.layoutsCameraGroups) {
        camerasForTree = Object.values(
            sortCameraGroups(camerasForTree).reduce((camerasAndGroups, camera) => {
                const cameraOrGroup = parseCameraGroup(
                    camerasAndGroups,
                    camera.details.parameters.customGroupId,
                    camera,
                );
                return {
                    ...camerasAndGroups,
                    [cameraOrGroup.details.id]: cameraOrGroup,
                };
            }, {}),
        );
    }

    return camerasForTree;
};
