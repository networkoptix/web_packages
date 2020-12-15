import { tap } from 'rxjs/operators';

import { environment }                                      from '@environments/environment';
import { NxCloudApiService }                                from '../../../nx-cloud-api';
import { NxSystemAPIService, NxSystemAPI, ResourceParam }   from '../../../system-api.service';
import { NxUtilsService }                                   from '../../../utils.service';
import { NxSystemServer, ModuleInfo, IParams }              from '../system-types';
import {
    ICamera, MotionType, IRecordingSettings, ITask,
    StreamQuality, RecordingType
}                                                           from  '../camera-manager/camera-manager-types';

export class ServerManager {
    mediaserverConnections: {
        [serverId: string]: NxSystemAPI;
    };

    servers: NxSystemServer[];
    cameras: ICamera[];
    moduleInfo: ModuleInfo;

    constructor(private mediaserver: NxSystemAPI,
        private systemApiService: NxSystemAPIService,
        private currentUserEmail: string,
        private systemId: string,
        private cloudApi: NxCloudApiService
    ) {
    }

    initSystemMediaServers() {
        if (this.servers.length) {
            this.mediaserverConnections = this.servers.reduce((mediaserverConnections, server) => {
                const unauthorizedCallback = environment.isLocal
                    ? () => Promise.resolve()
                    : () => this.cloudApi.getSystemAuth(this.systemId).toPromise().then((authKeys: any) => {
                        this.mediaserver.setAuthKeys(authKeys.authGet, authKeys.authPost, authKeys.authPlay);
                        return Promise.resolve(true);
                    });
                mediaserverConnections[server.id] = this.systemApiService
                    .createConnection(
                        this.currentUserEmail,
                        this.systemId,
                        server.id,
                        unauthorizedCallback
                    );
                const { authGet, authPost, authPlay } = this.mediaserver.getAuthKeys();
                mediaserverConnections[server.id].setAuthKeys(authGet, authPost, authPlay);
                return mediaserverConnections;
            }, {});
            return Promise.resolve(this.mediaserverConnections);
        }
        return Promise.reject();
    }

    async updateSystemServersCameras() {
        try {
            const response = await this.mediaserver.updateSystemServersCameras().toPromise();
            const [moduleInfo, servers, serverTimes, cameras] = response;
            this.moduleInfo = moduleInfo;
            this.servers = servers.sort(NxUtilsService.byParam((server: any) => server.name, NxUtilsService.sortASC));
            this.getCameras(serverTimes, cameras);
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(Error(`Request to server has failed ${error}`));
        }
    }

    getServers(servers?) {
        return this.getForceServers(true, servers);
    }

    getForceServers(useCache, servers?) {
        if (!servers) {
            const serverSubscription = this.mediaserver.getMediaServers(useCache);
            serverSubscription.subscribe((res: any) => {
                if (!res) {
                    return Promise.reject(new Error(`Request to server has failed ${res}`));
                }

                this.servers = res.sort(NxUtilsService.byParam((server: any) => server.name, NxUtilsService.sortASC));
                return this.servers;
            });
            return serverSubscription;
        } else {
            this.servers = servers.sort(NxUtilsService.byParam((server: any) => server.name, NxUtilsService.sortASC));
        }
    }

    getPreviewUrl(cameraId, time, width, height, rotate) {
        return this.mediaserver.previewUrl(cameraId, time, width, height, rotate);
    }

