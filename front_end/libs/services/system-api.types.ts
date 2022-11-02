interface IParams<Value = any> {
    [key: string]: Value;
}

/**
 * Base response type, accepts a generic type/interface that gets assigned to the reply property.
 * Usage example below.
 *
 * export interface GetUserRoles extends NormalResponse<UserPermissions> {}
 */
export interface NormalResponse<Reply = {}> {
    error: string,
    errorString: string,
    reply: Reply,
}

export interface RebuildResponse<Reply = {}> {
    reply?: Reply,
    main?: Reply,
    backup?: Reply
}

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
}

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
    maxVirtualCameraArchiveSynchronizationThreads: string,
    maxHttpTranscodingSessions: string,
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

export interface SystemSettings {
    settings: Settings
}

interface SystemTimeReply {
    isTakenFromInternet: boolean,
    utcTimeMs: string
}
export interface SystemTime extends NormalResponse<SystemTimeReply> {}

interface UserPermissions {
    id: string,
    name: string,
    permissions: Permissions
}
export interface GetUserRoles extends NormalResponse<UserPermissions> {}

export interface Params {
    name: string,
    value: string
}
interface AddParams extends Array<Params> {}
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
}

interface ApiConfigureReply {
    restartNeeded: boolean;
}
export interface ApiConfigure extends NormalResponse<ApiConfigureReply> {}

export interface RestartServer extends NormalResponse<null> {}

export interface ModuleInformationReply {
    brand: string,
    cloudHost: string,
    cloudSystemId: string,
    customization: string,
    ecDbReadOnly: boolean,
    flags?: IParams<boolean>,
    hardwareIds?: string[],
    hwPlatform: string,
    id: string,
    localSystemId: string,
    name: string,
    osInfo: {
        platform: string,
        variant: string,
        variantVersion: string
    },
    osTimeMs?: number,
    port: number,
    protoVersion: number,
    realm?: string,
    remoteAddresses: string[],
    runtimeId: string,
    serverFlags: string,
    sslAllowed: true,
    status?: string,
    synchronizedTimeMs?: number,
    systemName: string,
    timeZoneOffsetMs?: number,
    type: string,
    version: string
}
export type ModuleInformation = NormalResponse<ModuleInformationReply>;

export interface HardwareIds {
    hardwareIds: string[],
    serverId: string
}

export interface LogLevelReply {
    EC2_TRAN: string,
    HTTP: string,
    HWID: string,
    MAIN: string,
    PERMISSIONS: string
}
export interface LogLevel extends NormalResponse<LogLevelReply> {}

export interface ServerTime {
    osTime: string,
    serverId: string,
    timeZoneOffset: string,
    vmsTime: string,
}

interface PredefinedRoles {
    isOwner: boolean,
    name: string,
    permissions: string
}
interface ec2PredefinedRoles extends Array<PredefinedRoles> {}

export interface User {
    canBeEdited: boolean;
    canBeDeleted: boolean;
    email: string;
    id: string;
    isCloud: boolean;
    isAdmin?: boolean;
    isEnabled: boolean;
    userRoleId: string;
    permissions: string;
    // TODO: Remove the trash below after #VMS-2968
    name: string;
    fullName: string;
    username?: string;
}

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
}
interface ec2GetUsers extends Array<Users> {}

export interface UserSession {
  username: string,
  token: string,
  ageS: number,
  expiresInS: number
}

interface AggregatedUsersReply {
    'ec2/getPredefinedRoles': ec2PredefinedRoles,
    'ec2/getUserRoles': Array<null>,
    'ec2/getUsers': ec2GetUsers
}
export interface AggregatedUsers extends NormalResponse<AggregatedUsersReply> {}

export interface ChangedIdReturned {
    id: string
}

interface Tasks {
    bitrateKbps: number,
    dayOfWeek: number,
    endTime: number,
    fps: number,
    recordingType: string,
    startTime: number,
    streamQuality: string
}
interface ScheduledTasks extends Array<Tasks> {}
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
}

export interface EmptyObjectReturned {}

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

interface ec2GetMediaServers extends Array<GetMediaServers> {}
interface ec2GetCameras extends Array<GetCameras> {}
export interface AggregatedServersAndCameras {
    'ec2/getMediaServersEx': ec2GetMediaServers,
    'ec2/getCamerasEx': ec2GetCameras
}

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
}

