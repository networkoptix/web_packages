import type {
    BitrateInfos,
    BoolNum,
    IoSetting,
    MediaCapabilities,
    MediaStreams,
    StreamUrls,
} from '@services/system.service/camera-manager/add-params.types';
import {
    CameraStatus,
    DeviceType,
    RecordingStatus,
} from '@services/system.service/camera-manager/camera-manager-types';
import type { MotionType } from '@services/system.service/camera-manager/camera-manager-types';
import type { NxRecursiveKeyMap } from '@utils/nx';

import { HiddenParams, NormalResponse, Param } from '.';

export interface Task {
    bitrateKbps: number;
    dayOfWeek: number;
    endTime: number;
    fps: number;
    metadataTypes: string;
    recordingType: string;
    startTime: number;
    streamQuality: string;
}

export interface ec2Camera {
    groupId: string;
    groupName: string;
    id: string;
    mac: string;
    manuallyAdded: boolean;
    model: string;
    name: string;
    parentId: string;
    physicalId: string;
    statusFlags: string;
    typeId: string;
    url: string;
    vendor: string;
}

export interface ec2CameraEx extends ec2Camera {
    addParams: Param[];
    audioEnabled: boolean;
    backupContentType: string;
    backupPolicy: string;
    backupQuality: string;
    backupType?: string;
    controlEnabled: boolean;
    dewarpingParams: string;
    disableDualStreaming: boolean;
    failoverPriority: string;
    licenseUsed: boolean;
    logicalId: string;
    maxArchiveDays: number;
    maxArchivePeriodS: number;
    minArchiveDays: number;
    minArchivePeriodS: number;
    motionMask: string;
    motionType: MotionType;
    preferredServerId: string;
    recordAfterMotionSec: number;
    recordBeforeMotionSec: number;
    scheduleEnabled: boolean;
    scheduleTasks: Task[];
    status: CameraStatus | RecordingStatus.Recording; // v5 systems have "Recording" on status
    userDefinedGroupName: string;
}

export interface DeviceV1Full {
    backupQuality: string;
    capabilities: string;
    credentials: { user: string; password: string };
    group: { id: string; name: string };
    id: string;
    isLicenseUsed: boolean;
    isManuallyAdded: boolean;
    logicalId: string;
    mac: string;
    model: string;
    motion: {
        mask: string;
        recordAfterS: number;
        recordBeforeS: number;
        type: MotionType;
    };
    name: string;
    options: {
        backupContentType: string;
        backupPolicy: string;
        backupQuality: string;
        dewarpingParams: string;
        failoverPriority: string;
        isAudioEnabled: boolean;
        isControlEnabled: boolean;
        isDualStreamingDisabled: boolean;
        preferredServerId: string;
    };
    /** `_keepDefault` doesn't appear to work on `parameters`. `_with` will filter out
     * params not on the list, but won't force all the listed params to appear.
     */
    parameters?: Partial<{
        DeviceUrl: string;
        VideoLayout: string;
        bitrateInfos: BitrateInfos;
        bitratePerGOP: number;
        compatibleAnalyticsEngines: string[];
        defaultPreferredPtzPresetType: string;
        deviceAgentManifests: {
            key: string;
            value: Record<string, unknown>;
        }[];
        deviceAgentsSettingsValuesProperty: {
            key: string;
            value: Record<string, unknown>;
        }[];
        // Multiple nested layers on these two, not going to fill these out unless needed
        deviceType: DeviceType;
        dontRecordPrimaryStream: BoolNum;
        dontRecordSecondayStream: BoolNum;
        driverClass: string;
        firmware: number;
        forcedIsAudioSupported: BoolNum;
        forcedLicenseType: string;
        forcedMotionDetection: boolean;
        hasDualStreaming: BoolNum;
        http_port: string;
        ioSettings: IoSetting[];
        isAudioSupported: BoolNum;
        keepCameraTimeSettings: BoolNum;
        mediaCapabilities: MediaCapabilities;
        mediaStreams: MediaStreams;
        motionStream: string;
        overrideAr: number;
        ptzCapabilities: number;
        ptzPresets: Record<string, unknown>; // No examples found
        remoteArchiveMotionDetection: string;
        remoteArchiveSynchronizationEnabled: BoolNum;
        rotation: number;
        rtpTransport: string;
        streamUrls: StreamUrls;
        supportedMotion: string;
        trustCameraTime: BoolNum;
        useMedia2ToFetchProfiles: string;
        userEnabledAnalyticsEngines: unknown[]; // No examples found
        virtualCameraIgnoreTimeZone: string;
        customGroupId: string;
    }>;
    pysicalId: string;
    schedule: {
        isEnabled: boolean;
        maxArchiveDays: number;
        maxArchivePeriodS: number;
        minArchiveDays: number;
        minArchivePeriodS: number;
        tasks: Task[];
    };
    serverId: string;
    status: CameraStatus | RecordingStatus.Recording;
    typeId: string;
    url: string;
    vendor: string;
}

