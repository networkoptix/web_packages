/* eslint @typescript-eslint/member-ordering: ['error', {
    interfaces: {
        order: 'alphabetically'
    }
}]  */
import type { APIDoc } from '@pages/api-tool/api-tool-types';
import type {
    LegacyRole,
    LegacyUser,
    PredefinedLegacyRole,
    RestV1User,
} from '@services/system-user.types';
import type { ArrayType, KeyFilter } from '@utils/general';

import type { MenuManifest } from './nx-config/base-config';
import { NormalResponse, Param, ServerDocumentation } from './system-api.types';
import type {
    DeviceV1Full,
    DeviceV2Full,
    ec2CameraEx,
    Ec2CameraHistoryItems,
    Ec2RecordedTimePeriodsResp,
} from './system-api.types/devices.types';
import type { EventRule } from './system-api.types/events.types';
import type { Licence } from './system-api.types/licenses.types';
import type {
    ec2MediaServer,
    ec2MediaServerEx,
    ec2Storage,
    ModuleInformation,
    RestV1ServerFull,
    RestV2ServerFull,
    ServerHardareIdsResp,
    TimeOfServers,
} from './system-api.types/servers.types';
import {
    Alarms,
    AlarmsReply,
    CloudSaasState,
    Manifests,
    MergeStatus,
    SystemSettingsResp,
    Values,
    ValuesReply,
} from './system-api.types/system.types';
import { ec2User } from './system-api.types/users.types';

export interface GetEndpointsFull {
    /* rest/v1 */
    '/rest/v1/devices': DeviceV1Full[];
    '/rest/v1/servers': RestV1ServerFull[];
    '/rest/v1/users': RestV1User[];
    // TODO: Fix these to have defaults

    /* rest/v2 */
    '/rest/v2/devices': DeviceV2Full[];
    '/rest/v2/servers': RestV2ServerFull[];
}

export type GetArrayTypesFull = {
    [E in KeyFilter<GetEndpointsFull, unknown[]>]: ArrayType<GetEndpointsFull[E]>;
};

export interface GetEndpoints {
    /* api */
    '/api/getCurrentUser': NormalResponse<LegacyUser>;
    '/api/getNonce': { nonce: string; realm: string };
    '/api/moduleInformation': ModuleInformation;
    '/api/settingsDocumentation': ServerDocumentation;
    '/api/systemSettings': SystemSettingsResp;

    /* ec2 */
    '/ec2/getCameraHistoryItems': Ec2CameraHistoryItems;
    '/ec2/getCamerasEx': ec2CameraEx[];
    '/ec2/getEventRules': EventRule[];
    '/ec2/getHardwareIdsOfServers': ServerHardareIdsResp;
    '/ec2/getLicenses': Licence[];
    '/ec2/getMediaServers': ec2MediaServer[];
    '/ec2/getMediaServersEx': ec2MediaServerEx[];
    '/ec2/getPredefinedRoles': PredefinedLegacyRole[];
    '/ec2/getSettings': Param[];
    '/ec2/getStorages': ec2Storage[];
    '/ec2/getTimeOfServers': TimeOfServers;
    '/ec2/getUserRoles': LegacyRole[];
    '/ec2/getUsers': ec2User[];
    '/ec2/mergeStatus': MergeStatus;
    '/ec2/metrics/alarms': Alarms;
    '/ec2/metrics/manifest': Manifests;
    '/ec2/metrics/values': Values;
    '/ec2/recordedTimePeriods': Ec2RecordedTimePeriodsResp;

    /* rest/v1 */
    '/rest/v1/system/merge': MergeStatus;
    '/rest/v1/users': RestV1User[];

    /* rest/v2 */
    '/rest/v2/system/metrics/alarms': AlarmsReply;
    '/rest/v2/system/metrics/manifest': Manifests['reply'];
    '/rest/v2/system/metrics/values': ValuesReply;

    /* rest/v3 */
    '/rest/v3/system/cloud/saas': CloudSaasState;

    /* static */
    '/static/openapi_legacy.json': APIDoc;
    '/static/openapi_manifest.json': MenuManifest;
}
