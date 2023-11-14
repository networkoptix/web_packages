import type { GetEndpoints } from './system-api.endpoint-types';
import type { NormalResponse } from './system-api.types';
import type { Licence } from './system-api.types/licenses.types';
import type { ServerTime } from './system-api.types/servers.types';
import type { LegacyRole, PredefinedLegacyRole, SystemUser } from './system-user.types';
import type { PreprocessCamera } from './system.service/camera-manager/camera-manager-types';
import type { ViewBaseCamera, ViewPreprocessServer } from './system.service/types/servers.types';

export type AggregatedResp<K extends readonly (keyof GetEndpoints)[]> = NormalResponse<{
    [E in K[number]]: GetEndpoints[E];
}>;

export interface StorageAnalytics {
    hasAnalyticsData: boolean;
    hasPlugins: boolean;
    metadataStorageId: string;
}

export interface GetLicenses {
    licenses: Licence[];
    hwids: string[];
}

export interface AggregatedRoles {
    reply: {
        '/ec2/getPredefinedRoles': PredefinedLegacyRole[];
        '/ec2/getUserRoles': LegacyRole[];
    };
}

export interface AggregatedUsers {
    reply: {
        '/ec2/getPredefinedRoles': PredefinedLegacyRole[];
        '/ec2/getUserRoles': LegacyRole[];
        '/ec2/getUsers': SystemUser[];
    };
}

export type ViewMediaServersAndCameras = {
    mediaServers: ViewPreprocessServer[];
    cameras: ViewBaseCamera[];
};

export interface CamerasAndServerTimes {
    cameras: PreprocessCamera[];
    serverTimes: ServerTime[];
}

export type HealthReport = AggregatedResp<
    ['/ec2/metrics/manifest', '/ec2/metrics/values', '/ec2/metrics/alarms']
>;
