// Add interfaces here for cloud api request

/**
 * Base response type, accepts a generic type/interface that gets assigned to the reply property.
 * Usage example below.
 *
 * export interface GetUserRoles extends NormalResponse<UserPermissions> {}
 */
export interface NormalResponse<Reply = {}> {
    error: string,
    errorString: string,
    reply: Reply
};

interface Permissions {
    none: boolean,
    admin: boolean,
    editCameras: boolean,
    controlVideowall: boolean,
    viewLogs: boolean,
    viewArchive: boolean,
    exportArchive: boolean,
    viewBookmarks: boolean,
    manageBookmarks: boolean,
    userInput: boolean,
    accessAllMedia: boolean,
    customUser: boolean,
    liveViewerPermissions: boolean,
    viewerPermissions: boolean,
    advancedViewerPermissions: boolean,
    adminPermissions: boolean,
    videowallModePermissions: boolean,
    acsModePermissions: boolean
};

export interface Settings {
    additionalLocalFsTypes: string,
    arecontRtspEnabled: string,
    auditTrailEnabled: string,
    auditTrailPeriodDays: string,
    autoDiscoveryEnabled: string,
    autoDiscoveryResponseEnabled: string,
    autoUpdateThumbnails: string,
    backupNewCamerasByDefault: string,
    backupQualities: string,
    cameraSettingsOptimization: string,
    clientStatisticsSettingsUrl: string,
    cloudAccountName: string,
    cloudConnectRelayingEnabled: string,
    cloudConnectUdpHolePunchingEnabled: string,
    cloudHost: string,
    cloudSystemID: string,
    crossdomainEnabled: string,
    defaultExportVideoCodec: string,
    defaultVideoCodec: string,
    disabledVendors: string,
    downloaderPeers: string,
    ec2AliveUpdateIntervalSec: string,
    ec2ConnectionKeepAliveTimeoutSec: string,
    ec2KeepAliveProbeCount: string,
    emailFrom: string,
    emailSignature: string,
    emailSupportEmail: string,
    enableEdgeRecording: string,
    eventLogPeriodDays: string,
    forceLiveCacheForPrimaryStream: string,
    installedUpdateInformation: string,
    lastMergeMasterId: string,
    lastMergeSlaveId: string,
    ldapAdminDn: string,
    ldapSearchBase: string,
    ldapSearchFilter: string,
    ldapSearchTimeoutS: string,
    ldapUri: string,
    licenseServer: string,
    localSystemId: string,
    lowQualityScreenVideoCodec: string,
    maxDifferenceBetweenSynchronizedAndInternetTime: string,
    maxDifferenceBetweenSynchronizedAndLocalTimeMs: string,
    maxEventLogRecords: string,
    maxP2pAllClientsSizeBytes: string,
    maxP2pQueueSizeBytes: string,
    maxRecordQueueSizeBytes: string,
    maxRecordQueueSizeElements: string,
    maxRemoteArchiveSynchronizationThreads: string,
    maxRtpRetryCount: string,
    maxRtspConnectDurationSeconds: string,
    maxSceneItems: string,
    maxWearableArchiveSynchronizationThreads: string,
    maxWebMTranscoders: string,
    metadataStorageChangePolicy: string,
    osTimeChangeCheckPeriodMs: string,
    primaryTimeServer: string,
    proxyConnectTimeoutSec: string,
    pushNotificationsLanguage: string,
    resourceFileUri: string,
    rtpTimeoutMs: string,
    sequentialFlirOnvifSearcherEnabled: string,
    serverDiscoveryPingTimeoutSec: string,
    sessionLimitMinutes: string,
    smtpConnectionType: string,
    smtpHost: string,
    smtpPort: string,
    smtpSimple: string,
    smtpTimeout: string,
    smtpUser: string,
    specificFeatures: string,
    statisticsAllowed: string,
    statisticsReportLastNumber: string,
    statisticsReportLastTime: string,
    statisticsReportLastVersion: string,
    statisticsReportServerApi: string,
    statisticsReportTimeCycle: string,
    statisticsReportUpdateDelay: string,
    syncTimeEpsilon: string,
    syncTimeExchangePeriod: string,
    systemName: string,
    takeCameraOwnershipWithoutLock: string,
    targetUpdateInformation: string,
    timeSynchronizationEnabled: string,
    trafficEncryptionForced: string,
    updateNotificationsEnabled: string,
    upnpPortMappingEnabled: string,
    useTextEmailFormat: string,
    useWindowsEmailLineFeed: string,
    videoTrafficEncryptionForced: string,
    watermarkSettings: string,
    webSocketEnabled: string
}
export interface SystemSettings extends NormalResponse<Settings> {};

interface SystemTimeReply {
    isTakenFromInternet: boolean,
    utcTimeMs: string
};
export interface SystemTime extends NormalResponse<SystemTimeReply> {};

