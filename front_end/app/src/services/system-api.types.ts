// Add interfaces here for cloud api request

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

export interface SystemTime extends NormalResponse {
    reply: {
        isTakenFromInternet: boolean,
        utcTimeMs: string
    }
};

export interface UserPermissions extends Permissions {
    id: string,
    name: string,
}

export interface GetUserRoles extends NormalResponse<UserPermissions> {};

export interface SystemSettings extends NormalResponse<Settings> {};

interface Params {
    name: string,
    value: string
};

interface AddParams extends Array<Params>{};

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

export interface ApiConfigure extends NormalResponse {
    reply: {
        restartNeeded: boolean
    }
};

export interface RestartServer extends NormalResponse {
    reply: null
};

export interface ModuleInformation extends NormalResponse {
    reply: {
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
    }
};

export interface LogLevel extends NormalResponse {
    reply: {
        EC2_TRAN: string,
        HTTP: string,
        HWID: string,
        MAIN: string,
        PERMISSIONS: string
    }
};
