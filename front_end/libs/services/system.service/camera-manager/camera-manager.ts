import { flatten } from 'lodash-es';
import { BehaviorSubject, firstValueFrom, map, Observable } from 'rxjs';

import { NxSystemOldModule } from '@services/system/modules/nx-system-old-module';
import type { ChangedIdReturned } from '@services/system-api.types';
import type { ec2CameraEx } from '@services/system-api.types/devices.types';
import type { ServerTime } from '@services/system-api.types/servers.types';
import type { CameraValues } from '@services/system-api.types/system.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import {
    cleanIdLegacy,
    KeyFilter,
    MS,
    extractVideoLayout,
    parseDewarpingParams,
} from '@utils/general';

import type { ServerManager } from '../server-manager/server-manager';

import type * as APT from './add-params.types';
import {
    MotionType,
    RecordingSettings,
    StreamQuality,
    RecordingType,
    TimeDetail,
    RecordingModes,
    NxSystemCamera,
    TaskUpdate,
    CameraUpdate,
    SaveCameraUserAttributes,
    RecordingStatus,
    CameraStatus,
    PreprocessCamera,
    DeviceType,
    ScheduleTask,
} from './camera-manager-types';

type PartialSystem = Pick<
    NxSystemOldModule,
    'serverManager' | 'version' | 'useRest' | 'userManager' | 'permissionManager' | 'id'
>;

export class CameraManager {
    private camerasHealth: CameraValues = {};
    private serverManager: ServerManager;
    private serverTimes: ServerTime[];

    cameras$ = new BehaviorSubject<NxSystemCamera[]>([]);
    /**
     * @deprecated
     *
     * This is a temporary solution to have a reactive version for the cameras property.
     *
     * We should move the cameras state into either an ngrx store or signal store.
     */
    updateCamerasSubject = (): void => this.cameras$.next(this.cameras);

    cameras: NxSystemCamera[] = [];

    constructor(private system: PartialSystem) {
        this.serverManager = this.system.serverManager;
    }

    async updateSystemCameras(): Promise<void> {
        try {
            const { serverTimes, cameras } = await firstValueFrom(
                this.serverManager.mediaserver.getCamerasAndServerTime(),
            );
            await this.processCameras(cameras, serverTimes);
            return Promise.resolve();
        } catch (error) {
            if (error.name === 'TimeoutError') {
                return Promise.reject({ offline: true });
            }
            return Promise.reject(Error(`Request to server has failed ${error}`));
        }
    }

    async getCameras(): Promise<NxSystemCamera[]> {
        await firstValueFrom(this.serverManager.mediaserver.getCamerasAndServerTime()).then(
            response => {
                if (!response) {
                    this.cameras = [];
                } else {
                    const { cameras, serverTimes } = response;
                    return this.processCameras(cameras, serverTimes);
                }
            },
        );
        this.updateCamerasSubject();
        return this.cameras;
    }

    private async processCameras(
        cameras: PreprocessCamera[],
        serverTimes: ServerTime[],
    ): Promise<NxSystemCamera[]> {
        this.serverTimes = serverTimes;
        if (this.system?.permissionManager.isAdmin$$()) {
            this.camerasHealth = (
                await firstValueFrom(this.serverManager.mediaserver.getHealthValues())
            ).reply.cameras;
        }
        this.cameras = cameras.map(this.parseCamera);
        return this.cameras;
    }

