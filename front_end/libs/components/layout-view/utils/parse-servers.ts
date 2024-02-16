import { ResourceNode, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { NxSystemServer } from '@services/system.service/types/servers.types';

import { ResourceLookup } from './layout-view-utils.types';

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
                    status: server.status.toLowerCase(),
                    online: server.status === 'Online',
                    resourceType: staticLang.layouts.titles.resourceTypes[ResourceType.SERVER],
                },
                aspectRatio,
            } as ResourceNode<NxSystemServer>,
        }),
        {} as ResourceLookup<(typeof servers)[0]>,
    );
