import { ResourceLeafNode } from '@components/layout-grid/layout-grid.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { alphaNumericSort } from '@utils/general';

export const sortCameraGroups = (
    cameras: ResourceLeafNode<NxSystemCamera>[],
): ResourceLeafNode<NxSystemCamera>[] => {
    const byGroupAndName = alphaNumericSort<ResourceLeafNode<NxSystemCamera>>(
        r => (r.details.parameters.customGroupId || '') + r.details.name,
    );

    const { grouped, regular } = cameras.reduce(
        (
            category: {
                grouped: ResourceLeafNode<NxSystemCamera>[];
                regular: ResourceLeafNode<NxSystemCamera>[];
            },
            camera,
        ) => {
            if (camera.details.parameters.customGroupId) {
                category.grouped.push(camera);
            } else {
                category.regular.push(camera);
            }

            return category;
        },
        { grouped: [], regular: [] },
    );

    return [...grouped.sort(byGroupAndName), ...regular.sort(byGroupAndName)];
};
