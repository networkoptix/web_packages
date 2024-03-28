import { InjectionToken, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
    signalStore,
    type,
    withState,
    withMethods,
    withComputed,
    withHooks,
    patchState,
} from '@ngrx/signals';
import {
    removeAllEntities,
    removeEntity,
    setEntities,
    setEntity,
    withEntities,
} from '@ngrx/signals/entities';
import { isEqual } from 'lodash-es';
import {
    Observable,
    catchError,
    distinctUntilChanged,
    filter,
    repeat,
    map,
    switchMap,
    tap,
    from,
    firstValueFrom,
    NEVER,
    timer,
    take,
    skip,
    merge,
} from 'rxjs';

import staticLang from '@language_static';
import type { DraggableItem } from '@pages/home/home.types';
import { Translatable, isTranslatable } from '@pipes/nx-translate.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    CloudSystem,
    Group,
    GroupItem,
    SystemItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo, NxOrgSystemInfo } from '@services/systems.service.types';

import { generatePath, isGroupItem, isSystemItem, sortGroups } from './groups-utils';
import type {
    SystemsByOrgOrGroup,
    Undo,
    GroupFlatMap,
    GroupFlatItem,
    RibbonContextState,
} from './groups.types';

const initialState = {
    loadingGroups: true,
    currentGroupId: '',
    ribbonContext: { showForSeconds: 0 } as RibbonContextState,
};

const groupsEntity = { collection: 'groups' } as const;

const systemsEntity = { collection: 'systems' } as const;

const GROUPS_STATE = new InjectionToken<typeof initialState>('GroupsState', {
    factory: () => initialState,
});

