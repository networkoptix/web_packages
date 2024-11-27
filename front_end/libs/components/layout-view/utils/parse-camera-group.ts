import { ResourceLeafNode, ResourceParentNode } from '@components/layout-grid/layout-grid.types';

import { addToGroup } from './add-to-group';
import { ResourceLookup } from './layout-view-utils.types';

export const parseCameraGroup = (
    resourceLookup: ResourceLookup,
    groupId: string | undefined,
    camera: ResourceLeafNode,
): ResourceLeafNode | ResourceParentNode => {
    if (!groupId) {
        return camera;
    }

    const groupIds = encodeURI(groupId)
        .split('%0A')
        .map(s => decodeURI(s))
        .filter(Boolean);

    return addToGroup(resourceLookup, groupIds, camera);
};