    parseCamera = (camera: PreprocessCamera): NxSystemCamera => {
        const {
            parameters,
            credentials,
            maxFps,
            previewUrl,
            defaultRatio,
            motionLowResEnabled,
            audioSupported,
        } = this.parseParameters(camera);

        const backupQuality = (camera as ec2CameraEx).backupType || camera.backupQuality;

        const webRtcUrl =
            this.system.version >= 5.1
                ? ({ position } = { position: null }, resolvedRelay = ''): string => {
                      return this.serverManager.mediaserverConnections[
                          camera.parentId
                      ].getPlaybackUrl(
                          camera.id,
                          this.system.version > 5.1 ? 'webRtc2' : 'webRtc',
                          'low',
                          position,
                          resolvedRelay,
                      );
                  }
                : null;

        let status: CameraStatus;
        let recordingStatus: RecordingStatus;
        if (camera.status === RecordingStatus.Recording) {
            recordingStatus = RecordingStatus.Recording;
            status = CameraStatus.Online;
        } else if (camera.scheduleEnabled) {
            recordingStatus = this.getRecordingStatus(camera);
            status = camera.status;
        } else {
            status = camera.status;
        }

        const recordingSettings = this.parseRecordingSettings(camera, maxFps, motionLowResEnabled);

        const isStream = [
            'GENERIC_RTSP',
            'GENERIC_MULTICAST',
            'GENERIC_MULTICAST',
            'HTTP_URL_PLUGIN',
        ].includes(camera.vendor);

        const id = cleanIdLegacy(camera.id);
        const deviceType =
            'deviceType' in camera
                ? camera.deviceType
                : this.camerasHealth[cleanIdLegacy(camera.id)]?.info.type ?? DeviceType.Camera;

        const {
            name,
            vendor,
            model,
            url,
            typeId,

            parentId,
            audioEnabled,
            controlEnabled,
            motionType,
            motionMask,
            scheduleEnabled,
            scheduleTasks,
            backupPolicy,
            backupContentType,
            dewarpingParams: dewarpingParamsRaw,
        } = camera;

        const dewarpingParams = parseDewarpingParams(dewarpingParamsRaw);

        const getAccessToken = (): string =>
            'accessToken' in this.serverManager.mediaserver
                ? this.serverManager.mediaserver.accessToken
                : '';

        return {
            id,
            name,
            vendor,
            model,
            url,
            typeId,
            systemId: this.system.id,
            get accessToken(): string {
                return getAccessToken();
            },
            getAccessToken,
            parentId,
            audioEnabled,
            audioSupported,
            controlEnabled,
            motionType,
            motionMask,
            scheduleEnabled,
            scheduleTasks,
            backupPolicy,
            backupQuality,
            backupContentType,
            status,
            credentials,
            deviceType,
            parameters,

            defaultRatio,
            isStream,
            maxFps,
            previewUrl,
            recordingSettings,
            recordingStatus,
            webRtcUrl,
            dewarpingParams,
        };
    };

    private parseParameters(
        camera: PreprocessCamera,
    ): Pick<
        NxSystemCamera,
        'parameters' | 'credentials' | 'previewUrl' | 'defaultRatio' | 'maxFps' | 'audioSupported'
    > &
        Pick<RecordingSettings, 'motionLowResEnabled'> {
        let credentials: NxSystemCamera['credentials'];
        let parameters: NxSystemCamera['parameters'];

        if ('addParams' in camera) {
            const addParams = Object.fromEntries(
                camera.addParams.map(({ name, value }) => [name, value]),
            );
            // The server sends all params as strings for ec2 cameras, parsing is required
            // for some to convert them into usable forms

            const { motionStream, supportedMotion } = addParams;
            parameters = { motionStream, supportedMotion };
            // These two are already strings

            if (addParams.credentials) {
                const [user, password] = addParams.credentials.split(':');
                credentials = { user, password };
            }

            const boolKeys = ['hasDualStreaming', 'isAudioSupported'] satisfies KeyFilter<
                APT.ParsedAddParams,
                APT.BoolNum
            >[];
            Object.assign(
                parameters,
                Object.fromEntries(
                    // "0" or "1"
                    boolKeys
                        .filter(k => addParams[k] !== undefined)
                        .map(k => [k, Number(addParams[k])]),
                ),
            );

            const numKeys = ['overrideAr', 'rotation'] satisfies KeyFilter<
                APT.ParsedAddParams,
                number
            >[];
            Object.assign(
                parameters,
                Object.fromEntries(
                    numKeys
                        .filter(k => addParams[k] !== undefined)
                        .map(k => [k, Number(addParams[k])]),
                    // Empty strings will be converted to 0
                ),
            );

            const jsonKeys = [
                'bitrateInfos',
                'mediaCapabilities',
                'mediaStreams',
                'ioSettings',
            ] satisfies KeyFilter<APT.ParsedAddParams, object>[];
            Object.assign(
                parameters,
                Object.fromEntries(
                    jsonKeys
                        .filter(k => addParams[k] !== undefined)
                        .map(k => [k, JSON.parse(addParams[k])]),
                ),
            );
        } else {
            if ('credentials' in camera) {
                credentials = camera.credentials;
            }
            parameters = camera.parameters;
            // @ts-expect-error Server sometimes sends these as empty strings
            if (parameters?.overrideAr === '') {
                delete parameters.overrideAr;
            }
            // @ts-expect-error Server sometimes sends these as empty strings
            if (parameters?.rotation === '') {
                delete parameters.rotation;
            }
        }

        const primaryStream = parameters.mediaCapabilities?.streamCapabilities?.find(
            ({ key }) => key === 'primary',
        );
        const maxFps = primaryStream?.value?.maxFps || 15;
        const previewUrl = this.serverManager.mediaserver.previewUrl(
            camera.id,
            null,
            // covering cases where overrideAr is undefined or 0
            parameters.overrideAr === undefined ? undefined : parameters.overrideAr * 120,
            120,
            parameters.rotation,
        );

        const { bitrateInfos } = parameters;
        const [x, y]: number[] = (
            parameters?.mediaStreams?.streams.find(({ encoderIndex }) => encoderIndex === 0) ||
            bitrateInfos?.streams?.[0] || { resolution: '1920x1080' }
        ).resolution
            .split('x')
            .map(Number);
        const defaultRatio = [x, y].every(Boolean) ? x / y : 1920 / 1080;

        if (!parameters.overrideAr && parameters.VideoLayout) {
            parameters.overrideAr =
                extractVideoLayout(parameters.VideoLayout).gridAspect * defaultRatio;
        }

        const multiStream = bitrateInfos && bitrateInfos.streams.length >= 2;
        const motionLowResEnabled =
            !camera.disableDualStreaming && (multiStream || !!parameters.hasDualStreaming);

        // isAudioSupported is legacy, but some cameras will still use it
        const audioSupported =
            !!parameters.isAudioSupported || !!parameters.mediaCapabilities?.hasAudio;

        return {
            parameters,
            credentials,
            maxFps,
            previewUrl,
            defaultRatio,
            motionLowResEnabled,
            audioSupported,
        };
    }

