import { NxSystemCameraWithMappedFields } from '@components/layout-grid/layout-grid.types';
import { isRequiresTranscoding } from '@openLibs/webrtc-stream-manager';
import {
    NxSystemCamera,
    CameraStatus,
    RecordingStatus,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemServer } from '@services/system.service/types/servers.types';

import { isIoOnly } from './is-io-only';

export const mapAdditionalCameraFieldsFactory =
    (servers: Pick<NxSystemServer, 'id' | 'status' | 'version'>[]) =>
    (camera: NxSystemCamera): NxSystemCameraWithMappedFields => {
        const parentServer = servers.find(({ id }) => id === camera.parentId);
        const useV2api = parseFloat(parentServer?.version || '0') >= 6;
        const parentServerOnline = parentServer?.status === 'Online';
        const online =
            isIoOnly(camera) || (camera.status === CameraStatus.Online && parentServerOnline);
        const unauthorized = camera.status === CameraStatus.Unauthorized && parentServerOnline;
        if (!parentServerOnline) {
            if (camera.status === CameraStatus.Unauthorized) {
                camera.status = CameraStatus.Offline;
            }
            if (camera.recordingStatus === RecordingStatus.Recording) {
                camera.recordingStatus = RecordingStatus.Scheduled;
            }
        }

        const nonWebRtcCodec = (camera.parameters.mediaStreams?.streams ?? [])
            .filter(({ encoderIndex }) => encoderIndex !== -1)
            .every(({ codec }) => isRequiresTranscoding(codec));

        const requiresTranscoding = nonWebRtcCodec && !useV2api;

        const status = (camera.recordingStatus || camera.status).toLowerCase() as CameraStatus;
        return { ...camera, online, unauthorized, requiresTranscoding, status };
    };
