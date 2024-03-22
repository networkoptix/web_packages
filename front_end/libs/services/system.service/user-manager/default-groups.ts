import { UserGroup } from '@services/system-user.types';

export const DefaultUserGroups: UserGroup[] = [
    {
        attributes: 'readonly',
        description:
            'Members of this group have unlimited System privileges. Administrators can create and modify Power Users, merge Systems and connect or disconnect System to  Nx Cloud.',
        id: '00000000-0000-0000-0000-100000000000',
        name: 'Administrators',
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
        description:
            'Members of this group can, in addition to the permissions granted by the Advanced Viewers group, control most of the System configuration, but are not allowed to change any Administrator related settings, like delete or change their own groups and permissions, and cannot create or edit other Power Users.',
        id: '00000000-0000-0000-0000-100000000001',
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
        description:
            'Members of this group can, in addition to the permissions granted by the Viewers group, see and activate PTZ positions and PTZ tours, use 2-way audio, operate I/O module buttons, create and edit bookmarks, and view the Event Log.',
        id: '00000000-0000-0000-0000-100000000002',
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
        description:
            'Members of this group can, in addition to the permissions granted by the Live Viewers group, view and export archive and Bookmarks.',
        id: '00000000-0000-0000-0000-100000000003',
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
        description: 'Members of this group can view live videos, I/O modules and web pages.',
        id: '00000000-0000-0000-0000-100000000004',
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
        description:
            'Members of this group can view System Health Monitoring information and server processor load in real-time (Server Monitoring).',
        id: '00000000-0000-0000-0000-100000000005',
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
];

export const DefaultUserGroupsToId: Record<string, UserGroup> = DefaultUserGroups.reduce(
    (groups, group) => ({ ...groups, [group.id]: group }),
    {},
);
