enum EventState {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive',
}

export interface EventParams {
    timestamp?: Date;
    source?: string;
    caption?: string;
    description?: string;
    metaData?: string;
    state?: EventState;
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

interface RuleDefaults {
    schedule: string;
    system: boolean;
    eventState: string;
    disabled: boolean;
    aggregationPeriod: number;
}

export interface BaseRule extends Partial<RuleDefaults> {
    actionResourceIds?: string[];
    actionType: string;
    comment?: string;
    eventResourceIds?: string[];
    eventType: EventTypes;
    id?: string;
}

export interface ActionParams {
    allUsers: boolean;
    authType: string;
    durationMs: number;
    forced: boolean;
    fps: number;
    needConfirmation: boolean;
    playToClient: boolean;
    recordAfter: number;
    recordBeforeMs: number;
    requestType: string;
    streamQuality: string;
    useSource: boolean;
    actionResourceId: string;
    additionalResources: string[];
}

export interface EventCondition {
    caption: string;
    description: string;
    eventTimestampUsec: string;
    eventType: string;
    metadata: {
        allUsers: boolean;
        level: string;
    };
    omitDbLogging: boolean;
    reasonCode: string;
    resourceName: string;
}

export interface RawRule extends BaseRule {
    actionParams: ActionParams;
    eventCondition: EventCondition;
}
export interface EventRule extends BaseRule {
    actionParams: string;
    eventCondition: string;
}
