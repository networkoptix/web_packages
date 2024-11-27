import { v4 as uuid } from 'uuid';

import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import { nxConfig } from '@services/nx-config/config';

import { availableActions, performItemAction } from './action-test-helpers';
import { getLayoutLockActionsFactory } from './get-layout-lock-actions-factory';

const lockLayout = jest.fn();
const unlockLayout = jest.fn();
const currentUser = jest.fn();

const getLayoutEditActions = getLayoutLockActionsFactory(lockLayout, unlockLayout, currentUser);

describe('getLayoutLockActionsFactory', () => {
    let node: ResourceNodeMap[ResourceType.LAYOUT];

    beforeEach(() => {
        nxConfig.featureFlags.layoutsEditable = false;
        node = {
            details: {
                id: uuid(),
            },
            shared: false,
            locked: false,
            owned: true,
        } as ResourceNodeMap[ResourceType.LAYOUT];
        jest.resetAllMocks();
    });

    it('should return an empty array if layouts are not editable', () => {
        const result = getLayoutEditActions(node);

        expect(result).toEqual([]);
    });

    it('should return an empty array if user: "any" layout: "shared"', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.shared = true;

        const result = getLayoutEditActions(node);

        expect(result).toEqual([]);
    });

    it('should return an empty array if user: "owner" layout: "shared"', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.shared = true;
        node.owned = true;

        const result = getLayoutEditActions(node);

        expect(result).toEqual([]);
    });

    it('should return actions if user: "admin" layout: "shared"', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        currentUser.mockReturnValue({ isAdmin: true });
        node.shared = true;

        const result = getLayoutEditActions(node);

        expect(result[0].id).toBe('divider');
        expect(result[1].id).toBe('lockLayout');
    });

    it('should return actions if user: "owner" layout: "!shared"', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.shared = false;
        node.owned = true;

        const result = getLayoutEditActions(node);

        expect(result).toEqual(availableActions(['divider', 'lockLayout']));
    });

    it('should return action: "unlockLayout" if user: "admin" layout: "locked"', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        currentUser.mockReturnValue({ isAdmin: true });
        node.locked = true;

        const result = getLayoutEditActions(node);

        expect(result).toEqual(availableActions(['divider', 'unlockLayout']));
    });

    it('should show action: "lockLayout" if user: "admin" layout: "!locked"', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        currentUser.mockReturnValue({ isAdmin: true });
        node.locked = false;

        const result = getLayoutEditActions(node);

        expect(result).toEqual(availableActions(['divider', 'lockLayout']));
    });

    it('should call lockLayout when the lockLayout item is clicked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        currentUser.mockReturnValue({ isAdmin: true });
        node.locked = false;

        const result = getLayoutEditActions(node);

        performItemAction(result)('lockLayout', node);

        expect(lockLayout).toHaveBeenCalledWith(node.details);
    });

    it('should call unlockLayout when the unlockLayout item is clicked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        currentUser.mockReturnValue({ isAdmin: true });
        node.locked = true;

        const result = getLayoutEditActions(node);

        performItemAction(result)('unlockLayout', node);

        expect(unlockLayout).toHaveBeenCalledWith(node.details);
    });
});
