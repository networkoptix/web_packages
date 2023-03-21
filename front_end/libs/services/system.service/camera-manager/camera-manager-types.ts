import { Observable } from 'rxjs';

import type { ec2CameraEx, Task } from '@services/system-api.types';

import type { ParsedAddParams } from './add-params.types';

export interface NxSystemCamera extends Omit<ec2CameraEx, 'addParams'> {
    addParams: Record<string, string>; // Unpacked array of name/value objects
    backupType: string; // Always defined
    motionType: MotionType; // Specific strings

    dayOfWeek: number;
    defaultRatio: number;
    deviceType: string;
    isStream: boolean;
    liveUrl: string;
    maxFps: number;
    motionEnabled: boolean;
    motionLowResEnabled: boolean;
    parentName: string;
    parsedAddParams: ParsedAddParams;
    previewUrl: Observable<string>;
    recordingSettings: RecordingSettings;
    secondsToday: number;
    webRtcUrl: (params?: Record<string, unknown>) => string;
    online: boolean;
}

export type TaskUpdate = Pick<Task, 'fps' | 'recordingType' | 'streamQuality'>;
export type CameraUpdate = Pick<NxSystemCamera, 'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'motionType' | 'motionMask'>;

export interface SaveCameraUserAttributes extends CameraUpdate {
    scheduleTasks?: Omit<Task, 'metadataTypes'>[];
}

export interface IPartialCamera {
    deviceType: string;
    id: string;
    name: string;
    parentId: string;
    scheduleEnabled: boolean;
    status: string;
    url: string;
}

export interface PartialCameraRest {
    deviceType: string;
    id: string;
    name: string;
    schedule: {
        isEnabled: boolean;
    };
    serverId: string;
    status: string;
    url: string;
}

export enum MotionType {
    // 4.3 systems
    HardwareGrid = 'hardware',
    SoftwareGrid = 'software',
    NoMotion = 'none',

    // All systems
    Default = '2',
    Hardware = '1',
    Software = '2',
    MotionWIndow = '4',
    None = '8',
}

export interface RecordingSettings {
    recording: boolean;
    quality: StreamQuality;
    fps: number | 'various';
    motionEnabled: boolean;
    modes: RecordingModes[];
}

export interface RecordingModes {
    name: string;
    id: RecordingType;
    value: 0 | 1 | 2; // 0: None scheduled, 1: Some scheduled, 2: All scheduled
    enabled: boolean;
}

export enum RecordingType {
    ALWAYS = 'RT_Always',
    MOTION_ONLY = 'RT_MotionOnly',
    MOTION_LOW = 'RT_MotionAndLowQuality',
    NEVER = 'RT_Never',

    // Rest API
    META_NEVER = 'never',
    META_ALWAYS = 'always',
    META_ONLY = 'metadataOnly',
    META_LOW = 'metadataAndLowQuality'
}

export type StreamQuality = 'low' | 'normal' | 'high' | 'highest' | 'various';

export interface TimeDetail {
    cameraId: string;
    startTimeMs: number;
    endTimeMs: number;
    durationMs: number;
    start: number;
    end: number;
}
