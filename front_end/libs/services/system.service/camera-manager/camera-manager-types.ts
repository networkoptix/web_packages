import type { Observable } from 'rxjs';

import type { Task } from '@services/system-api.types';

import type { ParsedAddParams } from './add-params.types';

export interface NxSystemCamera {
    // Shared
    id: string;
    name: string;
    vendor: string;
    model: string;
    url: string;

    // Renamed
    parentId: string; // serverId
    audioEnabled: boolean; // options.isAudioEnabled
    controlEnabled: boolean; // options.isControlEnabled
    motionType: MotionType; // motion.type
    motionMask: string; // motion.mask
    scheduleEnabled: boolean; // schedule.isEnabled
    scheduleTasks: Task[]; // schedule.tasks (missing metadata types)
    backupPolicy: string; // options.backupPolicy
    backupQuality: string; // options.backupQuality
    backupContentType: string; // options.backupContentType

    // Modified
    addParams: Record<string, string>; // Unpacked array of name/value objects
    backupType: string; // backupType (v4 systems) || backupContentType (v5)
    status: CameraStatus; // Replace "Recording" with "Online"

    // Calculated
    defaultRatio: number;
    deviceType: string;
    isStream: boolean;
    maxFps: number;
    motionEnabled: boolean;
    motionLowResEnabled: boolean;
    parentName: string;
    parsedAddParams: ParsedAddParams;
    previewUrl: Observable<string>;
    recordingSettings: RecordingSettings;
    recordingStatus: RecordingStatus;
    webRtcUrl: ((param: { position: string | null }) => string) | null;
}

export type TaskUpdate = Pick<Task, 'fps' | 'recordingType' | 'streamQuality'>;
export type CameraUpdate = Pick<
    NxSystemCamera,
    'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'motionType' | 'motionMask'
>;

export interface SaveCameraUserAttributes extends CameraUpdate {
    scheduleTasks?: Omit<Task, 'metadataTypes'>[];
}

export enum CameraStatus {
    Online = 'Online',
    Offline = 'Offline',
    Unauthorized = 'Unauthorized',
}

export enum RecordingStatus {
    Recording = 'Recording',
    Scheduled = 'Scheduled',
    Archive = 'Archive',
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
    META_LOW = 'metadataAndLowQuality',
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
