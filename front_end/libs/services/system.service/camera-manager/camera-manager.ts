import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { alphabeticalSort } from '@utils/general';

import { ServerManager } from '../server-manager/server-manager';
import { NxSystem } from '../system';
import { NxSystemServer, ModuleInfo } from '../system-types';

import {
    ICamera,
    MotionType,
    IRecordingSettings,
    ITask,
    StreamQuality,
    RecordingType
} from './camera-manager-types';

export class CameraManager {
    private serverManager: ServerManager;
    servers: NxSystemServer[];
    cameras: ICamera[];
    moduleInfo: ModuleInfo;

    constructor(
        private system: NxSystem,
        private locale: string,
    ) {
        this.serverManager = this.system.serverManager;
    }

    async updateSystemServersCameras() {
        try {
            const response = await this.serverManager.mediaserver.updateSystemServersCameras().toPromise();
            const [moduleInfo, servers, serverTimes, cameras] = response;
            this.moduleInfo = moduleInfo;
            this.servers = servers.sort(
                alphabeticalSort(this.locale, (server: any) => server.name)
            );
            this.getCameras(serverTimes, cameras);
            return Promise.resolve();
        } catch (error) {
            if (error.name === 'TimeoutError') {
                return Promise.reject({ offline: true });
            }
            return Promise.reject(Error(`Request to server has failed ${error}`));
        }
    }

    async getCameras(serverTimes?, cameras?) {
        if (!serverTimes || !cameras) {
            await this.serverManager.mediaserver
                .getCamerasWithSeverTime().toPromise()
                .then(response => {
                    if (!response) {
                        cameras = [];
                        return;
                    }
                    [serverTimes, cameras] = response;
                });
        }

        let camerasHealth;
        try {
            camerasHealth = (await this.serverManager.mediaserver.getHealthValues().toPromise())?.reply?.cameras || {};
        } catch (e) {
            camerasHealth = {};
        }

        const mappedCameras = <ICamera[]>cameras.map(({ addParams: addParamsRaw, parentId, id, vendor, backupType: deprecatedBackupType, ...camera }: ICamera) => {
            const backupType = deprecatedBackupType || (<any>camera).backupQuality;
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
                // motionStream,
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

            const parentName = this.servers?.find(server => server.id === parentId)?.name;
            const isAudioSupported = !!audioSupported;
            const streamCapabilities = mediaCapabilities && JSON.parse(mediaCapabilities).streamCapabilities;
            const primary = streamCapabilities && streamCapabilities.find(({ key }) => key === 'primary');
            const _maxFps = primary && primary.value && (primary.value.maxFps || primary.value.MaxFps);
            const maxFps = _maxFps || 15;
            const previewRotate = overrideAr === 1 ? rotation : rotation === 180 ? 180 : 0;
            const previewUrl = this.serverManager.mediaserver.previewUrl(id, null, overrideAr * 120, 120, previewRotate);
            const liveUrl = this.serverManager.mediaserver.getPlaybackUrl(id, 'hls');
            const webRtcUrl = this.system.version >= 5.1 ? (): string => this.serverManager.mediaserver.getPlaybackUrl(id, 'webRtc') : null;
            const status = this.parseCameraStatus(camera, { dayOfWeek, secondsToday });
            const isStream = ['GENERIC_RTSP', 'GENERIC_MULTICAST', 'GENERIC_MULTICAST', 'HTTP_URL_PLUGIN'].includes(vendor);
            // eslint-disable-next-line no-use-before-define
            const motionEnabled = ![MotionType.noMotion, MotionType.none].includes(camera.motionType);
            let { hasDualStreaming, bitrateInfos } = parsedAddParams;
            let defaultRatio = 0;
            if (bitrateInfos) {
                bitrateInfos = JSON.parse(bitrateInfos);
                const [x, y] = bitrateInfos.streams[0].resolution.split('x');
                defaultRatio = x / y;
            }
            const multiStream = bitrateInfos && bitrateInfos.streams.length >= 2;
            const motionLowResEnabled = !camera.disableDualStreaming && (multiStream || !!hasDualStreaming);

            const newApi = this.serverManager.mediaserver instanceof NxSystemRestAPI;
            const always = newApi ? RecordingType.META_ALWAYS : RecordingType.ALWAYS;
            const motionOnly = newApi ? RecordingType.META_ONLY : RecordingType.MOTION_ONLY;
            const motionLowRes = newApi ? RecordingType.META_LOW : RecordingType.MOTION_LOW;

            const recordingSettings: IRecordingSettings = {
                recording: camera.scheduleEnabled && !camera.scheduleTasks.every(({ fps }) => !fps),
                quality: this.parseRecordingQuality(camera.scheduleTasks),
                fps: this.parseFps(camera.scheduleTasks, maxFps),
                motionEnabled,
                modes: [
                    { name: 'always', id: always, value: this.parseRecordingMode(camera, [RecordingType.META_ONLY, RecordingType.ALWAYS]), enabled: true },
                    { name: 'motion', id: motionOnly, value: this.parseRecordingMode(camera, [RecordingType.META_ONLY, RecordingType.MOTION_ONLY]), enabled: motionEnabled },
                    {
                        name: 'motionLowRes',
                        id: motionLowRes,
                        value: !motionEnabled ? 0 : this.parseRecordingMode(camera, [RecordingType.META_LOW, RecordingType.MOTION_LOW]),
                        enabled: motionLowResEnabled && motionEnabled
                    }
                ]
            };
            const deviceType = camerasHealth[id.replace(/{|}/g, '')]?.info?.type || 'Camera';
            return { ...camera, deviceType, id, parentId, dayOfWeek, maxFps, addParamsRaw, motionEnabled, recordingSettings, parsedAddParams, isAudioSupported, secondsToday, parentName, previewUrl, liveUrl, webRtcUrl, rotation, status, overrideAr, mediaCapabilities, vendor, isStream, motionLowResEnabled, defaultRatio, backupType };
        });
        this.cameras = mappedCameras;
        return mappedCameras;
    }

