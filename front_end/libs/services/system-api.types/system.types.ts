import {
    CameraStatus,
    DeviceType,
    RecordingStatus,
} from '@services/system.service/camera-manager/camera-manager-types';

import type { NormalResponse, Param } from './system-api.types';

export class SystemConfigSettings {
    cloudAccountName: string;
    cloudHost: string;
    cloudSystemID: string;
    localSystemId: string;
    specificFeatures: Record<string, unknown>;
    statisticsAllowed: boolean;
    statisticsReportLastNumber: number;
    statisticReportsLastTime: Date;
    statisticReportLastVersion: string;
    systemName: string;
    mergeInfo: MergeInfo;
    settingsPreset: string;

    constructor(params: Param[]) {
        params.forEach(({ name, value }) => {
            this[name] = value;
        });
    }
}

export interface Settings {
    additionalLocalFsTypes: string;
    arecontRtspEnabled: string;
    auditTrailEnabled: string;
    auditTrailPeriodDays: string;
    autoDiscoveryEnabled: string;
    autoDiscoveryResponseEnabled: string;
    autoUpdateThumbnails: string;
    backupNewCamerasByDefault: string;
    backupQualities: string;
    cameraSettingsOptimization: string;
    clientStatisticsSettingsUrl: string;
    cloudAccountName: string;
    cloudConnectRelayingEnabled: string;
    cloudConnectUdpHolePunchingEnabled: string;
    cloudHost: string;
    cloudSystemID: string;
    crossdomainEnabled: string;
    defaultExportVideoCodec: string;
    defaultVideoCodec: string;
    disabledVendors: string;
    downloaderPeers: string;
    ec2AliveUpdateIntervalSec: string;
    ec2ConnectionKeepAliveTimeoutSec: string;
    ec2KeepAliveProbeCount: string;
    emailFrom: string;
    emailSignature: string;
    emailSupportEmail: string;
    enableEdgeRecording: string;
    eventLogPeriodDays: string;
    forceLiveCacheForPrimaryStream: string;
    installedUpdateInformation: string;
    lastMergeMasterId: string;
    lastMergeSlaveId: string;
    ldapAdminDn: string;
    ldapSearchBase: string;
    ldapSearchFilter: string;
    ldapSearchTimeoutS: string;
    ldapUri: string;
    licenseServer: string;
    localSystemId: string;
    lowQualityScreenVideoCodec: string;
    maxDifferenceBetweenSynchronizedAndInternetTime: string;
    maxDifferenceBetweenSynchronizedAndLocalTimeMs: string;
    maxEventLogRecords: string;
    maxP2pAllClientsSizeBytes: string;
    maxP2pQueueSizeBytes: string;
    maxRecordQueueSizeBytes: string;
    maxRecordQueueSizeElements: string;
    maxRemoteArchiveSynchronizationThreads: string;
    maxRtpRetryCount: string;
    maxRtspConnectDurationSeconds: string;
    maxSceneItems: string;
    maxVirtualCameraArchiveSynchronizationThreads: string;
    maxHttpTranscodingSessions: string;
    metadataStorageChangePolicy: string;
    osTimeChangeCheckPeriodMs: string;
    primaryTimeServer: string;
    proxyConnectTimeoutSec: string;
    pushNotificationsLanguage: string;
    resourceFileUri: string;
    rtpTimeoutMs: string;
    sequentialFlirOnvifSearcherEnabled: string;
    serverDiscoveryPingTimeoutSec: string;
    sessionLimitMinutes: string;
    smtpConnectionType: string;
    smtpHost: string;
    smtpPort: string;
    smtpSimple: string;
    smtpTimeout: string;
    smtpUser: string;
    specificFeatures: string;
    statisticsAllowed: string;
    statisticsReportLastNumber: string;
    statisticsReportLastTime: string;
    statisticsReportLastVersion: string;
    statisticsReportServerApi: string;
    statisticsReportTimeCycle: string;
    statisticsReportUpdateDelay: string;
    syncTimeEpsilon: string;
    syncTimeExchangePeriod: string;
    systemName: string;
    takeCameraOwnershipWithoutLock: string;
    targetUpdateInformation: string;
    timeSynchronizationEnabled: string;
    trafficEncryptionForced: string;
    updateNotificationsEnabled: string;
    upnpPortMappingEnabled: string;
    useTextEmailFormat: string;
    useWindowsEmailLineFeed: string;
    videoTrafficEncryptionForced: string;
    watermarkSettings: string;
    webSocketEnabled: string;
}

export interface SystemSettings {
    settings: Settings;
}

export type SystemSettingsResp = NormalResponse<SystemSettings>;

export interface AlarmsReply {
    cameras?: {
        [id: string]: {
            availability: {
                status?: { level: string; text: string }[];
                offlineEvents?: { level: string; text: string }[];
            };
        };
    };
    servers?: {
        [id: string]: {
            [key: string]: {
                [key: string]: {
                    level: string;
                    text: string;
                }[];
            };
        };
    };
}

