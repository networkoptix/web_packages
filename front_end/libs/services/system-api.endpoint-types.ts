/* eslint @typescript-eslint/member-ordering: ['error', {
    interfaces: {
        order: 'alphabetically'
    }
}]  */
import type { APIDoc } from '@pages/api-tool/api-tool-types';

import type { MenuManifest } from './nx-config/base-config';
import type * as t from './system-api.types';

export interface GetEndpoints {
    /* api */
    '/api/getCurrentUser': t.CurrentUser;
    '/api/moduleInformation': t.ModuleInformation;
    '/api/settingsDocumentation': t.ServerDocumentation;
    '/api/synchronizedTime': t.SystemTime;
    '/api/systemSettings': t.SystemSettings;

    /* ec2 */
    '/ec2/getAccessRights': t.ec2AccessRight[];
    '/ec2/getCamerasEx': t.ec2CameraEx[];
    '/ec2/getEventRules': t.EventRule[];
    '/ec2/getHardwareIdsOfServers': t.ServerHardareIdsResp;
    '/ec2/getLicenses': t.Licence[];
    '/ec2/getMediaServers': t.ec2MediaServer[];
    '/ec2/getMediaServersEx': t.ec2MediaServerEx[];
    '/ec2/getPredefinedRoles': t.ec2PredefinedRole[];
    '/ec2/getResourceTypes': t.GetResourceTypes;
    '/ec2/getStorages': t.ec2Storage[];
    '/ec2/getTimeOfServers': t.TimeOfServers;
    '/ec2/getUserRoles': t.ec2UserRole[];
    '/ec2/getUsers': t.ec2User[];
    '/ec2/mergeStatus': t.MergeStatus;
    '/ec2/metrics/alarms': t.Alarms;
    '/ec2/metrics/manifest': t.Manifests;
    '/ec2/metrics/values': t.Values;

    /* rest/v1 */
    '/rest/v1/devices': t.Device[];
    '/rest/v1/servers': t.RestServer[];
    '/rest/v1/users': t.RestUser[];

    /* rest/v2 */

    /* rest/v3 */

    /* static */
    '/static/openapi_legacy.json': APIDoc;
    '/static/openapi_manifest.json': MenuManifest;
}
