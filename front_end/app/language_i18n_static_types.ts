// To parse this data:
//
//   import { Convert, LanguageI18NStaticTypes } from "./file";
//
//   const languageI18NStaticTypes = Convert.toLanguageI18NStaticTypes(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface LanguageI18NStaticTypes {
    "About %CLOUD_NAME%":  any;
    "Download %VMS_NAME%": any;
    Integrations:          any;
    Privacy:               any;
    Support:               any;
    Terms:                 any;
    accessRoles:           { [key: string]: AccessRole };
    account:               LanguageI18NStaticTypesAccount;
    activeActions:         ActiveActions;
    cameraFilters:         CameraFilters;
    clientProtocol:        any;
    common:                Common;
    dialogs:               Dialogs;
    downloads:             Downloads;
    errorCodes:            ErrorCodes;
    integration:           LanguageI18NStaticTypesIntegration;
    ipvd:                  Ipvd;
    ipvdFeedback:          IpvdFeedback;
    ipvdTopXByVolume:      any;
    ipvdDisclaimer:        any;
    license:               License;
    menu:                  Menu;
    pageTitles:            PageTitles;
    passwordRequirements:  PasswordRequirements;
    placeholderTexts:      PlaceholderTexts;
    pleaseSelect:          any;
    privacyPolicy:         PrivacyPolicy;
    registration:          Registration;
    ribbon:                Ribbon;
    search:                Search;
    servers:               Servers;
    system:                LanguageI18NStaticTypesSystem;
    systemStatuses:        SystemStatuses;
    toastMessage:          ToastMessage;
    settingsConfig:        { [key: string]: string };
    result:                any;
    additionalSystems:     any;
}

export interface AccessRole {
    description: any;
    label:       any;
}

export interface LanguageI18NStaticTypesAccount {
    accountSavedSuccess:    any;
    accountSettings:        any;
    activationLinkSent:     any;
    agreementAccepted:      any;
    changePassword:         any;
    newPasswordLabel:       any;
    passwordChangedSuccess: any;
    saveChanges:            any;
}

export interface ActiveActions {
    resetPassword:       any;
    sendConfirm:         any;
    setNewPassword:      any;
    setNewPasswordLabel: any;
}

export interface CameraFilters {
    H265:        any;
    IO:          any;
    TwWayAudio:  any;
    aptz:        any;
    audio:       any;
    encoder:     any;
    fisheye:     any;
    highRes:     any;
    multiSensor: any;
    ptz:         any;
}

export interface Common {
    account:                    CommonAccount;
    cameraLinks:                CameraLinks;
    cameraStates:               CameraStates;
    chromeCastWarning:          any;
    recordingSettingsWarning:   any;
    recordingModes:             RecordingModes;
    resolution:                 Resolution;
    general:                    any;
    inaccessibleFeatureMessage: any;
    searchCamPlaceholder:       any;
    systemHasNoCameras:         any;
    systemHasNoCamerasMessage:  any;
    systemNewVersion:           any;
    systemNewVersionMessage:    any;
    systemNoAlerts:             any;
    systemNoAlertsMessage:      any;
    systemOffline:              any;
    systemOfflineMessage:       any;
    systemServerError:          any;
    systemServerErrorMessage:   any;
    systemUnreachable:          any;
    unknown:                    any;
    voiceCommands:              VoiceCommands;
    viewingOutdatedReport:      any;
}

export interface CommonAccount {
    created:   NoSettings;
    activated: Activated;
}

export interface Activated {
    title: any;
}

export interface NoSettings {
    title:   any;
    message: any;
}

export interface CameraLinks {
    copyActiveText:  any;
    copyDefaultText: any;
    copyToClipboard: any;
    highStream:      any;
    lowStream:       any;
    transcoding:     any;
    unknown:         any;
}

export interface CameraStates {
    error:               any;
    errorLoading:        any;
    flashOrWebmRequired: any;
    flashRequired:       any;
    iOSVideoTooLarge:    any;
    ieNoWebm:            any;
    ieWin10:             any;
    noArmSupport:        any;
    noData:              any;
    noFormat:            any;
    offline:             any;
    ubuntuNX:            any;
    unauthorized:        any;
}

export interface RecordingModes {
    always:       any;
    motion:       any;
    motionLowRes: any;
}

export interface Resolution {
    various: any;
    auto:    any;
    best:    any;
    high:    any;
    medium:  any;
    low:     any;
}

export interface VoiceCommands {
    "clear search":         any;
    "collapse all servers": any;
    "collapse server":      any;
    "expand all servers":   any;
    "expand server":        any;
    help:                   any;
    live:                   any;
    pause:                  any;
    play:                   any;
    search:                 any;
    "stop listening":       any;
    view:                   any;
}

export interface Dialogs {
    buttons:      Buttons;
    cloudStorage: CloudStorage;
    merge:        DialogsMerge;
    message:      DialogsMessage;
    removeSystem: RemoveSystem;
    titles:       DialogsTitles;
    tooltips:     Tooltips;
}

export interface Buttons {
    cancel:           any;
    createAccount:    any;
    delete:           any;
    deleteAccount:    any;
    download:         any;
    logoutAuthorised: any;
    ok:               any;
    remove:           any;
    stayAs:           any;
    stayLoggedIn:     any;
}

export interface CloudStorage {
    title:                 any;
    enableStorage:         any;
    otherSystem:           any;
    initial:               any;
    available:             any;
    camera:                any;
    cameras:               any;
    remove:                EnableCloudStorage;
    activationError:       NoSettings;
    systemDisconnectError: NoSettings;
    moveCloudStorage:      MoveCloudStorage;
    enableCloudStorage:    EnableCloudStorage;
    noOtherSystemsError:   NoOtherSystemsError;
}

export interface EnableCloudStorage {
    success:     any;
    errorPrefix: any;
}

export interface MoveCloudStorage {
    title:       any;
    success:     any;
    errorPrefix: any;
    notFound:    any;
    status:      MoveCloudStorageStatus;
}

export interface MoveCloudStorageStatus {
    offline: any;
}

export interface NoOtherSystemsError {
    message: any;
}

export interface DialogsMerge {
    adminPasswordTitle:         any;
    checking:                   any;
    commonText:                 any;
    connectToCloud:             any;
    differentOwners:            any;
    duplicateServers:           any;
    enterSystemAddressTitle:    any;
    mergeConfirmation:          any;
    mergeSystemsTitle:          any;
    mergeFailedTitle:           any;
    noServerFound:              any;
    newSystemDisplayName:       any;
    otherSystem:                any;
    ownerCanMergeText:          any;
    passwordRequired:           any;
    passwordWrong:              any;
    primaryCannotMerge:         any;
    primarySystemOffline:       any;
    primarySystemUnavailable:   any;
    recommendSupport:           RecommendSupport;
    secondaryCannotMerge:       any;
    secondarySystemUnavailable: any;
    serverAtUrl:                any;
    serverNotAvailable:         any;
    serverNotYours:             any;
    serverVersionOld:           any;
    serverVersionNew:           any;
    systemOffline:              any;
    systemOfflineUrl:           any;
    systemsIncompatible:        any;
    systemVersionOld:           any;
    systemVersionNew:           any;
    urlEmpty:                   any;
    urlNotValid:                any;
    unknownError:               any;
    warning:                    any;
}

export interface RecommendSupport {
    a_recommend:  any;
    b_support:    any;
    c_proceeding: any;
}

export interface DialogsMessage {
    storageSettingsSaved:    any;
    storageSettingsNotSaved: any;
    settingsSaved:           any;
    settingsNotSaved:        any;
    logLevelsSaved:          any;
    logLevelsNotSaved:       any;
    failedToSend:            any;
    placeholders:            Placeholders;
    sent:                    any;
    subject:                 Subject;
    title:                   Title;
}

