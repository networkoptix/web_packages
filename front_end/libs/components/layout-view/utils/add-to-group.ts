import {
    ResourceLeafNode,
    ResourceParentNode,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';

import { ResourceLookup } from './layout-view-utils.types';

export const addToGroup = (
    resourceLookup: ResourceLookup,
    groupIds: string[],
    resource: ResourceLeafNode | ResourceParentNode,
): ResourceLeafNode | ResourceParentNode => {
    if (!groupIds.length) {
        return resource;
    }

    const groupId = groupIds.shift() || '';

    let group =
        (resourceLookup &&
            Array.isArray(resourceLookup.children) &&
            resourceLookup.children.find(i => i.details.id === groupId)) ||
        resourceLookup[groupId];

    if (!group) {
        group = {
            name: groupId,
            details: { id: groupId },
            type: ResourceType.CAMERAS_GROUP,
            children: [],
        };
    }

    const newChild = addToGroup(group, groupIds, resource);
    if (!group.children.includes(newChild)) {
        group.children = [...group.children, newChild];
    }
    return group;
};
