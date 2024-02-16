import { v4 as uuid } from 'uuid';

import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';

import type { mapAdditionalCameraFieldsFactory } from './map-additional-camera-fields-factory';
import { mapCameraResourceNode } from './map-camera-resource-node';

let ioOnlyDevice = false;

jest.mock('./is-io-only', () => ({
    isIoOnly: jest.fn(_ => ioOnlyDevice),
}));

describe('mapCameraResourceNode', () => {
    const expectedCameraName = uuid();
    const defaultRatio = Math.random();
    const baseCamera = {
        name: expectedCameraName,
        parameters: {},
        defaultRatio,
    } as NxSystemCamera;

    const fallbackAspectRatio = Math.random();
    const expectedDetails = uuid();
    const mapAdditionalCameraFields = jest.fn(
        () =>
            expectedDetails as unknown as ReturnType<
                ReturnType<typeof mapAdditionalCameraFieldsFactory>
            >,
    );

    it('should return a ResourceNode with the correct type, name, aspectRatio, and details', () => {
        ioOnlyDevice = false;

        expect(
            mapCameraResourceNode(baseCamera, fallbackAspectRatio, mapAdditionalCameraFields),
        ).toEqual({
            type: 'camera',
            name: expectedCameraName,
            aspectRatio: defaultRatio,
            details: expectedDetails,
        });
    });

    it('should return correct type for io only device', () => {
        ioOnlyDevice = true;

        expect(
            mapCameraResourceNode(baseCamera, fallbackAspectRatio, mapAdditionalCameraFields).type,
        ).toEqual('iodevice');
    });
});
