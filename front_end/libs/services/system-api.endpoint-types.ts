/* eslint @typescript-eslint/member-ordering: ['error', {
    interfaces: {
        order: 'alphabetically'
    }
}]  */
import type { APIDoc } from '@pages/api-tool/api-tool-types';
import {
    LegacyRole,
    LegacyUser,
    PredefinedLegacyRole,
    RestV1User,
} from '@services/system-user.types';
import type { ArrayType, KeyFilter } from '@utils/general';

import type { MenuManifest } from './nx-config/base-config';
import type * as t from './system-api.types';
import { NormalResponse } from './system-api.types';

export interface GetEndpointsFull {
    /* rest/v1 */
    '/rest/v1/devices': t.DeviceV1Full[];
    '/rest/v1/servers': t.RestV1ServerFull[];
    '/rest/v1/users': RestV1User[];
    // TODO: Fix these to have defaults

    /* rest/v2 */
    '/rest/v2/devices': t.DeviceV2Full[];
    '/rest/v2/servers': t.RestV2ServerFull[];
}

export type GetArrayTypesFull = {
    [E in KeyFilter<GetEndpointsFull, unknown[]>]: ArrayType<GetEndpointsFull[E]>;
};

export interface GetEndpoints {
    /* api */
    '/api/getCurrentUser': NormalResponse<LegacyUser>;
    '/api/getNonce': { nonce: string; realm: string };
    '/api/moduleInformation': t.ModuleInformation;
    '/api/settingsDocumentation': t.ServerDocumentation;
    '/api/systemSettings': t.SystemSettingsResp;

    /* ec2 */
    '/ec2/getCameraHistoryItems': t.Ec2CameraHistoryItems;
    '/ec2/getCamerasEx': t.ec2CameraEx[];
    '/ec2/getEventRules': t.EventRule[];
    '/ec2/getHardwareIdsOfServers': t.ServerHardareIdsResp;
    '/ec2/getLicenses': t.Licence[];
    '/ec2/getMediaServers': t.ec2MediaServer[];
    '/ec2/getMediaServersEx': t.ec2MediaServerEx[];
    '/ec2/getPredefinedRoles': PredefinedLegacyRole[];
    '/ec2/getSettings': t.Param[];
    '/ec2/getStorages': t.ec2Storage[];
    '/ec2/getTimeOfServers': t.TimeOfServers;
    '/ec2/getUserRoles': LegacyRole[];
    '/ec2/getUsers': t.ec2User[];
    '/ec2/mergeStatus': t.MergeStatus;
    '/ec2/metrics/alarms': t.Alarms;
    '/ec2/metrics/manifest': t.Manifests;
    '/ec2/metrics/values': t.Values;
    '/ec2/recordedTimePeriods': t.Ec2RecordedTimePeriodsResp;

    /* rest/v1 */
    '/rest/v1/system/merge': t.MergeStatus;
    '/rest/v1/users': RestV1User[];

    /* rest/v2 */
    '/rest/v2/system/metrics/alarms': t.AlarmsReply;
    '/rest/v2/system/metrics/manifest': t.Manifests['reply'];
    '/rest/v2/system/metrics/values': t.ValuesReply;

    /* rest/v3 */

    /* static */
    '/static/openapi_legacy.json': APIDoc;
    '/static/openapi_manifest.json': MenuManifest;
}
