import { ResourceType } from '@components/layout-grid/layout-grid.types';

import * as AddToGroup from './add-to-group';
import { getCameraGroupMocks } from './mocks/camera-group-mocks';

describe('addToGroup', () => {
    const { mockResource, mockResourceExtra, mockLookUp } = getCameraGroupMocks();
    let addToGroupSpy: jest.SpyInstance;
    const mockGroupId1 = 'groupId1';
    const mockGroup1 = {
        name: mockGroupId1,
        details: { id: mockGroupId1 },
        type: ResourceType.CAMERAS_GROUP,
        children: [],
    };
    const mockGroupId2 = 'groupId2';
    const mockGroup2 = {
        ...mockGroup1,
        name: mockGroupId2,
        details: { id: mockGroupId2 },
    };

    beforeEach(() => {
        addToGroupSpy = jest.spyOn(AddToGroup, 'addToGroup');
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('returns group with the resource as a child if group does not exist', async () => {
        expect(AddToGroup.addToGroup(mockLookUp, [mockGroupId1], mockResource)).toEqual({
            ...mockGroup1,
            children: [mockResource],
        });

        expect(addToGroupSpy).toHaveBeenCalledTimes(2);
    });

    it('returns group with the resource as an extra child if group does exist', async () => {
        expect(
            AddToGroup.addToGroup(
                { [mockGroup1.details.id]: { ...mockGroup1, children: [mockResourceExtra] } },
                [mockGroupId1],
                mockResource,
            ),
        ).toEqual({
            ...mockGroup1,
            children: [mockResourceExtra, mockResource],
        });

        expect(addToGroupSpy).toHaveBeenCalledTimes(2);
    });

    it('returns nested groups with the resource as a child if groups do not exist', async () => {
        expect(
            AddToGroup.addToGroup(mockLookUp, [mockGroupId1, mockGroupId2], mockResource),
        ).toEqual({
            ...mockGroup1,
            children: [{ ...mockGroup2, children: [mockResource] }],
        });

        expect(addToGroupSpy).toHaveBeenCalledTimes(3);
    });

    it('returns nested groups with the resource as a child if groups do exist', async () => {
        expect(
            AddToGroup.addToGroup(
                {
                    [mockGroupId1]: {
                        ...mockGroup1,
                        children: [
                            {
                                ...mockGroup2,
                                children: [mockResourceExtra],
                            },
                        ],
                    },
                },
                [mockGroupId1, mockGroupId2],
                mockResource,
            ),
        ).toEqual({
            ...mockGroup1,
            children: [{ ...mockGroup2, children: [mockResourceExtra, mockResource] }],
        });

        expect(addToGroupSpy).toHaveBeenCalledTimes(3);
    });

    it('returns nested groups with the resource as a child if one group exists', async () => {
        expect(
            AddToGroup.addToGroup(
                {
                    [mockGroupId1]: {
                        ...mockGroup1,
                        children: [],
                    },
                },
                [mockGroupId1, mockGroupId2],
                mockResource,
            ),
        ).toEqual({
            ...mockGroup1,
            children: [{ ...mockGroup2, children: [mockResource] }],
        });

        expect(addToGroupSpy).toHaveBeenCalledTimes(3);
    });
});
