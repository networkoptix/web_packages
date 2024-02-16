import { shuffle } from 'lodash-es';

import { ResourceLeafNode } from '@components/layout-grid/layout-grid.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';

import { sortCameraGroups } from './sort-camera-groups';

describe('sortCameraGroups', () => {
    it('should sort cameras by group and name', () => {
        const sortedByGroupAndName = [
            {
                details: {
                    parameters: {
                        customGroupId: 'group1',
                    },
                    name: 'camera1',
                },
            },
            {
                details: {
                    parameters: {
                        customGroupId: 'group2',
                    },
                    name: 'camera2',
                },
            },
            {
                details: {
                    parameters: {},
                    name: 'camera3',
                },
            },
        ] as ResourceLeafNode<NxSystemCamera>[];
        const result = sortCameraGroups(shuffle(sortedByGroupAndName));
        expect(result).toEqual(sortedByGroupAndName);
    });
});