    updateRecordingSettings(updatedTask: Pick<ITask, 'fps' | 'recordingType' | 'streamQuality'> | false,
        cameraSettings: Pick<ICamera, 'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'overrideAr' | 'rotation'>) {
        const baseTask: Pick<ITask, 'bitrateKbps' | 'endTime' | 'startTime' | 'recordingType'> = updatedTask && cameraSettings.scheduleEnabled ? {
            bitrateKbps: 0,
            endTime: 86400,
            startTime: 0,
            recordingType: updatedTask.recordingType
        } : {
            bitrateKbps: 0,
            endTime: 0,
            startTime: 0,
            recordingType: RecordingType.NEVER
        };

        const updateParams: Partial<ICamera> | any = cameraSettings;

        const scheduleTasks: ITask[] = [];
        if (updatedTask && cameraSettings.scheduleEnabled) {
            for (let dayOfWeek = 1; dayOfWeek < 8; dayOfWeek++) {
                scheduleTasks.push({ ...updatedTask, ...baseTask, dayOfWeek });
            }
            updateParams.scheduleTasks = scheduleTasks;
        }
        return this.serverManager.mediaserver.updateRecordingSettings(updateParams).toPromise();
    }

    private parseFps(schedule: ITask[], max: number): number | 'various' {
        const schedulesWithFps = schedule.filter(({ fps, recordingType }) => fps !== 0 && recordingType !== RecordingType.NEVER).map(({ fps }) => fps);
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

    private parseRecordingMode({ scheduleTasks }: Partial<ICamera>, types: RecordingType[]) {
        const partialSchedule = scheduleTasks.some(({ recordingType, startTime, endTime, fps }) => (
            types.includes(recordingType) &&
            fps > 0 &&
            startTime < endTime
        ));

        const fullSchedule = scheduleTasks.length && scheduleTasks.every(({ recordingType, startTime, endTime, fps }) => (
            types.includes(recordingType) &&
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
            recordingType !== RecordingType.NEVER &&
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
}