export interface Placeholders {
    feedback: any;
}

export interface Subject {
    integration_feedback: any;
    ipvd_feedback_device: any;
    ipvd_feedback_page:   any;
    sales_inquiry:        any;
    technical_inquiry:    any;
}

export interface Title {
    integration:          any;
    ipvd_feedback_device: any;
    ipvd_feedback_page:   any;
}

export interface RemoveSystem {
    action:  any;
    message: any;
    title:   any;
}

export interface DialogsTitles {
    error:                  any;
    success:                any;
    changeAccount:          any;
    deleteUser:             any;
    loggedFromOtherAccount: any;
    noClientDetected:       any;
    removeUser:             any;
    serversDetach:          any;
    serversReset:           any;
    serversRestart:         any;
}

export interface Tooltips {
    deleteAccount: any;
}

export interface Downloads {
    appTypes:      AppTypes;
    groups:        Groups;
    mobile:        Mobile;
    platforms:     Platforms;
    releasesTypes: ReleasesTypes;
}

export interface AppTypes {
    bundle:           any;
    camera_sdk:       any;
    client:           any;
    metadata_sdk:     any;
    package:          any;
    server:           any;
    servertool:       any;
    storage_sdk:      any;
    video_source_sdk: any;
}

export interface Groups {
    android: ArmClass;
    arm:     ArmClass;
    ios:     ArmClass;
    linux:   ArmClass;
    mac:     MAC;
    macos:   MAC;
    sdk:     ArmClass;
    windows: MAC;
}

export interface ArmClass {
    label:      any;
    shortLabel: any;
}

export interface MAC {
    label: any;
}

export interface Mobile {
    android: MobileAndroid;
    ios:     MobileAndroid;
}

export interface MobileAndroid {
    link: any;
}

export interface Platforms {
    bananapi:    any;
    bpi:         any;
    linux64:     any;
    linux_arm32: any;
    linux_arm64: any;
    mac:         any;
    rpi:         any;
    universal:   any;
    win64:       any;
}

export interface ReleasesTypes {
    beta:     any;
    betas:    any;
    patch:    any;
    patches:  any;
    rc:       any;
    release:  any;
    releases: any;
}

export interface ErrorCodes {
    CLOUD_SYSTEMS_HAVE_DIFFERENT_OWNERS: any;
    DUPLICATE_MEDIASERVER_FOUND:         any;
    EmailAlreadyExists:                  any;
    FAIL:                                any;
    INCOMPATIBLE:                        any;
    accountAlreadyActivated:             any;
    accountBlocked:                      any;
    accountNotActivated:                 any;
    alreadyExists:                       any;
    brokenAccount:                       any;
    cantActivatePrefix:                  any;
    cantAddYourOwnEmail:                 any;
    cantChangeAccountPrefix:             any;
    cantChangePasswordPrefix:            any;
    cantDisconnectSystemPrefix:          any;
    cantEditAdmin:                       any;
    cantEditYourself:                    any;
    cantGetSystemInfoPrefix:             any;
    cantGetSystemsListPrefix:            any;
    cantGetUsersListPrefix:              any;
    cantOpenClient:                      any;
    cantRegisterPrefix:                  any;
    cantSendActivationPrefix:            any;
    cantSendConfirmationPrefix:          any;
    cantSharePrefix:                     any;
    cantUnshareWithMeSystemPrefix:       any;
    emailNotFound:                       any;
    failedToAccessSystem:                any;
    forbidden:                           any;
    lostConnection:                      any;
    mergedSystemIsOffline:               any;
    notAuthorized:                       any;
    notFound:                            any;
    ok:                                  any;
    oldPasswordMistmatch:                any;
    oldSafariNotSupported:               any;
    passwordMismatch:                    any;
    thisSystem:                          any;
    unknownError:                        any;
    unknownMergeError:                   any;
    wrongAuthCode:                       any;
    wrongCode:                           any;
    wrongCodeRestore:                    any;
    wrongParameters:                     any;
    licenseFail:                         any;
    licenseTimeout:                      any;
    licenseServerError:                  any;
    networkConnection:                   any;
}

export interface LanguageI18NStaticTypesIntegration {
    "Access Control":     any;
    Connector:            any;
    "Data Analytics":     any;
    Drone:                any;
    "Health Monitor":     any;
    Storage:              any;
    myIntegrationsLabel:  any;
    phoneNumberWithLabel: any;
    requirements:         any;
    testedVersionLabel:   any;
    testedVersionsLabel:  any;
}

export interface Ipvd {
    "Advanced PTZ cameras":          any;
    "Cameras supporting H.265":      any;
    "Cameras with 2-way audio":      any;
    "Extra high resolution cameras": any;
    "Fisheye Cameras":               any;
    "I / O modules":                 any;
    "Multisensor Cameras":           any;
    "PTZ cameras":                   any;
    camera:                          any;
    count:                           any;
    dvr:                             any;
    encoder:                         any;
    hardwareType:                    any;
    isAnalyticsSupported:            any;
    isAptzSupported:                 any;
    isAptzSupportedShort:            any;
    isAudioSupported:                any;
    isDualStreamingSupported:        any;
    isFisheye:                       any;
    isH265:                          any;
    isIoSupported:                   any;
    isMdSupported:                   any;
    isMultiSensor:                   any;
    isPtzSupported:                  any;
    isTwAudioSupported:              any;
    maxFps:                          any;
    maxResolution:                   any;
    model:                           any;
    multiSensorCamera:               any;
    other:                           any;
    primaryCodec:                    any;
    resolutionArea:                  any;
    sndResolution:                   any;
    vendor:                          any;
    sortKey:                         any;
}

export interface IpvdFeedback {
    a_Please: any;
    b_Link:   any;
    c_Info:   any;
}

export interface License {
    info:     Info;
    messages: Messages;
}

export interface Info {
    type:          any;
    channels:      any;
    server:        any;
    hwid:          any;
    status:        any;
    expires:       any;
    time:          any;
    deactivations: any;
    trial:         any;
    online:        any;
    error:         any;
    expired:       any;
    ok:            any;
    digital:       any;
    analog:        any;
    edge:          any;
    vmax:          any;
    videowall:     any;
    analogencoder: any;
    starter:       any;
    iomodule:      any;
    bridge:        any;
}

export interface Messages {
    required:       any;
    activated:      any;
    inuse:          any;
    trialActivated: any;
}

export interface Menu {
    titles: MenuTitles;
}

export interface MenuTitles {
    systemAdministration: any;
    general:              any;
    licenses:             any;
    users:                any;
}

export interface PageTitles {
    about:                  any;
    account:                any;
    activate:               any;
    activateCode:           any;
    activateSuccess:        any;
    changePassword:         any;
    debug:                  any;
    default:                any;
    download:               any;
    downloadPlatform:       any;
    failedToAccessSystem:   any;
    integrations:           any;
    login:                  any;
    pageNotFound:           any;
    register:               any;
    registerSuccess:        any;
    restorePassword:        any;
    restorePasswordSuccess: any;
    supportedDevices:       any;
    system:                 any;
    systemShare:            any;
    systems:                any;
    template:               any;
    view:                   any;
}

export interface PasswordRequirements {
    common:           any;
    commonMessage:    any;
    fair:             any;
    fairMessage:      any;
    good:             any;
    minLength:        any;
    minLengthMessage: any;
    missingMessage:   any;
    required:         any;
    requiredMessage:  any;
    strongMessage:    any;
    weak:             any;
    weakMessage:      any;
}

export interface PlaceholderTexts {
    noSettings: NoSettings;
    merge:      PlaceholderTextsMerge;
    server:     NoSettings;
}

