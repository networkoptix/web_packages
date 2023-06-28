import type { GetEndpoints } from './system-api.endpoint-types';
import type * as t from './system-api.types';
import type { ServerPreprocess } from './system.service/system-types';

export type AggregatedResp<K extends readonly (keyof GetEndpoints)[]> = t.NormalResponse<{
    [E in K[number]]: GetEndpoints[E];
}>;

export interface StorageAnalytics {
    hasAnalyticsData: boolean;
    hasPlugins: boolean;
    metadataStorageId: string;
}

export interface GetLicenses {
    licenses: t.Licence[];
    hwids: string[];
}

export interface AggregatedUsers {
    reply: {
        '/ec2/getAccessRights': t.ec2AccessRight[];
        '/ec2/getPredefinedRoles': t.ec2PredefinedRole[];
        '/ec2/getUserRoles': (t.ec2UserRole | t.RestUserRole)[];
        '/ec2/getUsers': (t.ec2User | t.RestUserCompat)[];
    };
}

export type MediaServersAndCameras = t.NormalResponse<{
    '/ec2/getMediaServers': ServerPreprocess[];
    '/ec2/getCamerasEx': t.ec2CameraEx[];
}>;

export interface TimeAndCameras {
    serverTimes: t.ServerTime[];
    cameras: t.ec2CameraEx[];
}

export interface CameraManagerUpdate {
    moduleInfo: t.ModuleInformationReply;
    servers: t.ec2MediaServer[];
    serverTimes: t.ServerTime[];
    cameras: t.ec2CameraEx[];
}

export type HealthReport = AggregatedResp<
    ['/ec2/metrics/manifest', '/ec2/metrics/values', '/ec2/metrics/alarms']
>;