interface UserPermissions {
    id: string,
    name: string,
    permissions: Permissions
}
export interface GetUserRoles extends NormalResponse<UserPermissions> {};

interface Params {
    name: string,
    value: string
};
interface AddParams extends Array<Params> {};
export interface GetStorages {
    addParams: AddParams,
    id: string,
    isBackup: boolean,
    name: string,
    parentId: string,
    spaceLimit: string,
    storageType: string,
    typeId: string,
    url: string,
    usedForWriting: boolean
};

interface ApiConfigureReply {
    restartNeeded: boolean;
}
export interface ApiConfigure extends NormalResponse<ApiConfigureReply> {};

export interface RestartServer extends NormalResponse<null> {};

interface ModuleInformationReply {
    brand: string,
    cloudHost: string,
    cloudSystemId: string,
    customization: string,
    ecDbReadOnly: boolean,
    hwPlatform: string,
    id: string,
    localSystemId: string,
    name: string,
    osInfo: {
        platform: string,
        variant: string,
        variantVersion: string
    },
    port: number,
    protoVersion: number,
    realm: string,
    remoteAddresses: string[],
    runtimeId: string,
    serverFlags: string,
    sslAllowed: true,
    systemName: string,
    type: string,
    version: string
};
export interface ModuleInformation extends NormalResponse<ModuleInformationReply> {};

interface LogLevelReply {
    EC2_TRAN: string,
    HTTP: string,
    HWID: string,
    MAIN: string,
    PERMISSIONS: string
};
export interface LogLevel extends NormalResponse<LogLevelReply> {};

interface PredefinedRoles {
    isOwner: boolean,
    name: string,
    permissions: string
};
interface ec2PredefinedRoles extends Array<PredefinedRoles> {};

interface Users {
    cryptSha512Hash: string,
    digest: string,
    email: string,
    fullName: string,
    hash: string,
    id: string,
    isAdmin: boolean,
    isCloud: boolean,
    isEnabled: boolean,
    isLdap: boolean,
    name: string,
    parentId: string,
    permissions: string,
    realm: string,
    typeId: string,
    url: string,
    userRoleId: string
};
interface ec2GetUsers extends Array<Users> {};

interface AggregatedUsersReply {
    'ec2/getPredefinedRoles': ec2PredefinedRoles,
    'ec2/getUserRoles': Array<null>,
    'ec2/getUsers': ec2GetUsers
};
export interface AggregatedUsers extends NormalResponse<AggregatedUsersReply> {};

export interface ChangedIdReturned {
    id: string
};

interface Tasks {
    bitrateKbps: number,
    dayOfWeek: number,
    endTime: number,
    fps: number,
    recordingType: string,
    startTime: number,
    streamQuality: string
};
interface ScheduledTasks extends Array<Tasks> {};
export interface GetCameras {
    addParams: AddParams,
    audioEnabled: boolean,
    backupType: string,
    controlEnabled: boolean,
    dewarpingParams: string,
    disableDualStreaming: boolean,
    failoverPriority: string,
    groupId: string,
    groupName: string,
    id: string,
    licenseUsed: boolean,
    logicalId: string,
    mac: string,
    manuallyAdded: boolean,
    maxArchiveDays: number,
    minArchiveDays: number,
    model: string,
    motionMask: string,
    motionType: string,
    name: string,
    parentId: string,
    physicalId: string,
    preferredServerId: string,
    recordAfterMotionSec: number,
    recordBeforeMotionSec: number,
    scheduleEnabled: boolean,
    scheduleTasks: ScheduledTasks,
    status: string,
    statusFlags: string,
    typeId: string,
    url: string,
    userDefinedGroupName: string,
    vendor: string
};

export interface EmptyObjectReturned {};

export interface GetMediaServers {
    addParams: AddParams,
    allowAutoRedundancy: boolean,
    authKey: string,
    backupBitrate: number,
    backupDaysOfTheWeek: string,
    backupDuration: number,
    backupStart: number,
    backupType: string,
    flags: string,
    id: string,
    maxCameras: number,
    metadataStorageId: string,
    name: string,
    networkAddresses: string,
    osInfo: string,
    parentId: string,
    status: string,
    storages: Array<GetStorages>,
    systemInfo: string,
    typeId: string,
    url: string,
    version: string
}

interface ec2GetMediaServers extends Array<GetMediaServers> {};
interface ec2GetCameras extends Array<GetCameras> {};
export interface AggregatedServersAndCameras {
    'ec2/getMediaServersEx': ec2GetMediaServers,
    'ec2/getCamerasEx': ec2GetCameras
};

interface ResourceTypes {
    id: string,
    name: string,
    parentId: string[],
    propertyTypes: {
        defaultValue: string,
        name: string,
        resourceTypeId: string,
    }[],
    vendor: string,
};

export interface GetResourceTypes extends Array<ResourceTypes> {};