export interface PlaceholderTextsMerge {
    title:   any;
    message: MergeMessage;
}

export interface MergeMessage {
    dependingOnSize: any;
    untilFinished:   any;
    whenFinished:    any;
}

export interface PrivacyPolicy {
    integration: any;
    ipvd:        any;
}

export interface Registration {
    agreement: any;
}

export interface Ribbon {
    beingMerged:    BeingMerged;
    finishingMerge: any;
    integration:    RibbonIntegration;
    systemOffline:  any;
    systemsMerging: any;
}

export interface BeingMerged {
    to:      any;
    mayTake: any;
}

export interface RibbonIntegration {
    backToEditText: any;
    previewRibbon:  any;
}

export interface Search {
    Any:               any;
    Search:            any;
    analytics:         any;
    analyticsSelected: any;
    "filter applied":  any;
    "filters applied": any;
    appliedFilters:    any;
    hardwareType:      any;
    hardwareTypes:     any;
    minResolution:     any;
    search_ipvd:       any;
    selected:          any;
    vendor:            any;
    vendors:           any;
}

export interface Servers {
    beginDetach:             any;
    beginReset:              any;
    detachSystemFailed:      any;
    detachSystemSuccess:     any;
    portWarning:             any;
    removeMediaserverFailed: any;
    resetFailed:             any;
    resetSuccessful:         any;
    restartFailed:           any;
    restartSuccessful:       any;
    serverOffline:           any;
    servers:                 any;
    status:                  ServersStatus;
    successRename:           any;
}

export interface ServersStatus {
    checking:   any;
    offline:    any;
    resetting:  any;
    restarting: any;
}

export interface LanguageI18NStaticTypesSystem {
    MERGE_FINISHES:   any;
    mergeUnknownName: any;
    mySystemSearch:   any;
    settings:         Settings;
    status:           SystemStatus;
    users:            Users;
    yourSystem:       any;
    loggers:          Loggers;
}

export interface Loggers {
    none:    Debug;
    error:   Debug;
    warning: Debug;
    info:    Debug;
    debug:   Debug;
    verbose: Debug;
}

export interface Debug {
    text: any;
    help: any;
}

export interface Settings {
    notAbleToLoadSecurity: any;
    notAbleToLoadSystem:   any;
    sessionLimitDuration:  SessionLimitDuration;
    warningMessages:       WarningMessages;
}

export interface SessionLimitDuration {
    hours:   any;
    minutes: any;
}

export interface WarningMessages {
    videoEncryption: any;
}

export interface SystemStatus {
    offline:     any;
    unavailable: any;
}

export interface Users {
    cloudDelete: any;
    localDelete: any;
}

export interface SystemStatuses {
    activated:    any;
    incompatible: any;
    merging:      any;
    notActivated: any;
    offline:      any;
    online:       any;
    unavailable:  any;
}

export interface ToastMessage {
    system: ToastMessageSystem;
}

export interface ToastMessageSystem {
    deleted:      Deleted;
    disconnected: Deleted;
    merge:        SystemMerge;
    rename:       Deleted;
}

export interface Deleted {
    success: any;
}

export interface SystemMerge {
    failed:  any;
    success: any;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toLanguageI18NStaticTypes(json: string): LanguageI18NStaticTypes {
        return cast(JSON.parse(json), r("LanguageI18NStaticTypes"));
    }

    public static languageI18NStaticTypesToJson(value: LanguageI18NStaticTypes): string {
        return JSON.stringify(uncast(value, r("LanguageI18NStaticTypes")), null, 2);
    }
}

