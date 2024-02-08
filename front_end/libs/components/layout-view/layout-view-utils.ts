/* eslint-disable @typescript-eslint/explicit-function-return-type */

import {
    NxSystemCameraWithMappedFields,
    ResourceLeafNode,
    ResourceNode,
    ResourceParentNode,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { isRequiresTranscoding } from '@openLibs/webrtc-stream-manager';
import { nxConfig } from '@services/nx-config/config';
import { WebPages, WebPage } from '@services/system-api.types/layouts.types';
import {
    NxSystemCamera,
    CameraStatus,
    RecordingStatus,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemServer } from '@services/system.service/types/servers.types';
import { NxSystemInfo } from '@services/systems.service.types';
import { alphaNumericSort } from '@utils/general';

interface ResourceLookup<T = { id: string }> {
    [id: string]: ResourceNode<T>;
}

interface Resource {
    name: string;
    id: string;
}

const isIoOnly = (camera: NxSystemCamera): boolean =>
    !(!!camera.parameters.mediaStreams || !camera.parameters.ioSettings?.length);

export const sortByName = alphaNumericSort<Pick<Resource, 'name'>>(r => r.name || '');

export const addToGroup = (
    resourceLookup: ResourceLookup,
    groupIds: string[],
    resource: ResourceLeafNode | ResourceParentNode,
): ResourceLeafNode | ResourceParentNode => {
    if (!groupIds.length) {
        return resource;
    }

    const groupId = groupIds.shift() || '';

    let group =
        (resourceLookup &&
            Array.isArray(resourceLookup.children) &&
            resourceLookup.children.find(i => i.details.id === groupId)) ||
        resourceLookup[groupId];

    if (!group) {
        group = {
            name: groupId,
            details: { id: groupId },
            type: ResourceType.CAMERAS_GROUP,
            children: [],
        };
    }

    const newChild = addToGroup(group, groupIds, resource);
    if (!group.children.includes(newChild)) {
        group.children = [...group.children, newChild];
    }
    return group;
};

export const parseCameraGroup = (
    resourceLookup: ResourceLookup,
    groupId: string | undefined,
    camera: ResourceLeafNode,
): ResourceLeafNode | ResourceParentNode => {
    if (!groupId) {
        return camera;
    }

    const groupIds = encodeURI(groupId)
        .split('%0A')
        .map(s => decodeURI(s));

    return addToGroup(resourceLookup, groupIds, camera);
};

export const sortCameraGroups = (
    cameras: ResourceLeafNode<NxSystemCamera>[],
): ResourceLeafNode<NxSystemCamera>[] => {
    const byGroupAndName = alphaNumericSort<ResourceLeafNode<NxSystemCamera>>(
        r => (r.details.parameters.customGroupId || '') + r.details.name,
    );

    const { grouped, regular } = cameras.reduce(
        (
            category: {
                grouped: ResourceLeafNode<NxSystemCamera>[];
                regular: ResourceLeafNode<NxSystemCamera>[];
            },
            camera,
        ) => {
            if (camera.details.parameters.customGroupId) {
                category.grouped.push(camera);
            } else {
                category.regular.push(camera);
            }

            return category;
        },
        { grouped: [], regular: [] },
    );

    return [...grouped.sort(byGroupAndName), ...regular.sort(byGroupAndName)];
};

export const generateCamerasForTree = (parsedCameras: {
    [id: string]: ResourceNode<NxSystemCamera>;
}) => {
    let camerasForTree = Object.values(parsedCameras)
        .sort(sortByName)
        .filter(
            ({ type }) => nxConfig.featureFlags.layoutsIoDevices || type !== ResourceType.IO_DEVICE,
        ) as ResourceLeafNode<NxSystemCamera>[];

    if (nxConfig.featureFlags.layoutsCameraGroups) {
        camerasForTree = Object.values(
            sortCameraGroups(camerasForTree).reduce((camerasAndGroups, camera) => {
                const cameraOrGroup = parseCameraGroup(
                    camerasAndGroups,
                    camera.details.parameters.customGroupId,
                    camera,
                );
                return {
                    ...camerasAndGroups,
                    [cameraOrGroup.details.id]: cameraOrGroup,
                };
            }, {}),
        );
    }

    return camerasForTree;
};

export const parseCameras = (
    cameras: NxSystemCamera[],
    servers: NxSystemServer[],
    useV2api: boolean,
    aspectRatio: number,
): { [id: string]: ResourceNode<NxSystemCameraWithMappedFields> } =>
    cameras.reduce((cameras, camera) => {
        const parentServerOnline =
            servers.find(({ id }) => id === camera.parentId)?.status === 'Online';
        const online =
            isIoOnly(camera) || (camera.status === CameraStatus.Online && parentServerOnline);
        const unauthorized = camera.status === CameraStatus.Unauthorized && parentServerOnline;
        if (!parentServerOnline) {
            if (camera.status === CameraStatus.Unauthorized) {
                camera.status = CameraStatus.Offline;
            }
            if (camera.recordingStatus === RecordingStatus.Recording) {
                camera.recordingStatus = RecordingStatus.Scheduled;
            }
        }

        const nonWebRtcCodec = (camera.parameters.mediaStreams?.streams ?? [])
            .filter(({ encoderIndex }) => encoderIndex !== -1)
            .every(({ codec }) => isRequiresTranscoding(codec));

        const requiresTranscoding = nonWebRtcCodec && !useV2api;

        return {
            ...cameras,
            [camera.id]: {
                type: isIoOnly(camera) ? ResourceType.IO_DEVICE : ResourceType.CAMERA,
                name: camera.name,
                aspectRatio: camera.parameters.overrideAr || camera.defaultRatio || aspectRatio,
                details: {
                    ...camera,
                    online,
                    unauthorized,
                    requiresTranscoding,
                    // Compatibility patch for status
                    status: (camera.recordingStatus || camera.status).toLowerCase(),
                },
            },
        };
    }, {});

export const parseServers = (servers: NxSystemServer[], aspectRatio: number) =>
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

export const parseWebPages = (webPages: WebPages, aspectRatio: number) =>
    webPages.reduce(
        (webPages, webPage) => ({
            ...webPages,
            [webPage.id]: {
                id: webPage.id,
                type: ResourceType.WEB_PAGE,
                name: webPage.name,
                details: webPage,
                aspectRatio,
            } as ResourceNode<WebPage>,
        }),
        {} as ResourceLookup<(typeof webPages)[0]>,
    );

const normalizeSystemForLayout = ({ status, stateOfHealth, ...system }: NxSystemInfo) => ({
    ...system,
    status: stateOfHealth.replace('online', ''),
});

export const parseOtherSystems = (
    otherSystems: NxSystemInfo[],
    otherSystemsCameras: NxSystemCamera[],
    otherSystemsServers: NxSystemServer[],
    aspectRatio: number,
    loadedSystemIds: string[],
    hasQuery = true,
    openNodes: string[] = [],
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
