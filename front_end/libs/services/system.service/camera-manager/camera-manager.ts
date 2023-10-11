import { LOCALE_ID } from '@angular/core';
import { flatten, isEqual } from 'lodash-es';
import {
    animationFrameScheduler,
    distinctUntilChanged,
    firstValueFrom,
    interval,
    map,
    Observable,
    scan,
    switchMap,
    timer,
} from 'rxjs';

import type {
    ec2CameraEx,
    ec2MediaServer,
    ServerTime,
    Task,
    ChangedIdReturned,
    CameraValues,
} from '@services/system-api.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystemOldModule } from '@services/system/modules/nx-system-old-module';
import { NxSystemBase } from '@services/system/system-base';
import { alphabeticalSort, cleanId, KeyFilter, MS, paramSortFunc } from '@utils/general';

import type { ServerManager } from '../server-manager/server-manager';
import { ModuleInfo } from '../system-types';

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
} from './camera-manager-types';

type PartialSystem = Pick<
    NxSystemOldModule,
    'serverManager' | 'version' | 'useRest' | 'userManager'
>;

const updateDuration = (
    chunk: Pick<Partial<TimeDetail>, 'durationMs'> & Omit<TimeDetail, 'durationMs'>,
): TimeDetail => {
    chunk.durationMs = chunk.endTimeMs - chunk.startTimeMs;
    return chunk as TimeDetail;
};

export class CameraManager {
    private camerasHealth: CameraValues = {};
    private serverManager: ServerManager;
    private serverTimes: ServerTime[];
    private locale: string;

    servers: ec2MediaServer[];
    cameras: NxSystemCamera[];
    moduleInfo: ModuleInfo;

    constructor(private system: PartialSystem) {
        this.locale = NxSystemBase.INJECTOR.get(LOCALE_ID);
        this.serverManager = this.system.serverManager;
    }

    async updateSystemServersCameras(): Promise<void> {
        try {
            const { moduleInfo, servers, serverTimes, cameras } =
                await this.serverManager.mediaserver.updateSystemServersCameras().toPromise();
            this.moduleInfo = moduleInfo;
            this.servers = servers.sort(alphabeticalSort(this.locale, server => server.name));
            await this.processCameras({ serverTimes, cameras });
            return Promise.resolve();
        } catch (error) {
            if (error.name === 'TimeoutError') {
                return Promise.reject({ offline: true });
            }
            return Promise.reject(Error(`Request to server has failed ${error}`));
        }
    }

    async getCameras(): Promise<NxSystemCamera[]> {
        await this.serverManager.mediaserver
            .getCamerasWithServerTime()
            .toPromise()
            .then(response => {
                if (!response) {
                    this.cameras = [];
                } else {
                    return this.processCameras(response);
                }
            });
        return this.cameras;
    }

    private async processCameras({
        serverTimes,
        cameras,
    }: {
        serverTimes: ServerTime[];
        cameras: ec2CameraEx[];
    }): Promise<NxSystemCamera[]> {
        this.serverTimes = serverTimes;
        try {
            if (this.system?.userManager.permissions.isAdmin) {
                this.camerasHealth = (
                    await firstValueFrom(this.serverManager.mediaserver.getHealthValues())
                ).reply.cameras;
            }
        } catch (_) {
            this.camerasHealth = {};
        }
        this.cameras = cameras.map(this.parseCamera);
        return this.cameras;
    }