export interface ManifestReplyObjects {
    id: string;
    name: string;
    resource: string;
    values: {
        id: string;
        name: string;
        values: {
            description: string;
            display: string;
            format: string;
            id: string;
            name: string;
        }[];
    }[];
}

export interface CameraValues {
    [id: string]: {
        _: {
            name: string;
            thumbnail: string;
        };
        availability: {
            ipConflicts: number;
            ipConflicts3min: number;
            offlineEvents: number;
            status: CameraStatus | RecordingStatus.Recording;
            streamIssues: number;
            streamIssues1h: number;
        };
        info: {
            firmware: string;
            ip: string;
            model: string;
            recording: string;
            server: string;
            type: DeviceType;
            vendor: string;
        };
        secondaryStream: {
            recommendedMaxSecondaryResolution: string;
        };
        storage: {
            hasArchiveRotated: boolean;
        };
    };
}

interface NetworkInterfaces {
    [id: string]: {
        _: { name: string };
        info: {
            displayAddress: string;
            otherAddresses: string[];
            server: string;
            state: string;
        };
        rates: {
            inBps: number;
            inBps1m: number;
            outBps: number;
            outBps1m: number;
        };
    };
}

interface Servers {
    [id: string]: {
        _: { name: string };
        activity: {
            actionsTriggered: number;
            actionsTriggered1m: number;
            activePlugins: string;
            apiCalls: number;
            apiCalls1m: number;
            thumbnails: number;
            thumbnails1m: number;
            transactionsPerSecond: number;
            transactionsPerSecond1m: number;
        };
        availability: {
            offlineEvents: number;
            status: string;
            uptimeS?: number;
        };
        info: {
            cpu: string;
            cpuCores?: number;
            os: string;
            osTime?: string;
            publicIp: string;
            ram: number;
            vmsTime?: string;
            vmsTimeChanged?: number;
            vmsTimeChanged24h?: number;
        };
        load: {
            cameras: number;
            cpuUsageP?: number;
            decodedPixels?: number;
            decodingSpeed3s?: number;
            decodingThreads?: number;
            encodedPixels?: number;
            encodingSpeed3s?: number;
            encodingThreads?: number;
            incomingConnections?: number;
            logLevel?: string;
            outgoingConnections?: number;
            primaryStreams?: number;
            ramUsageB?: number;
            ramUsageP?: number;
            secondaryStreams?: number;
            serverCpuUsageP?: number;
            serverRamUsage?: number;
            serverRamUsageP?: number;
            threads?: number;
        };
    };
}

interface Storage {
    [id: string]: {
        _: { name: string };
        activity: {
            readRateBps: number;
            readRateBps1m: number;
            transactionsPerSecond: number;
            writeRateBps: number;
            writeRateBps1m: number;
        };
        info: {
            server: string;
            type: string;
        };
        space: { totalSpaceB: number };
        state: {
            issues: number;
            issues24h: number;
            status: string;
            systemStatus: string;
        };
    };
}

interface SystemInfo {
    [id: string]: {
        info: {
            cameras: number;
            name: string;
            recommendedMaxCameras: number;
            recommendedMaxServers: number;
            servers: number;
            storages: number;
            users: number;
            version: string;
        };
    };
}

export interface ValuesReply {
    cameras: CameraValues;
    networkInterfaces: NetworkInterfaces;
    servers: Servers;
    storage: Storage;
    systems: SystemInfo;
}

export interface Alarms extends NormalResponse<AlarmsReply> {}
export interface Manifests extends NormalResponse<Array<ManifestReplyObjects>> {}
export interface Values extends NormalResponse<ValuesReply> {}

export interface DiscoveredPeersReply {
    brand: string;
    cloudHost: string;
    cloudOwnerId: string;
    cloudSystemId: string;
    customization: string;
    ecDbReadOnly: boolean;
    flags?: Record<string, boolean>;
    hwPlatform: string;
    id: string;
    localSystemId: string;
    name: string;
    osInfo: {
        platform: string;
        variant: string;
        variantVersion: string;
    };
    port: number;
    protoVersion: number;
    realm: string;
    remoteAddresses: string[];
    runtimeId: string;
    serverFlags: string;
    sslAllowed: boolean;
    status: string;
    systemName: string;
    type: string;
    version: string;
}

export interface DiscoveredPeers extends NormalResponse<DiscoveredPeersReply[]> {}

export interface MergeSystems extends NormalResponse<DiscoveredPeersReply> {}

interface MergeStatusReply {
    mergeId: string;
    mergeInProgress: boolean;
}
export interface MergeStatus extends NormalResponse<MergeStatusReply> {}

export interface MergeInfo {
    primary: {
        id: string;
        name: string;
    };
    secondary: {
        id: string;
        name: string;
    };
    role: string;
    anotherSystemId: string;
    startTime?: string;
}

export type Statistics = NormalResponse<{
    statistics: {
        description: string;
        deviceFlags: number;
        deviceType: string;
        value: number;
    }[];
    updatePeriod: number;
    uptimeMs: number;
}>;
