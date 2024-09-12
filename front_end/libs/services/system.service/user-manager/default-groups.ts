import LANG from '@language_static';
import { UserGroup } from '@services/system-user.types';

export const DefaultUserGroups: UserGroup[] = [
    {
        attributes: 'readonly',
        description: LANG['00000000-0000-0000-0000-100000000000'],
        id: '{00000000-0000-0000-0000-100000000000}',
        orgRoleId: '00000000-0000-4000-8000-000000000002',
        name: 'Systems Administrator',
        parentGroupIds: [],
        permissions: 'powerUser|viewLogs|viewMetrics|generateEvents|administrator',
        resourceAccessRights: {
            '{00000000-0000-0000-0000-200000000001}':
                'view|viewArchive|exportArchive|viewBookmarks|manageBookmarks|userInput|edit',
            '{00000000-0000-0000-0000-200000000002}': 'view',
            '{00000000-0000-0000-0000-200000000003}': 'view',
            '{00000000-0000-0000-0000-200000000004}': 'edit',
        },
        type: 'local',
        externalId: {
            dn: '',
            syncId: '',
            synced: false,
        },
    },
    {
        attributes: 'readonly',
        description: LANG['00000000-0000-0000-0000-100000000001'],
        id: '{00000000-0000-0000-0000-100000000001}',
        orgRoleId: '00000000-0000-4000-8000-000000000003',
        name: 'Power Users',
        parentGroupIds: [],
        permissions: 'powerUser|viewLogs|viewMetrics|generateEvents',
        resourceAccessRights: {
            '{00000000-0000-0000-0000-200000000001}':
                'view|viewArchive|exportArchive|viewBookmarks|manageBookmarks|userInput|edit',
            '{00000000-0000-0000-0000-200000000002}': 'view',
            '{00000000-0000-0000-0000-200000000003}': 'view',
            '{00000000-0000-0000-0000-200000000004}': 'edit',
        },
        type: 'local',
        externalId: {
            dn: '',
            syncId: '',
            synced: false,
        },
    },
    {
        attributes: 'readonly',
        description: LANG['00000000-0000-0000-0000-100000000002'],
        id: '{00000000-0000-0000-0000-100000000002}',
        orgRoleId: '00000000-0000-4000-8000-000000000005',
        name: 'Advanced Viewers',
        parentGroupIds: [],
        permissions: 'viewLogs',
        resourceAccessRights: {
            '{00000000-0000-0000-0000-200000000001}':
                'view|viewArchive|exportArchive|viewBookmarks|manageBookmarks|userInput',
            '{00000000-0000-0000-0000-200000000002}': 'view',
            '{00000000-0000-0000-0000-200000000003}': 'view',
        },
        type: 'local',
        externalId: {
            dn: '',
            syncId: '',
            synced: false,
        },
    },
    {
        attributes: 'readonly',
        description: LANG['00000000-0000-0000-0000-100000000003'],
        id: '{00000000-0000-0000-0000-100000000003}',
        orgRoleId: '00000000-0000-4000-8000-000000000006',
        name: 'Viewers',
        parentGroupIds: [],
        permissions: 'none',
        resourceAccessRights: {
            '{00000000-0000-0000-0000-200000000001}':
                'view|viewArchive|exportArchive|viewBookmarks',
            '{00000000-0000-0000-0000-200000000002}': 'view',
            '{00000000-0000-0000-0000-200000000003}': 'view',
        },
        type: 'local',
        externalId: {
            dn: '',
            syncId: '',
            synced: false,
        },
    },
    {
        attributes: 'readonly',
        description: LANG['00000000-0000-0000-0000-100000000004'],
        id: '{00000000-0000-0000-0000-100000000004}',
        orgRoleId: '00000000-0000-4000-8000-000000000007',
        name: 'Live Viewers',
        parentGroupIds: [],
        permissions: 'none',
        resourceAccessRights: {
            '{00000000-0000-0000-0000-200000000001}': 'view',
            '{00000000-0000-0000-0000-200000000002}': 'view',
            '{00000000-0000-0000-0000-200000000003}': 'view',
        },
        type: 'local',
        externalId: {
            dn: '',
            syncId: '',
            synced: false,
        },
    },
    {
        attributes: 'readonly',
        description: LANG['00000000-0000-0000-0000-100000000005'],
        id: '{00000000-0000-0000-0000-100000000005}',
        orgRoleId: '00000000-0000-4000-8000-000000000004',
        name: 'System Health Viewers',
        parentGroupIds: [],
        permissions: 'viewMetrics',
        resourceAccessRights: {
            '{00000000-0000-0000-0000-200000000003}': 'view',
        },
        type: 'local',
        externalId: {
            dn: '',
            syncId: '',
            synced: false,
        },
    },
    {
        attributes: 'readonly',
        description: '',
        id: '',
        orgRoleId: '',
        name: 'Custom',
        parentGroupIds: [],
        permissions: 'none',
        resourceAccessRights: {},
        type: 'local',
        externalId: {
            dn: '',
            syncId: '',
            synced: false,
        },
    },
];

export const DefaultUserGroupsToId: Record<string, UserGroup> = DefaultUserGroups.reduce(
    (groups, group) => ({ ...groups, [group.id]: group }),
    {},
);
