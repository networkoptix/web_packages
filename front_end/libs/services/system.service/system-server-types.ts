import type { WithIpAndPort } from '@utils/nx';

import type { OsInfo, RestV1ServerFull, ec2CameraEx, ec2MediaServerEx } from '../system-api.types';

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

export interface NxViewMediaServer extends WithIpAndPort<ec2MediaServerEx> {
    cameras: ec2CameraEx[];
}
