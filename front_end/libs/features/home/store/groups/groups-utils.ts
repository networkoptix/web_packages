import { GroupItem } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { GroupFlatItem, GroupFlatMap } from './groups.types';

export const sortGroups = (groups: GroupItem[]): GroupItem[] =>
    groups
        .map(({ children, ...group }) => ({
            ...group,
            children: sortGroups(children),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

export function* generatePath(groupsMap: GroupFlatMap, groupId: string): Generator<GroupFlatItem> {
    let currentGroup = groupsMap[groupId];
    while (currentGroup) {
        yield currentGroup;
        currentGroup = groupsMap[currentGroup.parentId];
    }
}