    private parseRecordingSettings(
        { motionType, scheduleEnabled, scheduleTasks }: PreprocessCamera,
        maxFps: number,
        motionLowResEnabled: boolean,
    ): RecordingSettings {
        const motionEnabled = ![MotionType.NoMotion, MotionType.None].includes(motionType);

        const newApi = this.serverManager.mediaserver instanceof NxSystemRestAPI;
        return {
            recording: scheduleEnabled && !scheduleTasks.every(({ fps }) => !fps),
            quality: this.parseRecordingQuality(scheduleTasks),
            fps: this.parseFps(scheduleTasks, maxFps),
            motionEnabled,
            motionLowResEnabled,
            modes: [
                {
                    name: 'always',
                    id: newApi ? RecordingType.META_ALWAYS : RecordingType.ALWAYS,
                    value: this.recordingScheduleForType(scheduleTasks, [
                        RecordingType.META_ONLY,
                        RecordingType.ALWAYS,
                    ]),
                    enabled: true,
                },
                {
                    name: 'motion',
                    id: newApi ? RecordingType.META_ONLY : RecordingType.MOTION_ONLY,
                    value: this.recordingScheduleForType(scheduleTasks, [
                        RecordingType.META_ONLY,
                        RecordingType.MOTION_ONLY,
                    ]),
                    enabled: motionEnabled,
                },
                {
                    name: 'motionLowRes',
                    id: newApi ? RecordingType.META_LOW : RecordingType.MOTION_LOW,
                    value: !motionEnabled
                        ? 0
                        : this.recordingScheduleForType(scheduleTasks, [
                              RecordingType.META_LOW,
                              RecordingType.MOTION_LOW,
                          ]),
                    enabled: motionLowResEnabled && motionEnabled,
                },
            ],
        };
    }

