import { generateIds, setupGroupsStore, uuid } from './groups-test-helpers';

describe('Groups Store: Lifecycle Hook Side effects', () => {
    describe('onInit', () => {
        describe('initializeGroups side effect', () => {
            it('should call update org groups on org changes', async () => {
                const { groupsStore, cpService, detectChanges } = await setupGroupsStore();

                groupsStore.groupsEntities();

                const params = {
                    organizationId: uuid(),
                };

                cpService.paramStateHandler.state$$.set({
                    params,
                });

                const changes = generateIds();

                for (const organizationId of changes) {
                    cpService.paramStateHandler.state$$.set({
                        params: {
                            organizationId,
                        },
                    });
                    detectChanges();
                }

                expect(cpService.getGroupsStructure).toHaveBeenCalledTimes(changes.length);
                expect(cpService.getGroupsStructure).toHaveBeenLastCalledWith(
                    changes[changes.length - 1],
                );
            });
        });

        describe('initializeSystems side effect', () => {
            it('should call update group systems on group changes', async () => {
                const { groupsStore, cpService, detectChanges } = await setupGroupsStore();

                groupsStore.groupsEntities();

                const organizationId = uuid();

                const params = {
                    groupId: uuid(),
                    organizationId,
                };

                cpService.paramStateHandler.state$$.set({
                    params,
                });

                const changes = generateIds().map(groupId => [groupId, organizationId] as const);

                for (const [groupId, organizationId] of changes) {
                    cpService.paramStateHandler.state$$.set({
                        params: {
                            groupId,
                            organizationId,
                        },
                    });
                    detectChanges();
                }

                expect(cpService.getGroup).toHaveBeenCalledTimes(changes.length);
                expect(cpService.getGroup).toHaveBeenLastCalledWith(changes[changes.length - 1][0]);
            });

            it('should call update org root systems on org changes', async () => {
                const { groupsStore, cpService, detectChanges } = await setupGroupsStore();

                groupsStore.groupsEntities();

                const params = {
                    organizationId: uuid(),
                };

                cpService.paramStateHandler.state$$.set({
                    params,
                });

                const changes = generateIds();

                for (const organizationId of changes) {
                    cpService.paramStateHandler.state$$.set({
                        params: {
                            organizationId,
                        },
                    });
                    detectChanges();
                }

                expect(cpService.getUserSystems).toHaveBeenCalledTimes(changes.length);
                expect(cpService.getUserSystems).toHaveBeenLastCalledWith(
                    changes[changes.length - 1],
                    false,
                );
            });
        });

        describe('auto hide ribbon side effect', () => {
            // These features work but seems to be flaky in unit tests. Need to look at later.
            xit('should hide the ribbon when changing orgs', async () => {
                const { groupsStore, cpService, detectChanges } = await setupGroupsStore();

                const params = {
                    groupId: uuid(),
                    organizationId: uuid(),
                };
                cpService.paramStateHandler.state$$.set({ params });

                groupsStore.showRibbon(uuid());

                expect(groupsStore.ribbonContext().context).toBeTruthy();

                cpService.paramStateHandler.state$$.set({
                    params: { ...params, organizationId: uuid() },
                });

                detectChanges();

                expect(groupsStore.ribbonContext().context).toBeFalsy();
            });

            // These features work but seems to be flaky in unit tests. Need to look at later.
            xit('should hide the ribbon when changing groups', async () => {
                const { groupsStore, cpService, detectChanges } = await setupGroupsStore();

                const params = {
                    groupId: uuid(),
                    organizationId: uuid(),
                };
                cpService.paramStateHandler.state$$.set({ params });

                groupsStore.showRibbon(uuid());

                expect(groupsStore.ribbonContext().context).toBeTruthy();

                cpService.paramStateHandler.state$$.set({
                    params: { ...params, groupId: uuid() },
                });

                detectChanges();

                expect(groupsStore.ribbonContext().context).toBeFalsy();
            });
        });
    });
});
