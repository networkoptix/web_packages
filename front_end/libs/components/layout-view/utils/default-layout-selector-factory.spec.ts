import { v4 as uuid } from 'uuid';

import {
    NxSystemCameraWithMappedFields,
    ResourceLeafNodeMap,
    ResourceNode,
    ResourceParentNodeMap,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import type { LayoutStateService } from '@services/layout-state/layout-state.service';
import { Layout, LayoutItem } from '@services/system-api.types/layouts.types';

import { createNewLayoutFactory } from './create-new-layout-factory';
import { defaultLayoutSelectorFactory } from './default-layout-selector-factory';
import { generateLayoutItems } from './mocks/layout-item-mocks';

type ParamState = LayoutStateService['paramStateHandler']['state$$'];

const createLayout = (layoutId: string, items: LayoutItem[] = []): Layout => {
    const layout = createNewLayoutFactory(() => uuid())(uuid());
    layout.id = layoutId;
    layout.items = items;
    return layout;
};

describe('defaultLayoutSelectorFactory', () => {
    const setParamState = jest.fn();
    const paramState$$ = {
        set: setParamState as ParamState['set'],
    } as ParamState;

    const generateTree = ({
        layouts,
        cameras,
    }: {
        layouts?: ResourceParentNodeMap[ResourceType.LAYOUTS][];
        cameras?: ResourceLeafNodeMap[ResourceType.CAMERA][];
    } = {}): ResourceNode[] => [
        {
            type: ResourceType.LAYOUTS,
            name: 'Layouts',
            children: layouts || [],
        },
        {
            type: ResourceType.CAMERAS,
            name: 'Cameras',
            children: cameras || [],
        },
    ];

    const defaultLayoutSelector = defaultLayoutSelectorFactory(paramState$$);

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should return empty string when no layouts or cameras', () => {
        expect(defaultLayoutSelector(generateTree())).toEqual('');
    });

    it('should return layout id when layout exists with items', () => {
        const expectedLayoutId = uuid();
        const tree = generateTree({
            layouts: [
                {
                    type: ResourceType.LAYOUT,
                    name: 'Layout',
                    details: createLayout(expectedLayoutId, [...generateLayoutItems(2)]),
                    children: [],
                },
            ],
            cameras: [
                {
                    type: ResourceType.CAMERA,
                    name: 'Camera',
                    aspectRatio: 1,
                    details: {
                        id: uuid(),
                    } as unknown as NxSystemCameraWithMappedFields,
                },
            ],
        });
        expect(defaultLayoutSelector(tree)).toEqual(expectedLayoutId);
        expect(setParamState).toHaveBeenCalledWith({ params: { layoutId: expectedLayoutId } });
    });

    it('should return empty string if no layouts have items and no cameras', () => {
        const expectedLayoutId = uuid();
        const tree = generateTree({
            layouts: [
                {
                    type: ResourceType.LAYOUT,
                    name: 'Layout',
                    details: createLayout(expectedLayoutId),
                    children: [],
                },
            ],
        });
        expect(defaultLayoutSelector(tree)).toEqual('');
        expect(setParamState).not.toHaveBeenCalled();
    });

    it('should return camera id when no layouts have items', () => {
        const expectedCameraId = uuid();
        const tree = generateTree({
            layouts: [
                {
                    type: ResourceType.LAYOUT,
                    name: 'Layout',
                    details: createLayout(uuid()),
                    children: [],
                },
            ],
            cameras: [
                {
                    type: ResourceType.CAMERA,
                    name: 'Camera',
                    aspectRatio: 1,
                    details: {
                        id: expectedCameraId,
                    } as unknown as NxSystemCameraWithMappedFields,
                },
            ],
        });

        expect(defaultLayoutSelector(tree)).toEqual(expectedCameraId);
        expect(setParamState).toHaveBeenCalledWith({ params: { layoutId: expectedCameraId } });
    });
});