function invalidValue(typ: any, val: any): never {
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`);
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases, val);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue("array", val);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue("Date", val);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue("object", val);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val);
    }
    if (typ === false) return invalidValue(typ, val);
    while (typeof typ === "object" && typ.ref !== undefined) {
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "LanguageI18NStaticTypes": o([
        { json: "About %CLOUD_NAME%", js: "About %CLOUD_NAME%", typ: "any" },
        { json: "Download %VMS_NAME%", js: "Download %VMS_NAME%", typ: "any" },
        { json: "Integrations", js: "Integrations", typ: "any" },
        { json: "Privacy", js: "Privacy", typ: "any" },
        { json: "Support", js: "Support", typ: "any" },
        { json: "Terms", js: "Terms", typ: "any" },
        { json: "accessRoles", js: "accessRoles", typ: m(r("AccessRole")) },
        { json: "account", js: "account", typ: r("LanguageI18NStaticTypesAccount") },
        { json: "activeActions", js: "activeActions", typ: r("ActiveActions") },
        { json: "cameraFilters", js: "cameraFilters", typ: r("CameraFilters") },
        { json: "clientProtocol", js: "clientProtocol", typ: "any" },
        { json: "common", js: "common", typ: r("Common") },
        { json: "dialogs", js: "dialogs", typ: r("Dialogs") },
        { json: "downloads", js: "downloads", typ: r("Downloads") },
        { json: "errorCodes", js: "errorCodes", typ: r("ErrorCodes") },
        { json: "integration", js: "integration", typ: r("LanguageI18NStaticTypesIntegration") },
        { json: "ipvd", js: "ipvd", typ: r("Ipvd") },
        { json: "ipvdFeedback", js: "ipvdFeedback", typ: r("IpvdFeedback") },
        { json: "ipvdTopXByVolume", js: "ipvdTopXByVolume", typ: "any" },
        { json: "ipvdDisclaimer", js: "ipvdDisclaimer", typ: "any" },
        { json: "license", js: "license", typ: r("License") },
        { json: "menu", js: "menu", typ: r("Menu") },
        { json: "pageTitles", js: "pageTitles", typ: r("PageTitles") },
        { json: "passwordRequirements", js: "passwordRequirements", typ: r("PasswordRequirements") },
        { json: "placeholderTexts", js: "placeholderTexts", typ: r("PlaceholderTexts") },
        { json: "pleaseSelect", js: "pleaseSelect", typ: "any" },
        { json: "privacyPolicy", js: "privacyPolicy", typ: r("PrivacyPolicy") },
        { json: "registration", js: "registration", typ: r("Registration") },
        { json: "ribbon", js: "ribbon", typ: r("Ribbon") },
        { json: "search", js: "search", typ: r("Search") },
        { json: "servers", js: "servers", typ: r("Servers") },
        { json: "system", js: "system", typ: r("LanguageI18NStaticTypesSystem") },
        { json: "systemStatuses", js: "systemStatuses", typ: r("SystemStatuses") },
        { json: "toastMessage", js: "toastMessage", typ: r("ToastMessage") },
        { json: "settingsConfig", js: "settingsConfig", typ: m("") },
        { json: "result", js: "result", typ: "any" },
        { json: "additionalSystems", js: "additionalSystems", typ: "any" },
    ], false),
    "AccessRole": o([
        { json: "description", js: "description", typ: "any" },
        { json: "label", js: "label", typ: "any" },
    ], false),
    "LanguageI18NStaticTypesAccount": o([
        { json: "accountSavedSuccess", js: "accountSavedSuccess", typ: "any" },
        { json: "accountSettings", js: "accountSettings", typ: "any" },
        { json: "activationLinkSent", js: "activationLinkSent", typ: "any" },
        { json: "agreementAccepted", js: "agreementAccepted", typ: "any" },
        { json: "changePassword", js: "changePassword", typ: "any" },
        { json: "newPasswordLabel", js: "newPasswordLabel", typ: "any" },
        { json: "passwordChangedSuccess", js: "passwordChangedSuccess", typ: "any" },
        { json: "saveChanges", js: "saveChanges", typ: "any" },
    ], false),
    "ActiveActions": o([
        { json: "resetPassword", js: "resetPassword", typ: "any" },
        { json: "sendConfirm", js: "sendConfirm", typ: "any" },
        { json: "setNewPassword", js: "setNewPassword", typ: "any" },
        { json: "setNewPasswordLabel", js: "setNewPasswordLabel", typ: "any" },
    ], false),
    "CameraFilters": o([
        { json: "H265", js: "H265", typ: "any" },
        { json: "IO", js: "IO", typ: "any" },
        { json: "TwWayAudio", js: "TwWayAudio", typ: "any" },
        { json: "aptz", js: "aptz", typ: "any" },
        { json: "audio", js: "audio", typ: "any" },
        { json: "encoder", js: "encoder", typ: "any" },
        { json: "fisheye", js: "fisheye", typ: "any" },
        { json: "highRes", js: "highRes", typ: "any" },
        { json: "multiSensor", js: "multiSensor", typ: "any" },
        { json: "ptz", js: "ptz", typ: "any" },
    ], false),
    "Common": o([
        { json: "account", js: "account", typ: r("CommonAccount") },
        { json: "cameraLinks", js: "cameraLinks", typ: r("CameraLinks") },
        { json: "cameraStates", js: "cameraStates", typ: r("CameraStates") },
        { json: "chromeCastWarning", js: "chromeCastWarning", typ: "any" },
        { json: "recordingSettingsWarning", js: "recordingSettingsWarning", typ: "any" },
        { json: "recordingModes", js: "recordingModes", typ: r("RecordingModes") },
        { json: "resolution", js: "resolution", typ: r("Resolution") },
        { json: "general", js: "general", typ: "any" },
        { json: "inaccessibleFeatureMessage", js: "inaccessibleFeatureMessage", typ: "any" },
        { json: "searchCamPlaceholder", js: "searchCamPlaceholder", typ: "any" },
        { json: "systemHasNoCameras", js: "systemHasNoCameras", typ: "any" },
        { json: "systemHasNoCamerasMessage", js: "systemHasNoCamerasMessage", typ: "any" },
        { json: "systemNewVersion", js: "systemNewVersion", typ: "any" },
        { json: "systemNewVersionMessage", js: "systemNewVersionMessage", typ: "any" },
        { json: "systemNoAlerts", js: "systemNoAlerts", typ: "any" },
        { json: "systemNoAlertsMessage", js: "systemNoAlertsMessage", typ: "any" },
        { json: "systemOffline", js: "systemOffline", typ: "any" },
        { json: "systemOfflineMessage", js: "systemOfflineMessage", typ: "any" },
        { json: "systemServerError", js: "systemServerError", typ: "any" },
        { json: "systemServerErrorMessage", js: "systemServerErrorMessage", typ: "any" },
        { json: "systemUnreachable", js: "systemUnreachable", typ: "any" },
        { json: "unknown", js: "unknown", typ: "any" },
        { json: "voiceCommands", js: "voiceCommands", typ: r("VoiceCommands") },
        { json: "viewingOutdatedReport", js: "viewingOutdatedReport", typ: "any" },
    ], false),
    "CommonAccount": o([
        { json: "created", js: "created", typ: r("NoSettings") },
        { json: "activated", js: "activated", typ: r("Activated") },
    ], false),
    "Activated": o([
        { json: "title", js: "title", typ: "any" },
    ], false),
    "NoSettings": o([
        { json: "title", js: "title", typ: "any" },
        { json: "message", js: "message", typ: "any" },
    ], false),
    "CameraLinks": o([
        { json: "copyActiveText", js: "copyActiveText", typ: "any" },
        { json: "copyDefaultText", js: "copyDefaultText", typ: "any" },
        { json: "copyToClipboard", js: "copyToClipboard", typ: "any" },
        { json: "highStream", js: "highStream", typ: "any" },
        { json: "lowStream", js: "lowStream", typ: "any" },
        { json: "transcoding", js: "transcoding", typ: "any" },
        { json: "unknown", js: "unknown", typ: "any" },
    ], false),
    "CameraStates": o([
        { json: "error", js: "error", typ: "any" },
        { json: "errorLoading", js: "errorLoading", typ: "any" },
        { json: "flashOrWebmRequired", js: "flashOrWebmRequired", typ: "any" },
        { json: "flashRequired", js: "flashRequired", typ: "any" },
        { json: "iOSVideoTooLarge", js: "iOSVideoTooLarge", typ: "any" },
        { json: "ieNoWebm", js: "ieNoWebm", typ: "any" },
        { json: "ieWin10", js: "ieWin10", typ: "any" },
        { json: "noArmSupport", js: "noArmSupport", typ: "any" },
        { json: "noData", js: "noData", typ: "any" },
        { json: "noFormat", js: "noFormat", typ: "any" },
        { json: "offline", js: "offline", typ: "any" },
        { json: "ubuntuNX", js: "ubuntuNX", typ: "any" },
        { json: "unauthorized", js: "unauthorized", typ: "any" },
    ], false),
    "RecordingModes": o([
        { json: "always", js: "always", typ: "any" },
        { json: "motion", js: "motion", typ: "any" },
        { json: "motionLowRes", js: "motionLowRes", typ: "any" },
    ], false),
    "Resolution": o([
        { json: "various", js: "various", typ: "any" },
        { json: "auto", js: "auto", typ: "any" },
        { json: "best", js: "best", typ: "any" },
        { json: "high", js: "high", typ: "any" },
        { json: "medium", js: "medium", typ: "any" },
        { json: "low", js: "low", typ: "any" },
    ], false),
    "VoiceCommands": o([
        { json: "clear search", js: "clear search", typ: "any" },
        { json: "collapse all servers", js: "collapse all servers", typ: "any" },
        { json: "collapse server", js: "collapse server", typ: "any" },
        { json: "expand all servers", js: "expand all servers", typ: "any" },
        { json: "expand server", js: "expand server", typ: "any" },
        { json: "help", js: "help", typ: "any" },
        { json: "live", js: "live", typ: "any" },
        { json: "pause", js: "pause", typ: "any" },
        { json: "play", js: "play", typ: "any" },
        { json: "search", js: "search", typ: "any" },
        { json: "stop listening", js: "stop listening", typ: "any" },
        { json: "view", js: "view", typ: "any" },
    ], false),
    "Dialogs": o([
        { json: "buttons", js: "buttons", typ: r("Buttons") },
        { json: "cloudStorage", js: "cloudStorage", typ: r("CloudStorage") },
        { json: "merge", js: "merge", typ: r("DialogsMerge") },
        { json: "message", js: "message", typ: r("DialogsMessage") },
        { json: "removeSystem", js: "removeSystem", typ: r("RemoveSystem") },
        { json: "titles", js: "titles", typ: r("DialogsTitles") },
        { json: "tooltips", js: "tooltips", typ: r("Tooltips") },
    ], false),
    "Buttons": o([
        { json: "cancel", js: "cancel", typ: "any" },
        { json: "createAccount", js: "createAccount", typ: "any" },
        { json: "delete", js: "delete", typ: "any" },
        { json: "deleteAccount", js: "deleteAccount", typ: "any" },
        { json: "download", js: "download", typ: "any" },
        { json: "logoutAuthorised", js: "logoutAuthorised", typ: "any" },
        { json: "ok", js: "ok", typ: "any" },
        { json: "remove", js: "remove", typ: "any" },
        { json: "stayAs", js: "stayAs", typ: "any" },
        { json: "stayLoggedIn", js: "stayLoggedIn", typ: "any" },
    ], false),
    "CloudStorage": o([
        { json: "title", js: "title", typ: "any" },
        { json: "enableStorage", js: "enableStorage", typ: "any" },
        { json: "otherSystem", js: "otherSystem", typ: "any" },
        { json: "initial", js: "initial", typ: "any" },
        { json: "available", js: "available", typ: "any" },
        { json: "camera", js: "camera", typ: "any" },
        { json: "cameras", js: "cameras", typ: "any" },
        { json: "remove", js: "remove", typ: r("EnableCloudStorage") },
        { json: "activationError", js: "activationError", typ: r("NoSettings") },
        { json: "systemDisconnectError", js: "systemDisconnectError", typ: r("NoSettings") },
        { json: "moveCloudStorage", js: "moveCloudStorage", typ: r("MoveCloudStorage") },
        { json: "enableCloudStorage", js: "enableCloudStorage", typ: r("EnableCloudStorage") },
        { json: "noOtherSystemsError", js: "noOtherSystemsError", typ: r("NoOtherSystemsError") },
    ], false),
    "EnableCloudStorage": o([
        { json: "success", js: "success", typ: "any" },
        { json: "errorPrefix", js: "errorPrefix", typ: "any" },
    ], false),
    "MoveCloudStorage": o([
        { json: "title", js: "title", typ: "any" },
        { json: "success", js: "success", typ: "any" },
        { json: "errorPrefix", js: "errorPrefix", typ: "any" },
        { json: "notFound", js: "notFound", typ: "any" },
        { json: "status", js: "status", typ: r("MoveCloudStorageStatus") },
    ], false),
    "MoveCloudStorageStatus": o([
        { json: "offline", js: "offline", typ: "any" },
    ], false),
    "NoOtherSystemsError": o([
        { json: "message", js: "message", typ: "any" },
    ], false),
    "DialogsMerge": o([
        { json: "adminPasswordTitle", js: "adminPasswordTitle", typ: "any" },
        { json: "checking", js: "checking", typ: "any" },
        { json: "commonText", js: "commonText", typ: "any" },
        { json: "connectToCloud", js: "connectToCloud", typ: "any" },
        { json: "differentOwners", js: "differentOwners", typ: "any" },
        { json: "duplicateServers", js: "duplicateServers", typ: "any" },
        { json: "enterSystemAddressTitle", js: "enterSystemAddressTitle", typ: "any" },
        { json: "mergeConfirmation", js: "mergeConfirmation", typ: "any" },
        { json: "mergeSystemsTitle", js: "mergeSystemsTitle", typ: "any" },
        { json: "mergeFailedTitle", js: "mergeFailedTitle", typ: "any" },
        { json: "noServerFound", js: "noServerFound", typ: "any" },
        { json: "newSystemDisplayName", js: "newSystemDisplayName", typ: "any" },
        { json: "otherSystem", js: "otherSystem", typ: "any" },
        { json: "ownerCanMergeText", js: "ownerCanMergeText", typ: "any" },
        { json: "passwordRequired", js: "passwordRequired", typ: "any" },
        { json: "passwordWrong", js: "passwordWrong", typ: "any" },
        { json: "primaryCannotMerge", js: "primaryCannotMerge", typ: "any" },
        { json: "primarySystemOffline", js: "primarySystemOffline", typ: "any" },
        { json: "primarySystemUnavailable", js: "primarySystemUnavailable", typ: "any" },
        { json: "recommendSupport", js: "recommendSupport", typ: r("RecommendSupport") },
        { json: "secondaryCannotMerge", js: "secondaryCannotMerge", typ: "any" },
        { json: "secondarySystemUnavailable", js: "secondarySystemUnavailable", typ: "any" },
        { json: "serverAtUrl", js: "serverAtUrl", typ: "any" },
        { json: "serverNotAvailable", js: "serverNotAvailable", typ: "any" },
        { json: "serverNotYours", js: "serverNotYours", typ: "any" },
        { json: "serverVersionOld", js: "serverVersionOld", typ: "any" },
        { json: "serverVersionNew", js: "serverVersionNew", typ: "any" },
        { json: "systemOffline", js: "systemOffline", typ: "any" },
        { json: "systemOfflineUrl", js: "systemOfflineUrl", typ: "any" },
        { json: "systemsIncompatible", js: "systemsIncompatible", typ: "any" },
        { json: "systemVersionOld", js: "systemVersionOld", typ: "any" },
        { json: "systemVersionNew", js: "systemVersionNew", typ: "any" },
        { json: "urlEmpty", js: "urlEmpty", typ: "any" },
        { json: "urlNotValid", js: "urlNotValid", typ: "any" },
        { json: "unknownError", js: "unknownError", typ: "any" },
        { json: "warning", js: "warning", typ: "any" },
    ], false),
    "RecommendSupport": o([
        { json: "a_recommend", js: "a_recommend", typ: "any" },
        { json: "b_support", js: "b_support", typ: "any" },
        { json: "c_proceeding", js: "c_proceeding", typ: "any" },
    ], false),
    "DialogsMessage": o([
        { json: "storageSettingsSaved", js: "storageSettingsSaved", typ: "any" },
        { json: "storageSettingsNotSaved", js: "storageSettingsNotSaved", typ: "any" },
        { json: "settingsSaved", js: "settingsSaved", typ: "any" },
        { json: "settingsNotSaved", js: "settingsNotSaved", typ: "any" },
        { json: "logLevelsSaved", js: "logLevelsSaved", typ: "any" },
        { json: "logLevelsNotSaved", js: "logLevelsNotSaved", typ: "any" },
        { json: "failedToSend", js: "failedToSend", typ: "any" },
        { json: "placeholders", js: "placeholders", typ: r("Placeholders") },
        { json: "sent", js: "sent", typ: "any" },
        { json: "subject", js: "subject", typ: r("Subject") },
        { json: "title", js: "title", typ: r("Title") },
    ], false),
    "Placeholders": o([
        { json: "feedback", js: "feedback", typ: "any" },
    ], false),
    "Subject": o([
        { json: "integration_feedback", js: "integration_feedback", typ: "any" },
        { json: "ipvd_feedback_device", js: "ipvd_feedback_device", typ: "any" },
        { json: "ipvd_feedback_page", js: "ipvd_feedback_page", typ: "any" },
        { json: "sales_inquiry", js: "sales_inquiry", typ: "any" },
        { json: "technical_inquiry", js: "technical_inquiry", typ: "any" },
    ], false),
    "Title": o([
        { json: "integration", js: "integration", typ: "any" },
        { json: "ipvd_feedback_device", js: "ipvd_feedback_device", typ: "any" },
        { json: "ipvd_feedback_page", js: "ipvd_feedback_page", typ: "any" },
    ], false),
    "RemoveSystem": o([
        { json: "action", js: "action", typ: "any" },
        { json: "message", js: "message", typ: "any" },
        { json: "title", js: "title", typ: "any" },
    ], false),
    "DialogsTitles": o([
        { json: "error", js: "error", typ: "any" },
        { json: "success", js: "success", typ: "any" },
        { json: "changeAccount", js: "changeAccount", typ: "any" },
        { json: "deleteUser", js: "deleteUser", typ: "any" },
        { json: "loggedFromOtherAccount", js: "loggedFromOtherAccount", typ: "any" },
        { json: "noClientDetected", js: "noClientDetected", typ: "any" },
        { json: "removeUser", js: "removeUser", typ: "any" },
        { json: "serversDetach", js: "serversDetach", typ: "any" },
        { json: "serversReset", js: "serversReset", typ: "any" },
        { json: "serversRestart", js: "serversRestart", typ: "any" },
    ], false),
    "Tooltips": o([
        { json: "deleteAccount", js: "deleteAccount", typ: "any" },
    ], false),
    "Downloads": o([
        { json: "appTypes", js: "appTypes", typ: r("AppTypes") },
        { json: "groups", js: "groups", typ: r("Groups") },
        { json: "mobile", js: "mobile", typ: r("Mobile") },
        { json: "platforms", js: "platforms", typ: r("Platforms") },
        { json: "releasesTypes", js: "releasesTypes", typ: r("ReleasesTypes") },
    ], false),
    "AppTypes": o([
        { json: "bundle", js: "bundle", typ: "any" },
        { json: "camera_sdk", js: "camera_sdk", typ: "any" },
        { json: "client", js: "client", typ: "any" },
        { json: "metadata_sdk", js: "metadata_sdk", typ: "any" },
        { json: "package", js: "package", typ: "any" },
        { json: "server", js: "server", typ: "any" },
        { json: "servertool", js: "servertool", typ: "any" },
        { json: "storage_sdk", js: "storage_sdk", typ: "any" },
        { json: "video_source_sdk", js: "video_source_sdk", typ: "any" },
    ], false),
    "Groups": o([
        { json: "android", js: "android", typ: r("ArmClass") },
        { json: "arm", js: "arm", typ: r("ArmClass") },
        { json: "ios", js: "ios", typ: r("ArmClass") },
        { json: "linux", js: "linux", typ: r("ArmClass") },
        { json: "mac", js: "mac", typ: r("MAC") },
        { json: "macos", js: "macos", typ: r("MAC") },
        { json: "sdk", js: "sdk", typ: r("ArmClass") },
        { json: "windows", js: "windows", typ: r("MAC") },
    ], false),
    "ArmClass": o([
        { json: "label", js: "label", typ: "any" },
        { json: "shortLabel", js: "shortLabel", typ: "any" },
    ], false),
    "MAC": o([
        { json: "label", js: "label", typ: "any" },
    ], false),
    "Mobile": o([
        { json: "android", js: "android", typ: r("MobileAndroid") },
        { json: "ios", js: "ios", typ: r("MobileAndroid") },
    ], false),
    "MobileAndroid": o([
        { json: "link", js: "link", typ: "any" },
    ], false),
    "Platforms": o([
        { json: "bananapi", js: "bananapi", typ: "any" },
        { json: "bpi", js: "bpi", typ: "any" },
        { json: "linux64", js: "linux64", typ: "any" },
        { json: "linux_arm32", js: "linux_arm32", typ: "any" },
        { json: "linux_arm64", js: "linux_arm64", typ: "any" },
        { json: "mac", js: "mac", typ: "any" },
        { json: "rpi", js: "rpi", typ: "any" },
        { json: "universal", js: "universal", typ: "any" },
        { json: "win64", js: "win64", typ: "any" },
    ], false),
    "ReleasesTypes": o([
        { json: "beta", js: "beta", typ: "any" },
        { json: "betas", js: "betas", typ: "any" },
        { json: "patch", js: "patch", typ: "any" },
        { json: "patches", js: "patches", typ: "any" },
        { json: "rc", js: "rc", typ: "any" },
        { json: "release", js: "release", typ: "any" },
        { json: "releases", js: "releases", typ: "any" },
    ], false),
    "ErrorCodes": o([
        { json: "CLOUD_SYSTEMS_HAVE_DIFFERENT_OWNERS", js: "CLOUD_SYSTEMS_HAVE_DIFFERENT_OWNERS", typ: "any" },
        { json: "DUPLICATE_MEDIASERVER_FOUND", js: "DUPLICATE_MEDIASERVER_FOUND", typ: "any" },
        { json: "EmailAlreadyExists", js: "EmailAlreadyExists", typ: "any" },
        { json: "FAIL", js: "FAIL", typ: "any" },
        { json: "INCOMPATIBLE", js: "INCOMPATIBLE", typ: "any" },
        { json: "accountAlreadyActivated", js: "accountAlreadyActivated", typ: "any" },
        { json: "accountBlocked", js: "accountBlocked", typ: "any" },
        { json: "accountNotActivated", js: "accountNotActivated", typ: "any" },
        { json: "alreadyExists", js: "alreadyExists", typ: "any" },
        { json: "brokenAccount", js: "brokenAccount", typ: "any" },
        { json: "cantActivatePrefix", js: "cantActivatePrefix", typ: "any" },
        { json: "cantAddYourOwnEmail", js: "cantAddYourOwnEmail", typ: "any" },
        { json: "cantChangeAccountPrefix", js: "cantChangeAccountPrefix", typ: "any" },
        { json: "cantChangePasswordPrefix", js: "cantChangePasswordPrefix", typ: "any" },
        { json: "cantDisconnectSystemPrefix", js: "cantDisconnectSystemPrefix", typ: "any" },
        { json: "cantEditAdmin", js: "cantEditAdmin", typ: "any" },
        { json: "cantEditYourself", js: "cantEditYourself", typ: "any" },
        { json: "cantGetSystemInfoPrefix", js: "cantGetSystemInfoPrefix", typ: "any" },
        { json: "cantGetSystemsListPrefix", js: "cantGetSystemsListPrefix", typ: "any" },
        { json: "cantGetUsersListPrefix", js: "cantGetUsersListPrefix", typ: "any" },
        { json: "cantOpenClient", js: "cantOpenClient", typ: "any" },
        { json: "cantRegisterPrefix", js: "cantRegisterPrefix", typ: "any" },
        { json: "cantSendActivationPrefix", js: "cantSendActivationPrefix", typ: "any" },
        { json: "cantSendConfirmationPrefix", js: "cantSendConfirmationPrefix", typ: "any" },
        { json: "cantSharePrefix", js: "cantSharePrefix", typ: "any" },
        { json: "cantUnshareWithMeSystemPrefix", js: "cantUnshareWithMeSystemPrefix", typ: "any" },
        { json: "emailNotFound", js: "emailNotFound", typ: "any" },
        { json: "failedToAccessSystem", js: "failedToAccessSystem", typ: "any" },
        { json: "forbidden", js: "forbidden", typ: "any" },
        { json: "lostConnection", js: "lostConnection", typ: "any" },
        { json: "mergedSystemIsOffline", js: "mergedSystemIsOffline", typ: "any" },
        { json: "notAuthorized", js: "notAuthorized", typ: "any" },
        { json: "notFound", js: "notFound", typ: "any" },
        { json: "ok", js: "ok", typ: "any" },
        { json: "oldPasswordMistmatch", js: "oldPasswordMistmatch", typ: "any" },
        { json: "oldSafariNotSupported", js: "oldSafariNotSupported", typ: "any" },
        { json: "passwordMismatch", js: "passwordMismatch", typ: "any" },
        { json: "thisSystem", js: "thisSystem", typ: "any" },
        { json: "unknownError", js: "unknownError", typ: "any" },
        { json: "unknownMergeError", js: "unknownMergeError", typ: "any" },
        { json: "wrongAuthCode", js: "wrongAuthCode", typ: "any" },
        { json: "wrongCode", js: "wrongCode", typ: "any" },
        { json: "wrongCodeRestore", js: "wrongCodeRestore", typ: "any" },
        { json: "wrongParameters", js: "wrongParameters", typ: "any" },
        { json: "licenseFail", js: "licenseFail", typ: "any" },
        { json: "licenseTimeout", js: "licenseTimeout", typ: "any" },
        { json: "licenseServerError", js: "licenseServerError", typ: "any" },
        { json: "networkConnection", js: "networkConnection", typ: "any" },
    ], false),
    "LanguageI18NStaticTypesIntegration": o([
        { json: "Access Control", js: "Access Control", typ: "any" },
        { json: "Connector", js: "Connector", typ: "any" },
        { json: "Data Analytics", js: "Data Analytics", typ: "any" },
        { json: "Drone", js: "Drone", typ: "any" },
        { json: "Health Monitor", js: "Health Monitor", typ: "any" },
        { json: "Storage", js: "Storage", typ: "any" },
        { json: "myIntegrationsLabel", js: "myIntegrationsLabel", typ: "any" },
        { json: "phoneNumberWithLabel", js: "phoneNumberWithLabel", typ: "any" },
        { json: "requirements", js: "requirements", typ: "any" },
        { json: "testedVersionLabel", js: "testedVersionLabel", typ: "any" },
        { json: "testedVersionsLabel", js: "testedVersionsLabel", typ: "any" },
    ], false),
    "Ipvd": o([
        { json: "Advanced PTZ cameras", js: "Advanced PTZ cameras", typ: "any" },
        { json: "Cameras supporting H.265", js: "Cameras supporting H.265", typ: "any" },
        { json: "Cameras with 2-way audio", js: "Cameras with 2-way audio", typ: "any" },
        { json: "Extra high resolution cameras", js: "Extra high resolution cameras", typ: "any" },
        { json: "Fisheye Cameras", js: "Fisheye Cameras", typ: "any" },
        { json: "I / O modules", js: "I / O modules", typ: "any" },
        { json: "Multisensor Cameras", js: "Multisensor Cameras", typ: "any" },
        { json: "PTZ cameras", js: "PTZ cameras", typ: "any" },
        { json: "camera", js: "camera", typ: "any" },
        { json: "count", js: "count", typ: "any" },
        { json: "dvr", js: "dvr", typ: "any" },
        { json: "encoder", js: "encoder", typ: "any" },
        { json: "hardwareType", js: "hardwareType", typ: "any" },
        { json: "isAnalyticsSupported", js: "isAnalyticsSupported", typ: "any" },
        { json: "isAptzSupported", js: "isAptzSupported", typ: "any" },
        { json: "isAptzSupportedShort", js: "isAptzSupportedShort", typ: "any" },
        { json: "isAudioSupported", js: "isAudioSupported", typ: "any" },
        { json: "isDualStreamingSupported", js: "isDualStreamingSupported", typ: "any" },
        { json: "isFisheye", js: "isFisheye", typ: "any" },
        { json: "isH265", js: "isH265", typ: "any" },
        { json: "isIoSupported", js: "isIoSupported", typ: "any" },
        { json: "isMdSupported", js: "isMdSupported", typ: "any" },
        { json: "isMultiSensor", js: "isMultiSensor", typ: "any" },
        { json: "isPtzSupported", js: "isPtzSupported", typ: "any" },
        { json: "isTwAudioSupported", js: "isTwAudioSupported", typ: "any" },
        { json: "maxFps", js: "maxFps", typ: "any" },
        { json: "maxResolution", js: "maxResolution", typ: "any" },
        { json: "model", js: "model", typ: "any" },
        { json: "multiSensorCamera", js: "multiSensorCamera", typ: "any" },
        { json: "other", js: "other", typ: "any" },
        { json: "primaryCodec", js: "primaryCodec", typ: "any" },
        { json: "resolutionArea", js: "resolutionArea", typ: "any" },
        { json: "sndResolution", js: "sndResolution", typ: "any" },
        { json: "vendor", js: "vendor", typ: "any" },
        { json: "sortKey", js: "sortKey", typ: "any" },
    ], false),
    "IpvdFeedback": o([
        { json: "a_Please", js: "a_Please", typ: "any" },
        { json: "b_Link", js: "b_Link", typ: "any" },
        { json: "c_Info", js: "c_Info", typ: "any" },
    ], false),
    "License": o([
        { json: "info", js: "info", typ: r("Info") },
        { json: "messages", js: "messages", typ: r("Messages") },
    ], false),
    "Info": o([
        { json: "type", js: "type", typ: "any" },
        { json: "channels", js: "channels", typ: "any" },
        { json: "server", js: "server", typ: "any" },
        { json: "hwid", js: "hwid", typ: "any" },
        { json: "status", js: "status", typ: "any" },
        { json: "expires", js: "expires", typ: "any" },
        { json: "time", js: "time", typ: "any" },
        { json: "deactivations", js: "deactivations", typ: "any" },
        { json: "trial", js: "trial", typ: "any" },
        { json: "online", js: "online", typ: "any" },
        { json: "error", js: "error", typ: "any" },
        { json: "expired", js: "expired", typ: "any" },
        { json: "ok", js: "ok", typ: "any" },
        { json: "digital", js: "digital", typ: "any" },
        { json: "analog", js: "analog", typ: "any" },
        { json: "edge", js: "edge", typ: "any" },
        { json: "vmax", js: "vmax", typ: "any" },
        { json: "videowall", js: "videowall", typ: "any" },
        { json: "analogencoder", js: "analogencoder", typ: "any" },
        { json: "starter", js: "starter", typ: "any" },
        { json: "iomodule", js: "iomodule", typ: "any" },
        { json: "bridge", js: "bridge", typ: "any" },
    ], false),
    "Messages": o([
        { json: "required", js: "required", typ: "any" },
        { json: "activated", js: "activated", typ: "any" },
        { json: "inuse", js: "inuse", typ: "any" },
        { json: "trialActivated", js: "trialActivated", typ: "any" },
    ], false),
    "Menu": o([
        { json: "titles", js: "titles", typ: r("MenuTitles") },
    ], false),
    "MenuTitles": o([
        { json: "systemAdministration", js: "systemAdministration", typ: "any" },
        { json: "general", js: "general", typ: "any" },
        { json: "licenses", js: "licenses", typ: "any" },
        { json: "users", js: "users", typ: "any" },
    ], false),
    "PageTitles": o([
        { json: "about", js: "about", typ: "any" },
        { json: "account", js: "account", typ: "any" },
        { json: "activate", js: "activate", typ: "any" },
        { json: "activateCode", js: "activateCode", typ: "any" },
        { json: "activateSuccess", js: "activateSuccess", typ: "any" },
        { json: "changePassword", js: "changePassword", typ: "any" },
        { json: "debug", js: "debug", typ: "any" },
        { json: "default", js: "default", typ: "any" },
        { json: "download", js: "download", typ: "any" },
        { json: "downloadPlatform", js: "downloadPlatform", typ: "any" },
        { json: "failedToAccessSystem", js: "failedToAccessSystem", typ: "any" },
        { json: "integrations", js: "integrations", typ: "any" },
        { json: "login", js: "login", typ: "any" },
        { json: "pageNotFound", js: "pageNotFound", typ: "any" },
        { json: "register", js: "register", typ: "any" },
        { json: "registerSuccess", js: "registerSuccess", typ: "any" },
        { json: "restorePassword", js: "restorePassword", typ: "any" },
        { json: "restorePasswordSuccess", js: "restorePasswordSuccess", typ: "any" },
        { json: "supportedDevices", js: "supportedDevices", typ: "any" },
        { json: "system", js: "system", typ: "any" },
        { json: "systemShare", js: "systemShare", typ: "any" },
        { json: "systems", js: "systems", typ: "any" },
        { json: "template", js: "template", typ: "any" },
        { json: "view", js: "view", typ: "any" },
    ], false),
    "PasswordRequirements": o([
        { json: "common", js: "common", typ: "any" },
        { json: "commonMessage", js: "commonMessage", typ: "any" },
        { json: "fair", js: "fair", typ: "any" },
        { json: "fairMessage", js: "fairMessage", typ: "any" },
        { json: "good", js: "good", typ: "any" },
        { json: "minLength", js: "minLength", typ: "any" },
        { json: "minLengthMessage", js: "minLengthMessage", typ: "any" },
        { json: "missingMessage", js: "missingMessage", typ: "any" },
        { json: "required", js: "required", typ: "any" },
        { json: "requiredMessage", js: "requiredMessage", typ: "any" },
        { json: "strongMessage", js: "strongMessage", typ: "any" },
        { json: "weak", js: "weak", typ: "any" },
        { json: "weakMessage", js: "weakMessage", typ: "any" },
    ], false),
    "PlaceholderTexts": o([
        { json: "noSettings", js: "noSettings", typ: r("NoSettings") },
        { json: "merge", js: "merge", typ: r("PlaceholderTextsMerge") },
        { json: "server", js: "server", typ: r("NoSettings") },
    ], false),
    "PlaceholderTextsMerge": o([
        { json: "title", js: "title", typ: "any" },
        { json: "message", js: "message", typ: r("MergeMessage") },
    ], false),
    "MergeMessage": o([
        { json: "dependingOnSize", js: "dependingOnSize", typ: "any" },
        { json: "untilFinished", js: "untilFinished", typ: "any" },
        { json: "whenFinished", js: "whenFinished", typ: "any" },
    ], false),
    "PrivacyPolicy": o([
        { json: "integration", js: "integration", typ: "any" },
        { json: "ipvd", js: "ipvd", typ: "any" },
    ], false),
    "Registration": o([
        { json: "agreement", js: "agreement", typ: "any" },
    ], false),
    "Ribbon": o([
        { json: "beingMerged", js: "beingMerged", typ: r("BeingMerged") },
        { json: "finishingMerge", js: "finishingMerge", typ: "any" },
        { json: "integration", js: "integration", typ: r("RibbonIntegration") },
        { json: "systemOffline", js: "systemOffline", typ: "any" },
        { json: "systemsMerging", js: "systemsMerging", typ: "any" },
    ], false),
    "BeingMerged": o([
        { json: "to", js: "to", typ: "any" },
        { json: "mayTake", js: "mayTake", typ: "any" },
    ], false),
    "RibbonIntegration": o([
        { json: "backToEditText", js: "backToEditText", typ: "any" },
        { json: "previewRibbon", js: "previewRibbon", typ: "any" },
    ], false),
    "Search": o([
        { json: "Any", js: "Any", typ: "any" },
        { json: "Search", js: "Search", typ: "any" },
        { json: "analytics", js: "analytics", typ: "any" },
        { json: "analyticsSelected", js: "analyticsSelected", typ: "any" },
        { json: "filter applied", js: "filter applied", typ: "any" },
        { json: "filters applied", js: "filters applied", typ: "any" },
        { json: "appliedFilters", js: "appliedFilters", typ: "any" },
        { json: "hardwareType", js: "hardwareType", typ: "any" },
        { json: "hardwareTypes", js: "hardwareTypes", typ: "any" },
        { json: "minResolution", js: "minResolution", typ: "any" },
        { json: "search_ipvd", js: "search_ipvd", typ: "any" },
        { json: "selected", js: "selected", typ: "any" },
        { json: "vendor", js: "vendor", typ: "any" },
        { json: "vendors", js: "vendors", typ: "any" },
    ], false),
    "Servers": o([
        { json: "beginDetach", js: "beginDetach", typ: "any" },
        { json: "beginReset", js: "beginReset", typ: "any" },
        { json: "detachSystemFailed", js: "detachSystemFailed", typ: "any" },
        { json: "detachSystemSuccess", js: "detachSystemSuccess", typ: "any" },
        { json: "portWarning", js: "portWarning", typ: "any" },
        { json: "removeMediaserverFailed", js: "removeMediaserverFailed", typ: "any" },
        { json: "resetFailed", js: "resetFailed", typ: "any" },
        { json: "resetSuccessful", js: "resetSuccessful", typ: "any" },
        { json: "restartFailed", js: "restartFailed", typ: "any" },
        { json: "restartSuccessful", js: "restartSuccessful", typ: "any" },
        { json: "serverOffline", js: "serverOffline", typ: "any" },
        { json: "servers", js: "servers", typ: "any" },
        { json: "status", js: "status", typ: r("ServersStatus") },
        { json: "successRename", js: "successRename", typ: "any" },
    ], false),
    "ServersStatus": o([
        { json: "checking", js: "checking", typ: "any" },
        { json: "offline", js: "offline", typ: "any" },
        { json: "resetting", js: "resetting", typ: "any" },
        { json: "restarting", js: "restarting", typ: "any" },
    ], false),
    "LanguageI18NStaticTypesSystem": o([
        { json: "MERGE_FINISHES", js: "MERGE_FINISHES", typ: "any" },
        { json: "mergeUnknownName", js: "mergeUnknownName", typ: "any" },
        { json: "mySystemSearch", js: "mySystemSearch", typ: "any" },
        { json: "settings", js: "settings", typ: r("Settings") },
        { json: "status", js: "status", typ: r("SystemStatus") },
        { json: "users", js: "users", typ: r("Users") },
        { json: "yourSystem", js: "yourSystem", typ: "any" },
        { json: "loggers", js: "loggers", typ: r("Loggers") },
    ], false),
    "Loggers": o([
        { json: "none", js: "none", typ: r("Debug") },
        { json: "error", js: "error", typ: r("Debug") },
        { json: "warning", js: "warning", typ: r("Debug") },
        { json: "info", js: "info", typ: r("Debug") },
        { json: "debug", js: "debug", typ: r("Debug") },
        { json: "verbose", js: "verbose", typ: r("Debug") },
    ], false),
    "Debug": o([
        { json: "text", js: "text", typ: "any" },
        { json: "help", js: "help", typ: "any" },
    ], false),
    "Settings": o([
        { json: "notAbleToLoadSecurity", js: "notAbleToLoadSecurity", typ: "any" },
        { json: "notAbleToLoadSystem", js: "notAbleToLoadSystem", typ: "any" },
        { json: "sessionLimitDuration", js: "sessionLimitDuration", typ: r("SessionLimitDuration") },
        { json: "warningMessages", js: "warningMessages", typ: r("WarningMessages") },
    ], false),
    "SessionLimitDuration": o([
        { json: "hours", js: "hours", typ: "any" },
        { json: "minutes", js: "minutes", typ: "any" },
    ], false),
    "WarningMessages": o([
        { json: "videoEncryption", js: "videoEncryption", typ: "any" },
    ], false),
    "SystemStatus": o([
        { json: "offline", js: "offline", typ: "any" },
        { json: "unavailable", js: "unavailable", typ: "any" },
    ], false),
    "Users": o([
        { json: "cloudDelete", js: "cloudDelete", typ: "any" },
        { json: "localDelete", js: "localDelete", typ: "any" },
    ], false),
    "SystemStatuses": o([
        { json: "activated", js: "activated", typ: "any" },
        { json: "incompatible", js: "incompatible", typ: "any" },
        { json: "merging", js: "merging", typ: "any" },
        { json: "notActivated", js: "notActivated", typ: "any" },
        { json: "offline", js: "offline", typ: "any" },
        { json: "online", js: "online", typ: "any" },
        { json: "unavailable", js: "unavailable", typ: "any" },
    ], false),
    "ToastMessage": o([
        { json: "system", js: "system", typ: r("ToastMessageSystem") },
    ], false),
    "ToastMessageSystem": o([
        { json: "deleted", js: "deleted", typ: r("Deleted") },
        { json: "disconnected", js: "disconnected", typ: r("Deleted") },
        { json: "merge", js: "merge", typ: r("SystemMerge") },
        { json: "rename", js: "rename", typ: r("Deleted") },
    ], false),
    "Deleted": o([
        { json: "success", js: "success", typ: "any" },
    ], false),
    "SystemMerge": o([
        { json: "failed", js: "failed", typ: "any" },
        { json: "success", js: "success", typ: "any" },
    ], false),
};
