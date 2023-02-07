export interface System {
    name: string;
    id: string;
    ownerAccountEmail: string;
    ownerFullName: string;
    systemName: string;
    isMine: boolean;
    capabilities: Record<any, any>;
    state: string;
    stateOfHealth: string;
    system2faEnabled: boolean;
    canMerge: boolean;
    cloudStorageCapable: boolean;
    isOnline: boolean;
    stateMessage: string;
    cameraManager: CameraManager;
    mediaserver: MediaServer;
}

export interface MediaServer {
    getAuthKeys: () => { authGet: string; authPost: string; authPlay: string };
    createEvent: (event: EventParams) => Promise<any>;
    getEvents: (
        from: number,
        to: number,
        cameraId?: string,
        eventType?: EventTypes,
        actionType?: ActionTypes,
        eventRuleId?: string
    ) => Promise<any>;
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

export enum EventState {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive'
}

export interface EventParams {
    timestamp?: Date;
    source?: string;
    caption?: string;
    description?: string;
    metaData?: string;
    state?: EventState;
}

export interface CameraManager {
    cameras: Camera[];
    getCameras: () => Promise<Camera[]>;
}

export interface Camera {
    rotation?: number | string;
    overrideAr?: number | string;
    isAudioSupported: boolean;
    audioEnabled: boolean;
    backupType: string;
    controlEnabled: boolean;
    defaultRatio: number;
    dewarpingParams: string;
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
    motionEnabled: boolean | string;
    maxFps: number;
    name: string;
    parentId: string;
    parentName: string;
    physicalId: string;
    preferredServerId: string;
    recordAfterMotionSec: number;
    recordBeforeMotionSec: number;
    scheduleEnabled: boolean;
    status: string;
    statusFlags: string;
    typeId: string;
    url: string;
    userDefinedGroupName: string;
    vendor: string;
    previewUrl: string;
    isStream: boolean;
}
