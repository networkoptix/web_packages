import {
    NxSystemCamera,
    RecordingStatus,
} from '@services/system.service/camera-manager/camera-manager-types';

import { mapAdditionalCameraFieldsFactory } from './map-additional-camera-fields-factory';

let requiresTranscoding = false;

jest.mock('@openLibs/webrtc-stream-manager', () => ({
    isRequiresTranscoding: jest.fn(_ => requiresTranscoding),
}));

describe('mapAdditionalCameraFieldsFactory', () => {
    const servers = [
        {
            id: 'server1',
            status: 'Online',
        },
        {
            id: 'server2',
            status: 'Offline',
        },
    ];
    const camera = {
        id: 'camera1',
        parentId: 'server1',
        status: 'Online',
        recordingStatus: 'Recording',
        parameters: {
            mediaStreams: {
                streams: [
                    {
                        encoderIndex: 0,
                        codec: '',
                    },
                    {
                        encoderIndex: -1,
                        codec: '',
                    },
                ],
            },
        },
    } as unknown as NxSystemCamera;

    const mapAdditionalCameraFieldsV1System = mapAdditionalCameraFieldsFactory(servers, false);
    const mapAdditionalCameraFieldsV2System = mapAdditionalCameraFieldsFactory(servers, true);

    it('should return a camera with the correct fields', () => {
        requiresTranscoding = false;
        expect(mapAdditionalCameraFieldsV1System(camera)).toEqual({
            id: 'camera1',
            parentId: 'server1',
            status: 'recording',
            recordingStatus: RecordingStatus.Recording,
            parameters: {
                mediaStreams: {
                    streams: [
                        {
                            encoderIndex: 0,
                            codec: '',
                        },
                        {
                            encoderIndex: -1,
                            codec: '',
                        },
                    ],
                },
            },
            online: true,
            unauthorized: false,
            requiresTranscoding: false,
        });
    });

    it('should return a camera with requiresTranscoding set to true if not v2 system', () => {
        requiresTranscoding = true;
        expect(mapAdditionalCameraFieldsV1System(camera).requiresTranscoding).toBe(true);
    });

    it('should return a camera with requiresTranscoding set to false if v2 system', () => {
        requiresTranscoding = true;
        expect(mapAdditionalCameraFieldsV2System(camera).requiresTranscoding).toBe(false);
    });

    it('should return a camera with status set to scheduled if parent server is offline and recording is scheduled', () => {
        const cameraOnOfflineServer = {
            ...camera,
            parentId: 'server2',
        };

        const mappedCamera = mapAdditionalCameraFieldsV1System(cameraOnOfflineServer);

        expect(mappedCamera.status).toBe('scheduled');
        expect(mappedCamera.online).toBe(false);
    });

    it('should return a camera with status set to offline if parent server is offline', () => {
        const cameraOnOfflineServer = {
            ...camera,
            recordingStatus: undefined,
            parentId: 'server2',
        };

        expect(mapAdditionalCameraFieldsV1System(cameraOnOfflineServer).online).toBe(false);
    });
});
