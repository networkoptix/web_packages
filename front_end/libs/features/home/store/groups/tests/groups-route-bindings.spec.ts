import { setupGroupsStore, generateIds, uuid, sample } from './groups-test-helpers';

describe('Groups Store: Route Bindings', () => {
    describe('param state bindings', () => {
        it('should use organizationId as current group if no groupId param', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const organizationId = uuid();
            cpService.paramStateHandler.state$$.set({ params: { organizationId } });

            const currentGroup = groupsStore.currentGroupId$$();
            expect(currentGroup.id).toBe(organizationId);
            expect(currentGroup.isRoot).toBe(true);
        });

        it('should groupId as current group if param exists in route', async () => {
            const { groupsStore, cpService } = await setupGroupsStore();
            const organizationId = uuid();
            const groupId = uuid();
            cpService.paramStateHandler.state$$.set({ params: { organizationId, groupId } });

            const currentGroup = groupsStore.currentGroupId$$();
            expect(currentGroup.id).toBe(groupId);
            expect(currentGroup.isRoot).toBe(false);
        });
    });

    describe('initialization on route changes', () => {
        it('should initialize groups when organizationId changes', async () => {
            const { groupsStore, cpService, detectChanges } = await setupGroupsStore();
            const organizationIds = generateIds();

            for (const organizationId of organizationIds) {
                cpService.paramStateHandler.state$$.set({ params: { organizationId } });
                detectChanges();
                const currentGroup = groupsStore.currentGroupId$$();
                expect(currentGroup.id).toBe(organizationId);
                expect(currentGroup.isRoot).toBe(true);
                expect(cpService.getGroupsStructure).toHaveBeenLastCalledWith(organizationId);
            }

            expect(cpService.getGroupsStructure).toHaveBeenCalledTimes(organizationIds.length);
        });

        it('should initialize systems when organizationId or groupId changes', async () => {
            const { groupsStore, cpService, detectChanges } = await setupGroupsStore();
            const organizationIds = generateIds(10, 20);
            const testParams = organizationIds.map(organizationId =>
                sample([{ organizationId }, { organizationId, groupId: uuid() }]),
            );

            for (const params of testParams) {
                cpService.paramStateHandler.state$$.set({ params });
                detectChanges();
                const isRoot = !!params && !('groupId' in params);
                const currentGroup = groupsStore.currentGroupId$$();
                expect(currentGroup).toEqual({
                    id: params!.groupId || params!.organizationId,
                    isRoot,
                });
                expect(
                    isRoot ? cpService.getUserSystems : cpService.getGroup,
                ).toHaveBeenLastCalledWith(
                    ...(isRoot ? [params.organizationId, false] : [params!.groupId]),
                );
            }

            expect(cpService.getUserSystems).toHaveBeenCalledTimes(
                testParams.filter(p => !('groupId' in p!)).length,
            );
            expect(cpService.getGroup).toHaveBeenCalledTimes(
                testParams.filter(p => 'groupId' in p!).length,
            );
        });
    });
});
