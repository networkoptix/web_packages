import { computed, inject, InjectionToken } from '@angular/core';
import { tapResponse } from '@ngrx/component-store';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
    addEntity,
    removeAllEntities,
    removeEntities,
    removeEntity,
    setEntities,
    updateEntity,
    withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { iif, Observable, pipe, zip } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

import {
    AccessLevel,
    UserRecord,
    UserType,
} from '@pages/home/components/users/channel-partner-users/channel-partner-users.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    GroupItem,
    GroupRole,
    GroupUser,
    GroupUserCanAccess,
    Organization,
    OrganizationUser,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { caseInsenstiveSearch } from '@utils/general';

import { GroupsStore } from '../groups/groups.store';
import { ChannelPartnersRouteState } from '../route-state/route-state.store';

import { OrgUser, OrgUsersState } from './org-users.types';

const initialState: OrgUsersState = {
    selectedGroupId: '',
    selectedUser: '',
    groups: [],
    searchQuery: '',
};

const ORG_USER_STATE = new InjectionToken<OrgUsersState>('OrgUserState', {
    factory: () => initialState,
});

const formatUser = (
    org: Organization,
    user: (OrganizationUser | GroupUser) &
        Partial<{
            hasAccessTo: Record<string, string>;
            rolesIds: string[];
            groupRoles: GroupRole[];
        }>,
    groups: GroupItem[],
    userType: boolean,
): OrgUser => {
    let groupRoles: GroupRole[] = [];
    let accessLevel: AccessLevel;
    if (user.groupRoles?.length) {
        groupRoles = user.groupRoles.map(group => ({
            ...group,
            name: groups.find(_group => _group.id === group.groupId)?.name,
        }));
    } else if (user.hasAccessTo) {
        const { id = '', name = '' } = user.hasAccessTo ?? {
            id: '',
            name: '',
        };
        const { rolesIds = [], roles = [] } = user;
        groupRoles = [{ groupId: id, name, rolesIds, roles }];
    } else if (user.roles) {
        accessLevel = {
            name: org.name,
            id: org.id,
            membershipType: '',
        };
    }

    return {
        ...user,
        groupRoles,
        accessLevel: accessLevel || user.hasAccessTo,
        isOrgUser: userType,
        userType: userType ? UserType.ORGANIZATION : UserType.GROUP,
    } as OrgUser;
};

const mapGroupUsers = (users: GroupUserCanAccess[]): UserRecord[] => {
    return users.map(user => ({
        email: user.email,
        userId: user.email,
        fullName: user.fullName || 'N/A',
        roles: user.roles,
        isOrgUser: user.hasAccessTo?.membershipType === 'organization',
        accessLevel: user.hasAccessTo,
        userType: UserType.GROUP,
    }));
};

const mapOrgUsers = (users: OrganizationUser[], groups: GroupItem[]): UserRecord[] => {
    const isOrgUser = (user: OrganizationUser): boolean => {
        // Still needs clarification on all ways to see if user is from org
        return user.roles?.includes('Administrator') || !user.groupRoles?.length;
    };
    return users.map(user => ({
        ...user,
        fullName: user.fullName || 'N/A',
        groupRoles: user?.groupRoles?.map(group => ({
            ...group,
            name: groups?.find(groupItem => groupItem.id === group.groupId)?.name,
        })),
        userId: user.email,
        isOrgUser: isOrgUser(user),
        userType: UserType.ORGANIZATION,
    }));
};

function getUsersByModel(records: OrgUser[] | undefined, query: string): OrgUser[] {
    if (records) {
        return records.filter(user => caseInsenstiveSearch(user.email, query));
    }
    return [];
}

