import { sample } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import { MenuItem } from '@components/context-menu/context-menu.types';
import { ResourceNodeMap, ResourceType } from '@components/layout-grid/layout-grid.types';
import { Resolution } from '@services/layout-state/store/layouts-resolution/resolution.types';

import { availableActions, performItemAction } from './action-test-helpers';
import { getLayoutResolutionActionsFactory } from './get-layout-resolution-actions-factory';

let currentResolution = Resolution.AUTO;

const getResolution = jest.fn();
const setLayoutResolution = jest.fn();

const getLayoutResolutionActions = getLayoutResolutionActionsFactory(
    getResolution,
    setLayoutResolution,
);

describe('getLayoutResolutionActionsFactory', () => {
    const node = {
        details: {
            id: uuid(),
        },
        owned: true,
        locked: false,
    } as ResourceNodeMap[ResourceType.LAYOUT];

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const getSubMenu = async () => {
        const result = getLayoutResolutionActions(node);
        const resolutionNode = result.find(item => item.id === 'resolution');
        let subMenu: MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[];
        if ('subMenu' in resolutionNode) {
            subMenu =
                typeof resolutionNode.subMenu === 'function'
                    ? await resolutionNode.subMenu(node)
                    : resolutionNode.subMenu;
        }
        return subMenu;
    };

    beforeEach(() => {
        currentResolution = Resolution.AUTO;
        jest.resetAllMocks();
    });

    it('should include a divider', () => {
        const result = getLayoutResolutionActions(node);

        expect(result[0].id).toBe('divider');
    });

    it('should resolution subMenu with default resolutions', async () => {
        const subMenu = await getSubMenu();

        expect(subMenu).toBeDefined();
        expect(subMenu).toEqual(
            availableActions([Resolution.AUTO, Resolution.LOW, Resolution.HIGH], {
                checked$$: expect.any(Function),
            }),
        );
    });

    it('should use getResolution with layout id to get current resolution', async () => {
        currentResolution = sample([Resolution.AUTO, Resolution.LOW, Resolution.HIGH]);
        getResolution.mockReturnValue(Promise.resolve(currentResolution));
        const subMenu = await getSubMenu();

        const checked = subMenu.filter(item => item.checked$$());

        expect(getResolution).toHaveBeenCalledWith(node.details.id);
        expect(checked).toHaveLength(1);
        expect(checked[0].id).toBe(currentResolution);
        expect(subMenu.find(item => item.id === Resolution.CUSTOM)).not.toBeDefined();
    });

    it('should show custom resolution if current resolution is not in default resolutions', async () => {
        currentResolution = Resolution.CUSTOM;
        getResolution.mockReturnValue(Promise.resolve(currentResolution));
        const subMenu = await getSubMenu();

        const checked = subMenu.filter(item => item.checked$$());

        expect(checked).toHaveLength(1);
        expect(checked[0].id).toBe(Resolution.CUSTOM);
    });

    it('should call setLayoutResolution when resolution item is clicked', async () => {
        currentResolution = Resolution.CUSTOM;
        const targetResolution = sample([Resolution.AUTO, Resolution.LOW, Resolution.HIGH]);
        const subMenu = await getSubMenu();

        performItemAction(subMenu)(targetResolution, node);

        expect(setLayoutResolution).toHaveBeenCalledWith({
            layoutId: node.details.id,
            resolution: targetResolution,
        });
    });
});
