import { ResourceType } from '@components/layout-grid/layout-grid.types';
import { nxConfig } from '@services/nx-config/config';

import { generateCamerasForTree } from './generate-cameras-for-tree';
import { parseCameraGroup } from './parse-camera-group';

jest.mock('./parse-camera-group', () => ({
    parseCameraGroup: jest.fn((camerasAndGroups, customGroupId, camera) => camera),
}));

describe('generateCamerasForTree', () => {
    let type = ResourceType.CAMERA;
    const parsedCameras = {
        '1': {
            id: '1',
            get type() {
                return type;
            },
            name: 'Camera 1',
            details: {
                id: '1',
                name: 'Camera 1',
                aspectRatio: 0,
                parameters: {},
            },
        },
        '2': {
            id: '2',
            get type() {
                return type;
            },
            name: 'Camera 2',
            details: {
                id: '2',
                name: 'Camera 2',
                aspectRatio: 0,
                parameters: {},
            },
        },
    } as unknown as Parameters<typeof generateCamerasForTree>[0];

    const expected = Object.values(parsedCameras);

    it('should return cameras for tree', () => {
        type = ResourceType.CAMERA;
        const result = generateCamerasForTree(parsedCameras);

        expect(result).toEqual(expected);
        expect(result.length).toBe(2);
    });

    it('should group cameras if layoutsCameraGroups flag is on', () => {
        nxConfig.featureFlags.layoutsCameraGroups = true;

        const result = generateCamerasForTree(parsedCameras);

        expect(result).toEqual(expected);
        expect(parseCameraGroup).toHaveBeenCalledTimes(2);
    });

    it('should filter out io devices if layoutsIoDevices flag is off', () => {
        nxConfig.featureFlags.layoutsIoDevices = false;
        type = ResourceType.IO_DEVICE;

        const result = generateCamerasForTree(parsedCameras);

        expect(result).toEqual([]);
        expect(result.length).toBe(0);
    });

    it('should include io devices if layoutsIoDevices flag is on', () => {
        nxConfig.featureFlags.layoutsIoDevices = true;
        type = ResourceType.IO_DEVICE;

        const result = generateCamerasForTree(parsedCameras);

        expect(result).toEqual(expected);
        expect(result.length).toBe(2);
    });
});
