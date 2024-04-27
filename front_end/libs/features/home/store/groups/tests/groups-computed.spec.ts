import { patchState } from '@ngrx/signals';
import { setEntities } from '@ngrx/signals/entities';
import { v4 as uuid } from 'uuid';

import { GroupItem } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { mapToSystemItem, sortGroups } from '../groups-utils';
import { GroupFlatItem } from '../groups.types';

import {
    setupGroupsStore,
    generateGroups,
    sample,
    generateSystemsByOrgOrGroup,
    findItem,
} from './groups-test-helpers';

describe('Groups Store: Computed signals', () => {
    describe('groupPathMap$$', () => {
        it('should return empty map if no groups are loaded', async () => {
            const { groupsStore } = await setupGroupsStore();
            const groupPathMap = groupsStore.groupPathMap$$();
            expect(groupPathMap).toEqual({});
        });

        it('should return map of groups by id', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { flatGroups, groups } = generateGroups();

            const expectedPathMap = flatGroups.reduce(
                (acc, current, index, arr) => {
                    const leafPath = arr.slice(0, index + 1);
                    return {
                        ...acc,
                        [current.id]: {
                            path: leafPath,
                            pathString: ['', ...leafPath.map(path => path.name)].join(' / ').trim(),
                        },
                    };
                },
                {} as Record<string, { path: GroupFlatItem[]; pathString: string }>,
            );

            patchState(groupsStore, setEntities(groups, { collection: 'groups' }));

            const groupPathMap = groupsStore.groupPathMap$$();
            expect(groupPathMap).toEqual(expectedPathMap);
        });
    });

    describe('groupFlatMap$$', () => {
        it('should return empty map if no groups are loaded', async () => {
            const { groupsStore } = await setupGroupsStore();
            const groupFlatMap = groupsStore.groupFlatMap$$();
            expect(groupFlatMap).toEqual({});
        });

        it('should return map of groups by id', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { flatGroups, groups } = generateGroups();

            const expectedFlatMap = flatGroups.reduce(
                (acc, current) => ({
                    ...acc,
                    [current.id]: current,
                }),
                {} as Record<string, GroupFlatItem>,
            );

            patchState(groupsStore, setEntities(groups, { collection: 'groups' }));

            const groupFlatMap = groupsStore.groupFlatMap$$();
            expect(groupFlatMap).toEqual(expectedFlatMap);
        });
    });

    describe('groupsPath$$', () => {
        it('should return empty array if no groups are loaded', async () => {
            const { groupsStore } = await setupGroupsStore();
            const groupsPath = groupsStore.groupsPath$$();
            expect(groupsPath).toEqual([]);
        });

        it('should return empty array if no current group', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { groups } = generateGroups();
            patchState(groupsStore, setEntities(groups, { collection: 'groups' }));
            const groupsPath = groupsStore.groupsPath$$();
            expect(groupsPath).toEqual([]);
        });

        it('should return path for current group', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const { flatGroups, groups } = generateGroups();

            const organizationId = uuid();
            const groupId = flatGroups[flatGroups.length - 1].id;
            cpService.paramStateHandler.state$$.set({ params: { organizationId, groupId } });

            patchState(groupsStore, setEntities(groups, { collection: 'groups' }));

            const groupsPath = groupsStore.groupsPath$$();
            expect(groupsPath).toEqual(flatGroups);
        });
    });

    describe('currentGroupId$$', () => {
        it('should return id of organizationId and isRoot true if no groupId in params', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const organizationId = uuid();
            cpService.paramStateHandler.state$$.set({ params: { organizationId } });
            const currentGroupId = groupsStore.currentGroupId$$();
            expect(currentGroupId).toEqual({
                id: organizationId,
                isRoot: true,
            });
        });

        it('should return id of groupId and isRoot false if groupId in params', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const groupId = uuid();
            cpService.paramStateHandler.state$$.set({
                params: { organizationId: uuid(), groupId },
            });
            const currentGroupId = groupsStore.currentGroupId$$();
            expect(currentGroupId).toEqual({
                id: groupId,
                isRoot: false,
            });
        });
    });

    describe('currentRibbonContext$$', () => {
        it('should return undefined if no ribbon is shown', async () => {
            const { groupsStore } = await setupGroupsStore();
            const currentRibbonContext = groupsStore.currentRibbonContext$$();
            expect(currentRibbonContext).toBeUndefined();
        });

        it('should return context if ribbon is shown', async () => {
            const { groupsStore } = await setupGroupsStore();
            const message = uuid();
            groupsStore.showRibbon(message);
            const currentRibbonContext = groupsStore.currentRibbonContext$$();
            expect(currentRibbonContext).toEqual({
                visibility: true,
                type: 'groups-error',
                actions: [],
                message,
            });
        });
    });

    describe('sortedGroups$$', () => {
        it('should return empty array if no groups are loaded', async () => {
            const { groupsStore } = await setupGroupsStore();
            const sortedGroups = groupsStore.sortedGroups$$();
            expect(sortedGroups).toEqual([]);
        });

        it('should return sorted groups', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { flatGroups } = generateGroups();
            const groups = flatGroups.map(
                group => ({ ...group, parentId: null, children: [] }) as GroupItem,
            );
            patchState(groupsStore, setEntities(groups, { collection: 'groups' }));
            const sortedGroups = groupsStore.sortedGroups$$();
            expect(sortedGroups).toEqual(sortGroups(groups));
        });
    });

    describe('currentGroups$$', () => {
        it('should return empty array if no groups are loaded', async () => {
            const { groupsStore } = await setupGroupsStore();
            const currentGroup = groupsStore.currentGroups$$();
            expect(currentGroup).toEqual([]);
        });

        it('should return current group', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const { groups, flatGroups } = generateGroups();
            const groupId = flatGroups[flatGroups.length - 2]!.id;
            const expectedGroups = findItem(groups, groupId)!.children;
            cpService.paramStateHandler.state$$.set({
                params: { organizationId: uuid(), groupId },
            });

            patchState(groupsStore, setEntities(groups, { collection: 'groups' }));
            const currentGroups = groupsStore.currentGroups$$();
            expect(currentGroups).toEqual(expectedGroups);
        });
    });

    describe('currentGroupName$$', () => {
        it('should return undefined if no groups are loaded', async () => {
            const { groupsStore } = await setupGroupsStore();
            const currentGroupName = groupsStore.currentGroupName$$();
            expect(currentGroupName).toBeUndefined();
        });
        it('should return name for current group', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const { groups, flatGroups } = generateGroups();
            const currentGroup = sample(flatGroups)!;
            cpService.paramStateHandler.state$$.set({
                params: { organizationId: uuid(), groupId: currentGroup.id },
            });
            patchState(groupsStore, setEntities(groups, { collection: 'groups' }));

            expect(groupsStore.currentGroupName$$()).toBe(currentGroup.name);
        });
    });
    describe('openGroups$$', () => {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        const generateExpectedGroups = (flatGroups: GroupFlatItem[], organizationId: string) => {
            const currentGroup = sample(flatGroups)!;
            const groupId = currentGroup.id;
            return [
                groupId,
                flatGroups.slice(0, flatGroups.indexOf(currentGroup) + 1).reduce(
                    (acc, curr) => {
                        acc[curr.id] ||= true;
                        return acc;
                    },
                    {
                        [organizationId]: true,
                        [groupId]: true,
                    },
                ),
            ] as const;
        };
        it('should always have root group open', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const { groups } = generateGroups();
            const organizationId = uuid();
            cpService.paramStateHandler.state$$.set({
                params: { organizationId },
            });
            patchState(groupsStore, setEntities(groups, { collection: 'groups' }));

            expect(groupsStore.openGroups$$()).toEqual({ [organizationId]: true });
        });

        it('should always have current group open', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const { groups, flatGroups } = generateGroups();
            const organizationId = uuid();
            const [groupId, expectedOpenGroups] = generateExpectedGroups(
                flatGroups,
                organizationId,
            );
            cpService.paramStateHandler.state$$.set({
                params: { organizationId, groupId },
            });
            patchState(groupsStore, setEntities(groups, { collection: 'groups' }));

            const openGroups = groupsStore.openGroups$$();
            expect(openGroups).toEqual(expectedOpenGroups);
        });

        // Need to figure out why flaky
        xit('should show open groups from queryParams', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const { groups, flatGroups } = generateGroups();
            const organizationId = uuid();
            const [groupId, expectedOpenGroups0] = generateExpectedGroups(
                flatGroups,
                organizationId,
            );
            const [groupId1, expectedOpenGroups1] = generateExpectedGroups(
                flatGroups,
                organizationId,
            );
            const [groupId2, expectedOpenGroups2] = generateExpectedGroups(
                flatGroups,
                organizationId,
            );
            const expectedOpenGroups = {
                ...expectedOpenGroups0,
                ...expectedOpenGroups1,
                ...expectedOpenGroups2,
            };
            cpService.paramStateHandler.state$$.set({
                params: { organizationId, groupId },
            });
            patchState(
                groupsStore,
                setEntities(
                    [
                        { id: groupId1, open: true },
                        { id: groupId2, open: true },
                    ],
                    { collection: 'openGroups' },
                ),
                setEntities(groups, { collection: 'groups' }),
            );

            const openGroups = groupsStore.openGroups$$();
            expect(openGroups).toEqual(expectedOpenGroups);
        });
    });

    describe('currentSystems$$', () => {
        it('should return root org systems', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const orgSystems = generateSystemsByOrgOrGroup();
            const [rootSystems] = orgSystems;
            const expectedSystems = mapToSystemItem(rootSystems.cloudSystems, new Map());
            cpService.paramStateHandler.state$$.set({
                params: { organizationId: rootSystems.id },
            });
            patchState(groupsStore, setEntities(orgSystems, { collection: 'systems' }));

            const currentSystems = groupsStore.currentSystems$$();
            expect(currentSystems).toEqual(expectedSystems);
        });

        it('should return group systems', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const orgSystems = generateSystemsByOrgOrGroup();
            const [rootSystems, ...groupSystems] = orgSystems;
            const activeGroup = sample(groupSystems)!;
            const expectedSystems = mapToSystemItem(activeGroup.cloudSystems, new Map());
            cpService.paramStateHandler.state$$.set({
                params: { organizationId: rootSystems.id, groupId: activeGroup.id },
            });
            patchState(groupsStore, setEntities(orgSystems, { collection: 'systems' }));

            const currentSystems = groupsStore.currentSystems$$();
            expect(currentSystems).toEqual(expectedSystems);
        });
    });

    describe('allOrgSystems$$', () => {
        it('should return all systems for org when in root', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const orgSystems = generateSystemsByOrgOrGroup();
            const expectedSystemCount = orgSystems.flatMap(
                ({ cloudSystems }) => cloudSystems,
            ).length;
            const [rootSystems] = orgSystems;
            cpService.paramStateHandler.state$$.set({
                params: { organizationId: rootSystems.id },
            });
            patchState(groupsStore, setEntities(orgSystems, { collection: 'systems' }));

            const currentSystems = groupsStore.allOrgSystems$$();
            expect(currentSystems.length).toEqual(expectedSystemCount);
        });

        it('should return all systems for org when in group', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const orgSystems = generateSystemsByOrgOrGroup();
            const expectedSystemCount = orgSystems.flatMap(
                ({ cloudSystems }) => cloudSystems,
            ).length;
            const [rootSystems, ...groupSystems] = orgSystems;
            const activeGroup = sample(groupSystems)!;
            cpService.paramStateHandler.state$$.set({
                params: { organizationId: rootSystems.id, groupId: activeGroup.id },
            });
            patchState(groupsStore, setEntities(orgSystems, { collection: 'systems' }));

            const currentSystems = groupsStore.allOrgSystems$$();
            expect(currentSystems.length).toEqual(expectedSystemCount);
        });
    });
});
