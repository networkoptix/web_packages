import { ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemServer } from '@services/system.service/types/servers.types';
import { NxSystemInfo } from '@services/systems.service.types';

import { ResourceLookup } from './layout-view-utils.types';
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
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) =>
    otherSystems
        .filter(({ version }) => version >= 5.1)
        .reduce(
            (systems, system) => {
                const parsedCameras = Object.values(
                    parseCameras(
                        otherSystemsCameras.filter(({ systemId }) => systemId === system.id),
                        otherSystemsServers,
                        false,
                        aspectRatio,
                    ),
                );

                const normalizedSystem = normalizeSystemForLayout(system);

                return {
                    ...systems,
                    [system.id]: {
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
                                                : hasQuery && !openNodes.includes(system.id)
                                                  ? staticLang.layouts.otherSystems.searchCameras
                                                  : staticLang.layouts.otherSystems.loadingCameras,
                                      details: { id: 'noResults' },
                                      type: null,
                                      aspectRatio: 0,
                                  },
                              ],
                    },
                };
            },
            {} as ResourceLookup<(typeof otherSystems)[0]>,
        );
