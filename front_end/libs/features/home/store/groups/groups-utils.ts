import type {
    CloudSystemLight,
    GroupItem,
    SystemItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxOrgSystemInfo, NxSystemInfo } from '@services/systems.service.types';
import { alphaNumericSort } from '@utils/general';

import { GroupFlatItem, GroupFlatMap } from './groups.types';

export const sortGroups = (groups: GroupItem[]): GroupItem[] =>
    groups
        .map(({ children, ...group }) => ({
            ...group,
            children: sortGroups(children),
        }))
        .sort(alphaNumericSort(group => group.name));

export function* generatePath(groupsMap: GroupFlatMap, groupId: string): Generator<GroupFlatItem> {
    let currentGroup = groupsMap[groupId];
    while (currentGroup) {
        yield currentGroup;
        currentGroup = groupsMap[currentGroup.parentId];
    }
}

export function isSystemItem(item: SystemItem | GroupItem): item is SystemItem {
    return 'systemId' in item;
}

export function isGroupItem(item: GroupItem | SystemItem): item is GroupItem {
    return 'id' in item;
}

export const flattenGroups = (groups: GroupItem[], groupMap: GroupFlatMap = {}): GroupFlatMap => {
    for (const group of groups) {
        const { children, ...withoutChild } = group;
        groupMap[group.id] = withoutChild;
        if (children?.length) {
            flattenGroups(group.children, groupMap);
        }
    }
    return groupMap;
};

export const mapToSystemItem = (
    cloudSystems: CloudSystemLight[],
    systemInfoMap: Map<string, NxSystemInfo>,
): SystemItem[] => {
    const systemItems: SystemItem[] = [];
    for (const system of cloudSystems) {
        const systemInfo = systemInfoMap.get(system.systemId) || ({} as NxSystemInfo);
        const { systemId, groupId, effectiveState } = system;
        // API sometimes forgets the system name on CloudSystem, patch for now
        // https://networkoptix.atlassian.net/browse/CLOUD-13056?focusedCommentId=194015
        const {
            system2faEnabled = false,
            stateOfHealth = '',
            name = system.name || '',
            organizationId = system.organization,
        } = systemInfo as NxOrgSystemInfo;
        systemItems.push({
            systemId,
            organizationId,
            groupId,
            name,
            system2faEnabled,
            stateOfHealth,
            effectiveState,
        });
    }
    return systemItems.sort(alphaNumericSort(group => group.name));
};

export const findItem = (
    items: GroupItem[],
    id: string | null,
    remove = false,
): GroupItem | undefined => {
    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const found = item.id === id;

        if (found) {
            return remove ? items.splice(index, 1)[0] : item;
        } else if (item.children.length) {
            const foundChild = findItem(item.children, id, remove);
            if (foundChild) {
                return foundChild;
            }
        }
    }
};