    async getCameras(serverTimes?, cameras?) {
        if (!serverTimes || !cameras) {
            [serverTimes, cameras] = await this.mediaserver.getCamerasWithSeverTime().toPromise();
            if (!cameras) {
                return Promise.reject(new Error(`Request to server has failed ${cameras}`));
            }
        }
        const mappedCameras = await <ICamera[]>cameras.map(({ addParams: addParamsRaw, parentId, id, vendor, ...camera }: ICamera) => {
            const server = serverTimes.find(({ serverId }) => serverId === parentId);
            let dayOfWeek;
            let secondsToday;
            if (server) {
                const { timeZoneOffset, vmsTime } = server;
                const serverTime = parseInt(vmsTime) + parseInt(timeZoneOffset);
                const vmsDate = new Date(serverTime);
                dayOfWeek = ((vmsDate.getDay() + 6) % 7) + 1;
                secondsToday = Math.round((serverTime % 86400000) / 1000);
            }
            const {
                rotation,
                overrideAr,
                mediaCapabilities,
                isAudioSupported: audioSupported,
                motionStream,
                ...parsedAddParams
            }: any = addParamsRaw.filter(({ name }) => [
                'rotation',
                'overrideAr',
                'mediaCapabilities',
                'isAudioSupported',
                'supportedMotion',
                'motionStream',
                'credentials',
                'hasDualStreaming',
                'bitrateInfos'
            ].includes(name)).reduce((params, { name, value }) => {
                params[name] = value;
                return params;
            }, {});
            const parentName = this.servers.find(server => server.id === parentId)?.name;
            const isAudioSupported = !!audioSupported;
            const streamCapabilities = mediaCapabilities && JSON.parse(mediaCapabilities).streamCapabilities;
            const primary = streamCapabilities && streamCapabilities.find(({ key }) => key === 'primary');
            const _maxFps = primary && primary.value && (primary.value.maxFps || primary.value.MaxFps);
            const maxFps = _maxFps || 15;
            const previewRotate = overrideAr === 1 ? rotation : rotation === 180 ? 180 : 0;
            const previewUrl = this.mediaserver.previewUrl(id, null, overrideAr * 120, 120, previewRotate);
            const status = this.parseCameraStatus(camera, { dayOfWeek, secondsToday });
            const isStream = ['GENERIC_RTSP', 'GENERIC_MULTICAST', 'GENERIC_MULTICAST', 'HTTP_URL_PLUGIN'].includes(vendor);
            // eslint-disable-next-line no-use-before-define
            const motionEnabled = camera.motionType !== MotionType.noMotion;
            const { hasDualStreaming, bitrateInfos } = parsedAddParams;
            const multiStream = bitrateInfos && JSON.parse(bitrateInfos).streams.length >= 2;
            const motionLowresEnabled = !camera.disableDualStreaming && (multiStream || !!hasDualStreaming);
            const recordingSettings: IRecordingSettings = {
                recording : camera.scheduleEnabled && !camera.scheduleTasks.every(({ fps }) => !fps),
                quality   : this.parseRecordingQuality(camera.scheduleTasks),
                fps       : this.parseFps(camera.scheduleTasks, maxFps),
                motionEnabled,
                modes     : [
                    { name: 'always', id: 'RT_Always', value: this.parseRecordingMode(camera, 'RT_Always'), enabled: true },
                    { name: 'motion', id: 'RT_MotionOnly', value: this.parseRecordingMode(camera, 'RT_MotionOnly'), enabled: motionEnabled },
                    {
                        name    : 'motionLowRes',
                        id      : 'RT_MotionAndLowQuality',
                        value   : !motionEnabled ? 0 : this.parseRecordingMode(camera, 'RT_MotionAndLowQuality'),
                        enabled : motionLowresEnabled && motionEnabled
                    }
                ]
            };
            return { ...camera, id, parentId, dayOfWeek, maxFps, addParamsRaw, motionEnabled, recordingSettings, parsedAddParams, isAudioSupported, secondsToday, parentName, previewUrl, rotation, status, overrideAr, mediaCapabilities, vendor, isStream, motionLowresEnabled };
        });
        this.cameras = mappedCameras;
        return mappedCameras;
    }

    setCameraUserSettings(serverId: string, id: string, params: { [key: string]: string; }) {
        return this.mediaserverConnections[serverId].saveCameraUserSettings(id, params);
    }

    setServerUserSettings(serverId: string, params: { [key: string]: string; }) {
        return this.mediaserverConnections[serverId].saveServerUserSettings(serverId, params);
    }

    updateResource(resourceId: string, params: IParams) {
        const mappedParams: ResourceParam[] = Object.entries(params).map(([name, value]) => ({ name, value, resourceId }));
        return this.mediaserver.setResourceParams(mappedParams).toPromise();
    }

    updateOrGetBackupControl(serverId: string, action?: 'start' | 'stop') {
        return this.mediaserverConnections[serverId].backupControl(action);
    }

    updateRecordingSettings(updatedTask: Pick<ITask, 'fps' | 'recordingType' | 'streamQuality'> | false,
        cameraSettings: Pick<ICamera, 'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'overrideAr' | 'rotation'>) {
        const baseTask: Pick<ITask, 'bitrateKbps' | 'endTime' | 'startTime' | 'recordingType'> = updatedTask && cameraSettings.scheduleEnabled ? {
            bitrateKbps   : 0,
            endTime       : 86400,
            startTime     : 0,
            recordingType : updatedTask.recordingType
        } : {
            bitrateKbps   : 0,
            endTime       : 0,
            startTime     : 0,
            recordingType : 'RT_Never'
        };

        const updateParams: Partial<ICamera> | any = cameraSettings;

        const scheduleTasks: ITask[] = [];
        if (updatedTask && cameraSettings.scheduleEnabled) {
            for (let dayOfWeek = 1; dayOfWeek < 8; dayOfWeek++) {
                scheduleTasks.push({ ...updatedTask, ...baseTask, dayOfWeek });
            }
            updateParams.scheduleTasks = scheduleTasks;
        }
        return this.mediaserver.updateRecordingSettings(updateParams).toPromise();
    }

    private parseFps(schedule: ITask[], max: number): number | 'various' {
        const schedulesWithFps = schedule.filter(({ fps, recordingType }) => fps !== 0 && recordingType !== 'RT_Never').map(({ fps }) => fps);
        const uniqueFps = new Set(schedulesWithFps);
        const currentFps = Array.from(uniqueFps);
        return schedulesWithFps.length === 0 ? max : currentFps.length === 1 ? currentFps[0] : 'various';
    }