const findItem = (items: GroupItem[], id: string | null, remove = false): GroupItem | undefined => {
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

export const GroupsStore = signalStore(
    { providedIn: 'root' },
    // 1. Define the underlying state model
    withState(() => inject(GROUPS_STATE)),
    withEntities({ entity: type<GroupItem>(), collection: 'groups' }),
    withEntities({ entity: type<SystemsByOrgOrGroup>(), collection: 'systems' }),
    withEntities({ entity: type<{ id: string; open: boolean }>(), collection: 'openGroups' }),
    withMethods((_, channelPartnerService = inject(NxChannelPartnersService)) => ({
        getChannelPartnersService: () => channelPartnerService,
    })),
    // 2. Define mutations for state. All mutations should return an undo function
    withMethods(store => {
        const updateSystemCounts = (
            groups: GroupItem[],
            systemCounts: Record<string, number>,
        ): void => {
            const updateGroup = (id: string, count: number): void => {
                const group = findItem(groups, id);
                if (group) {
                    group.systemCount += count;
                    if (group.parentId) {
                        updateGroup(group.parentId, count);
                    }
                }
            };
            Object.entries(systemCounts).forEach(([id, count]) => updateGroup(id, count));
        };

        const moveById = (
            movedGroupId: string,
            targetParentId: string | null,
            groups: GroupItem[],
        ): GroupItem[] | undefined => {
            const moved = findItem(groups, movedGroupId, true)!;

            updateSystemCounts(groups, {
                [moved.parentId]: -moved.systemCount,
            });

            if (targetParentId === null) {
                if (moved) {
                    moved.parentId = '';
                    groups.push(moved);
                }
                return groups;
            }
            const target = findItem(groups, targetParentId);

            if (target && moved) {
                moved.parentId = target.id;
                target.children.push(moved);
                updateSystemCounts(groups, {
                    [target.id]: moved.systemCount,
                });
                return groups;
            }
        };

        const patchGroupChanges = (groups: GroupItem[] | undefined): void => {
            if (groups) {
                patchState(
                    store,
                    removeAllEntities(groupsEntity),
                    setEntities(groups, groupsEntity),
                    { ribbonContext: { showForSeconds: 0 } },
                );
            }
        };

        const moveSystem = (systemId: string, targetGroupId: string | null): string => {
            const systemsByGroup = store.systemsEntities();
            const targetGroup: SystemsByOrgOrGroup = systemsByGroup.find(
                ({ id }) => id === targetGroupId,
            ) || {
                id: targetGroupId!,
                systems: [],
                cloudSystems: [],
            };
            const originalGroup = systemsByGroup.find(({ systems }) => systems.includes(systemId))!;

            const systemsIndex = originalGroup.systems.indexOf(systemId);
            const cloudSystemsIndex = originalGroup.cloudSystems.findIndex(
                ({ systemId: id }) => id === systemId,
            );

            targetGroup.systems.push(...originalGroup.systems.splice(systemsIndex, 1));
            targetGroup.cloudSystems.push(
                ...originalGroup.cloudSystems.splice(cloudSystemsIndex, 1),
            );

            const groups = store.groupsEntities();
            updateSystemCounts(groups, {
                [originalGroup.id]: -1,
                [targetGroup.id]: 1,
            });

            patchState(
                store,
                setEntities([targetGroup, originalGroup], systemsEntity),
                setEntities(groups, groupsEntity),
                { ribbonContext: { showForSeconds: 0 } },
            );
            return originalGroup.id;
        };

        const hideRibbon = (): void => patchState(store, { ribbonContext: { showForSeconds: 0 } });

        const showRibbon = (ribbonContext: RibbonContextState | Translatable): Undo => {
            if (isTranslatable(ribbonContext)) {
                ribbonContext = {
                    showForSeconds: 5,
                    context: {
                        message: ribbonContext,
                        actions: [],
                        type: 'groups-error',
                    },
                };
            }
            patchState(store, { ribbonContext });
            return hideRibbon;
        };

        const methods = {
            showRibbon,
            hideRibbon,
            initializeGroupsWithUndo: (): Undo => {
                patchState(
                    store,
                    removeAllEntities(groupsEntity),
                    setEntities([] as GroupItem[], groupsEntity),
                    { loadingGroups: true },
                );
                return () => patchState(store, { loadingGroups: false });
            },
            moveItemWithUndo: (
                movedItem: DraggableItem,
                targetItem: Pick<GroupItem, 'id'> | { id: null },
            ): Undo => {
                const movedGroupId = 'id' in movedItem ? movedItem.id : '';
                const originalParentId = 'parentId' in movedItem ? movedItem.parentId : '';
                const targetParentId = targetItem.id;

                // Handle system move

                if (isSystemItem(movedItem)) {
                    const originalGroupId = moveSystem(movedItem.systemId, targetParentId!);

                    return () => moveSystem(movedItem.systemId, originalGroupId);
                }

                // Handle group move

                patchGroupChanges(moveById(movedGroupId, targetParentId, store.groupsEntities()));

                return () =>
                    patchGroupChanges(
                        moveById(movedGroupId, originalParentId, store.groupsEntities()),
                    );
            },
            addItemWithUndo: (group: Group): Undo => {
                // children types are incompatible but new groups have none
                const item = { ...group, children: [] } as GroupItem;
                const groups = store.groupsEntities();
                const parentItem = findItem(groups, item.parentId);
                (parentItem?.children || groups).push(item);
                patchGroupChanges(groups);

                return () => {
                    const groups = store.groupsEntities();
                    const parentItem = findItem(groups, item.parentId);

                    if (!parentItem) {
                        return;
                    }

                    parentItem.children = parentItem.children.filter(({ id }) => id !== item.id);
                    patchGroupChanges(groups);
                };
            },
            deleteGroupWithUndo: (id: string, orgId: string): Undo => {
                const groups = store.groupsEntities();
                const deletedGroup = findItem(groups, id, true)!;
                const targetGroupChildren =
                    findItem(groups, deletedGroup.parentId)?.children || groups;
                targetGroupChildren.push(
                    ...deletedGroup.children.map(child => ({
                        ...child,
                        parentId: deletedGroup.parentId,
                    })),
                );

                const systemsByGroup = store.systemsEntityMap();
                const systemsWithinGroup = systemsByGroup[id];
                const statePatches = [
                    store,
                    removeAllEntities(groupsEntity),
                    setEntities(groups, groupsEntity),
                    { ribbonContext: { showForSeconds: 0 } },
                ] as const;
                if (systemsWithinGroup?.systems.length) {
                    const targetGroup = systemsByGroup[deletedGroup.parentId || orgId] || {
                        id: deletedGroup.parentId,
                        systems: [],
                        cloudSystems: [],
                    };
                    targetGroup.systems.push(...systemsWithinGroup.systems);
                    targetGroup.cloudSystems.push(
                        ...systemsWithinGroup.cloudSystems.map(cloudSystem => ({
                            ...cloudSystem,
                            groupId: deletedGroup.parentId,
                        })),
                    );

                    updateSystemCounts(groups, {
                        [deletedGroup.id]: -systemsWithinGroup?.systems.length,
                    });

                    patchState(
                        ...statePatches,
                        setEntity(targetGroup, systemsEntity),
                        removeEntity(deletedGroup?.id, systemsEntity),
                    );

                    return () => {
                        // TODO: Implement undo for deleteGroupWithUndo if we need it
                    };
                }

                patchState(...statePatches);

                return () => {
                    // TODO: Implement undo for deleteGroupWithUndo if we need it
                };
            },
            getTargetGroupId: (movedItem: DraggableItem): string | null => {
                const targetGroupId = isGroupItem(movedItem)
                    ? movedItem.parentId
                    : store
                          .systemsEntities()
                          .find(({ systems }) => systems.includes(movedItem.systemId))!.id;
                return targetGroupId ===
                    store.getChannelPartnersService().paramStateHandler.state$$().params
                        ?.organizationId
                    ? null
                    : targetGroupId;
            },
            renameItemWithUndo: (id: string, name: string): Undo => {
                const groups = store.groupsEntities();
                const item = findItem(store.groupsEntities(), id);

                if (!item) {
                    return () => {};
                }

                const currentName = item.name;
                item.name = name;

                patchGroupChanges(groups);
                return () => {
                    const groups = store.groupsEntities();
                    const item = findItem(store.groupsEntities(), id);
                    if (item) {
                        item.name = currentName;
                        patchGroupChanges(groups);
                    }
                };
            },
        };
        return methods;
    }),
    // 3. Define data persistence methods
    withMethods((store, channelPartnerService = inject(NxChannelPartnersService)) => ({
        toggleOpenState: (id: string) => {
            const openGroups = store.openGroupsEntityMap();
            const open = !openGroups[id]?.open;
            patchState(store, setEntity({ id, open }, { collection: 'openGroups' }));
        },
        moveItem: (
            movedItem: DraggableItem,
            targetItem: GroupItem | { id: null } = { id: null },
        ) => {
            const { draggableType, errorMsg } = staticLang.systemGroups;
            const type = {
                value: isGroupItem(movedItem) ? draggableType.folder : draggableType.system,
            };
            if (
                isGroupItem(movedItem) &&
                movedItem.children &&
                findItem(movedItem.children, targetItem.id)
            ) {
                const value = errorMsg.childInFolder;
                store.showRibbon({ value, params: { type } });
                return from(Promise.reject(value));
            }

            const targetGroupId = store.getTargetGroupId(movedItem);

            if (targetGroupId === targetItem.id) {
                const value = targetGroupId ? errorMsg.alreadyInFolder : errorMsg.alreadyInRoot;
                store.showRibbon({ value, params: { type } });
                return from(Promise.reject(value));
            }

            const undo = store.moveItemWithUndo(movedItem, targetItem);
            const persist$ = isGroupItem(movedItem)
                ? channelPartnerService.patchGroup(movedItem.id, { parentId: targetItem.id })
                : channelPartnerService.updateSystemGroup(movedItem.systemId, {
                      groupId: targetItem.id,
                  });
            return (persist$ as Observable<GroupItem | CloudSystem>).pipe(
                catchError((_, caught) => {
                    undo();
                    return caught;
                }),
            );
        },
        /**
         * Initialize groups for store.
         *
         * @param orgId - OrganizationId to initialize groups for store
         * @returns GroupItem[] - Array of groups
         */
        initializeGroups: (orgId: string) => {
            const undo = store.initializeGroupsWithUndo();
            return channelPartnerService.getGroupsStructure(orgId).pipe(
                tap(groups =>
                    patchState(
                        store,
                        removeAllEntities(groupsEntity),
                        setEntities(groups as GroupItem[], groupsEntity),
                    ),
                ),
                catchError((_, caught) => {
                    undo();
                    return caught;
                }),
                repeat({
                    delay: 30 * 1000,
                }),
            );
        },
        initializeSystems: (orgId: string, groupId?: string) => {
            return (
                groupId
                    ? channelPartnerService.getGroup(groupId).pipe(
                          map(({ systems, cloudSystems }) => ({
                              id: groupId!,
                              systems,
                              cloudSystems,
                          })),
                      )
                    : channelPartnerService.getOrgSystems(orgId, true).pipe(
                          map(cloudSystems => ({
                              id: orgId,
                              cloudSystems,
                              systems: cloudSystems.map(({ systemId }) => systemId),
                          })),
                      )
            ).pipe(
                tap(orgOrGroupSystems =>
                    patchState(store, setEntity(orgOrGroupSystems, systemsEntity)),
                ),
            );
        },
        initializeOpenGroupsSync: () =>
            channelPartnerService.paramStateHandler.state$.pipe(
                map(({ queryParams: { openGroups } }) => openGroups || []),
                take(1),
                switchMap(openGroups => {
                    patchState(
                        store,
                        setEntities(
                            openGroups.map(id => ({
                                id,
                                open: true,
                            })),
                            { collection: 'openGroups' },
                        ),
                    );
                    return toObservable(store.openGroupsEntities);
                }),
                skip(1),
                tap(openGroupsState => {
                    const openGroups = openGroupsState.flatMap(({ id, open }) =>
                        open ? [id] : [],
                    );
                    channelPartnerService.paramStateHandler.state$$.set({
                        queryParams: { openGroups },
                    });
                }),
            ),
    })),
    // 4. Define side effects
    withHooks({
        onInit: store => {
            const paramState$ = store.getChannelPartnersService().paramStateHandler.state$.pipe(
                map(({ params }) => params),
                filter(({ organizationId }) => !!organizationId),
            );
            const orgOrGroupChange$ = paramState$.pipe(
                map(({ organizationId, groupId }) => ({ organizationId, groupId })),
                distinctUntilChanged((a, b) => isEqual(a, b)),
            );
            paramState$
                .pipe(
                    map(({ organizationId }) => organizationId),
                    distinctUntilChanged(),
                    switchMap(store.initializeGroups),
                    takeUntilDestroyed(),
                )
                .subscribe();
            orgOrGroupChange$
                .pipe(
                    tap(({ organizationId, groupId }) =>
                        firstValueFrom(store.initializeSystems(organizationId, groupId)),
                    ),
                    takeUntilDestroyed(),
                )
                .subscribe();
            // Handles auto-hiding of ribbon
            toObservable(store.ribbonContext)
                .pipe(
                    distinctUntilChanged((a, b) => isEqual(a, b)),
                    switchMap(context => {
                        if (context.showForSeconds) {
                            return merge(
                                timer(context.showForSeconds * 1000),
                                orgOrGroupChange$.pipe(skip(1)),
                            ).pipe(take(1));
                        }
                        return NEVER;
                    }),
                    tap(() => store.hideRibbon()),
                    takeUntilDestroyed(),
                )
                .subscribe();
            store.initializeOpenGroupsSync().pipe(takeUntilDestroyed()).subscribe();
        },
    }),
    // 5. Define Computed state
    withComputed(
        (
            store,
            channelPartnersService = inject(NxChannelPartnersService),
            systemsService = inject(NxSystemsService),
        ) => {
            const params$$ = computed(() => {
                return channelPartnersService.paramStateHandler.state$$().params;
            });

            const currentGroupId$$ = computed(() => {
                const params = params$$();
                if (params?.groupId) {
                    return {
                        isRoot: false as const,
                        id: params.groupId,
                    };
                }
                return {
                    isRoot: true as const,
                    id: params?.organizationId || '',
                };
            });

            const processGroups = (orgGroups: GroupItem[]): GroupItem[] => {
                const groups: GroupItem[] = [];
                const getChildren = (group: GroupItem): void => {
                    for (const child of group.children) {
                        groups.push(child);
                        getChildren(child);
                    }
                };
                for (const group of orgGroups) {
                    groups.push(group);
                    getChildren(group);
                }
                return groups;
            };

            const sortedGroups$$ = computed(() => sortGroups(store.groupsEntities()));

            // const groupStateAdapter$$ = computed((): GroupsState => {
            //     const groups = processGroups(sortedGroups$$());
            //     const openGroups = Object.fromEntries(
            //         store.openGroupsEntities().map(({ id, open }) => [id, open]),
            //     );
            //     const systems = store.systemsEntities() as unknown as SystemItem[];
            //     const currentGroupId = store.currentGroupId();
            //     return {
            //         groups,
            //         openGroups,
            //         systems,
            //         currentGroupId,
            //     };
            // });

            const currentGroups$$ = computed(() => {
                const groups = sortedGroups$$();
                const currentGroup = currentGroupId$$();
                if (currentGroup.isRoot) {
                    return groups;
                }

                return findItem(groups, currentGroup.id)?.children || [];
            });

            const flatGroups$$ = computed(() => {
                const groups = store.groupsEntities();
                return processGroups(groups).map(({ id, parentId }) => ({ id, parentId }));
            });

            function* getOpenGroups(
                groups: { id: string; parentId: string }[],
                currentGroupId: string,
            ): Generator<string> {
                while (currentGroupId) {
                    yield currentGroupId;
                    const group = groups.find(group => group.id === currentGroupId);
                    if (group) {
                        currentGroupId = group.parentId;
                    } else {
                        return;
                    }
                }
            }

            const openGroups$$ = computed(() => {
                const groups = flatGroups$$();
                const openGroups = Object.fromEntries(
                    store.openGroupsEntities().map(({ id, open }) => [id, open]),
                );
                const currentGroup = currentGroupId$$();
                const params = params$$();

                const organizationId = params!.organizationId;

                const fromOpen = currentGroup.isRoot
                    ? { [currentGroup.id]: true }
                    : Object.fromEntries(
                          [...getOpenGroups(groups, currentGroup.id), organizationId].map(id => [
                              id,
                              true,
                          ]),
                      );

                return {
                    ...openGroups,
                    ...fromOpen,
                };
            });

            const currentSystems$$ = computed<SystemItem[]>(() => {
                const systems = store.systemsEntityMap();
                const { id, isRoot } = currentGroupId$$();
                const systemInfoMap = systemsService.systemInfoMap$$();

                const currentGroup = systems[id];
                const cloudSystems = currentGroup?.cloudSystems || [];
                const systemItems: SystemItem[] = [];
                for (const system of cloudSystems) {
                    const systemInfo = systemInfoMap.get(system.systemId) || ({} as NxSystemInfo);
                    const { systemId, groupId, effectiveState } = system;
                    // API sometimes forgets the system name on CloudSystem, patch for now
                    // https://networkoptix.atlassian.net/browse/CLOUD-13056?focusedCommentId=194015
                    const {
                        system2faEnabled = false,
                        stateOfHealth = '',
                        name = system.name,
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
                return systemItems
                    .filter(({ groupId }) => (isRoot ? groupId === null : groupId === id))
                    .sort((a, b) => a.name!.localeCompare(b.name!));
            });

            const groupFlatMap$$ = computed(() => {
                const groups = store.groupsEntities();
                const flattenGroups = (
                    groups: GroupItem[],
                    groupMap: GroupFlatMap = {},
                ): GroupFlatMap => {
                    for (const group of groups) {
                        const { children, ...withoutChild } = group;
                        groupMap[group.id] = withoutChild;
                        if (children?.length) {
                            flattenGroups(group.children, groupMap);
                        }
                    }
                    return groupMap;
                };
                return flattenGroups(groups);
            });

            const groupsPath$$ = computed(() => {
                const groups = groupFlatMap$$();
                const currentGroupId = currentGroupId$$().id;
                return [...generatePath(groups, currentGroupId)].reverse();
            });

            const groupPathMap$$ = computed(() => {
                const groups = groupFlatMap$$();

                return Object.keys(groups).reduce(
                    (acc, groupId) => {
                        const path = [...generatePath(groups, groupId)].reverse();
                        const pathString = ['', ...path.map(({ name }) => name)].join(' / ').trim();
                        acc[groupId] = {
                            path,
                            pathString,
                        };
                        return acc;
                    },
                    {} as Record<string, { path: GroupFlatItem[]; pathString: string }>,
                );
            });

            const currentRibbonContext$$ = computed(() => {
                const context = store.ribbonContext();
                if (context.showForSeconds && context.context?.message) {
                    return { visibility: true, ...context.context };
                }
            });

            return {
                sortedGroups$$,
                // groupStateAdapter$$,
                currentGroupId$$,
                currentGroups$$,
                currentSystems$$,
                openGroups$$,
                groupsPath$$,
                groupFlatMap$$,
                groupPathMap$$,
                currentRibbonContext$$,
            };
        },
    ),
);
