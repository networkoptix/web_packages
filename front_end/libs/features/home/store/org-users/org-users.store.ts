import { computed, inject, InjectionToken } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { tapResponse } from '@ngrx/component-store';
import {
    patchState,
    signalStore,
    type,
    withComputed,
    withHooks,
    withMethods,
    withState,
} from '@ngrx/signals';
import {
    addEntity,
    removeAllEntities,
    removeEntities,
    removeEntity,
    setEntities,
    setEntity,
    updateEntity,
    withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { Store } from '@ngrx/store';
import { iif, NEVER, Observable, pipe, Subject, timer, zip } from 'rxjs';
import {
    catchError,
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
    pairwise,
    retry,
    startWith,
    switchMap,
} from 'rxjs/operators';

import LANG from '@language/language_i18n_static.json';
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
    OrgRoleIds,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { selectCurrentOrganization } from '@store/channel-partners/channel-partners.selectors';
import { alphaNumericSort, caseInsensitiveSearch, interceptMethodCalls } from '@utils/general';

import { GroupsStore } from '../groups/groups.store';
import { ChannelPartnersRouteState } from '../route-state/route-state.store';

import { OrgUser, OrgUsersByGroup, OrgUsersState } from './org-users.types';

const initialState: OrgUsersState = {
    selectedGroupId: '',
    selectedUser: '',
    groups: [],
    searchQuery: '',
    searchFilters: {},
    refreshUsersSubject: new Subject(),
    initialized: false,
};

const ORG_USER_STATE = new InjectionToken<OrgUsersState>('OrgUserState', {
    factory: () => initialState,
});

const findGroupRecursive = (
    groups: GroupItem[],
    matcher: (group: GroupItem) => boolean,
): GroupItem | undefined => {
    for (const group of groups) {
        if (matcher(group)) {
            return group;
        }
        if (group.children) {
            const found = findGroupRecursive(group.children, matcher);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
};

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
        rolesIds: user.rolesIds,
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
            name: findGroupRecursive(groups, groupItem => groupItem.id === group.groupId)?.name,
        })),
        userId: user.email,
        isOrgUser: isOrgUser(user),
        userType: isOrgUser(user) ? UserType.ORGANIZATION : UserType.GROUP,
    }));
};

function getUsersByFilters(
    records: OrgUser[] | undefined,
    filters: Record<string, string>,
): OrgUser[] {
    if (records) {
        return records.filter(user => {
            return filters.email && caseInsensitiveSearch(user.email, filters.email);
            // Commented out for 23.3.3
            // https://networkoptix.atlassian.net/browse/CLOUD-14078
            // return (
            //     (filters.email && caseInsensitiveSearch(user.email, filters.email)) ||
            //     (filters.name && caseInsensitiveSearch(user.fullName, filters.name)) ||
            //     (filters.role &&
            //         user.roles?.some(role => caseInsensitiveSearch(role, filters.role))) ||
            //     (filters.folder &&
            //         user.groupRoles?.some(role => caseInsensitiveSearch(role.name, filters.folder)))
            // );
        });
    }
    return [];
}

function getUsersByModel(
    records: OrgUser[] | undefined,
    query: string,
    orgName: string,
): OrgUser[] {
    if (!records || !query) {
        return [];
    }

    return records.filter(user => {
        const fieldsToFilterBy = [
            user.email,
            user.fullName,
            ...user.rolesIds.map(roleId => LANG.channelPartners.orgs.orgRoleInfo[roleId].name),
        ];

        if (user.groupRoles) {
            fieldsToFilterBy.push(
                ...user.groupRoles.map(
                    groupRole => LANG.channelPartners.orgs.orgRoleInfo[groupRole.rolesIds[0]].name,
                ),
                ...user.groupRoles.map(groupRole => groupRole.name),
            );
        }

        if (user.accessLevel) {
            fieldsToFilterBy.push(user.accessLevel.name);
        } else if (user.userType === UserType.ORGANIZATION) {
            fieldsToFilterBy.push(orgName);
        }

        // Commented out for 23.3.3
        // https://networkoptix.atlassian.net/browse/CLOUD-14078
        // return (
        //     query &&
        //     (caseInsensitiveSearch(user.email, query) ||
        //         caseInsensitiveSearch(user.fullName, query) ||
        //         user.roles?.some(role => caseInsensitiveSearch(role, query)) ||
        //         user.groupRoles?.some(role => caseInsensitiveSearch(role.name, query)))
        // );

        return fieldsToFilterBy.some(value => caseInsensitiveSearch(value, query));
    });
}

const currentGroupUsersEntity = { collection: 'currentGroupUsers' } as const;

const usersCacheEntity = { collection: 'usersCache' } as const;