export interface GetResourceTypes extends Array<ResourceTypes> {}

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
}

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

export interface Alarms extends NormalResponse<AlarmsReply> {}
export interface Manifests extends NormalResponse<Array<ManifestReplyObjects>> {}
export interface Values extends NormalResponse<ValuesReply> {}

export interface AggregatedHealthReportReply {
    'ec2/metrics/alarms': Alarms,
    'ec2/metrics/manifest': Manifests,
    'ec2/metrics/values': Values
}

export interface AggregatedHealthReport extends NormalResponse<AggregatedHealthReportReply> {}

interface DiscoveredPeersReply {
    brand: string,
    cloudHost: string,
    cloudSystemId: string,
    customization: string,
    ecDbReadOnly: boolean,
    flags?: IParams<boolean>,
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
}

export interface DiscoveredPeers extends NormalResponse<DiscoveredPeersReply[]> {}

export interface MergeSystems extends NormalResponse<DiscoveredPeersReply> {}

interface MergeStatusReply {
    mergeId: string,
    mergeInProgress: boolean
}
export interface MergeStatus extends NormalResponse<MergeStatusReply> {}

export class SystemConfigSettings {
    cloudAccountName: string;
    cloudHost: string;
    cloudSystemID: string;
    localSystemId: string;
    specificFeatures: IParams;
    statisticsAllowed: boolean;
    statisticsReportLastNumber: number;
    statisticReportsLastTime: Date;
    statisticReportLastVersion: string;
    systemName: string;
    mergeInfo: any;
    videoTrafficEncryptionForced?: boolean;
    exposeDeviceCredentials?: boolean;

    constructor(params: Params[]) {
        params.forEach(({ name, value }) => {
            this[name] = value;
        });
    }
}

export class SystemAdvancedConfigSettings {
    videoTrafficEncryptionForced?: boolean;
    exposeDeviceCredentials?: boolean;
}

enum EventState {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive'
}

export interface EventParams {
    timestamp?: Date;
    source?: string;
    caption?: string;
    description?: string;
    metaData?: string;
    state?: EventState
}

export interface ConfigureParams {
    systemName?: string;
    port?: number;
    password?: string;
    currentPassword?: string;
}

export enum CameraDiagnosticSteps {
    MEDIASERVER_AVAILABILITY = 'mediaServerAvailability',
    CAMERA_AVAILABILITY = 'cameraAvailability',
    STREAM_AVAILABILITY = 'mediaStreamAvailability',
    STREAM_INTEGRITY = 'mediaStreamIntegrity'
}

export enum EventTypes {
   UNDEFINED = 'UndefinedEvent',
   CAMERA_MOTION = 'CameraMotionEvent',
   CAMERA_INPUT = 'CameraInputEvent',
   CAMERA_DISCONNECT = 'CameraDisconnectEvent',
   STORAGE_FAILURE = 'StorageFailureEvent',
   NETWORK_ISSUE = 'NetworkIssueEvent',
   IP_CONFLICT = 'CameraIpConflictEvent',
   SERVER_FAILURE = 'ServerFailureEvent',
   SERVER_CONFLICT = 'ServerConflictEvent',
   SERVER_START = 'ServerStartEvent',
   LICENSE_ISSUE = 'LicenseIssueEvent',
   BACKUP_FINISHED = 'BackupFinishedEvent',
   SYSTEM_HEALTH = 'SystemHealthEvent',
   MAX_SYSTEM_HEALTH = 'MaxSystemHealthEvent',
   ANY_CAMERA = 'AnyCameraEvent',
   ANY_SERVER = 'AnyServerEvent',
   ANY_BUSINESS = 'AnyBusinessEvent',
   SOFT_TRIGGER = 'softwareTriggerEvent',
   ANALYTICS = 'analyticsSdkEvent',
   PLUGIN_DIAGNOSTIC = 'pluginDiagnosticEvent',
   POE_OVER_BUDGET = 'poeOverBudgetEvent',
   FAN_ERROR = 'fanErrorEvent',
   ANY = 'anyEvent',
   USER_DEFINED = 'userDefinedEvent',
}

