import type {
    OsInfo,
    RestV1ServerFull,
    ec2MediaServerEx,
} from '@services/system-api.types/servers.types';
import type { WithIpAndPort } from '@utils/nx';

import type { MediaStream } from '../camera-manager/add-params.types';

export type ec2MediaServerExCompat = Omit<ec2MediaServerEx, 'osInfo' | 'networkAddresses'> & {
    osInfo: OsInfo;
    endpoints: string[];
};

export const serverKeyMapV1 = [
    'id',
    'endpoints',
    'name',
    'osInfo',
    'status',
    'version',
] satisfies (keyof RestV1ServerFull)[];
export type RestV1ServerCompat = Pick<RestV1ServerFull, (typeof serverKeyMapV1)[number]>;
export const serverKeyMapV2 = serverKeyMapV1;
export type RestV2ServerCompat = RestV1ServerCompat;

export type PreprocessServer = ec2MediaServerExCompat | RestV1ServerCompat;

export interface NxSystemServer {
    // Shared
    id: string;
    name: string;
    status: string;
    version: string;

    // Compatibility patches
    backupType?: string; // Backup API has been changed, only in legacy servers
    endpoints: string[]; // ";" joined string in legacy as networkAddresses, string[] on rest
    osInfo: OsInfo; // Unparsed JSON in legacy, already parsed in rest

    // Calculated
    ip: string;
    port: string;
}

export interface ViewBaseCamera {
    disableDualStreaming: boolean;
    deviceType: string;
    id: string;
    model: string;
    name: string;
    parentId: string;
    preferredServerId: string;
    scheduleEnabled: boolean;
    status: string;
    url: string;

    /* From params */
    mediaStreams: MediaStream[];
    rotation: number;
}

export interface ViewPreprocessServer {
    id: string;
    name: string;
    endpoints: string[];
    status: string;
}

export interface ViewBaseServer extends WithIpAndPort<ViewPreprocessServer> {
    cameras: ViewBaseCamera[];
}
