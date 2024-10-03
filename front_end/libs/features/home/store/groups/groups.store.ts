import { computed, inject, InjectionToken, Injector, runInInjectionContext } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
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
    removeAllEntities,
    removeEntity,
    setEntities,
    setEntity,
    withEntities,
} from '@ngrx/signals/entities';
import { groupBy, isEqual } from 'lodash-es';
import { firstValueFrom, from, merge, NEVER, Observable, timer } from 'rxjs';
import {
    catchError,
    distinctUntilChanged,
    distinctUntilKeyChanged,
    filter,
    map,
    repeat,
    retry,
    skip,
    switchMap,
    take,
    tap,
} from 'rxjs/operators';

import staticLang from '@language_static';
import type { DraggableItem } from '@pages/home/home.types';
import { isTranslatable, Translatable } from '@pipes/nx-translate.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    CloudSystemLight,
    Group,
    GroupItem,
    GroupStructureItem,
    SystemItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxSystemsService } from '@services/systems.service';

import {
    findItem,
    flattenGroups,
    generatePath,
    isGroupItem,
    isSystemItem,
    mapToSystemItem,
    sortGroups,
} from './groups-utils';
import type { GroupFlatItem, RibbonContextState, SystemsByOrgOrGroup, Undo } from './groups.types';

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

