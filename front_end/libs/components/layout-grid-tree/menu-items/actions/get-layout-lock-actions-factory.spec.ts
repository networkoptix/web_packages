import { v4 as uuid } from 'uuid';

import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import { nxConfig } from '@services/nx-config/config';

import { availableActions, performItemAction } from './action-test-helpers';
import { getLayoutLockActionsFactory } from './get-layout-lock-actions-factory';

const lockLayout = jest.fn();
const unlockLayout = jest.fn();

const getLayoutEditActions = getLayoutLockActionsFactory(lockLayout, unlockLayout);

describe('getLayoutLockActionsFactory', () => {
    let node: ResourceNodeMap[ResourceType.LAYOUT];

    beforeEach(() => {
        nxConfig.featureFlags.layoutsEditable = false;
        node = {
            details: {
                id: uuid(),
            },
            owned: true,
            locked: false,
        } as ResourceNodeMap[ResourceType.LAYOUT];
        jest.resetAllMocks();
    });

    it('should return an empty array if layouts are not editable', () => {
        const result = getLayoutEditActions(node);

        expect(result).toEqual([]);
    });

    it('should include a divider', () => {
        nxConfig.featureFlags.layoutsEditable = true;

        const result = getLayoutEditActions(node);

        expect(result[0].id).toBe('divider');
    });

    it('should return an empty array if layout is not owned', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = false;

        const result = getLayoutEditActions(node);

        expect(result).toEqual([]);
    });

    it('should show unlockLayout action if layout is owned and locked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = true;

        const result = getLayoutEditActions(node);

        expect(result).toEqual(availableActions(['divider', 'unlockLayout']));
    });

    it('should show lockLayout action if layout is owned and unlocked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = false;

        const result = getLayoutEditActions(node);

        expect(result).toEqual(availableActions(['divider', 'lockLayout']));
    });

    it('should call lockLayout when the lockLayout item is clicked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = false;

        const result = getLayoutEditActions(node);

        performItemAction(result)('lockLayout', node);

        expect(lockLayout).toHaveBeenCalledWith(node.details);
    });

    it('should call unlockLayout when the unlockLayout item is clicked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = true;

        const result = getLayoutEditActions(node);

        performItemAction(result)('unlockLayout', node);

        expect(unlockLayout).toHaveBeenCalledWith(node.details);
    });
});
