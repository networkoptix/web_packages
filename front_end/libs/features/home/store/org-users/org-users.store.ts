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
import { Subject, iif, Observable, pipe, zip, NEVER, timer } from 'rxjs';
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
import { caseInsenstiveSearch, interceptMethodCalls } from '@utils/general';

import { GroupsStore } from '../groups/groups.store';
import { ChannelPartnersRouteState } from '../route-state/route-state.store';

import { OrgUser, OrgUsersByGroup, OrgUsersState } from './org-users.types';

const initialState: OrgUsersState = {
    selectedGroupId: '',
    selectedUser: '',
    groups: [],
    searchQuery: '',
    refreshUsersSubject: new Subject(),
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

function getUsersByModel(records: OrgUser[] | undefined, query: string): OrgUser[] {
    if (records) {
        return records.filter(user => caseInsenstiveSearch(user.email, query));
    }
    return [];
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
                                            updateEntity(
                                                {
                                                    id: user.email,
                                                    changes,
                                                },
                                                currentGroupUsersEntity,
                                            ),
                                        );
                                    } else {
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
                        const user = store.currentGroupUsersEntityMap()[email];
                        iif(
                            () => user!.isOrgUser || folders.length === 0,
                            chpService.deleteOrganizationUser(orgId, email),
                            chpService.deleteBulkUserGroups(
                                orgId,
                                email,
                                folders.length
                                    ? folders
                                    : user!.groupRoles.map(group => group.groupId),
                            ),
                        ).subscribe(() => {
                            if (user.isOrgUser || folders.length === user.groupRoles.length) {
                                patchState(store, removeEntity(email, currentGroupUsersEntity));
                            } else {
                                patchState(
                                    store,
                                    updateEntity(
                                        {
                                            id: user.email,
                                            changes: {
                                                groupRoles: user.groupRoles.filter(
                                                    group => !folders.includes(group.groupId),
                                                ),
                                            },
                                        },
                                        currentGroupUsersEntity,
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
                        iif(
                            () => !!folder && roleId !== OrgRoleIds.OrgAdmin,
                            chpService.updateGroupUser(folder, {
                                roleId,
                                email,
                            }),
                            chpService.updateOrganizationUser(orgId, { roleId, email }),
                        ).subscribe(updatedUser =>
                            patchState(
                                store,
                                updateEntity(
                                    { id: email, changes: { ...updatedUser } },
                                    currentGroupUsersEntity,
                                ),
                            ),
                        );
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
                    switchMap(groupId => (groupId ? Promise.resolve(groupId) : NEVER)),
                    distinctUntilChanged(),
                    tapResponse({
                        next: (groupId: string) => {
                            const id = store.selectedGroupId() || routerStateStore.organizationId();
                            const users = store.currentGroupUsersEntities();
                            console.info({ id, users });
                            patchState(
                                store,
                                removeAllEntities(currentGroupUsersEntity),
                                {
                                    selectedGroupId: groupId,
                                },
                                setEntity(
                                    { id, users },
                                    { collection: usersCacheEntity.collection },
                                ),
                            );
                        },
                        error: () => {},
                    }),
                    switchMap(groupId => {
                        const cached = store.usersCacheEntityMap()[groupId];

                        if (cached) {
                            store.setUsers(cached.users);
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
                        next: users => store.setUsers(users as OrgUser[]),
                        error: () => {},
                    }),
                ),
            ),
            setSearchQuery: search => patchState(store, { searchQuery: search }),
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
                            map((_, index) => [...state, true] as const),
                            startWith([...state, false] as const),
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
    withComputed(({ searchQuery: searchQuery$$, currentGroupUsersEntities: entities$$ }) => ({
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
