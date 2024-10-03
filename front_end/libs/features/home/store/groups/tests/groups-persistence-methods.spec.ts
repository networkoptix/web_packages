import { patchState } from '@ngrx/signals';
import { setEntities } from '@ngrx/signals/entities';
import { random } from 'lodash-es';
import { firstValueFrom, Observable, of } from 'rxjs';

import staticLang from '@language_static';
import { TranslateObject } from '@pipes/nx-translate.types';
import {
    CloudSystemLight,
    GroupItem,
    GroupStructureItem,
    WithPageUpdater,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { mapToSystemItem } from '../groups-utils';

import {
    findItem,
    generateGroup,
    generateGroupsAndSystems,
    generateIds,
    populateStore,
    sample,
    setupGroupsStore,
} from './groups-test-helpers';

const {
    systemGroups: { errorMsg },
} = staticLang;

describe('Groups Store: Persistence Methods', () => {
    describe('toggleOpenState', () => {
        it('should toggle group open state', async () => {
            const { groupsStore } = await setupGroupsStore();
            const openGroupsInitial = generateIds().map(id => ({
                id,
                open: !sample([true, false]),
            }));

            patchState(groupsStore, setEntities(openGroupsInitial, { collection: 'openGroups' }));

            expect(groupsStore.openGroupsEntities()).toEqual(openGroupsInitial);

            for (const group of openGroupsInitial) {
                groupsStore.toggleOpenState(group.id);
                expect(groupsStore.openGroupsEntityMap()[group.id].open).toBe(!group.open);
            }
        });
    });

    describe('moveItem', () => {
        describe('when moving group', () => {
            it('should move group to group', async () => {
                const { groupsStore, cpService } = await setupGroupsStore();
                const { organizationId, groups, flatGroups } = populateStore(groupsStore);

                cpService.paramStateHandler.state$$.set({ params: { organizationId } });

                const targetGroup = findItem(
                    groups,
                    sample(flatGroups.filter(({ parentId }) => parentId === organizationId))!.id,
                )!;

                const groupToMove = sample(sample(targetGroup.children)!.children)!;

                const result = (await firstValueFrom(
                    groupsStore.moveItem(groupToMove, targetGroup),
                )) as GroupItem;

                expect(result.parentId).toBe(targetGroup.id);
            });

            it('should move group to root', async () => {
                const { groupsStore, cpService } = await setupGroupsStore();
                const { organizationId, groups, flatGroups } = populateStore(groupsStore);

                cpService.paramStateHandler.state$$.set({ params: { organizationId } });

                const groupToMove = findItem(
                    groups,
                    sample(
                        flatGroups.filter(
                            ({ id, parentId }) => ![id, parentId].includes(organizationId),
                        ),
                    )!.id,
                )!;

                const result = (await firstValueFrom(
                    groupsStore.moveItem(groupToMove, { id: null }),
                )) as GroupItem;

                expect(result.parentId).toBeNull();
            });

            it('should show alreadyInFolder error when moving group to same parent', async () => {
                const { groupsStore } = await setupGroupsStore();
                const { groups, flatGroups } = generateGroupsAndSystems();
                const parentGroup = findItem(groups, sample(flatGroups)!.id)!;
                const childGroup = sample(parentGroup.children)!;

                const result = await firstValueFrom(
                    groupsStore.moveItem(childGroup, parentGroup),
                ).catch(error => error as string);

                expect(result).toBe(errorMsg.alreadyInFolder);
                expect(
                    (groupsStore.currentRibbonContext$$()!.message as TranslateObject).value,
                ).toBe(errorMsg.alreadyInFolder);
            });

            it('should show alreadyInRoot error when moving group to root that is already in root', async () => {
                const { groupsStore, cpService, detectChanges } = await setupGroupsStore();
                const { groups, organizationId } = generateGroupsAndSystems();
                cpService.paramStateHandler.state$$.set({ params: { organizationId } });

                const parentGroup = findItem(groups, organizationId)!;
                const childGroup = sample(parentGroup.children)!;

                const result = await firstValueFrom(groupsStore.moveItem(childGroup)).catch(
                    error => error as string,
                );

                detectChanges();

                expect(result).toBe(errorMsg.alreadyInFolder);
                expect(
                    (groupsStore.currentRibbonContext$$()!.message as TranslateObject).value,
                ).toBe(errorMsg.alreadyInFolder);
            });

            xit('should show childInFolder error when moving group to a child', async () => {
                const { groupsStore } = await setupGroupsStore();
                const { groups, flatGroups } = generateGroupsAndSystems();
                const parentGroup = findItem(groups, sample(flatGroups)!.id)!;
                const childGroup = sample(parentGroup.children)!;

                const result = await firstValueFrom(
                    groupsStore.moveItem(parentGroup, childGroup),
                ).catch(error => error as string);

                expect(result).toBe(errorMsg.folderInBranch);
                expect(
                    (groupsStore.currentRibbonContext$$()!.message as TranslateObject).value,
                ).toBe(errorMsg.folderInBranch);
            });
        });

        describe('when moving system', () => {
            it('should move system to group', async () => {
                const { groupsStore, cpService } = await setupGroupsStore();
                const { organizationId, groups, systemsByOrgOrGroup, flatGroups } =
                    populateStore(groupsStore);

                cpService.paramStateHandler.state$$.set({ params: { organizationId } });

                const targetGroup = findItem(
                    groups,
                    sample(flatGroups.filter(({ id }) => id !== organizationId))!.id,
                )!;

                const systemToMove = sample(
                    mapToSystemItem(
                        sample(systemsByOrgOrGroup.filter(({ id }) => id !== targetGroup.id))!
                            .cloudSystems,
                        new Map(),
                    ),
                )!;

                const result = (await firstValueFrom(
                    groupsStore.moveItem(systemToMove, targetGroup),
                )) as CloudSystemLight;

                expect(result.groupId).toBe(targetGroup.id);
            });

            it('should move system to root', async () => {
                const { groupsStore, cpService } = await setupGroupsStore();
                const { organizationId, systemsByOrgOrGroup } = populateStore(groupsStore);

                cpService.paramStateHandler.state$$.set({ params: { organizationId } });

                const systemNotInRoot = sample(
                    mapToSystemItem(
                        sample(systemsByOrgOrGroup.filter(({ id }) => id !== organizationId))!
                            .cloudSystems,
                        new Map(),
                    ),
                )!;

                const result = (await firstValueFrom(
                    groupsStore.moveItem(systemNotInRoot, { id: null }),
                )) as CloudSystemLight;

                expect(result.groupId).toBeNull();
            });
        });
    });

    describe('deleteSystem', () => {
        it('should delete the system from the store and delete using the systemsService', async () => {
            const { groupsStore, cpService, systemsService } = await setupGroupsStore();
            const { organizationId, systemsByOrgOrGroup } = populateStore(groupsStore);
            cpService.paramStateHandler.state$$.set({ params: { organizationId } });

            const systemToDelete = sample(sample(systemsByOrgOrGroup)!.cloudSystems)!;

            const deleteSystemSpy = jest.spyOn(systemsService, 'deleteSystem');

            groupsStore.deleteSystem(systemToDelete.systemId);
            const cloudSystems =
                groupsStore.systemsEntityMap()[
                    systemToDelete.groupId || systemToDelete.organization
                ].cloudSystems;
            expect(cloudSystems).not.toContainEqual(systemToDelete);
            expect(deleteSystemSpy).toHaveBeenCalledWith(systemToDelete.systemId);
        });
    });

    describe('initializeGroups', () => {
        it('should update groupsEntities on organization change', async () => {
            const { groupsStore, cpService, detectChanges } = await setupGroupsStore();

            const orgGroups = Array(random(10, 30, false))
                .fill(undefined)
                .map(() => generateGroupsAndSystems())
                .map(({ groups }) => groups);

            for (const groups of orgGroups) {
                const organizationId = sample(groups)!.id;

                cpService.getGroupsStructure.mockReturnValueOnce(
                    of(groups as GroupStructureItem[]),
                );

                cpService.paramStateHandler.state$$.set({ params: { organizationId } });

                detectChanges();

                expect(groupsStore.groupsEntities()).toEqual(groups);
            }
        });

        it('should not update groups structure on group change', async () => {
            const { cpService, detectChanges } = await setupGroupsStore();

            const [org1, org2, ...groupIds] = generateIds(10, 30);

            for (const organizationId of [org1, org2]) {
                for (const groupId of groupIds) {
                    cpService.paramStateHandler.state$$.set({
                        params: { organizationId, groupId },
                    });

                    detectChanges();
                }
            }

            expect(cpService.getGroupsStructure).toHaveBeenCalledTimes(2);
        });
    });

    describe('initializeSystems', () => {
        it('should update group systems on group change', async () => {
            const { groupsStore, cpService, detectChanges } = await setupGroupsStore();
            const { systemsByOrgOrGroup, organizationId } = generateGroupsAndSystems();
            const systemsByGroup = sample(
                systemsByOrgOrGroup.filter(({ id }) => id !== organizationId),
            )!;
            const groupId = systemsByGroup.id;

            cpService.getGroup.mockReturnValueOnce(
                of(
                    generateGroup({
                        id: systemsByGroup.id,
                        organizationId,
                        cloudSystems: systemsByGroup.cloudSystems,
                        systems: systemsByGroup.systems,
                    }),
                ),
            );

            cpService.paramStateHandler.state$$.set({ params: { organizationId, groupId } });

            detectChanges();

            expect(groupsStore.systemsEntityMap()[groupId]).toEqual(systemsByGroup);
        });

        it('should update org root systems on group change', async () => {
            const { groupsStore, cpService, detectChanges } = await setupGroupsStore();
            const { systemsByOrgOrGroup, organizationId } = generateGroupsAndSystems();
            const systemsByOrg = systemsByOrgOrGroup.find(({ id }) => id === organizationId)!;
            cpService.getUserSystems.mockReturnValueOnce(
                of(systemsByOrg.cloudSystems) as WithPageUpdater<Observable<CloudSystemLight[]>>,
            );

            cpService.paramStateHandler.state$$.set({ params: { organizationId } });

            detectChanges();

            expect(groupsStore.systemsEntityMap()[organizationId]).toEqual(systemsByOrg);
        });
    });
});