    updateRecordingSettings(
        updatedTask: TaskUpdate,
        cameraSettings: CameraUpdate,
    ): Promise<ChangedIdReturned> {
        const baseTask =
            updatedTask && cameraSettings.scheduleEnabled
                ? {
                      bitrateKbps: 0,
                      endTime: 86400,
                      startTime: 0,
                      recordingType: updatedTask.recordingType,
                  }
                : {
                      bitrateKbps: 0,
                      endTime: 0,
                      startTime: 0,
                      recordingType: RecordingType.NEVER,
                  };

        const updateParams: SaveCameraUserAttributes = cameraSettings;

        const scheduleTasks: SaveCameraUserAttributes['scheduleTasks'] = [];
        if (updatedTask && cameraSettings.scheduleEnabled) {
            for (let dayOfWeek = 1; dayOfWeek < 8; dayOfWeek++) {
                scheduleTasks.push({ ...updatedTask, ...baseTask, dayOfWeek });
            }
            updateParams.scheduleTasks = scheduleTasks;
        }
        return firstValueFrom(this.serverManager.mediaserver.updateRecordingSettings(updateParams));
    }

    private parseFps(schedule: ScheduleTask[], max: number): number | 'various' {
        const taskFps = schedule
            .filter(s => s.fps !== 0 && s.recordingType !== RecordingType.NEVER)
            .map(s => s.fps);
        const currentFps = Array.from(new Set(taskFps));
        if (taskFps.length === 0) {
            return max;
        } else if (currentFps.length === 1) {
            return currentFps[0];
        } else {
            return 'various';
        }
    }

    private parseRecordingQuality(schedule: ScheduleTask[]): StreamQuality {
        const streamQualities = ['low', 'normal', 'high', 'highest'];
        let quality = schedule.length ? 'various' : 'high';
        for (const stream of streamQualities) {
            if (
                schedule.length &&
                schedule.every(({ streamQuality }) => streamQuality === stream)
            ) {
                quality = stream;
            }
        }
        return quality as StreamQuality;
    }

    private recordingScheduleForType(
        scheduleTasks: ScheduleTask[],
        types: RecordingType[],
    ): RecordingModes['value'] {
        let scheduled = 0;
        scheduleTasks.forEach(({ recordingType, startTime, endTime, fps }) => {
            scheduled += Number(
                types.includes(recordingType as RecordingType) && fps > 0 && startTime < endTime,
            );
        });

        if (scheduleTasks.length && scheduleTasks.length === scheduled) {
            // Full schedule
            return 2;
        } else if (scheduled > 0) {
            // Partial schedule
            return 1;
        } else {
            return 0;
        }
    }

    private getRecordingStatus({
        status,
        scheduleTasks,
        parentId,
    }: PreprocessCamera): RecordingStatus {
        const serverTime = this.serverTimes.find(({ serverId }) => serverId === parentId);
        let recording = false;
        if (serverTime) {
            // Intentionally made descriptive ... I dislike time manipulation
            const { timeZoneOffset: serverTimeZoneOffsetMs, vmsTime: vmsTimeMs } = serverTime;
            const localTimeZoneOffsetMs = new Date().getTimezoneOffset() * MS.minute;
            const timeZoneOffset = parseInt(serverTimeZoneOffsetMs) + localTimeZoneOffsetMs;
            const vmsTimeFromLocal = parseInt(vmsTimeMs) + timeZoneOffset;
            const vmsDate = new Date(vmsTimeFromLocal);

            const dayOfWeek = ((vmsDate.getDay() + 6) % 7) + 1;
            const secondsToday = Math.round((vmsDate.getTime() % MS.day) / 1000);
            recording = scheduleTasks.some(
                task =>
                    ![RecordingType.NEVER, RecordingType.META_NEVER].includes(
                        task.recordingType as RecordingType,
                    ) &&
                    task.dayOfWeek === dayOfWeek &&
                    task.startTime < secondsToday &&
                    secondsToday < task.endTime,
            );
        }
        return recording && status !== CameraStatus.Offline
            ? RecordingStatus.Recording
            : RecordingStatus.Scheduled;
    }

    public hasArchives(): Observable<string[]> {
        return this.serverManager.mediaserver
            .getCameraHistoryItems()
            .pipe(map(res => flatten(res.map(({ archivedCameras }) => archivedCameras))));
    }

    public getRecordedTimes(
        cameraId: string[],
        startTime: number,
        endTime: number = Date.now(),
        detail: number = 1,
    ): Observable<TimeDetail[]> {
        const params = {
            cameraId,
            groupBy: 'cameraId',
            keepSmallChunks: true,
            detail,
            startTime: startTime || 0,
            endTime,
        };

        return this.serverManager.mediaserver.recordedTimePeriods(params);
    }
}
