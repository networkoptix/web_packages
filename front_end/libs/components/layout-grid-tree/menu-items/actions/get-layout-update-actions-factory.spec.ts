import { v4 as uuid } from 'uuid';

import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import { nxConfig } from '@services/nx-config/config';

import { availableActions, performItemAction } from './action-test-helpers';
import { getLayoutUpdateActionsFactory } from './get-layout-update-actions-factory';

const discardLayout = jest.fn();
const saveLayout = jest.fn();
const getDisabledSignal = jest.fn();

const getLayoutUpdateActions = getLayoutUpdateActionsFactory(
    discardLayout,
    saveLayout,
    getDisabledSignal,
);

describe('getLayoutUpdateActionsFactory', () => {
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
        const result = getLayoutUpdateActions(node);

        expect(result).toEqual([]);
    });

    it('should include a divider', () => {
        nxConfig.featureFlags.layoutsEditable = true;

        const result = getLayoutUpdateActions(node);

        expect(result[0].id).toBe('divider');
    });

    it('should return an empty array if layout is not owned', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = false;

        const result = getLayoutUpdateActions(node);

        expect(result).toEqual([]);
    });

    it('should return an empty array if layout is locked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.locked = true;

        const result = getLayoutUpdateActions(node);

        expect(result).toEqual([]);
    });

    it('should show actions if owned and unlocked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = false;

        const result = getLayoutUpdateActions(node);

        expect(result).toEqual(availableActions(['divider', 'save', 'discard']));
    });

    it('should call discardLayout when the discard item is clicked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = false;

        const result = getLayoutUpdateActions(node);

        performItemAction(result)('discard', node);

        expect(discardLayout).toHaveBeenCalledWith(node.details.id);
    });

    it('should call saveLayout when the save item is clicked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = false;

        const result = getLayoutUpdateActions(node);

        performItemAction(result)('save', node);

        expect(saveLayout).toHaveBeenCalledWith(node.details.id);
    });

    it('should call getDisabledSignal with the layout id', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = false;

        getLayoutUpdateActions(node);

        expect(getDisabledSignal).toHaveBeenCalledWith(node.details.id);
    });

    it('should pass the disabled signal to the actions', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.locked = false;
        const disabledSignal = uuid();
        getDisabledSignal.mockReturnValue(disabledSignal);

        const result = getLayoutUpdateActions(node);

        expect(result).toStrictEqual(
            availableActions(['divider', 'save', 'discard'], {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                disabled$$: disabledSignal as any,
            }),
        );
    });
});