export enum ActionTypes {
    UNDEFINED = 'UndefinedAction',
    CAMERA_OUTPUT = 'CameraOutputAction',
    BOOKMARK = 'BookmarkAction',
    RECORDING = 'CameraRecordingAction',
    PANIC_RECORDING = 'PanicRecordingAction',
    SEND_MAIL = 'SendMailAction',
    DIAGNOSTICS = 'DiagnosticsAction',
    SHOW_POPUP = 'ShowPopupAction',
    PLAY_SOUND = 'PlaySoundAction',
    PLAY_SOUND_ONCE = 'PlaySoundOnceAction',
    SAY_TEXT = 'SayTextAction',
    EXECUTE_PTZ_PRESET = 'ExecutePtzPresetAction',
    SHOW_TEXT_OVERLAY = 'ShowTextOverlayAction',
    SHOW_ON_ALARM_LAYOUT = 'ShowOnAlarmLayoutAction',
    EXEC_HTTP_REQUEST = 'ExecHttpRequestAction',
    BUZZER = 'BuzzerAction'
}

export interface ServerNetworkSettings {
    dhcp: boolean;
    dnsServers: string;
    extraParams: IParams;
    ipAddr: string;
    mac: string;
    name: string;
    netMask: string;
}

interface RuleDefaults {
    schedule: string
    system: boolean
    eventState: string
    disabled: boolean
    aggregationPeriod: number
}

export interface BaseRule extends Partial<RuleDefaults> {
    actionResourceIds?: string[]
    actionType: string
    comment?: string
    eventResourceIds?: string[]
    eventType: EventTypes
    id?: string
}

export interface RawRule extends BaseRule {
    actionParams: any
    eventCondition: any
}
export interface EventRule extends BaseRule {
    actionParams: string
    eventCondition: string
}

export interface ResourceParam {
    value: string;
    name: string;
    resourceId?: string;
}

export type RebuildArchiveResponse = RebuildResponse<{
    state: string;
    totalProgress: number;
}>;

export interface WebPage {
    id: uuid;
    parentId: uuid;
    name: string;
    url: string;
    typeId: uuid;
}

export type WebPages = WebPage[];

type int = number;
type float = number;
type uuid = string;

interface BaseParams {
    description?: string;
    enabled: boolean;
}

interface ContrastParams extends BaseParams {
    blackLevel: float;
    whiteLevel: float;
    gamma: float;
}

interface DewarpingParams extends BaseParams {
    xAngle: int;
    yAngle: int;
    fov: int;
    panoFactor: 1 | 2 | 4;
}

export interface LayoutItem {
    id: uuid;
    flags: int;
    top: int;
    bottom: int;
    left: int;
    right: int;
    rotation: int;
    zoomLeft: float;
    zoomTop: float;
    zoomRight: float;
    zoomBottom: float;
    zoomTargetId: uuid;
    contrastParams: ContrastParams;
    dewarpingParams: DewarpingParams;
    displayInfo: boolean;
    controlPtz: boolean;
    displayAnalyticsObjects: boolean;
    displayRoi: boolean;
    resourceId: uuid;
    resourcePath: string;
}

export type LayoutItems = LayoutItem[];

export interface Layout {
    backgroundHeight: int;
    backgroundImageFilename: string;
    backgroundOpacity: float;
    backgroundWidth: int;
    cellAspectRatio: float;
    cellSpacing: float;
    fixedHeight: int;
    fixedWidth: int;
    id: uuid;
    items: LayoutItems;
    locked: boolean;
    logicalId: int;
    name: string;
    systemId: uuid;
    parentId: uuid;
}

export type Layouts = Layout[];

interface CameraId {
    cameraId: string;
}

interface Speed {
    speed: number;
}

export enum PtzCommands {
    RELATIVE_MOVE = 'RelativeMovePtzCommand',
    RELATIVE_FOCUS = 'RelativeFocusPtzCommand'
}

export interface BasePtzCommand<Command> extends CameraId {
    command: Command;
}

export interface Pan {
    pan: number;
}

export interface Tilt {
    tilt: number;
}

export interface Zoom {
    zoom: number;
}

export interface PtzMoveParams extends Speed, Pan, Tilt, Zoom {}

export interface Focus {
    focus: number;
}

export interface PtzMoveCommand extends BasePtzCommand<PtzCommands.RELATIVE_MOVE>, PtzMoveParams {}

export interface PtzFocusCommand extends BasePtzCommand<PtzCommands.RELATIVE_FOCUS>, Focus {}

export type PtzCommand = PtzMoveCommand | PtzFocusCommand;
