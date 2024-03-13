import { GroupItem } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export const sortGroups = (groups: GroupItem[]): GroupItem[] =>
    groups
        .map(({ children, ...group }) => ({
            ...group,
            children: sortGroups(children),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
