import { ResourceType } from '@components/layout-grid/layout-grid.types';

export const getCameraGroupMocks = () =>
    ({
        mockResource: {
            aspectRatio: 1,
            type: ResourceType.CAMERA,
            name: 'camera',
            details: { id: 'camera' },
        },
        mockResourceExtra: {
            aspectRatio: 1,
            type: ResourceType.CAMERA,
            name: 'camera2',
            details: { id: 'camera2' },
        },
        mockLookUp: {
            mockLookup: {
                name: 'mockLookup',
                type: ResourceType.CAMERAS,
                id: 'mockLookup',
            },
        },
    }) as const;