export const OrgUsersStore = signalStore(
    { providedIn: 'root' },
    withState(() => inject(ORG_USER_STATE)),
    withEntities({ entity: type<OrgUser>(), collection: currentGroupUsersEntity.collection }),
    withEntities({ entity: type<OrgUsersByGroup>(), collection: usersCacheEntity.collection }),
    withComputed(store => ({
        tableUsers$$: computed(() => {
            // const groups = store.groups();
            return store.currentGroupUsersEntities() as UserRecord[];
        }),
    })),
    withMethods(
        (
            store,
            chpService = inject(NxChannelPartnersService),
            groupsStore = inject(GroupsStore),
            routerStateStore = inject(ChannelPartnersRouteState),
        ) => {
            const updateGroupCache = (groupId: string): void => {
                const orgId = routerStateStore.organizationId();
                iif(
                    () => groupId !== routerStateStore.organizationId(),
                    chpService
                        .getGroupUsersWithAccess(groupId)
                        .pipe(map(users => mapGroupUsers(users))),
                    chpService
                        .getOrganizationUsers(orgId)
                        .pipe(map(users => mapOrgUsers(users, groupsStore.currentGroups$$()))),
                ).subscribe(users => {
                    patchState(
                        store,
                        setEntity(
                            { id: groupId, users: users as OrgUser[] },
                            { collection: usersCacheEntity.collection },
                        ),
                    );
                });
            };

            const refreshUsers = (methodName?: string): void => {
                const excludedMethods = ['setUsers'];
                if (excludedMethods.includes(methodName || '')) {
                    return;
                }

                store.refreshUsersSubject().next();
            };

            const updateHelpers = {
                /**
                 * A method to manually trigger updating the cached users for a specific group.
                 *
                 * This is useful when you need a different group's users or the orgs users when you are viewing a different group.
                 *
                 * Example use case is when you need the org users within a dialog.
                 *
                 * Another example use case would be to add pre-fetching of users when you're hovering over a group link
                 *
                 * @param groupId Pass a groupId to update the cached users for a particular group. Or orgId to update the cached org users.
                 */
                updateGroupCache,
                /**
                 * A method to manually trigger updating users for the current group as well
                 * as cached org users.
                 */
                refreshUsers: refreshUsers as () => void,
            };

            const updateMethods = interceptMethodCalls(
                {
                    addUser: (
                        org: Organization,
                        folder: string,
                        user: { email: string; roleId: string },
                    ) => {
                        const currentGroupId = store.selectedGroupId();
                        const isAddingToOrg = org.id === folder;
                        const groups = groupsStore.groupsEntities();
                        return iif(
                            () => isAddingToOrg,
                            chpService.createOrganizationUser(org.id, user),
                            chpService.updateGroupUser(folder, user),
                        ).pipe(
                            map(user => formatUser(org, user, groups, isAddingToOrg)),
                            tapResponse({
                                next: user => {
                                    const existingUser =
                                        store.currentGroupUsersEntityMap()[user.email];
                                    if (existingUser) {
                                        let changes: Partial<OrgUser>;
                                        if (isAddingToOrg) {
                                            changes = {
                                                accessLevel: undefined,
                                                isOrgUser: true,
                                                userType: UserType.ORGANIZATION,
                                                groupRoles: [],
                                            };
                                        } else if ([org.id, folder].includes(currentGroupId)) {
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
                                        } else {
                                            return; // Do nothing if the user is not being added to the current group.
                                        }
                                        changes.roles = user.roles;
                                        changes.rolesIds = user.rolesIds;

                                        patchState(
                                            store,
                                            updateEntity(
                                                {
                                                    id: user.email,
                                                    changes,
                                                },
                                                currentGroupUsersEntity,
                                            ),
                                        );
                                    } else if ([org.id, folder].includes(currentGroupId)) {
                                        patchState(
                                            store,
                                            addEntity(
                                                { ...user },
                                                {
                                                    idKey: 'email',
                                                    collection: currentGroupUsersEntity.collection,
                                                },
                                            ),
                                        );
                                    }
                                },
                                error: e => {
                                    console.error(e);
                                    throw e;
                                },
                            }),
                        );
                    },
                    removeUser: (orgId: string, email: string, folders: string[] = []) => {
                        let userInCurrentGroup = true;
                        let user = store.currentGroupUsersEntityMap()[email];
                        // Handles the case when the user is not in the current group. IE not in the root of the org.
                        // This happens when the user is being deleted from the access table.
                        if (!user || user.accessLevel) {
                            const cachedUser = store
                                .usersCacheEntityMap()
                                [orgId]?.users?.find(u => u.email === email);
                            if (cachedUser) {
                                userInCurrentGroup = false;
                                user = cachedUser;
                            }
                        }
                        // No folders or folders === groupRoles effective means we are removing the user from the org.
                        const deleteFromOrg =
                            user!.isOrgUser ||
                            folders.length === 0 ||
                            folders.length === user.groupRoles?.length;
                        iif(
                            () => deleteFromOrg,
                            chpService.deleteOrganizationUser(orgId, email),
                            chpService.deleteBulkUserGroups(
                                orgId,
                                email,
                                folders.length
                                    ? folders
                                    : user!.groupRoles.map(group => group.groupId),
                            ),
                        ).subscribe(() => {
                            if (deleteFromOrg || !!user.accessLevel) {
                                patchState(store, removeEntity(email, currentGroupUsersEntity));
                            }

                            // Remove the group roles from the user
                            user.groupRoles = user.groupRoles?.filter(
                                group => !folders.includes(group.groupId),
                            );

                            if (userInCurrentGroup) {
                                return patchState(
                                    store,
                                    updateEntity(
                                        {
                                            id: user.email,
                                            changes: {
                                                groupRoles: user.groupRoles,
                                            },
                                        },
                                        currentGroupUsersEntity,
                                    ),
                                );
                            }

                            const users = store.usersCacheEntityMap()[orgId]?.users;
                            const userIndex = users.findIndex(u => u.email === email);
                            if (userIndex > -1) {
                                users[userIndex] = user;
                                patchState(
                                    store,
                                    updateEntity(
                                        { id: orgId, changes: { users } },
                                        usersCacheEntity,
                                    ),
                                );
                            }
                        });
                    },
                    removeUsers: (orgId: string, folder: string, emails: string[]) => {
                        const requests: Observable<unknown>[] = [];
                        if (!folder || folder === orgId) {
                            requests.push(chpService.deleteBulkOrganizationUsers(orgId, emails));
                        } else {
                            const users: { orgUsers: OrgUser[]; groupUsers: OrgUser[] } = store
                                .currentGroupUsersEntities()
                                .reduce(
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
                                    { orgUsers: [], groupUsers: [] } as {
                                        orgUsers: OrgUser[];
                                        groupUsers: OrgUser[];
                                    },
                                );

                            if (users.orgUsers.length) {
                                requests.push(
                                    chpService.deleteBulkOrganizationUsers(
                                        orgId,
                                        users.orgUsers.map(({ email }) => email),
                                    ),
                                );
                            }
                            if (users.groupUsers.length) {
                                requests.push(
                                    chpService.deleteBulkGroupUsers(
                                        folder,
                                        users.groupUsers.map(({ email }) => email),
                                    ),
                                );
                            }
                        }
                        zip(requests).subscribe(() =>
                            patchState(store, removeEntities(emails, currentGroupUsersEntity)),
                        );
                    },
                    setUsers: (users: OrgUser[]) => {
                        patchState(
                            store,
                            setEntities(users, {
                                idKey: 'email',
                                collection: currentGroupUsersEntity.collection,
                            }),
                        );
                    },
                    updateUser: (orgId: string, folder: string, email: string, roleId: string) => {
                        const isGroupUser =
                            !!folder && folder !== orgId && roleId !== OrgRoleIds.OrgAdmin;
                        iif(
                            () => isGroupUser,
                            chpService.updateGroupUser(folder, {
                                roleId,
                                email,
                            }),
                            chpService.updateOrganizationUser(orgId, { roleId, email }),
                        ).subscribe(updatedUser => {
                            if (isGroupUser) {
                                const { roles, rolesIds } = updatedUser;
                                const user = store.currentGroupUsersEntityMap()[email];
                                const { groupRoles } = user;
                                const changes: Partial<OrgUser> = {
                                    roles,
                                    rolesIds,
                                    isOrgUser: false,
                                };
                                const groupIndex =
                                    groupRoles?.findIndex(({ groupId }) => groupId === folder) ??
                                    -1;
                                if (groupIndex !== -1) {
                                    groupRoles[groupIndex] = {
                                        ...groupRoles[groupIndex],
                                        roles,
                                        rolesIds,
                                    };
                                    changes.groupRoles = groupRoles;
                                }
                                patchState(
                                    store,
                                    updateEntity({ id: email, changes }, currentGroupUsersEntity),
                                );
                            } else {
                                patchState(
                                    store,
                                    updateEntity(
                                        {
                                            id: email,
                                            changes: { ...updatedUser, isOrgUser: true },
                                        },
                                        currentGroupUsersEntity,
                                    ),
                                );
                            }
                        });
                    },
                },
                refreshUsers,
            );

            return {
                ...updateHelpers,
                ...updateMethods,
            };
        },
    ),
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
                    switchMap(groupId =>
                        // Empty string was added as an escape hatch to reset the current group.
                        groupId || groupId === '' ? Promise.resolve(groupId) : NEVER,
                    ),
                    distinctUntilChanged(),
                    tapResponse({
                        next: (groupId: string) => {
                            const id = routerStateStore.organizationId();
                            const users = store.currentGroupUsersEntities();
                            const selectedGroupId = groupId === id ? id : groupId;

                            console.info({ id, users });
                            patchState(
                                store,
                                removeAllEntities(currentGroupUsersEntity),
                                { selectedGroupId },
                                setEntity(
                                    { id, users },
                                    {
                                        collection: usersCacheEntity.collection,
                                    },
                                ),
                            );
                        },
                        error: () => {},
                    }),
                    switchMap(groupId => {
                        const cached = store.usersCacheEntityMap()[groupId];

                        if (cached) {
                            store.setUsers(cached.users);
                        } else if (groupId === '') {
                            // In escape hatch scenario, update the current group.
                            groupId =
                                routerStateStore.groupId() || routerStateStore.organizationId();
                        }
                        return iif(
                            () => groupId !== routerStateStore.organizationId(),
                            chpService
                                .getGroupUsersWithAccess(groupId)
                                .pipe(map(users => mapGroupUsers(users))),
                            chpService
                                .getOrganizationUsers(groupId)
                                .pipe(
                                    map(users => mapOrgUsers(users, groupsStore.currentGroups$$())),
                                ),
                        ).pipe(
                            retry({
                                count: 3,
                                delay: (_, retryCount: number) =>
                                    timer(retryCount ** retryCount * 500),
                                resetOnSuccess: true,
                            }),
                            catchError(() => NEVER),
                        );
                    }),
                    tapResponse({
                        next: users => {
                            store.setUsers(users as OrgUser[]);
                            patchState(store, { initialized: true });
                        },
                        error: () => {},
                    }),
                ),
            ),
            setSearchQuery: search => patchState(store, { searchQuery: search }),
            setSearchFilters: filters => patchState(store, { searchFilters: filters }),
            clearSearchFilters: () => patchState(store, { searchQuery: '', searchFilters: {} }),
            usersByGroupSignalFactory: (groupId?: string) => {
                if (!groupId) {
                    groupId = routerStateStore.organizationId();
                }
                store.updateGroupCache(groupId);
                return computed(() => {
                    return ((groupId && store.usersCacheEntityMap()[groupId]?.users) ||
                        []) as UserRecord[];
                });
            },
        }),
    ),
    withHooks({
        onInit: (
            store,
            groupsStore = inject(GroupsStore),
            routerStateStore = inject(ChannelPartnersRouteState),
        ) => {
            const updateSelectedGroup$$ = computed(() => {
                const groupId = routerStateStore.groupId() || routerStateStore.organizationId();
                const email = routerStateStore.email();
                return {
                    groupId,
                    email,
                };
            });
            const updater$$ = store.refreshUsersSubject();
            const currentGroupEntities = toObservable(store.currentGroupUsersEntities);
            store.setSelectedGroup(
                toObservable(updateSelectedGroup$$).pipe(
                    startWith(updateSelectedGroup$$()),
                    pairwise(),
                    filter(([prev, next]) => !next.email || next.email === prev.email),
                    switchMap(state =>
                        updater$$.pipe(
                            switchMap(() => currentGroupEntities),
                            debounceTime(100),
                            map((_, index) => [...state, !index] as const),
                            startWith([...state, true] as const),
                        ),
                    ),
                    map(([{ email }, { groupId }, refreshUsers]) => {
                        if (email || refreshUsers) {
                            store.updateGroupCache(routerStateStore.organizationId());
                        }
                        return groupId;
                    }),
                ),
            );
            store.setGroups(toObservable(groupsStore.currentGroups$$));
        },
    }),
    withComputed(
        (
            {
                searchQuery: searchQuery$$,
                searchFilters: searchFilters$$,
                currentGroupUsersEntities: entities$$,
            },
            store = inject(Store),
        ) => ({
            filteredRecords$$: computed(() => {
                if (!entities$$().length) {
                    return undefined; // avoid showing "No data" msg.
                }
                const currentOrg$$ = store.selectSignal(selectCurrentOrganization);
                const currentOrgName = currentOrg$$().name;
                const records = entities$$().sort(alphaNumericSort(record => record.email));
                const search = searchQuery$$();
                const filters = searchFilters$$() as Record<string, string>;
                let filteredRecords: OrgUser[] = records;

                if (Object.keys(filters).length) {
                    filteredRecords = getUsersByFilters(filteredRecords, filters);
                }
                if (search.length) {
                    filteredRecords = getUsersByModel(filteredRecords, search, currentOrgName);
                }

                return filteredRecords as UserRecord[];
            }),
        }),
    ),
);
