import { groupBy } from 'lodash-es';

import { ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { OrganizationAndStructure } from '@pages/home/store/groups/groups-cache.store';
import { CloudSystemLight } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemServer } from '@services/system.service/types/servers.types';
import { NxSystemInfo } from '@services/systems.service.types';
import { isOrgSystem } from '@utils/nx';

import { generateCamerasForTree } from './generate-cameras-for-tree';
import { normalizeSystemForLayout } from './normalize-system-for-layout';
import { parseCameras } from './parse-cameras';

export const parseOtherSystems = (
    otherSystems: NxSystemInfo[],
    otherSystemsCameras: NxSystemCamera[],
    otherSystemsServers: NxSystemServer[],
    aspectRatio: number,
    loadedSystemIds: string[],
    hasQuery = true,
    openNodes: string[] = [],
    orgStructures: OrganizationAndStructure[] = [],
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
    const allSystems = otherSystems
        .filter(({ version }) => version >= 5.1)
        .map(system => {
            const parsedCameras = generateCamerasForTree(
                parseCameras(
                    otherSystemsCameras.filter(({ systemId }) => systemId === system.id),
                    otherSystemsServers,
                    aspectRatio,
                ),
            );

            const normalizedSystem = normalizeSystemForLayout(system);

            return {
                id: system.id,
                type: ResourceType.SYSTEM,
                name: system.name,
                details: normalizedSystem,
                children: parsedCameras.length
                    ? parsedCameras
                    : [
                          {
                              name:
                                  normalizedSystem.status === 'offline'
                                      ? staticLang.layouts.otherSystems.systemOffline
                                      : loadedSystemIds.includes(system.id)
                                        ? staticLang.layouts.otherSystems.noCameras
                                        : staticLang.layouts.otherSystems.loadingCameras,
                              details: {
                                  id:
                                      normalizedSystem.status === 'offline' ||
                                      loadedSystemIds.includes(system.id)
                                          ? 'noResults'
                                          : 'loading',
                              },
                              type: null,
                              aspectRatio: 0,
                          },
                      ],
            };
        });

    const groupedSystems = groupBy<(typeof allSystems)[number]>(allSystems, ({ details }) => {
        if (isOrgSystem(details) && details.organizationId) {
            return 'organizationSystems';
        }

        if (details.isMine) {
            return 'mySystems';
        }

        return 'sharedSystems';
    });

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const lookupCloudSystems = (cloudSystems: CloudSystemLight[]) =>
        cloudSystems
            .map(system =>
                groupedSystems.organizationSystems?.find(({ id }) => id === system.systemId),
            )
            .filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const generateGroupItems = (groups: OrganizationAndStructure['groups']) =>
        groups.map(group => ({
            id: group.id,
            name: group.name,
            type: ResourceType.SYSTEMS_GROUP,
            details: { id: group.id },
            children: [
                ...generateGroupItems(group.children),
                ...lookupCloudSystems(group.cloudSystems),
            ],
        }));

    const orgSystems = orgStructures.map(({ groups, cloudSystems, id, name }) => ({
        id,
        name,
        type: ResourceType.SYSTEMS_ORGANIZATION,
        details: { id },
        children: [...generateGroupItems(groups), ...lookupCloudSystems(cloudSystems)],
    }));

    return [
        ...orgSystems,
        {
            id: 'mySystems',
            name: 'My Systems',
            type: ResourceType.SYSTEMS_GROUP,
            details: { id: 'mySystems' },
            children: groupedSystems.mySystems || [],
        },
        {
            id: 'sharedSystems',
            name: 'Shared with Me',
            type: ResourceType.SYSTEMS_GROUP,
            details: { id: 'sharedSystems' },
            children: groupedSystems.sharedSystems || [],
        },
    ];
};
