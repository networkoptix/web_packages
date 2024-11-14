import { groupBy } from 'lodash-es';

import { ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { OrganizationAndStructure } from '@pages/home/store/groups/groups-cache.store';
import { Account } from '@services/account.service/account';
import { CloudSystemLight } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemServer } from '@services/system.service/types/servers.types';
import { NxSystemInfo } from '@services/systems.service.types';
import { canViewLayouts } from '@utils/can-view-layouts';
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
    account: Account | undefined = undefined,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
    const allSystems = otherSystems.map(system => {
        const parsedCameras = generateCamerasForTree(
            parseCameras(
                otherSystemsCameras.filter(({ systemId }) => systemId === system.id),
                otherSystemsServers,
                aspectRatio,
            ),
        );

        const normalizedSystem = normalizeSystemForLayout(system);

        const requires2Fa = normalizedSystem.system2faEnabled;

        const systemVersionSupported = canViewLayouts(normalizedSystem);

        const placeholder = [
            {
                name: (() => {
                    if (normalizedSystem.status === 'offline') {
                        return staticLang.layouts.otherSystems.systemOffline;
                    }

                    if (!systemVersionSupported) {
                        return 'siteOutdated';
                    }

                    if (loadedSystemIds.includes(system.id)) {
                        if (!requires2Fa || account?.account2faEnabled) {
                            return staticLang.layouts.otherSystems.noCameras;
                        }

                        return account?.totpExistsForAccount
                            ? 'twoFactorNotEnabled'
                            : 'twoFactorNotAvailable';
                    }

                    return staticLang.layouts.otherSystems.loadingCameras;
                })(),
                details: {
                    id: (() => {
                        if (!systemVersionSupported) {
                            return 'siteOutdated';
                        }

                        if (
                            normalizedSystem.status === 'offline' ||
                            loadedSystemIds.includes(system.id)
                        ) {
                            return requires2Fa ? 'twoFactorNotEnabled' : 'noResults';
                        }
                        return staticLang.layouts.otherSystems.loadingCameras;
                    })(),
                },
                type: null,
                aspectRatio: 0,
            },
        ];

        return {
            id: system.id,
            type: ResourceType.SYSTEM,
            name: system.name,
            details: normalizedSystem,
            children: parsedCameras.length && systemVersionSupported ? parsedCameras : placeholder,
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
            .map(system => {
                const index = groupedSystems.organizationSystems.findIndex(
                    ({ id }) => id === system.systemId,
                );

                if (index === -1) {
                    return null;
                }

                return groupedSystems.organizationSystems.splice(index, 1)[0];
            })
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
            name: staticLang.layouts.otherSystems.mySystems,
            type: ResourceType.SYSTEMS_GROUP,
            details: { id: 'mySystems' },
            children: groupedSystems.mySystems || [],
        },
        {
            id: 'sharedSystems',
            name: staticLang.layouts.otherSystems.sharedWithMe,
            type: ResourceType.SYSTEMS_GROUP,
            details: { id: 'sharedSystems' },
            children: [...groupedSystems.organizationSystems, ...groupedSystems.sharedSystems],
        },
    ];
};
