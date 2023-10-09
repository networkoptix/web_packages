import type { Observable } from 'rxjs';

import type { DeviceV2Full, Task, cameraKeyMapV2, ec2CameraEx } from '@services/system-api.types';
import type { NxRecursivePick } from '@utils/nx';

export interface Credentials {
    user: string;
    password: string;
}

export type RestV1CameraCompat = Pick<
    ec2CameraEx,
    | 'id'
    | 'name'
    | 'vendor'
    | 'model'
    | 'status'
    | 'url'
    | 'disableDualStreaming'
    | 'parentId'
    | 'audioEnabled'
    | 'controlEnabled'
    | 'motionType'
    | 'motionMask'
    | 'scheduleEnabled'
    | 'backupContentType'
    | 'backupPolicy'
    | 'backupQuality'
> & { deviceType: DeviceType; scheduleTasks: ScheduleTask[]; parameters: CamParameters };

export type ScheduleTask = NxRecursivePick<
    DeviceV2Full['schedule'],
    (typeof cameraKeyMapV2)['schedule']
>['tasks'][number];
// Removed bitrateKbps and metadataTypes

type CamParameters = NxRecursivePick<
    DeviceV2Full['parameters'],
    (typeof cameraKeyMapV2)['parameters']
>;
// Using deviceV2 because we don't want deviceType in the params
// Cut down object params to only used properties

export interface RestV2CameraCompat extends RestV1CameraCompat {
    credentials: Credentials;
}

export type PreprocessCamera = ec2CameraEx | RestV1CameraCompat | RestV2CameraCompat;

export interface NxSystemCamera {
    // Shared
    id: string; // Unwrapped
    name: string;
    vendor: string;
    model: string;
    url: string;

    // Compatibility patches
    parentId: string; // serverId
    audioEnabled: boolean; // options.isAudioEnabled
    controlEnabled: boolean; // options.isControlEnabled
    motionType: MotionType; // motion.type
    motionMask: string; // motion.mask
    scheduleEnabled: boolean; // schedule.isEnabled
    scheduleTasks: ScheduleTask[]; // schedule.tasks
    backupContentType: string; // options.backupContentType
    backupPolicy: string; // options.backupPolicy
    backupQuality: string; // backupType (v4) => backupQuality (v5/ec2) => options.backupQuality (rest)
    credentials?: Credentials;
    /* Inside addParams in legacy, but 5.0 systems have a bug where requesting it
    using `_with` on a camera that doesn't have credentials will cause the id of the camera in
    the response to be all zeroes. The workaround for this is to only try getting credentials
    for rest systems in the dialog to change camera credentials where it is used. */
    parameters: CamParameters; // raw addParams in legacy, already parsed in rest
    status: CameraStatus; // Replace "Recording" with "Online" for v5 systems
    deviceType: DeviceType; // Not included on ec2 => parameters.deviceType on restV1 => deviceType on restV2

    // Calculated
    defaultRatio: number;
    isStream: boolean;
    maxFps: number;
    previewUrl: Observable<string>;
    recordingSettings: RecordingSettings;
    recordingStatus: RecordingStatus;
    webRtcUrl: ((param: { position: string | null }) => string) | null;
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

export enum DeviceType {
    Camera = 'Camera',
    Nvr = 'NVR',
    // io device
    // virtual camera
    // Supposed to be more than two types, but no example checks for them
}

export enum MotionType {
    // 4.3 systems
    HardwareGrid = 'hardware',
    SoftwareGrid = 'software',
    NoMotion = 'none',

    // All systems
    Default = '0',
    Hardware = '1',
    Software = '2',
    MotionWindow = '4',
    None = '8',
}

export interface RecordingSettings {
    recording: boolean;
    quality: StreamQuality;
    fps: number | 'various';
    motionEnabled: boolean;
    motionLowResEnabled: boolean;
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

export enum StreamQuality {
    LOW = 'low',
    MEDIUM = 'normal',
    HIGH = 'high',
    BEST = 'highest',
    VARIOUS = 'various',
}

export interface TimeDetail {
    guid: string;
    periods: {
        durationMs: string;
        startTimeMs: string;
    }[];
}

export type TaskUpdate = Pick<Task, 'fps' | 'recordingType' | 'streamQuality'>;
export type CameraUpdate = Pick<
    NxSystemCamera,
    'id' | 'name' | 'audioEnabled' | 'scheduleEnabled' | 'motionType' | 'motionMask'
>;

export interface SaveCameraUserAttributes extends CameraUpdate {
    scheduleTasks?: Omit<Task, 'metadataTypes'>[];
}
