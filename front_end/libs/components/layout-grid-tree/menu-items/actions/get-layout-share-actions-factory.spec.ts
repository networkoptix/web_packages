import { v4 as uuid } from 'uuid';

import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import { nxConfig } from '@services/nx-config/config';

import { availableActions, performItemAction } from './action-test-helpers';
import { getLayoutShareActionsFactory } from './get-layout-share-actions-factory';

const shareLayout = jest.fn();
const currentUser = jest.fn();

const getLayoutShareActions = getLayoutShareActionsFactory(shareLayout, currentUser);

describe('getLayoutShareActionsFactory', () => {
    let node: ResourceNodeMap[ResourceType.LAYOUT];

    beforeEach(() => {
        nxConfig.featureFlags.layoutsShare = true;
        nxConfig.featureFlags.layoutsEditable = true;
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
        currentUser.mockReturnValue({ isAdmin: true });

        const result = getLayoutShareActions(node);

        expect(result[0].id).toBe('divider');
    });

    it('should return an empty array if layout is not owned', () => {
        nxConfig.featureFlags.layoutsShare = true;
        currentUser.mockReturnValue({ isAdmin: false });

        const result = getLayoutShareActions(node);

        expect(result).toEqual([]);
    });

    it('should return an empty array if layout is locked', () => {
        nxConfig.featureFlags.layoutsShare = true;
        currentUser.mockReturnValue({ isAdmin: true });
        node.locked = true;

        const result = getLayoutShareActions(node);

        expect(result).toEqual([]);
    });

    it('should return an empty array if layout is crossSystem', () => {
        nxConfig.featureFlags.layoutsShare = true;
        currentUser.mockReturnValue({ isAdmin: true });
        node.crossSystem = true;

        const result = getLayoutShareActions(node);

        expect(result).toEqual([]);
    });

    it('should show shareLayout action if layout is owned and not shared', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        currentUser.mockReturnValue({ isAdmin: true });
        node.shared = false;

        const result = getLayoutShareActions(node);

        expect(result).toEqual(availableActions(['divider', 'shareLayout']));
    });

    it('should call shareLayout when the shareLayout item is clicked', () => {
        nxConfig.featureFlags.layoutsEditable = true;
        currentUser.mockReturnValue({ isAdmin: true });
        node.shared = false;

        const result = getLayoutShareActions(node);

        performItemAction(result)('shareLayout', node);

        expect(shareLayout).toHaveBeenCalledWith(node.details);
    });
});
