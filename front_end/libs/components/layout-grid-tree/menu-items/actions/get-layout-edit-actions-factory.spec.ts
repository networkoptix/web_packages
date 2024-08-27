import { v4 as uuid } from 'uuid';

import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import { nxConfig } from '@services/nx-config/config';

import { availableActions, performItemAction } from './action-test-helpers';
import { getLayoutEditActionsFactory } from './get-layout-edit-actions-factory';

const deleteLayout = jest.fn();
const duplicateLayout = jest.fn();
const setEditedLayout = jest.fn();

const getLayoutEditActions = getLayoutEditActionsFactory(
    deleteLayout,
    duplicateLayout,
    setEditedLayout,
);

describe('getLayoutEditActionsFactory', () => {
    let node: ResourceNodeMap[ResourceType.LAYOUT];

    const getAllActions = (): ReturnType<typeof getLayoutEditActions> => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = false;

        return getLayoutEditActions(node);
    };

    beforeEach(() => {
        nxConfig.featureFlags.layoutsEditable = false;
        node = {
            details: {
                id: uuid(),
            },
            owned: true,
            locked: false,
        } as ResourceNodeMap[ResourceType.LAYOUT];
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

    it('should only include duplicate item action if not owned', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = false;

        const result = getLayoutEditActions(node);

        expect(result).toEqual(availableActions(['divider', 'duplicate']));
    });

    it('should only include duplicate item action if owned but layout is locked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = true;

        const result = getLayoutEditActions(node);

        expect(result).toEqual(availableActions(['divider', 'duplicate']));
    });

    it('should include all actions if owned and not locked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = false;

        const result = getLayoutEditActions(node);

        expect(result).toEqual(availableActions(['divider', 'startRename', 'duplicate', 'delete']));
    });

    it('should call deleteLayout when the delete item is clicked', () => {
        const result = getAllActions();

        performItemAction(result)('delete', node);

        expect(deleteLayout).toHaveBeenCalledWith(node.details);
    });

    it('should call setEditedLayout when the rename item is clicked', () => {
        const result = getAllActions();

        performItemAction(result)('startRename', node);

        expect(setEditedLayout).toHaveBeenCalledWith(node.details);
    });

    it('should call duplicateLayout when the duplicate item is clicked', () => {
        const result = getAllActions();

        performItemAction(result)('duplicate', node);

        expect(duplicateLayout).toHaveBeenCalledWith(node.details);
    });
});