const sharedTopLevelKeyMap = {
    id: true,
    name: true,
    vendor: true,
    model: true,
    url: true,
    serverId: true,
    status: true,
    typeId: true,
    capabilities: true,
} satisfies NxRecursiveKeyMap<DeviceV1Full>;

export const cameraKeyMapV1 = {
    ...sharedTopLevelKeyMap,
    options: {
        backupContentType: true,
        backupPolicy: true,
        backupQuality: true,
        isAudioEnabled: true,
        isControlEnabled: true,
        isDualStreamingDisabled: true,
        dewarpingParams: true,
    },
    parameters: {
        bitrateInfos: {
            streams: { resolution: true },
        },
        deviceType: true,
        hasDualStreaming: true,
        ioSettings: { id: true },
        isAudioSupported: true,
        mediaCapabilities: {
            streamCapabilities: {
                key: true,
                value: { maxFps: true },
            },
            hasAudio: true,
        },
        mediaStreams: {
            streams: { codec: true, encoderIndex: true, resolution: true },
        },
        motionStream: true,
        overrideAr: true,
        rotation: true,
        supportedMotion: true,
        VideoLayout: true,
        customGroupId: true,
    },
    motion: {
        mask: true,
        type: true,
    },
    schedule: {
        isEnabled: true,
        tasks: {
            // 'bitrateKbps': true,
            dayOfWeek: true,
            endTime: true,
            fps: true,
            // 'metadataTypes': true,
            recordingType: true,
            startTime: true,
            streamQuality: true,
        },
    },
} satisfies NxRecursiveKeyMap<DeviceV1Full>;

export interface DeviceV2Full extends DeviceV1Full {
    deviceType: DeviceType; // Moved from parameters to top level property
    parameters?: Omit<NonNullable<DeviceV1Full['parameters']>, 'deviceType'>;
}

const { deviceType: _, ...v2ParamsKeyMap } = cameraKeyMapV1.parameters;

export const cameraKeyMapV2 = {
    ...sharedTopLevelKeyMap,
    deviceType: true,
    credentials: true,
    options: cameraKeyMapV1.options,
    parameters: v2ParamsKeyMap,
    motion: cameraKeyMapV1.motion,
    schedule: cameraKeyMapV1.schedule,
} satisfies NxRecursiveKeyMap<DeviceV2Full>;

export type DevicesParams = Omit<HiddenParams, '_local'>;

export type Ec2RecordedTimePeriodsResp = NormalResponse<
    {
        guid: string; // Camera id
        periods: {
            durationMs: string;
            startTimeMs: string;
        }[];
    }[]
>;

export type Ec2CameraHistoryItems = {
    archivedCameras: string[];
    serverGuid: string;
}[];

export type BookmarksParams = HiddenParams &
    Partial<{
        deviceId: string[];
        startTimeMs: number;
        endTimeMs: number;
        text: string;
        limit: number;
        order: 'asc' | 'desc';
        column:
            | 'name'
            | 'startTime'
            | 'duration'
            | 'creationTime'
            | 'creator'
            | 'tags'
            | 'description'
            | 'cameraName';
        minVisibleLengthMs: number;
        creationStartTimeMs: number;
        creationEndTimeMs: number;
        _orderBy: Boomarks_orderBy | Boomarks_orderBy[];
        shareFilter: 'shared' | 'notShared';
    }>;
type Boomarks_orderBy =
    | 'id'
    | 'deviceId'
    | 'name'
    | 'description'
    | 'startTimeMs'
    | 'durationMs'
    | 'creatorUserId'
    | 'creationTimeMs';

export interface BookmarkV1 {
    creationTimeMs: number;
    creatorUserId: string;
    description: string;
    deviceId: string;
    durationMs: number;
    id: string;
    name: string;
    startTimeMs: number;
    tags?: string[];
}

export interface BookmarkV4 extends BookmarkV1 {
    // if share exists then bookmark is publicly visible
    share?: {
        expirationTimeMs: number;
        password: '' | '******';
    };
}

export type Bookmark = BookmarkV1 | BookmarkV4;

export interface BookmarksTagsParams extends Omit<HiddenParams, '_with' | '_orderBy'> {
    limit?: number;
}
export interface BookmarksTags {
    [tagName: string]: number;
}
