import * as AddToGroup from './add-to-group';
import { getCameraGroupMocks } from './mocks/camera-group-mocks';
import { parseCameraGroup } from './parse-camera-group';

describe('parseCameraGroup', () => {
    const { mockResource, mockLookUp } = getCameraGroupMocks();
    let addToGroupSpy: jest.SpyInstance;

    beforeEach(() => {
        addToGroupSpy = jest.spyOn(AddToGroup, 'addToGroup').mockReturnValue(mockResource);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('returns resource if no groupId is provided', async () => {
        expect(parseCameraGroup(mockLookUp, undefined, mockResource)).toEqual(mockResource);
        expect(parseCameraGroup(mockLookUp, '', mockResource)).toEqual(mockResource);

        expect(addToGroupSpy).not.toBeCalled();
    });

    it('splits group path correctly for single group', async () => {
        expect(parseCameraGroup(mockLookUp, 'groupId', mockResource)).toEqual(mockResource);

        expect(addToGroupSpy).toBeCalledWith(mockLookUp, ['groupId'], mockResource);
    });
    it('splits group path correctly for nested group', async () => {
        const nestedGroups = ['groupId1', 'groupId2', 'groupId3'];

        expect(parseCameraGroup(mockLookUp, nestedGroups.join('\n'), mockResource)).toEqual(
            mockResource,
        );

        expect(addToGroupSpy).toBeCalledWith(mockLookUp, nestedGroups, mockResource);
    });
    it('splits group path correctly for nested group with escaped symbols', async () => {
        const nestedGroups = ['gro\\nupId1', 'groupId2\\', 'groupId3'];

        expect(parseCameraGroup(mockLookUp, nestedGroups.join('\n'), mockResource)).toEqual(
            mockResource,
        );

        expect(addToGroupSpy).toBeCalledWith(mockLookUp, nestedGroups, mockResource);
    });
});
