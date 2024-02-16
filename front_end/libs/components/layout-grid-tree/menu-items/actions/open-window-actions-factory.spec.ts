import { v4 as uuid } from 'uuid';

import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';

import { availableActions, performItemAction } from './action-test-helpers';
import { openWindowActionsFactory } from './open-window-actions-factory';

const openWindow = jest.fn();

const nodeId = uuid();

const node = {
    details: {
        id: nodeId,
    },
    owned: true,
    locked: false,
    crossSystem: false,
} as ResourceNodeMap[ResourceType.LAYOUT];

describe('openWindowActionsFactory', () => {
    it('should return openNewTab and openNewWindow actions', () => {
        const actions = openWindowActionsFactory(openWindow);

        expect(actions).toStrictEqual(availableActions(['openNewTab', 'openNewWindow']));
    });

    it('should call openWindow with nodeId and false on openNewTab action', () => {
        const actions = openWindowActionsFactory(openWindow);

        performItemAction(actions)('openNewTab', node);

        expect(openWindow).toHaveBeenCalledWith(nodeId, false);
    });

    it('should call openWindow with nodeId and true on openNewWindow action', () => {
        const actions = openWindowActionsFactory(openWindow);

        performItemAction(actions)('openNewWindow', node);

        expect(openWindow).toHaveBeenCalledWith(nodeId, true);
    });
});
