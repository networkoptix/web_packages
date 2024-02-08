import { ResourceType } from '@components/layout-grid/layout-grid.types';
import * as LayoutViewUtils from '@components/layout-view/layout-view-utils';

describe('LayoutViewUtils', () => {
    const mockResource = {
        aspectRatio: 1,
        type: ResourceType.CAMERA,
        name: 'camera',
        details: { id: 'camera' },
    };
    const mockResourceExtra = {
        aspectRatio: 1,
        type: ResourceType.CAMERA,
        name: 'camera2',
        details: { id: 'camera2' },
    };
    const mockLookUp = {
        mockLookup: {
            name: 'mockLookup',
            type: ResourceType.CAMERAS,
            id: 'mockLookup',
        },
    };
    describe('parseCameraGroup', () => {
        let addToGroupSpy: jest.SpyInstance;

        beforeEach(() => {
            addToGroupSpy = jest.spyOn(LayoutViewUtils, 'addToGroup').mockReturnValue(mockResource);
        });

        afterEach(() => {
            jest.resetAllMocks();
        });

        it('returns resource if no groupId is provided', async () => {
            expect(LayoutViewUtils.parseCameraGroup(mockLookUp, undefined, mockResource)).toEqual(
                mockResource,
            );
            expect(LayoutViewUtils.parseCameraGroup(mockLookUp, '', mockResource)).toEqual(
                mockResource,
            );

            expect(addToGroupSpy).not.toBeCalled();
        });

        it('splits group path correctly for single group', async () => {
            expect(LayoutViewUtils.parseCameraGroup(mockLookUp, 'groupId', mockResource)).toEqual(
                mockResource,
            );

            expect(addToGroupSpy).toBeCalledWith(mockLookUp, ['groupId'], mockResource);
        });
        it('splits group path correctly for nested group', async () => {
            const nestedGroups = ['groupId1', 'groupId2', 'groupId3'];

            expect(
                LayoutViewUtils.parseCameraGroup(mockLookUp, nestedGroups.join('\n'), mockResource),
            ).toEqual(mockResource);

            expect(addToGroupSpy).toBeCalledWith(mockLookUp, nestedGroups, mockResource);
        });
        it('splits group path correctly for nested group with escaped symbols', async () => {
            const nestedGroups = ['gro\\nupId1', 'groupId2\\', 'groupId3'];

            expect(
                LayoutViewUtils.parseCameraGroup(mockLookUp, nestedGroups.join('\n'), mockResource),
            ).toEqual(mockResource);

            expect(addToGroupSpy).toBeCalledWith(mockLookUp, nestedGroups, mockResource);
        });
    });
    describe('addToGroup', () => {
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
            addToGroupSpy = jest.spyOn(LayoutViewUtils, 'addToGroup');
        });

        afterEach(() => {
            jest.resetAllMocks();
        });

        it('returns group with the resource as a child if group does not exist', async () => {
            expect(LayoutViewUtils.addToGroup(mockLookUp, [mockGroupId1], mockResource)).toEqual({
                ...mockGroup1,
                children: [mockResource],
            });

            expect(addToGroupSpy).toHaveBeenCalledTimes(2);
        });

        it('returns group with the resource as an extra child if group does exist', async () => {
            expect(
                LayoutViewUtils.addToGroup(
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
                LayoutViewUtils.addToGroup(mockLookUp, [mockGroupId1, mockGroupId2], mockResource),
            ).toEqual({
                ...mockGroup1,
                children: [{ ...mockGroup2, children: [mockResource] }],
            });

            expect(addToGroupSpy).toHaveBeenCalledTimes(3);
        });

        it('returns nested groups with the resource as a child if groups do exist', async () => {
            expect(
                LayoutViewUtils.addToGroup(
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
                LayoutViewUtils.addToGroup(
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
});
