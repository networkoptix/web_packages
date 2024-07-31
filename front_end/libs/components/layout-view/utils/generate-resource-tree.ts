import {
    LayoutPlaceholder,
    LayoutResourceTree,
    ResourceType,
    SharableResourceLeafNode,
} from '@components/layout-grid/layout-grid.types';
import { generateCamerasForTree } from '@components/layout-view/utils/generate-cameras-for-tree';
import staticLang from '@language_static';
import { OrganizationAndStructure } from '@pages/home/store/groups/groups-cache.store';
import { Account } from '@services/account.service/account';
import { nxConfig } from '@services/nx-config/config';
import { Layout } from '@services/system-api.types/layouts.types';
import { CurrentUser } from '@services/system-user.types';
import { NxSystemInfo } from '@services/systems.service.types';
import {
    SystemResourcesTypeMap,
    SystemResourceTypeEnums,
} from '@store/system-resources/system-resources.types';
import { alphaNumericSort, dirtyId } from '@utils/general';

import { parseCameras } from './parse-cameras';
import { parseOtherSystems } from './parse-other-systems';
import { parseServers } from './parse-servers';
import { parseWebPages } from './parse-web-pages';

export interface Resource {
    name: string;
    id: string;
}

export const generateResourceTree = ([
    allSystemResources,
    currentSystemId,
    currentLayout,
    layouts,
    currentUser,
    editedLayout,
    otherSystemsInfo,
    orgStructures,
    queryInfo,
    account,
]: [
    Record<string, SystemResourcesTypeMap>,
    string,
    Layout | null,
    Layout[],
    CurrentUser,
    { id: string; isNew?: boolean } | null,
    NxSystemInfo[],
    OrganizationAndStructure[],
    {
        hasQuery: boolean;
        openNodes: string[];
    },
    Account,
]): LayoutResourceTree => {
    const { [currentSystemId]: currentSystem, ...otherSystems } = allSystemResources;
    const loadedSystems = Object.keys(allSystemResources);
    const { cameras = [], servers = [], webPages = [] } = currentSystem;
    const {
        cameras: otherSystemsCameras,
        servers: otherSystemsServers,
        webPages: OtherSystemsWebPages,
    } = Object.values(otherSystems).reduce(
        (allResources, currentSystemResources) => {
            Object.entries(currentSystemResources).forEach(([resourceType, resources]) =>
                allResources[resourceType]?.push(...resources),
            );
            return allResources;
        },
        { cameras: [], servers: [], webPages: [] } as Omit<
            typeof currentSystem,
            SystemResourceTypeEnums.LAYOUTS
        >,
    );
    const aspectRatio = currentLayout?.cellAspectRatio || 0;

    const parsedCameras = parseCameras(cameras, servers, aspectRatio);

    const parsedServers = parseServers(servers, aspectRatio);

    const parsedWebPages = parseWebPages(webPages, aspectRatio);

    const parsedOtherSystemsCameras = parseCameras(
        otherSystemsCameras,
        otherSystemsServers,
        aspectRatio,
    );

    const parsedOtherSystemsServers = parseServers(otherSystemsServers, aspectRatio);
    const parsedOtherSystemsWebPages = parseWebPages(OtherSystemsWebPages, aspectRatio);

    const parsedOtherSystems = parseOtherSystems(
        otherSystemsInfo.filter(({ id }) => id !== currentSystemId),
        otherSystemsCameras,
        otherSystemsServers,
        aspectRatio,
        loadedSystems,
        queryInfo.hasQuery,
        queryInfo.openNodes,
        orgStructures,
        account,
    );

    const byName = alphaNumericSort<Pick<Resource, 'name'>>(r => r.name || '');

    const layoutsForTree = layouts
        .filter(layout => layout.id && layout.id !== 'new')
        .filter(
            layout =>
                !layout.parentId ||
                [currentUser?.id, '{00000000-0000-0000-0000-000000000000}'].includes(
                    layout.parentId,
                ),
        )
        .map(
            details =>
                ({
                    id: details.id,
                    type: ResourceType.LAYOUT,
                    name: details.name,
                    owned:
                        !details.parentId ||
                        currentUser?.id === details.parentId ||
                        currentUser?.isAdmin,
                    shared: details.parentId === '{00000000-0000-0000-0000-000000000000}',
                    crossSystem: !details.parentId,
                    locked: details.locked,
                    details,
                }) as SharableResourceLeafNode<Layout>,
        )
        .sort((a, b) => {
            // newly created layout is displayed first in the tree
            if (editedLayout?.isNew && editedLayout.id === a.details.id) {
                return -1;
            }
            // shared layouts are at the top sorted alphabetically
            return a.shared === b.shared ? byName(a, b) : a.shared ? -1 : 1;
        });

    const parsedResources = Object.entries({
        ...parsedOtherSystems,
        ...parsedOtherSystemsCameras,
        ...parsedOtherSystemsServers,
        ...parsedOtherSystemsWebPages,
        ...parsedServers,
        ...parsedCameras,
        ...parsedWebPages,
        ...layoutsForTree.reduce((acc, layout) => ({ ...acc, [layout.details.id]: layout }), {}),
    }).reduce((newObject, [id, value]) => {
        newObject[dirtyId(id)] = value;
        return newObject;
    }, {});

    const serversForTree = Object.values(parsedServers).sort(byName);

    const camerasForTree = generateCamerasForTree(parsedCameras)
        .sort(byName)
        .filter(
            ({ type }) => nxConfig.featureFlags.layoutsIoDevices || type !== ResourceType.IO_DEVICE,
        );

    const webPagesForTree = Object.values(parsedWebPages).sort(byName);

    const otherSystemsForTree = Object.values(parsedOtherSystems).sort(byName);

    return {
        tree: [
            {
                name: staticLang.layouts.titles.resourceTypes[ResourceType.LAYOUTS],
                details: { id: LayoutPlaceholder.NO_LAYOUTS },
                type: ResourceType.LAYOUTS,
                children: layoutsForTree,
            },
            (nxConfig.featureFlags.layoutsServers || nxConfig.featureFlags.layoutsDemo) && {
                name: staticLang.layouts.titles.resourceTypes[ResourceType.SERVERS],
                details: { id: ResourceType.SERVERS },
                type: ResourceType.SERVERS,
                children: serversForTree.map(server => ({
                    ...server,
                    children: [],
                    // children: camerasForTree.filter(({ details: { parentId } }) => parentId === server.details.id)
                })),
            },
            {
                name: staticLang.layouts.titles.resourceTypes[ResourceType.CAMERAS],
                details: { id: ResourceType.CAMERAS },
                type: ResourceType.CAMERAS,
                children: camerasForTree,
            },
            (nxConfig.featureFlags.layoutsWebpages || nxConfig.featureFlags.layoutsDemo) && {
                name: staticLang.layouts.titles.resourceTypes[ResourceType.WEB_PAGES],
                details: { id: ResourceType.WEB_PAGES },
                type: ResourceType.WEB_PAGES,
                children: webPagesForTree,
            },
        ].filter(item => !!item),
        otherSystems: otherSystemsInfo.length && otherSystemsForTree,
        ...parsedResources,
    } as unknown as LayoutResourceTree;
};
