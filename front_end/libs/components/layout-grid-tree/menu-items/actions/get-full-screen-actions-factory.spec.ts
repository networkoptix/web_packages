import { v4 as uuid } from 'uuid';

import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';

import { availableActions, performItemAction } from './action-test-helpers';
import { getFullScreenActionsFactory } from './get-full-screen-actions-factory';

describe('getFullScreenActionsFactory', () => {
    const toggleLayoutFullScreen = jest.fn();
    const currentLayoutId = uuid();
    const otherLayoutId = uuid();
    const getCurrentLayoutId = jest.fn(() => currentLayoutId);
    const currentLayoutNode: ResourceNodeMap[ResourceType.LAYOUT] = {
        details: {
            id: currentLayoutId,
        },
    } as ResourceNodeMap[ResourceType.LAYOUT];
    const otherLayoutNode: ResourceNodeMap[ResourceType.LAYOUT] = {
        details: {
            id: otherLayoutId,
        },
    } as ResourceNodeMap[ResourceType.LAYOUT];
    const getFullScreenActions = getFullScreenActionsFactory(
        toggleLayoutFullScreen,
        getCurrentLayoutId,
    );

    it('should return an empty array if the layout is not the current layout', () => {
        const result = getFullScreenActions(otherLayoutNode);

        expect(result).toEqual([]);
    });

    it('should return an array with a divider and a toggleFullScreen item if the layout is the current layout', () => {
        const result = getFullScreenActions(currentLayoutNode);

        expect(result).toStrictEqual(availableActions(['divider', 'toggleFullScreen']));
    });

    it('should call toggleLayoutFullScreen when the toggleFullScreen item is clicked', () => {
        const result = getFullScreenActions(currentLayoutNode);

        performItemAction(result)('toggleFullScreen', currentLayoutNode);

        expect(toggleLayoutFullScreen).toHaveBeenCalled();
    });
});