    private parseRecordingQuality(schedule: ITask[]) {
        const streamQualities: StreamQuality[] = ['low', 'normal', 'high', 'highest'];
        let quality: StreamQuality = schedule.length ? 'various' : 'high';
        for (const stream of streamQualities) {
            if (schedule.length && schedule.every(({ streamQuality }) => streamQuality === stream)) {
                quality = stream;
            }
        }
        return quality;
    }

    private parseRecordingMode({ scheduleTasks }: Partial<ICamera>, id: RecordingType) {
        const partialSchedule = scheduleTasks.some(({ recordingType, startTime, endTime, fps }) => (
            recordingType === id &&
            fps > 0 &&
            startTime < endTime
        ));

        const fullSchedule = scheduleTasks.length && scheduleTasks.every(({ recordingType, startTime, endTime, fps }) => (
            recordingType === id &&
            fps > 0 &&
            startTime < endTime
        ));
        return fullSchedule ? 2 : partialSchedule ? 1 : 0;
    }

    private parseCameraStatus({ status, scheduleEnabled, scheduleTasks }: Partial<ICamera>, { dayOfWeek, secondsToday }) {
        if (status !== 'Online' || !scheduleEnabled) {
            return status;
        }
        const recording = scheduleTasks.some(({ dayOfWeek: day, startTime, endTime, recordingType }) => (
            recordingType !== 'RT_Never' &&
            day === dayOfWeek &&
            startTime < secondsToday &&
            secondsToday < endTime
        ));
        if (recording) {
            return 'Recording';
        } else {
            return 'Scheduled';
        }
    }

    getLicenses() {
        return this.mediaserver.getLicenses().toPromise();
    }

    getModuleInfo(serverId?: string) {
        if (serverId) {
            return this.mediaserverConnections[serverId].getModuleInfo()
                .pipe(tap(moduleInfo => {
                    this.moduleInfo = moduleInfo.reply;
                }));
        } else {
            return this.mediaserver.getModuleInfo()
                .pipe(tap(moduleInfo => {
                    this.moduleInfo = moduleInfo.reply;
                }));
        }
    }

    changeServerPort(port: number, serverId: string) {
        return this.mediaserverConnections[serverId].changePort(port)
            .catch(err => Promise.reject(err));
    }

    logLevel(serverId: string) {
        return this.mediaserverConnections[serverId].logLevel().toPromise();
    }

    setLogLevels(serverId: string, loggers: IParams) {
        const promises = [];

        loggers.forEach((logger) => {
            promises.push(this.mediaserverConnections[serverId].logLevel(undefined, logger.key, logger.value).toPromise());
        });

        return Promise.all(promises)
            .then(() => {
                return Promise.resolve({});
            })
            .catch((error) => {
                return Promise.reject(new Error(error));
            });
    };

    activateLicense(serverId, key) {
        if (!this.mediaserverConnections) {
            return this.initSystemMediaServers()
                .then(() => {
                    return this.mediaserverConnections[serverId].activateLicense(key).toPromise();
                });
        } else {
            return this.mediaserverConnections[serverId].activateLicense(key).toPromise();
        }
    }

    renameServer(serverId: string, serverName: string) {
        const cleanServerId = serverId.replace(/[{}]/g, '');
        return this.mediaserverConnections[serverId].saveServerUserSettings(cleanServerId, { serverName });
    }

    restartServer(serverId: string) {
        return this.mediaserverConnections[serverId].restartServer()
            .catch(err => Promise.reject(err));
    }

    detachFromSystem(serverId: string, currentPassword: string) {
        return this.mediaserverConnections[serverId].detachFromSystem(currentPassword);
    }

    removeMediaserver(anotherServerId: string, serverIdToRemove: string) {
        return this.mediaserverConnections[anotherServerId].removeResource(serverIdToRemove);
    }

    restoreFactorySettings(serverId: string, currentPassword: string) {
        return this.mediaserverConnections[serverId].restoreFactorySettings(currentPassword);
    }

    /**
     * Storage endpoints
     */
    rebuildArchive(serverId: string, type: number, action?: string) {
        return this.mediaserverConnections[serverId].rebuildArchive(type, action);
    }

    checkForAnalyticsData(serverId: string) {
        return this.mediaserverConnections[serverId].checkForAnalyticsData();
    }

    getApiDoc(serverId: string) {
        return this.mediaserverConnections[serverId].getApiDoc();
    }

    getStorages(serverId, useCache = false, customTimeout = 8000) {
        return this.mediaserverConnections[serverId].getStorages(useCache, customTimeout);
    }

    getRecordStats(serverId, useCache = false) {
        return this.mediaserverConnections[serverId].getRecordStats(useCache);
    }

    getServerStats(serverId, useCache = false) {
        return this.mediaserverConnections[serverId].getServerStats(useCache);
    }
}