export const GroupsStore = signalStore(
    { providedIn: 'root' },
    // 1. Define the underlying state model
    withState(() => inject(GROUPS_STATE)),
    withEntities({ entity: type<GroupItem>(), collection: 'groups' }),
    withEntities({ entity: type<SystemsByOrgOrGroup>(), collection: 'systems' }),
    withEntities({ entity: type<{ id: string; open: boolean }>(), collection: 'openGroups' }),
    withMethods(
        (
            _,
            channelPartnerService = inject(NxChannelPartnersService),
            systemsService = inject(NxSystemsService),
        ) => ({
            getChannelPartnersService: () => channelPartnerService,
            getSystemsService: () => systemsService,
        }),
    ),
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

        const showRibbon = (
            ribbonContext: RibbonContextState | Translatable,
            showForSeconds = 5,
        ): Undo => {
            if (isTranslatable(ribbonContext)) {
                ribbonContext = {
                    showForSeconds,
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
    withMethods(
        (
            store,
            channelPartnerService = inject(NxChannelPartnersService),
            injector = inject(Injector),
        ) => ({
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
                    (isGroupItem(movedItem) &&
                        movedItem.children &&
                        findItem(movedItem.children, targetItem.id)) ||
                    ('id' in movedItem && movedItem.id === targetItem.id)
                ) {
                    const value = errorMsg.folderInBranch;
                    store.showRibbon({ value, params: { type } });
                    return from(Promise.reject(value));
                }

                const targetGroupId = store.getTargetGroupId(movedItem);

                if (targetGroupId === targetItem.id) {
                    const value = errorMsg.alreadyInFolder;
                    store.showRibbon({ value, params: { type } });
                    return from(Promise.reject(value));
                }

                const undo = store.moveItemWithUndo(movedItem, targetItem);
                const persist$ = isGroupItem(movedItem)
                    ? channelPartnerService.patchGroup(movedItem.id, { parentId: targetItem.id })
                    : channelPartnerService.updateSystemGroup(movedItem.systemId, {
                          groupId: targetItem.id,
                      });
                return (persist$ as Observable<GroupItem | CloudSystemLight>).pipe(
                    catchError((_, caught) => {
                        undo();
                        return caught;
                    }),
                );
            },
            deleteSystem: (systemId: string) => {
                const systems = store
                    .systemsEntities()
                    .filter(({ systems }) => systems.includes(systemId))
                    .map(({ systems, cloudSystems, ...rest }) => ({
                        systems: systems.filter(id => id !== systemId),
                        cloudSystems: cloudSystems.filter(({ systemId: id }) => id !== systemId),
                        ...rest,
                    }));

                patchState(store, setEntities(systems, systemsEntity));
                return store.getSystemsService().deleteSystem(systemId);
            },
            /**
             * Initialize groups for store.
             *
             * @param orgId - OrganizationId to initialize groups for store
             * @param groupId - Current group
             * @returns GroupItem[] - Array of groups
             */
            initializeGroups: (orgId: string, groupId: string) => {
                const undo = store.initializeGroupsWithUndo();
                return channelPartnerService.getGroupsStructure(orgId).pipe(
                    tap(groups => {
                        patchState(
                            store,
                            removeAllEntities(groupsEntity),
                            setEntities(groups as GroupItem[], groupsEntity),
                        );

                        const openGroupsEntities = [{ id: orgId, open: true }];
                        if (groupId) {
                            let emptyActiveGroup = false;
                            function findGroupPath(
                                targetId: string,
                                currentLevel: GroupStructureItem[],
                                pathBase: string[] = [],
                                targetPath: string[] = [],
                            ): string[] {
                                for (let i = 0; i < currentLevel.length; i++) {
                                    if (targetPath.length) {
                                        return targetPath;
                                    }

                                    const currentGroup = currentLevel[i];
                                    const currentPath = pathBase.concat(currentGroup.id);
                                    if (currentGroup.id === targetId) {
                                        if (!currentGroup.children.length) {
                                            emptyActiveGroup = true;
                                            // Don't open current group if no children
                                        }
                                        return currentPath;
                                    }

                                    targetPath = findGroupPath(
                                        targetId,
                                        currentGroup.children,
                                        currentPath,
                                        targetPath,
                                    );
                                }
                                return targetPath;
                            }
                            const path = findGroupPath(groupId, groups);
                            if (emptyActiveGroup) {
                                path.pop();
                            }
                            openGroupsEntities.push(...path.map(id => ({ id, open: true })));
                        }

                        patchState(
                            store,
                            setEntities(openGroupsEntities, {
                                collection: 'openGroups',
                            }),
                        );
                    }),
                    catchError(e => {
                        undo();
                        throw e;
                    }),
                    retry({ delay: 30 * 1000 }),
                    repeat({ delay: 30 * 1000 }),
                );
            },
            initializeSystems: (orgId: string, groupId?: string) => {
                const orgSystems = store.systemsEntityMap()[orgId];
                return (
                    groupId
                        ? channelPartnerService.getGroup(groupId).pipe(
                              map(({ systems, cloudSystems }) => [
                                  {
                                      id: groupId!,
                                      systems,
                                      cloudSystems,
                                  },
                              ]),
                          )
                        : channelPartnerService.getUserSystems(orgId, !!orgSystems).pipe(
                              map(cloudSystems => {
                                  const grouped = groupBy(cloudSystems, 'groupId');
                                  const mapped = Object.entries(grouped).map(
                                      ([groupId, cloudSystems]) => ({
                                          id: groupId === 'null' ? orgId : groupId,
                                          cloudSystems,
                                          systems: cloudSystems.map(({ systemId }) => systemId),
                                      }),
                                  );
                                  return mapped;
                              }),
                          )
                ).pipe(
                    tap(orgOrGroupSystems =>
                        patchState(store, setEntities(orgOrGroupSystems, systemsEntity)),
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
                        return runInInjectionContext(injector, () =>
                            toObservable(store.openGroupsEntities),
                        );
                    }),
                    tap(openGroupsState => {
                        if (
                            !channelPartnerService.paramStateHandler.state$$().params
                                ?.organizationId
                        ) {
                            return;
                        }
                        const openGroups = openGroupsState.flatMap(({ id, open }) =>
                            open ? [id] : [],
                        );
                        channelPartnerService.paramStateHandler.state$$.update(state => ({
                            ...state,
                            queryParams: { openGroups },
                        }));
                    }),
                ),
        }),
    ),
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
                    distinctUntilKeyChanged('organizationId'),
                    switchMap(({ organizationId, groupId }) =>
                        store.initializeGroups(organizationId, groupId),
                    ),
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

            const sortedGroups$$ = computed(() => sortGroups(store.groupsEntities()));

            const currentGroups$$ = computed(() => {
                const groups = sortedGroups$$();
                const currentGroup = currentGroupId$$();
                if (currentGroup.isRoot) {
                    return groups;
                }

                return findItem(groups, currentGroup.id)?.children || [];
            });

            const currentGroupName$$ = computed(
                () => findItem(store.groupsEntities(), currentGroupId$$().id)?.name,
            );

            const openGroups$$ = computed(() => {
                const openGroups = Object.fromEntries(
                    store.openGroupsEntities().map(({ id, open }) => [id, open]),
                );
                return openGroups;
            });

            const allOrgSystems$$ = computed(() => {
                const systems = store.systemsEntities().flatMap(({ cloudSystems }) => cloudSystems);
                return mapToSystemItem(systems, systemsService.systemInfoMap$$());
            });

            const currentSystems$$ = computed<SystemItem[]>(() => {
                const systems = store.systemsEntityMap();
                const { id, isRoot } = currentGroupId$$();

                const currentGroup = systems[id];
                const cloudSystems = currentGroup?.cloudSystems || [];

                return mapToSystemItem(cloudSystems, systemsService.systemInfoMap$$()).filter(
                    ({ groupId }) => (isRoot ? groupId === null : groupId === id),
                );
            });

            const groupFlatMap$$ = computed(() => {
                const groups = store.groupsEntities();
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

            const totalOrgGroupsOrSystems$$ = computed(() => {
                const groups = Object.values(groupFlatMap$$());
                const groupCount = groups.length;
                return groupCount + allOrgSystems$$().length;
            });

            return {
                sortedGroups$$,
                currentGroupId$$,
                currentGroups$$,
                currentSystems$$,
                openGroups$$,
                groupsPath$$,
                groupFlatMap$$,
                groupPathMap$$,
                currentRibbonContext$$,
                currentGroupName$$,
                totalOrgGroupsOrSystems$$,
                allOrgSystems$$,
            };
        },
    ),
);

export type GroupsStoreType = typeof GroupsStore;
