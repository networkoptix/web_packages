import { setupGroupsStore, uuid } from './groups-test-helpers';

describe('Groups Store: Ribbon Behavior', () => {
    it('should show ribbon when calling showRibbon', async () => {
        const { groupsStore } = await setupGroupsStore();
        const message = uuid();
        groupsStore.showRibbon(message);
        const currentContext = groupsStore.currentRibbonContext$$();
        expect(currentContext?.visibility).toBe(true);
        expect(currentContext?.message).toBe(message);
    });

    it('should hide ribbon when calling hideRibbon', async () => {
        const { groupsStore } = await setupGroupsStore();
        const message = uuid();
        groupsStore.showRibbon(message);

        expect(groupsStore.currentRibbonContext$$()?.visibility).toBe(true);

        groupsStore.hideRibbon();

        const currentContext = groupsStore.currentRibbonContext$$();
        expect(currentContext).toBeFalsy();
    });

    it('should automatically hide if showForSeconds is configured', async () => {
        const { groupsStore } = await setupGroupsStore();
        const message = uuid();
        const showFor = 0.02;
        const shouldBeShownAt = 0.01;
        const shouldNotBeShownAt = 0.03;

        groupsStore.showRibbon(message, showFor);

        await new Promise(resolve => setTimeout(resolve, shouldBeShownAt * 1000));
        expect(groupsStore.currentRibbonContext$$()?.visibility).toBe(true);

        await new Promise(resolve => setTimeout(resolve, shouldNotBeShownAt * 1000));
        expect(groupsStore.currentRibbonContext$$()).toBeFalsy();
    });
});
