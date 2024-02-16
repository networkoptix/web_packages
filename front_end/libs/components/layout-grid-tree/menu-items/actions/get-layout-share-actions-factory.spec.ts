import { v4 as uuid } from 'uuid';

import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import { nxConfig } from '@services/nx-config/config';

import { availableActions, performItemAction } from './action-test-helpers';
import { getLayoutShareActionsFactory } from './get-layout-share-actions-factory';

const shareLayout = jest.fn();
const unshareLayout = jest.fn();

const getLayoutShareActions = getLayoutShareActionsFactory(shareLayout, unshareLayout);

describe('getLayoutShareActionsFactory', () => {
    let node: ResourceNodeMap[ResourceType.LAYOUT];

    beforeEach(() => {
        nxConfig.featureFlags.layoutsShare = true;
        node = {
            details: {
                id: uuid(),
            },
            owned: true,
            locked: false,
            crossSystem: false,
        } as ResourceNodeMap[ResourceType.LAYOUT];
        jest.resetAllMocks();
    });

    it('should return an empty array if layoutsShare flag is off', () => {
        nxConfig.featureFlags.layoutsShare = false;
        const result = getLayoutShareActions(node);

        expect(result).toEqual([]);
    });

    it('should include a divider', () => {
        nxConfig.featureFlags.layoutsShare = true;

        const result = getLayoutShareActions(node);

        expect(result[0].id).toBe('divider');
    });

    it('should return an empty array if layout is not owned', () => {
        nxConfig.featureFlags.layoutsShare = true;
        node.owned = false;

        const result = getLayoutShareActions(node);

        expect(result).toEqual([]);
    });

    it('should return an empty array if layout is locked', () => {
        nxConfig.featureFlags.layoutsShare = true;
        node.locked = true;

        const result = getLayoutShareActions(node);

        expect(result).toEqual([]);
    });

    it('should return an empty array if layout is crossSystem', () => {
        nxConfig.featureFlags.layoutsShare = true;
        node.crossSystem = true;

        const result = getLayoutShareActions(node);

        expect(result).toEqual([]);
    });

    it('should show unshareLayout action if layout is owned and shared', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.shared = true;

        const result = getLayoutShareActions(node);

        expect(result).toEqual(availableActions(['divider', 'unshareLayout']));
    });

    it('should show shareLayout action if layout is owned and not shared', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.shared = false;

        const result = getLayoutShareActions(node);

        expect(result).toEqual(availableActions(['divider', 'shareLayout']));
    });

    it('should call shareLayout when the shareLayout item is clicked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.shared = false;

        const result = getLayoutShareActions(node);

        performItemAction(result)('shareLayout', node);

        expect(shareLayout).toHaveBeenCalledWith(node.details);
    });

    it('should call unshareLayout when the unshareLayout item is clicked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        node.owned = true;
        node.shared = true;

        const result = getLayoutShareActions(node);

        performItemAction(result)('unshareLayout', node);

        expect(unshareLayout).toHaveBeenCalledWith(node.details);
    });
});
