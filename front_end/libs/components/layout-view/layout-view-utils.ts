/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { isRequiresTranscoding } from 'nx-open-web/packages/webrtc-stream-manager';

import { ResourceNode, ResourceType } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { WebPages, WebPage } from '@services/system-api.types';
import {
    NxSystemCamera,
    CameraStatus,
    RecordingStatus,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemServer } from '@services/system.service/system-server-types';
import { NxSystemInfo } from '@services/systems.service.types';

interface ResourceLookup<T = { id: string }> {
    [id: string]: ResourceNode<T>;
}

const isIoOnly = (camera: NxSystemCamera): boolean =>
    !(!!camera.parameters.mediaStreams || !camera.parameters.ioSettings?.length);

export const parseCameras = (
    cameras: NxSystemCamera[],
    servers: NxSystemServer[],
    useV2api: boolean,
    aspectRatio: number,
) =>
    cameras.reduce(
        (cameras, camera) => {
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
                    id: camera.id,
                    type: isIoOnly(camera) ? ResourceType.IO_DEVICE : ResourceType.CAMERA,
                    name: camera.name,
                    details: {
                        ...camera,
                        online,
                        unauthorized,
                        requiresTranscoding,
                        resourceType: staticLang.layouts.titles.resourceTypes[ResourceType.CAMERA],
                        status: (camera.recordingStatus || camera.status).toLowerCase(),
                        // Compatibility patch for status
                    },
                    aspectRatio: camera.parameters.overrideAr || camera.defaultRatio || aspectRatio,
                },
            };
        },
        {} as ResourceLookup<(typeof cameras)[0]>,
    );

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
                                              : staticLang.layouts.otherSystems.noCameras,
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