export const OrgUsersStore = signalStore(
    { providedIn: 'root' },
    withState(() => inject(ORG_USER_STATE)),
    withEntities<OrgUser>(),
    withComputed(store => ({
        tableUsers$$: computed(() => {
            const groups = store.groups();
            return store.entities().map(user => ({
                ...user,
                groupRoles: (user?.groupRoles || []).map(group => ({
                    ...group,
                    name: group.name || groups.find(_group => _group.id === group.groupId)?.name,
                })),
            })) as UserRecord[];
        }),
    })),
    withMethods((store, chpService = inject(NxChannelPartnersService)) => ({
        addUser: (org: Organization, folder: string, user: { email: string; roleId: string }) => {
            const isAddingToOrg = org.id === folder;
            const groups = store.groups();
            return iif(
                () => isAddingToOrg,
                chpService.createOrganizationUser(org.id, user),
                chpService.updateGroupUser(folder, user),
            ).pipe(
                map(user => formatUser(org, user, groups, isAddingToOrg)),
                tapResponse({
                    next: user => {
                        if (isAddingToOrg || [folder, org.id].includes(store.selectedGroupId())) {
                            const existingUser = store.entityMap()[user.email];
                            if (existingUser) {
                                let changes: Partial<OrgUser>;
                                if (isAddingToOrg) {
                                    changes = {
                                        accessLevel: undefined,
                                        isOrgUser: true,
                                        userType: UserType.ORGANIZATION,
                                        groupRoles: [],
                                    };
                                } else {
                                    changes = {
                                        accessLevel: user.accessLevel,
                                        isOrgUser: false,
                                        userType: UserType.GROUP,
                                        groupRoles: user.groupRoles.reduce<GroupRole[]>(
                                            (roles, role) => {
                                                const index = roles.findIndex(
                                                    _role => _role.groupId === role.groupId,
                                                );
                                                if (index > -1) {
                                                    roles[index] = role;
                                                } else {
                                                    roles.push(role);
                                                }
                                                return roles;
                                            },
                                            existingUser.groupRoles,
                                        ),
                                    };
                                }
                                changes.roles = user.roles;
                                changes.rolesIds = user.rolesIds;

                                patchState(
                                    store,
                                    updateEntity({
                                        id: user.email,
                                        changes,
                                    }),
                                );
                            } else {
                                patchState(store, addEntity({ ...user }, { idKey: 'email' }));
                            }
                        }
                    },
                    error: e => {
                        console.error(e);
                    },
                }),
            );
        },
        removeUser: (orgId: string, folder: string, email: string) => {
            iif(
                () => orgId === folder,
                chpService.deleteOrganizationUser(orgId, email),
                chpService.deleteBulkGroupUsers(folder, [email]),
            ).subscribe(() => patchState(store, removeEntity(email)));
        },
        removeUsers: (orgId: string, folder: string, emails: string[]) => {
            const users: { orgUsers: OrgUser[]; groupUsers: OrgUser[] } = store.entities().reduce(
                (deletedUsers, user) => {
                    if (emails.includes(user.email)) {
                        if (user?.groupRoles?.length) {
                            deletedUsers.groupUsers.push(user);
                        } else {
                            deletedUsers.orgUsers.push(user);
                        }
                    }
                    return deletedUsers;
                },
                { orgUsers: [], groupUsers: [] } as { orgUsers: OrgUser[]; groupUsers: OrgUser[] },
            );
            const requests: Observable<unknown>[] = [];
            if (users.orgUsers.length) {
                requests.push(
                    chpService.deleteBulkOrganizationUsers(
                        orgId,
                        users.orgUsers.map(({ email }) => email),
                    ),
                );
            }
            if (orgId !== folder) {
                requests.push(
                    chpService.deleteBulkGroupUsers(
                        folder,
                        users.groupUsers.map(({ email }) => email),
                    ),
                );
            } else {
                const groupMap: { [key: string]: string[] } = {};
                for (const user of users.groupUsers) {
                    for (const group of user?.groupRoles || []) {
                        const { groupId } = group;
                        if (!groupMap[groupId]) {
                            groupMap[groupId] = [];
                        }
                        groupMap[groupId].push(user.email);
                    }
                }

                Object.entries(groupMap).forEach(([id, users]) =>
                    requests.push(chpService.deleteBulkGroupUsers(id, users)),
                );
            }
            zip(requests).subscribe(() => patchState(store, removeEntities(emails)));
        },
        setUsers: users => patchState(store, setEntities(users, { idKey: 'email' })),
        updateUser: (orgId: string, folder: string, email: string, roleId: string) => {
            iif(
                () => !!folder,
                chpService.updateGroupUser(folder, {
                    roleId,
                    email,
                }),
                chpService.updateOrganizationUser(orgId, { roleId, email }),
            ).subscribe(); // Once the user is changed that's it because we fetch on each load.
            // In the future we can patch the state if it becomes necessary.
        },
    })),
    withMethods(
        (
            store,
            chpService = inject(NxChannelPartnersService),
            groupsStore = inject(GroupsStore),
            routerStateStore = inject(ChannelPartnersRouteState),
        ) => ({
            setGroups: rxMethod<GroupItem[]>(
                pipe(
                    filter(Boolean),
                    tapResponse({
                        next: (groups: GroupItem[]) => patchState(store, { groups }),
                        error: () => [],
                    }),
                ),
            ),
            setSelectedGroup: rxMethod<string>(
                pipe(
                    tapResponse({
                        next: (groupId: string) =>
                            patchState(store, removeAllEntities(), { selectedGroupId: groupId }),
                        error: () => {},
                    }),
                    switchMap(groupId => {
                        return iif(
                            () => !!groupId,
                            chpService
                                .getGroupUsersWithAccess(groupId)
                                .pipe(map(users => mapGroupUsers(users))),
                            chpService
                                .getOrganizationUsers(routerStateStore.organizationId())
                                .pipe(
                                    map(users => mapOrgUsers(users, groupsStore.currentGroups$$())),
                                ),
                        );
                    }),
                    tapResponse({
                        next: users => store.setUsers(users),
                        error: () => {},
                    }),
                ),
            ),
            setSearchQuery: search => patchState(store, { searchQuery: search }),
        }),
    ),
    withComputed(({ searchQuery: searchQuery$$, entities: entities$$ }) => ({
        filteredRecords$$: computed(() => {
            const records = entities$$();
            const search = searchQuery$$();
            if (!records) {
                return undefined; // avoid showing "No data" msg.
            } else if (search.length) {
                return getUsersByModel(records, search) as UserRecord[];
            } else {
                return records as UserRecord[];
            }
        }),
    })),
);
