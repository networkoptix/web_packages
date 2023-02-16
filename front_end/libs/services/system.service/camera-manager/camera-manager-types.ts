import { Observable } from 'rxjs';

export interface IAddParamsRaw {
    name: string;
    value: string;
}

export type IParsedAddParams = Partial<_ParsedAddParams>;

export interface ICamera {
    addParams?: IAddParamsRaw[];
    addParamsRaw?: IAddParamsRaw[]
    parsedAddParams: IParsedAddParams;
    rotation?: number | string;
    overrideAr?: number | string;
    isAudioSupported: boolean;
    audioEnabled: boolean;
    backupType: string;
    controlEnabled: boolean;
    defaultRatio: number;
    dewarpingParams: string;
    deviceType: string;
    disableDualStreaming: boolean;
    failoverPriority: string;
    groupId: string;
    groupName: string;
    id: string;
    licenseUsed: boolean;
    motionLowResEnabled: boolean;
    logicalId: string;
    mac: string;
    manuallyAdded: boolean;
    maxArchiveDays: number;
    minArchiveDays: number;
    model: string;
    motionMask: string;
    motionType: MotionType;
    motionEnabled: boolean | string;
    maxFps: number;
    mediaCapabilities: IMediaCapabilities;
    name: string;
    parentId: string;
    parentName: string;
    physicalId: string;
    preferredServerId: string;
    recordAfterMotionSec: number;
    recordBeforeMotionSec: number;
    scheduleEnabled: boolean;
    scheduleTasks: ITask[];
    status: string;
    statusFlags: string;
    typeId: string;
    url: string;
    userDefinedGroupName: string;
    vendor: string;
    previewUrl: Observable<string>;
    webRtcUrl: (params?: Record<string, unknown>) => string;
    liveUrl: string;
    recordingSettings: IRecordingSettings;
    isStream: boolean;
    online: boolean;
}

export interface IPartialCamera {
    id: string;
    name: string;
    parentId: string;
    scheduleEnabled: boolean;
    status: string;
    url: string;
}

export interface PartialCameraRest {
    id: string;
    name: string;
    schedule: {
        isEnabled: boolean;
    }
    serverId: string;
    status: string;
    url: string;
}

export enum MotionType {
    hardwareGrid = 'hardware',
    softwareGrid = 'software',
    noMotion = 'none',
    // String enums above are returned from 4.3 systems getCamerasEx, enums below used for saving on all systems
    default = '2',
    hardware = '1',
    software = '2',
    motionWIndow = '4',
    none = '8',
}

export interface IMediaCapabilities {
    hasAudio: boolean;
    streamCapabilities: any;
}

export interface ITask {
    bitrateKbps: number;
    dayOfWeek: number;
    endTime: number;
    fps: number;
    recordingType: RecordingType;
    startTime: number;
    streamQuality: StreamQuality;
}

export interface IRecordingSettings {
    recording: boolean;
    quality: StreamQuality;
    fps: number | 'various' | any;
    motionEnabled: boolean;
    modes: IRecordingModes[];
}

export interface IRecordingModes {
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
    META_ALWAYS = 'always',
    META_ONLY = 'metadataOnly',
    META_LOW = 'metadataAndLowQuality'
}

export type StreamQuality = 'low' | 'normal' | 'high' | 'highest' | 'various';

export interface CustomStreamParams {
}

export interface Stream {
    codec: number;
    customStreamParams: CustomStreamParams;
    encoderIndex: number;
    resolution: string;
    transcodingRequired: boolean;
    transports: string[];
}

export interface MediaStreams {
    streams: Stream[];
}

export interface StreamUrls {
    1?: string;
    2?: string;
}

export interface BitrateInfoStreams {
    actualBitrate: number;
    actualFps: number;
    averageGopSize: number;
    bitrateFactor: number;
    bitratePerGop: boolean;
    encoderIndex: string;
    fps: number;
    isConfigured: boolean;
    numberOfChannels: number;
    rawSuggestedBitrate: number;
    resolution: string;
    suggestedBitrate: number;
    timestamp: Date;
}

export interface BitrateInfos {
    streams: BitrateInfoStreams[];
}

export interface IoSetting {
    autoResetTimeoutMs: number;
    iDefaultState: string;
    id: number;
    inputName: string;
    oDefaultState: string;
    outputName: string;
    portType: string;
    supportedPortTypes: string;
}

interface _ParsedAddParams {
    DeviceUrl: string;
    VideoLayout: string;
    cameraCapabilities: number;
    compatibleAnalyticsEngines: any[];
    credentials: string;
    driverClass: string;
    firmware: string;
    hasDualStreaming: number;
    ioSettings: IoSetting[];
    mediaStreams: MediaStreams;
    ptzCapabilities: number;
    streamUrls: StreamUrls;
    bitrateInfos: BitrateInfos;
    bitratePerGOP: number;
    dontRecordPrimaryStream: number;
    dontRecordSecondaryStream: number;
    mediaPort: string;
    rtpTransport: string;
    trustCameraTime: number;
    userEnabledAnalyticsEngines: any[];
    motionStream: string;
    streamFpsSharing: string;
    supportedMotion: string;
    defaultPreferredPtzPresetType: string;
}

export interface TimeDetail {
    cameraId: string;
    startTimeMs: number;
    endTimeMs: number;
    durationMs: number;
    start: number;
    end: number;
}