interface AlarmsReply {
    cameras: {
        [id: string]: {
            availability: {
                status: { level: string, text: string }[]
            }
        }
    },
    servers: {
        [id: string]: {
            [key: string]: {
                [key: string]: {
                    level: string,
                    text: string
                }[]
            }
        }
    }
};

interface ManifestReplyObjects {
    id: string,
    name: string,
    resource: string,
    values: {
        id: string,
        name: string,
        values: {
            description: string,
            display: string,
            format: string,
            id: string,
            name: string
        }[]
    }[]
}

interface Cameras {
    [id: string]: {
        _: {
            name: string,
            thumbnail: string
        },
        availability: {
            ipConflicts: number,
            ipConflicts3min: number,
            offlineEvents: number,
            status: string,
            streamIssues: number,
            streamIssues1h: number
        },
        info: {
            firmware: string,
            ip: string,
            model: string,
            recording: string,
            server: string,
            type: string,
            vendor: string
        },
        secondaryStream: {
            recommendedMaxSecondaryResolution: string
        },
        storage: {
            hasArchiveRotated: boolean
        }
    }
}

interface NetworkInterfaces {
    [id: string]: {
        _: { name: string },
        info: {
            displayAddress: string,
            otherAddresses: string[],
            server: string,
            state: string
        },
        rates: {
            inBps: number,
            inBps1m: number,
            outBps: number,
            outBps1m: number
        }
    },
}

interface Servers {
    [id: string]: {
        _: { name: string },
        activity: {
            actionsTriggered: number,
            actionsTriggered1m: number,
            activePlugins: string,
            apiCalls: number,
            apiCalls1m: number,
            thumbnails: number,
            thumbnails1m: number,
            transactionsPerSecond: number,
            transactionsPerSecond1m: number
        },
        availability: {
            offlineEvents: number,
            status: string,
            uptimeS?: number
        },
        info: {
            cpu: string,
            cpuCores?: number,
            os: string,
            osTime?: string,
            publicIp: string,
            ram: number,
            vmsTime?: string,
            vmsTimeChanged?: number,
            vmsTimeChanged24h?: number
        },
        load: {
            cameras: number,
            cpuUsageP?: number,
            decodedPixels?: number,
            decodingSpeed3s?: number,
            decodingThreads?: number,
            encodedPixels?: number,
            encodingSpeed3s?: number,
            encodingThreads?: number,
            incomingConnections?: number,
            logLevel?: string,
            outgoingConnections?: number,
            primaryStreams?: number,
            ramUsageB?: number,
            ramUsageP?: number,
            secondaryStreams?: number,
            serverCpuUsageP?: number,
            serverRamUsage?: number,
            serverRamUsageP?: number,
            threads?: number
        }
    }
}

interface Storage {
    [id: string]: {
        _: { name: string },
        activity: {
            readRateBps: number,
            readRateBps1m: number,
            transactionsPerSecond: number,
            writeRateBps: number,
            writeRateBps1m: number
        },
        info: {
            server: string,
            type: string
        },
        space: { totalSpaceB: number },
        state: {
            issues: number,
            issues24h: number,
            status: string,
            systemStatus: string
        }
    }
}

interface SystemInfo {
    [id: string]: {
        info: {
            cameras: number,
            name: string,
            recommendedMaxCameras: number,
            recommendedMaxServers: number,
            servers: number,
            storages: number,
            users: number,
            version: string
        }
    }
}

interface ValuesReply {
    cameras: Cameras,
    networkInterfaces: NetworkInterfaces,
    servers: Servers,
    storage: Storage,
    systems: SystemInfo
}

export interface Alarms extends NormalResponse<AlarmsReply> {};
export interface Manifests extends NormalResponse<Array<ManifestReplyObjects>> {};
export interface Values extends NormalResponse<ValuesReply> {};

export interface AggregatedHealthReportReply {
    'ec2/metrics/alarms': Alarms,
    'ec2/metrics/manifest': Manifests,
    'ec2/metrics/values': Values
};

export interface AggregatedHealthReport extends NormalResponse<AggregatedHealthReportReply> {};

interface DiscoveredPeersReply {
    brand: string,
    cloudHost: string,
    cloudSystemId: string,
    customization: string,
    ecDbReadOnly: boolean,
    hwPlatform: string,
    id: string,
    localSystemId: string,
    name: string,
    osInfo: {
        platform: string,
        variant: string,
        variantVersion: string
    },
    port: number,
    protoVersion: number,
    realm: string,
    remoteAddresses: string[],
    runtimeId: string,
    serverFlags: string,
    sslAllowed: boolean,
    status: string,
    systemName: string,
    type: string,
    version: string
};

export interface DiscoveredPeers extends NormalResponse<DiscoveredPeersReply> {};

export interface MergeSystems extends NormalResponse<DiscoveredPeersReply> {};

interface MergeStatusReply {
    mergeId: string,
    mergeInProgress: boolean
};
export interface MergeStatus extends NormalResponse<MergeStatusReply> {};
