import { patchState } from '@ngrx/signals';
import { setEntities } from '@ngrx/signals/entities';

import { mapToSystemItem } from '../groups-utils';

import {
    findItem,
    generateGroup,
    generateGroups,
    populateStore,
    sample,
    setupGroupsStore,
    uuid,
} from './groups-test-helpers';

describe('GroupsStore: Base Methods', () => {
    describe('showRibbon', () => {
        it('should set ribbon context with text', async () => {
            const { groupsStore } = await setupGroupsStore();
            const ribbonContext = uuid();
            groupsStore.showRibbon(ribbonContext);
            expect(groupsStore.ribbonContext()).toEqual({
                context: {
                    message: ribbonContext,
                    actions: [],
                    type: 'groups-error',
                },
                showForSeconds: 5,
            });
        });

        it('should set ribbon context with RibbonContextState', async () => {
            const { groupsStore } = await setupGroupsStore();
            const ribbonContext = {
                context: {
                    message: uuid(),
                    actions: [],
                    type: uuid(),
                },
                showForSeconds: 5,
            };
            groupsStore.showRibbon(ribbonContext);
            expect(groupsStore.ribbonContext()).toEqual(ribbonContext);
        });

        it('should return hideRibbon function', async () => {
            const { groupsStore } = await setupGroupsStore();
            const returnValue = groupsStore.showRibbon(uuid());

            expect(returnValue).toEqual(expect.any(Function));
        });

        it('should clear ribbon when returned hideRibbon function is called', async () => {
            const { groupsStore } = await setupGroupsStore();

            groupsStore.showRibbon(uuid())();

            expect(groupsStore.ribbonContext()).toEqual({ showForSeconds: 0 });
        });
    });

    describe('hideRibbon', () => {
        it('should clear ribbon', async () => {
            const { groupsStore } = await setupGroupsStore();

            groupsStore.showRibbon(uuid());
            groupsStore.hideRibbon();

            expect(groupsStore.ribbonContext()).toEqual({ showForSeconds: 0 });
        });
    });

    describe('initializeGroupsWithUndo', () => {
        it('should properly set loadingGroups state and reset on undo', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { groups } = generateGroups();
            patchState(groupsStore, setEntities(groups, { collection: 'groups' }));

            const undo = groupsStore.initializeGroupsWithUndo();

            expect(groupsStore.groupsEntities()).toEqual([]);
            expect(groupsStore.loadingGroups()).toBe(true);

            undo();

            expect(groupsStore.groupsEntities()).toEqual([]);
            expect(groupsStore.loadingGroups()).toBe(false);
        });
    });

    // Need to figure out why this is flaky
    xdescribe('moveItemWithUndo', () => {
        it('should properly move group', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const { groups, systemsByOrgOrGroup, flatGroups } = populateStore(groupsStore);

            const rootGroup = flatGroups.find(group => !group.parentId)!;
            cpService.paramStateHandler.state$$.set({
                params: { organizationId: rootGroup.id },
            });

            const groupIdToMove = sample(
                flatGroups.filter(group => group.parentId && group.parentId !== rootGroup.id),
            )!.id;

            const groupToMove = findItem(groups, groupIdToMove)!;
            const targetGroup = sample(
                flatGroups.filter(
                    group =>
                        group.id !== groupToMove.id && !findItem(groupToMove.children, group.id),
                ),
            )!;

            groupsStore.moveItemWithUndo({ ...groupToMove, children: [] }, targetGroup);

            const updatedTarget = findItem(groupsStore.groupsEntities(), targetGroup.id)!;
            expect(updatedTarget.children).toContainEqual(groupToMove);
            expect(groupsStore.systemsEntities()).toEqual(systemsByOrgOrGroup);
        });

        it('should properly reset on undo', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { groups, systemsByOrgOrGroup, flatGroups } = populateStore(groupsStore);

            const childGroups = flatGroups.filter(group => group.parentId);
            const groupToMove = sample(childGroups)!;
            const targetGroup = sample(childGroups.filter(group => group.id !== groupToMove.id))!;

            const undo = groupsStore.moveItemWithUndo(
                { ...groupToMove, children: [] },
                targetGroup,
            );
            undo();

            expect(groupsStore.groupsEntities()).toEqual(groups);
            expect(groupsStore.systemsEntities()).toEqual(systemsByOrgOrGroup);
        });
    });

    describe('addItemWithUndo', () => {
        it('should properly add group', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { flatGroups } = populateStore(groupsStore);

            const targetGroup = sample(flatGroups)!;
            const addedGroup = generateGroup({
                id: uuid(),
                parentId: targetGroup.id,
            });

            groupsStore.addItemWithUndo(addedGroup);

            expect(findItem(groupsStore.groupsEntities(), targetGroup.id)!.children).toContainEqual(
                addedGroup,
            );
        });

        it('should properly reset on undo', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { groups, systemsByOrgOrGroup, flatGroups } = populateStore(groupsStore);

            const targetGroup = sample(flatGroups)!;

            const undo = groupsStore.addItemWithUndo(
                generateGroup({
                    id: uuid(),
                    parentId: targetGroup.id,
                }),
            );
            undo();

            expect(groupsStore.groupsEntities()).toEqual(groups);
            expect(groupsStore.systemsEntities()).toEqual(systemsByOrgOrGroup);
        });
    });

    describe('deleteItemWithUndo', () => {
        it('should properly delete group and group systems', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { systemsByOrgOrGroup, flatGroups, organizationId } = populateStore(groupsStore);

            const groupToDelete = sample(flatGroups.filter(group => group.parentId))!;

            groupsStore.deleteGroupWithUndo(groupToDelete.id, organizationId);

            expect(groupsStore.groupFlatMap$$()[groupToDelete.id]).toBeUndefined();
            expect(groupsStore.systemsEntities()).toEqual(
                systemsByOrgOrGroup.filter(groups => groups.id !== groupToDelete.id),
            );
        });

        /**
         * Not currently implemented in the store. Not sure if we need it.
         *
         * Test case added in case we do need it.
         */
        xit('should properly reset on undo', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { groups, systemsByOrgOrGroup, flatGroups, organizationId } =
                populateStore(groupsStore);

            const groupToDelete = sample(flatGroups.filter(group => group.parentId))!;

            const undo = groupsStore.deleteGroupWithUndo(groupToDelete.id, organizationId);
            undo();

            expect(groupsStore.groupsEntities()).toEqual(groups);
            expect(groupsStore.systemsEntities()).toEqual(systemsByOrgOrGroup);
        });
    });

    describe('getTargetGroupId', () => {
        it('should return parentId of group', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { flatGroups } = populateStore(groupsStore);
            const group = sample(flatGroups.filter(group => group.parentId))!;
            const expectedTargetGroupId = group.parentId;
            const targetGroupId = groupsStore.getTargetGroupId({ ...group, children: [] });
            expect(targetGroupId).toEqual(expectedTargetGroupId);
        });

        it('should return groupId of system', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { systemsByOrgOrGroup } = populateStore(groupsStore);
            const group = sample(systemsByOrgOrGroup)!;
            const expectedGroupId = group.id;
            const system = sample(mapToSystemItem(group.cloudSystems, new Map()))!;
            const targetGroupId = groupsStore.getTargetGroupId(system);
            expect(targetGroupId).toEqual(expectedGroupId);
        });

        it('should return null if targetGroupId is root', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const { flatGroups } = populateStore(groupsStore);
            const rootGroup = flatGroups.find(group => !group.parentId)!;
            cpService.paramStateHandler.state$$.set({
                params: { organizationId: rootGroup.id },
            });
            const childOfRootGroup = sample(
                flatGroups.filter(group => group.parentId === rootGroup.id),
            )!;
            const targetGroupId = groupsStore.getTargetGroupId({
                ...childOfRootGroup,
                children: [],
            });
            expect(targetGroupId).toBe(null);
        });
    });

    describe('renameItemWithUndo', () => {
        it('should properly rename group', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { flatGroups } = populateStore(groupsStore);

            const groupToRename = sample(flatGroups.filter(group => group.parentId))!;

            const updatedName = uuid();

            groupsStore.renameItemWithUndo(groupToRename.id, updatedName);

            expect(groupsStore.groupFlatMap$$()[groupToRename.id].name).toEqual(updatedName);
        });

        it('should properly reset on undo', async () => {
            const { groupsStore } = await setupGroupsStore();
            const { groups, systemsByOrgOrGroup, flatGroups } = populateStore(groupsStore);

            const groupToRename = sample(flatGroups.filter(group => group.parentId))!;

            const undo = groupsStore.renameItemWithUndo(groupToRename.id, uuid());
            undo();

            expect(groupsStore.groupsEntities()).toEqual(groups);
            expect(groupsStore.systemsEntities()).toEqual(systemsByOrgOrGroup);
        });
    });
});
