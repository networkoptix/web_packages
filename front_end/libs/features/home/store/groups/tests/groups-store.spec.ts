import { setupGroupsStore } from './groups-test-helpers';

describe('GroupsStore', () => {
    it('should initialize', async () => {
        const { groupsStore, cpService, systemsService, detectChanges } = await setupGroupsStore();
        const currentGroupId = groupsStore.currentGroupId();
        expect(currentGroupId).toBeFalsy();
        expect(groupsStore).toBeTruthy();
        expect(cpService).toBeTruthy();
        expect(systemsService).toBeTruthy();
        expect(detectChanges).toBeTruthy();
    });
});
