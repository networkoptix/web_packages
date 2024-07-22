import { ResourceNode, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { ServerStatus } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemServer } from '@services/system.service/types/servers.types';

import { ResourceLookup } from './layout-view-utils.types';

export const getServerStatus = (status: string): ServerStatus => {
    switch (status.toLowerCase()) {
        case 'online':
            return ServerStatus.Online;
        case 'offline':
            return ServerStatus.Offline;
        case 'unauthorized':
            return ServerStatus.Unauthorized;
        case 'incompatible':
            return ServerStatus.Incompatible;
        case 'mismatchedcertificate':
            return ServerStatus.Incompatible;
        default:
            return ServerStatus.Incompatible;
    }
};

export const parseServers = (
    servers: NxSystemServer[],
    aspectRatio: number,
): ResourceLookup<(typeof servers)[0]> =>
    servers.reduce(
        (servers, server) => ({
            ...servers,
            [server.id]: {
                id: server.id,
                type: ResourceType.SERVER,
                name: server.name,
                details: {
                    ...server,
                    status: getServerStatus(server.status),
                    online: server.status.toLowerCase() === ServerStatus.Online.toLowerCase(),
                    resourceType: staticLang.layouts.titles.resourceTypes[ResourceType.SERVER],
                },
                aspectRatio,
            } as ResourceNode<NxSystemServer>,
        }),
        {} as ResourceLookup<(typeof servers)[0]>,
    );