    parseCamera = (camera: ec2CameraEx): NxSystemCamera => {
        const backupType = camera.backupType || camera.backupQuality;

        if (!camera.addParams) {
            /* @ts-expect-error TODO: Figure out how to handle processing for rest cameras  */
            return camera;
        }

        const addParams = Object.fromEntries(
            camera.addParams.map(({ name, value }) => [name, value]),
        );

        // The server sends all params as strings, parsing is required
        // for some to convert them into usable forms
        const parsedAddParams: APT.ParsedAddParams = {};
        const boolKeys: KeyFilter<APT.ParsedAddParams, boolean>[] = [
            'hasDualStreaming',
            'isAudioSupported',
        ];
        Object.assign(
            parsedAddParams,
            Object.fromEntries(
                // "0" or "1"
                boolKeys
                    .filter(k => addParams[k] !== undefined)
                    .map(k => [k, !!Number(addParams[k])]),
            ),
        );

        const numKeys: KeyFilter<APT.ParsedAddParams, number>[] = ['overrideAr', 'rotation'];
        Object.assign(
            parsedAddParams,
            Object.fromEntries(
                numKeys.filter(k => addParams[k] !== undefined).map(k => [k, Number(addParams[k])]),
                // Empty strings will be converted to 0
            ),
        );

        const jsonKeys: KeyFilter<APT.ParsedAddParams, object>[] = [
            'bitrateInfos',
            'mediaCapabilities',
        ];
        Object.assign(
            parsedAddParams,
            Object.fromEntries(
                jsonKeys
                    .filter(k => addParams[k] !== undefined)
                    .map(k => [k, JSON.parse(addParams[k])]),
            ),
        );

        const parentName = this.servers?.find(server => server.id === camera.parentId)?.name;
        const streamCapabilities = parsedAddParams.mediaCapabilities?.streamCapabilities;
        const primary = streamCapabilities?.find(({ key }) => key === 'primary');
        const maxFps = primary?.value?.maxFps || 15;
        const previewUrl = this.serverManager.mediaserver.previewUrl(
            camera.id,
            null,
            parsedAddParams.overrideAr * 120,
            120,
            addParams.rotation,
        );
        const webRtcUrl =
            this.system.version >= 5.1
                ? ({ position } = { position: null }, resolvedRelay = ''): string => {
                      return this.serverManager.mediaserverConnections[
                          camera.parentId
                      ].getPlaybackUrl(camera.id, 'webRtc', 'low', position, resolvedRelay);
                  }
                : null;
        const status = this.parseCameraStatus(camera, this.system.useRest).toLowerCase();
        const unauthorized = status === 'unauthorized';
        const online = ['online', 'recording'].includes(status);
        const isStream = [
            'GENERIC_RTSP',
            'GENERIC_MULTICAST',
            'GENERIC_MULTICAST',
            'HTTP_URL_PLUGIN',
        ].includes(camera.vendor);
        const motionEnabled = ![MotionType.NoMotion, MotionType.None].includes(
            camera.motionType as MotionType,
        );

        let defaultRatio = 0;
        const { bitrateInfos } = parsedAddParams;
        if (bitrateInfos) {
            const [x, y] = bitrateInfos.streams[0].resolution.split('x');
            defaultRatio = Number(x) / Number(y);
        }
        const multiStream = bitrateInfos && bitrateInfos.streams.length >= 2;
        const motionLowResEnabled =
            !camera.disableDualStreaming && (multiStream || parsedAddParams.hasDualStreaming);

        const newApi = this.serverManager.mediaserver instanceof NxSystemRestAPI;
        const recordingSettings: RecordingSettings = {
            recording: camera.scheduleEnabled && !camera.scheduleTasks.every(({ fps }) => !fps),
            quality: this.parseRecordingQuality(camera.scheduleTasks),
            fps: this.parseFps(camera.scheduleTasks, maxFps),
            motionEnabled,
            modes: [
                {
                    name: 'always',
                    id: newApi ? RecordingType.META_ALWAYS : RecordingType.ALWAYS,
                    value: this.recordingScheduleForType(camera, [
                        RecordingType.META_ONLY,
                        RecordingType.ALWAYS,
                    ]),
                    enabled: true,
                },
                {
                    name: 'motion',
                    id: newApi ? RecordingType.META_ONLY : RecordingType.MOTION_ONLY,
                    value: this.recordingScheduleForType(camera, [
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
                        : this.recordingScheduleForType(camera, [
                              RecordingType.META_LOW,
                              RecordingType.MOTION_LOW,
                          ]),
                    enabled: motionLowResEnabled && motionEnabled,
                },
            ],
        };
        const deviceType = this.camerasHealth[cleanId(camera.id)]
            ? this.camerasHealth[cleanId(camera.id)].info.type
            : 'Camera';

        const {
            id,
            name,
            vendor,
            model,
            url,

            parentId,
            audioEnabled,
            controlEnabled,
            motionType,
            motionMask,
            scheduleEnabled,
            scheduleTasks,
            backupPolicy,
            backupQuality,
            backupContentType,
        } = camera;
        return {
            id,
            name,
            vendor,
            model,
            url,

            parentId,
            audioEnabled,
            controlEnabled,
            motionType: motionType as MotionType,
            motionMask,
            scheduleEnabled,
            scheduleTasks,
            backupPolicy,
            backupQuality,
            backupContentType,

            addParams,
            backupType,
            status,

            defaultRatio,
            deviceType,
            isStream,
            maxFps,
            motionEnabled,
            motionLowResEnabled,
            parentName,
            parsedAddParams,
            previewUrl,
            recordingSettings,
            webRtcUrl,
            online,
            unauthorized,
        };
    };

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
        return this.serverManager.mediaserver.updateRecordingSettings(updateParams).toPromise();
    }

    private parseFps(schedule: Task[], max: number): number | 'various' {
        const schedulesWithFps = schedule
            .filter(s => s.fps !== 0 && s.recordingType !== RecordingType.NEVER)
            .map(s => s.fps);
        const currentFps = Array.from(new Set(schedulesWithFps));
        if (schedulesWithFps.length === 0) {
            return max;
        } else if (currentFps.length === 1) {
            return currentFps[0];
        } else {
            return 'various';
        }
    }

    private parseRecordingQuality(schedule: Task[]): StreamQuality {
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
        { scheduleTasks }: ec2CameraEx,
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

    private parseCameraStatus(
        { status, scheduleEnabled, scheduleTasks, parentId }: ec2CameraEx,
        restSystem = true,
    ): string {
        if (!scheduleEnabled) {
            return status;
        }

        if (restSystem) {
            return status === 'Recording' ? status : 'Scheduled';
        }

        const serverTime = this.serverTimes.find(({ serverId }) => serverId === parentId);
        let recording = false;
        if (serverTime) {
            // Intentionally made descriptive ... I dislike time manipulation
            const { timeZoneOffset: serverTimeZoneOffsetMs, vmsTime: vmsTimeMs } = serverTime;
            const localTimeZoneOffsetMs = new Date().getTimezoneOffset() * MS.min;
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
        return recording && status !== 'Offline' ? 'Recording' : 'Scheduled';
    }

    public hasArchives(): Observable<string[]> {
        return this.serverManager.mediaserver
            .getCameraHistoryItems()
            .pipe(map(res => flatten(res.map(({ archivedCameras }) => archivedCameras))));
    }

    public getRecordedTimes(cameraId: string[], baseCanvasSize = 36000): Observable<TimeDetail[]> {
        const tenSecondsInMs = 10 * 1000;
        let first = Infinity;
        let resolution = 1;
        const params = {
            cameraId,
            groupBy: 'cameraId',
            keepSmallChunks: true,
            detail: 1,
            startTime: 0,
            endTime: 0,
        };
        return timer(0, tenSecondsInMs).pipe(
            switchMap(() => {
                params.startTime = params.endTime;
                params.endTime = Date.now();
                return this.serverManager.mediaserver.recordedTimePeriods(params);
            }),
            map(times => {
                times.forEach(({ periods }) => {
                    first = Math.min(parseInt(periods[0].startTimeMs), first);
                });
                resolution = Math.round((Date.now() - first) / baseCanvasSize);
                return times.reduce((acc, { guid: cameraId, periods }) => {
                    acc.push(
                        ...periods.map(({ startTimeMs, durationMs }) => {
                            startTimeMs = parseInt(startTimeMs);
                            durationMs = parseInt(durationMs);
                            const endTimeMs = startTimeMs + durationMs;
                            const start = Math.round((startTimeMs - first) / resolution);
                            const end = Math.max(
                                Math.round((endTimeMs - first) / resolution),
                                start + 1,
                            );
                            return { cameraId, startTimeMs, durationMs, endTimeMs, start, end };
                        }),
                    );
                    return acc.sort(paramSortFunc<TimeDetail>(period => period.startTimeMs));
                }, [] as TimeDetail[]);
            }),
            scan((acc, curr) => {
                if (!acc.length) {
                    return curr;
                }

                curr = curr.filter(current => !acc.find(existing => isEqual(current, existing)));

                if (curr.length) {
                    acc.push(...curr);
                }

                return acc;
            }, []),
            distinctUntilChanged(isEqual),
            switchMap(records =>
                !records.length || records[records.length - 1].durationMs !== -1
                    ? Promise.resolve(records)
                    : interval(0, animationFrameScheduler).pipe(
                          map(() => {
                              const last = records[records.length - 1];
                              last.endTimeMs = Date.now();
                              updateDuration(last);
                              return records;
                          }),
                      ),
            ),
        );
    }
}
