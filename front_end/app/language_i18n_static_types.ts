// To parse this data:
//
//   import { Convert, LanguageI18NStaticTypes } from "./file";
//
//   const languageI18NStaticTypes = Convert.toLanguageI18NStaticTypes(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface LanguageI18NStaticTypes {
    "About %CLOUD_NAME%":  string;
    "Download %VMS_NAME%": string;
    Integrations:          string;
    Privacy:               string;
    Support:               string;
    Terms:                 string;
    accessRoles:           { [key: string]: AccessRole };
    account:               LanguageI18NStaticTypesAccount;
    activeActions:         ActiveActions;
    cameraFilters:         CameraFilters;
    clientProtocol:        string;
    common:                Common;
    dialogs:               Dialogs;
    downloads:             Downloads;
    errorCodes:            ErrorCodes;
    integration:           LanguageI18NStaticTypesIntegration;
    ipvd:                  Ipvd;
    menu:                  Menu;
    pageTitles:            PageTitles;
    passwordRequirements:  PasswordRequirements;
    placeholderTexts:      PlaceholderTexts;
    pleaseSelect:          string;
    privacyPolicy:         PrivacyPolicy;
    registration:          Registration;
    ribbon:                Ribbon;
    search:                Search;
    servers:               Servers;
    system:                LanguageI18NStaticTypesSystem;
    systemStatuses:        SystemStatuses;
    toastMessage:          ToastMessage;
    settingsConfig:        { [key: string]: string };
}

export interface AccessRole {
    description: string;
    label:       string;
}

export interface LanguageI18NStaticTypesAccount {
    accountSavedSuccess: string;
    accountSettings:     string;
    activationLinkSent:  string;
    agreementAccepted:   string;
    changePassword:      string;
    newPasswordLabel:    string;
    saveChanges:         string;
}

export interface ActiveActions {
    resetPassword:       string;
    sendConfirm:         string;
    setNewPassword:      string;
    setNewPasswordLabel: string;
}

export interface CameraFilters {
    H265:        string;
    IO:          string;
    TwWayAudio:  string;
    aptz:        string;
    audio:       string;
    encoder:     string;
    fisheye:     string;
    highRes:     string;
    multiSensor: string;
    ptz:         string;
}

export interface Common {
    account:                   CommonAccount;
    cameraLinks:               CameraLinks;
    cameraStates:              CameraStates;
    chromeCastWarning:         string;
    resolution:                Resolution;
    maintenanceInProgress:     string;
    searchCamPlaceholder:      string;
    systemHasNoCameras:        string;
    systemHasNoCamerasMessage: string;
    systemNewVersion:          string;
    systemNewVersionMessage:   string;
    systemNoAlerts:            string;
    systemNoAlertsMessage:     string;
    systemOffline:             string;
    systemOfflineMessage:      string;
    systemServerError:         string;
    systemServerErrorMessage:  string;
    systemUnreachable:         string;
    unknown:                   string;
    voiceCommands:             VoiceCommands;
    viewingOutdatedReport:     string;
}

export interface CommonAccount {
    created:   Created;
    activated: Activated;
}

export interface Activated {
    title: string;
}

export interface Created {
    title:   string;
    message: string;
}

export interface CameraLinks {
    copyActiveText:  string;
    copyDefaultText: string;
    copyToClipboard: string;
    highStream:      string;
    lowStream:       string;
    transcoding:     string;
    unknown:         string;
}

export interface CameraStates {
    error:               string;
    errorLoading:        string;
    flashOrWebmRequired: string;
    flashRequired:       string;
    iOSVideoTooLarge:    string;
    ieNoWebm:            string;
    ieWin10:             string;
    noArmSupport:        string;
    noData:              string;
    noFormat:            string;
    offline:             string;
    ubuntuNX:            string;
    unauthorized:        string;
}

export interface Resolution {
    auto: string;
    high: string;
    low:  string;
}

export interface VoiceCommands {
    "clear search":         string;
    "collapse all servers": string;
    "collapse server":      string;
    "expand all servers":   string;
    "expand server":        string;
    help:                   string;
    live:                   string;
    pause:                  string;
    play:                   string;
    search:                 string;
    "stop listening":       string;
    view:                   string;
}

export interface Dialogs {
    buttons:      Buttons;
    merge:        DialogsMerge;
    message:      DialogsMessage;
    removeSystem: RemoveSystem;
    sharing:      Sharing;
    titles:       DialogsTitles;
}

export interface Buttons {
    cancel:           string;
    createAccount:    string;
    delete:           string;
    download:         string;
    logoutAuthorised: string;
    ok:               string;
    remove:           string;
    stayAs:           string;
    stayLoggedIn:     string;
}

export interface DialogsMerge {
    adminPasswordTitle:         string;
    checking:                   string;
    commonText:                 string;
    connectToCloud:             string;
    duplicateServers:           string;
    enterSystemAddressTitle:    string;
    mergeConfirmation:          string;
    mergeSystemsTitle:          string;
    mergeFailedTitle:           string;
    noServerFound:              string;
    newSystemDisplayName:       string;
    ownerCanMergeText:          string;
    passwordRequired:           string;
    passwordWrong:              string;
    primaryCannotMerge:         string;
    primarySystemOffline:       string;
    primarySystemUnavailable:   string;
    recommendSupport:           RecommendSupport;
    secondaryCannotMerge:       string;
    secondarySystemUnavailable: string;
    serverNotAvailable:         string;
    serverNotYours:             string;
    serverVersionOld:           string;
    serverVersionNew:           string;
    systemVersionOld:           string;
    systemVersionNew:           string;
    systemOffline:              string;
    urlEmpty:                   string;
    urlNotValid:                string;
    unknownError:               string;
    warning:                    string;
}

export interface RecommendSupport {
    a_recommend:  string;
    b_support:    string;
    c_proceeding: string;
}

export interface DialogsMessage {
    settingsSaved:    string;
    settingsNotSaved: string;
    failedToSend:     string;
    placeholders:     Placeholders;
    sent:             string;
    subject:          Subject;
    title:            Title;
}

export interface Placeholders {
    feedback: string;
}

export interface Subject {
    integration_feedback: string;
    ipvd_feedback_device: string;
    ipvd_feedback_page:   string;
    sales_inquiry:        string;
    technical_inquiry:    string;
}

export interface Title {
    integration:          string;
    ipvd_feedback_device: string;
    ipvd_feedback_page:   string;
}

export interface RemoveSystem {
    action:  string;
    message: string;
    title:   string;
}

export interface Sharing {
    confirmOwner:           string;
    editShareConfirmButton: string;
    editShareTitle:         string;
    shareConfirmButton:     string;
    shareTitle:             string;
}

export interface DialogsTitles {
    error:                  string;
    success:                string;
    changeAccount:          string;
    deleteUser:             string;
    loggedFromOtherAccount: string;
    noClientDetected:       string;
    removeUser:             string;
    serversDetach:          string;
    serversReset:           string;
    serversRestart:         string;
}

export interface Downloads {
    appTypes:      AppTypes;
    groups:        Groups;
    mobile:        Mobile;
    platforms:     Platforms;
    releasesTypes: ReleasesTypes;
}

export interface AppTypes {
    bundle:           string;
    camera_sdk:       string;
    client:           string;
    metadata_sdk:     string;
    package:          string;
    server:           string;
    servertool:       string;
    storage_sdk:      string;
    video_source_sdk: string;
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
    label:      string;
    shortLabel: string;
}

export interface MAC {
    label: string;
}

export interface Mobile {
    android: MobileAndroid;
    ios:     MobileAndroid;
}

export interface MobileAndroid {
    link: string;
}

export interface Platforms {
    bananapi:    string;
    bpi:         string;
    linux64:     string;
    linux_arm32: string;
    linux_arm64: string;
    mac:         string;
    rpi:         string;
    universal:   string;
    win64:       string;
}

export interface ReleasesTypes {
    beta:     string;
    betas:    string;
    patch:    string;
    patches:  string;
    rc:       string;
    release:  string;
    releases: string;
}

export interface ErrorCodes {
    DUPLICATE_MEDIASERVER_FOUND:   string;
    EmailAlreadyExists:            string;
    FAIL:                          string;
    INCOMPATIBLE:                  string;
    accountAlreadyActivated:       string;
    accountBlocked:                string;
    accountNotActivated:           string;
    alreadyExists:                 string;
    brokenAccount:                 string;
    cantActivatePrefix:            string;
    cantAddYourOwnEmail:           string;
    cantChangeAccountPrefix:       string;
    cantChangePasswordPrefix:      string;
    cantDisconnectSystemPrefix:    string;
    cantEditAdmin:                 string;
    cantEditYourself:              string;
    cantGetSystemInfoPrefix:       string;
    cantGetSystemsListPrefix:      string;
    cantGetUsersListPrefix:        string;
    cantOpenClient:                string;
    cantRegisterPrefix:            string;
    cantSendActivationPrefix:      string;
    cantSendConfirmationPrefix:    string;
    cantSharePrefix:               string;
    cantUnshareWithMeSystemPrefix: string;
    emailNotFound:                 string;
    failedToAccessSystem:          string;
    forbidden:                     string;
    lostConnection:                string;
    mergedSystemIsOffline:         string;
    notAuthorized:                 string;
    notFound:                      string;
    ok:                            string;
    oldPasswordMistmatch:          string;
    oldSafariNotSupported:         string;
    passwordMismatch:              string;
    thisSystem:                    string;
    unknownError:                  string;
    unknownMergeError:             string;
    wrongAuthCode:                 string;
    wrongCode:                     string;
    wrongCodeRestore:              string;
    wrongParameters:               string;
}

export interface LanguageI18NStaticTypesIntegration {
    "Access Control":     string;
    Connector:            string;
    "Data Analytics":     string;
    Drone:                string;
    "Health Monitor":     string;
    Storage:              string;
    myIntegrationsLabel:  string;
    phoneNumberWithLabel: string;
    requirements:         string;
    testedVersionLabel:   string;
    testedVersionsLabel:  string;
}

export interface Ipvd {
    "Advanced PTZ cameras":          string;
    "Cameras supporting H.265":      string;
    "Cameras with 2-way audio":      string;
    "Extra high resolution cameras": string;
    "Fisheye Cameras":               string;
    "I / O modules":                 string;
    "Multisensor Cameras":           string;
    "PTZ cameras":                   string;
    camera:                          string;
    count:                           string;
    disclaimer:                      string;
    dvr:                             string;
    encoder:                         string;
    feedback:                        Feedback;
    hardwareType:                    string;
    isAnalyticsSupported:            string;
    isAptzSupported:                 string;
    isAptzSupportedShort:            string;
    isAudioSupported:                string;
    isFisheye:                       string;
    isH265:                          string;
    isIoSupported:                   string;
    isMdSupported:                   string;
    isMultiSensor:                   string;
    isPtzSupported:                  string;
    isTwAudioSupported:              string;
    maxFps:                          string;
    maxResolution:                   string;
    model:                           string;
    multiSensorCamera:               string;
    other:                           string;
    primaryCodec:                    string;
    resolutionArea:                  string;
    topXByVolume:                    string;
    vendor:                          string;
}

export interface Feedback {
    a_Please: string;
    b_Link:   string;
    c_Info:   string;
}

export interface Menu {
    titles: MenuTitles;
}

export interface MenuTitles {
    systemAdministration: string;
    users:                string;
}

export interface PageTitles {
    about:                  string;
    account:                string;
    activate:               string;
    activateCode:           string;
    activateSuccess:        string;
    changePassword:         string;
    debug:                  string;
    default:                string;
    download:               string;
    downloadPlatform:       string;
    failedToAccessSystem:   string;
    integrations:           string;
    login:                  string;
    pageNotFound:           string;
    register:               string;
    registerSuccess:        string;
    restorePassword:        string;
    restorePasswordSuccess: string;
    supportedDevices:       string;
    system:                 string;
    systemName:             string;
    systemShare:            string;
    systems:                string;
    template:               string;
    view:                   string;
}

export interface PasswordRequirements {
    common:           string;
    commonMessage:    string;
    fair:             string;
    fairMessage:      string;
    good:             string;
    minLength:        string;
    minLengthMessage: string;
    missingMessage:   string;
    required:         string;
    requiredMessage:  string;
    strongMessage:    string;
    weak:             string;
    weakMessage:      string;
}

export interface PlaceholderTexts {
    merge: PlaceholderTextsMerge;
}

export interface PlaceholderTextsMerge {
    title:   string;
    message: MergeMessage;
}

export interface MergeMessage {
    dependingOnSize: string;
    untilFinished:   string;
    whenFinished:    string;
}

export interface PrivacyPolicy {
    integration: string;
    ipvd:        string;
}

export interface Registration {
    agreement: string;
}

export interface Ribbon {
    beingMerged:    BeingMerged;
    finishingMerge: string;
    integration:    RibbonIntegration;
    systemOffline:  string;
}

export interface BeingMerged {
    to:      string;
    mayTake: string;
}

export interface RibbonIntegration {
    backToEditText: string;
    previewRibbon:  string;
}

export interface Search {
    Any:               string;
    Search:            string;
    analytics:         string;
    analyticsSelected: string;
    "filter applied":  string;
    "filters applied": string;
    hardwareType:      string;
    hardwareTypes:     string;
    minResolution:     string;
    search_ipvd:       string;
    selected:          string;
    vendor:            string;
    vendors:           string;
}

export interface Servers {
    beginDetach:             string;
    beginReset:              string;
    beginRestart:            string;
    detachSystemFailed:      string;
    detachSystemSuccess:     string;
    getModuleFailed:         string;
    portWarning:             string;
    removeMediaserverFailed: string;
    resetFailed:             string;
    resetSuccessful:         string;
    restartFailed:           string;
    restartSuccessful:       string;
    servers:                 string;
    status:                  ServersStatus;
    successRename:           string;
}

export interface ServersStatus {
    checking:   string;
    offline:    string;
    reseting:   string;
    restarting: string;
}

export interface LanguageI18NStaticTypesSystem {
    MERGE_FINISHES:   string;
    mergeUnknownName: string;
    mySystemSearch:   string;
    settings:         Settings;
    status:           SystemStatus;
    users:            Users;
    yourSystem:       string;
}

export interface Settings {
    notAbleToLoadSecurity: string;
    notAbleToLoadSystem:   string;
    sessionLimitDuration:  SessionLimitDuration;
    warningMessages:       WarningMessages;
}

export interface SessionLimitDuration {
    hours:   string;
    minutes: string;
}

export interface WarningMessages {
    videoEncryption: string;
}

export interface SystemStatus {
    offline:     string;
    unavailable: string;
}

export interface Users {
    cloudDelete: string;
    localDelete: string;
}

export interface SystemStatuses {
    activated:    string;
    incompatible: string;
    merging:      string;
    notActivated: string;
    offline:      string;
    online:       string;
    unavailable:  string;
}

export interface ToastMessage {
    system: ToastMessageSystem;
}

export interface ToastMessageSystem {
    deleted:      Deleted;
    disconnected: Deleted;
    merge:        SystemMerge;
    rename:       Deleted;
    share:        Share;
}

export interface Deleted {
    success: string;
}

export interface SystemMerge {
    failed:  string;
    start:   string;
    success: string;
}

export interface Share {
    offline:      string;
    unauthorized: string;
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
        var map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        var map: any = {};
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
        var l = typs.length;
        for (var i = 0; i < l; i++) {
            var typ = typs[i];
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

    function transformDate(typ: any, val: any): any {
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
        var result: any = {};
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
    if (typ === Date && typeof val !== "number") return transformDate(typ, val);
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
        { json: "About %CLOUD_NAME%", js: "About %CLOUD_NAME%", typ: "" },
        { json: "Download %VMS_NAME%", js: "Download %VMS_NAME%", typ: "" },
        { json: "Integrations", js: "Integrations", typ: "" },
        { json: "Privacy", js: "Privacy", typ: "" },
        { json: "Support", js: "Support", typ: "" },
        { json: "Terms", js: "Terms", typ: "" },
        { json: "accessRoles", js: "accessRoles", typ: m(r("AccessRole")) },
        { json: "account", js: "account", typ: r("LanguageI18NStaticTypesAccount") },
        { json: "activeActions", js: "activeActions", typ: r("ActiveActions") },
        { json: "cameraFilters", js: "cameraFilters", typ: r("CameraFilters") },
        { json: "clientProtocol", js: "clientProtocol", typ: "" },
        { json: "common", js: "common", typ: r("Common") },
        { json: "dialogs", js: "dialogs", typ: r("Dialogs") },
        { json: "downloads", js: "downloads", typ: r("Downloads") },
        { json: "errorCodes", js: "errorCodes", typ: r("ErrorCodes") },
        { json: "integration", js: "integration", typ: r("LanguageI18NStaticTypesIntegration") },
        { json: "ipvd", js: "ipvd", typ: r("Ipvd") },
        { json: "menu", js: "menu", typ: r("Menu") },
        { json: "pageTitles", js: "pageTitles", typ: r("PageTitles") },
        { json: "passwordRequirements", js: "passwordRequirements", typ: r("PasswordRequirements") },
        { json: "placeholderTexts", js: "placeholderTexts", typ: r("PlaceholderTexts") },
        { json: "pleaseSelect", js: "pleaseSelect", typ: "" },
        { json: "privacyPolicy", js: "privacyPolicy", typ: r("PrivacyPolicy") },
        { json: "registration", js: "registration", typ: r("Registration") },
        { json: "ribbon", js: "ribbon", typ: r("Ribbon") },
        { json: "search", js: "search", typ: r("Search") },
        { json: "servers", js: "servers", typ: r("Servers") },
        { json: "system", js: "system", typ: r("LanguageI18NStaticTypesSystem") },
        { json: "systemStatuses", js: "systemStatuses", typ: r("SystemStatuses") },
        { json: "toastMessage", js: "toastMessage", typ: r("ToastMessage") },
        { json: "settingsConfig", js: "settingsConfig", typ: m("") },
    ], false),
    "AccessRole": o([
        { json: "description", js: "description", typ: "" },
        { json: "label", js: "label", typ: "" },
    ], false),
    "LanguageI18NStaticTypesAccount": o([
        { json: "accountSavedSuccess", js: "accountSavedSuccess", typ: "" },
        { json: "accountSettings", js: "accountSettings", typ: "" },
        { json: "activationLinkSent", js: "activationLinkSent", typ: "" },
        { json: "agreementAccepted", js: "agreementAccepted", typ: "" },
        { json: "changePassword", js: "changePassword", typ: "" },
        { json: "newPasswordLabel", js: "newPasswordLabel", typ: "" },
        { json: "saveChanges", js: "saveChanges", typ: "" },
    ], false),
    "ActiveActions": o([
        { json: "resetPassword", js: "resetPassword", typ: "" },
        { json: "sendConfirm", js: "sendConfirm", typ: "" },
        { json: "setNewPassword", js: "setNewPassword", typ: "" },
        { json: "setNewPasswordLabel", js: "setNewPasswordLabel", typ: "" },
    ], false),
    "CameraFilters": o([
        { json: "H265", js: "H265", typ: "" },
        { json: "IO", js: "IO", typ: "" },
        { json: "TwWayAudio", js: "TwWayAudio", typ: "" },
        { json: "aptz", js: "aptz", typ: "" },
        { json: "audio", js: "audio", typ: "" },
        { json: "encoder", js: "encoder", typ: "" },
        { json: "fisheye", js: "fisheye", typ: "" },
        { json: "highRes", js: "highRes", typ: "" },
        { json: "multiSensor", js: "multiSensor", typ: "" },
        { json: "ptz", js: "ptz", typ: "" },
    ], false),
    "Common": o([
        { json: "account", js: "account", typ: r("CommonAccount") },
        { json: "cameraLinks", js: "cameraLinks", typ: r("CameraLinks") },
        { json: "cameraStates", js: "cameraStates", typ: r("CameraStates") },
        { json: "chromeCastWarning", js: "chromeCastWarning", typ: "" },
        { json: "resolution", js: "resolution", typ: r("Resolution") },
        { json: "maintenanceInProgress", js: "maintenanceInProgress", typ: "" },
        { json: "searchCamPlaceholder", js: "searchCamPlaceholder", typ: "" },
        { json: "systemHasNoCameras", js: "systemHasNoCameras", typ: "" },
        { json: "systemHasNoCamerasMessage", js: "systemHasNoCamerasMessage", typ: "" },
        { json: "systemNewVersion", js: "systemNewVersion", typ: "" },
        { json: "systemNewVersionMessage", js: "systemNewVersionMessage", typ: "" },
        { json: "systemNoAlerts", js: "systemNoAlerts", typ: "" },
        { json: "systemNoAlertsMessage", js: "systemNoAlertsMessage", typ: "" },
        { json: "systemOffline", js: "systemOffline", typ: "" },
        { json: "systemOfflineMessage", js: "systemOfflineMessage", typ: "" },
        { json: "systemServerError", js: "systemServerError", typ: "" },
        { json: "systemServerErrorMessage", js: "systemServerErrorMessage", typ: "" },
        { json: "systemUnreachable", js: "systemUnreachable", typ: "" },
        { json: "unknown", js: "unknown", typ: "" },
        { json: "voiceCommands", js: "voiceCommands", typ: r("VoiceCommands") },
        { json: "viewingOutdatedReport", js: "viewingOutdatedReport", typ: "" },
    ], false),
    "CommonAccount": o([
        { json: "created", js: "created", typ: r("Created") },
        { json: "activated", js: "activated", typ: r("Activated") },
    ], false),
    "Activated": o([
        { json: "title", js: "title", typ: "" },
    ], false),
    "Created": o([
        { json: "title", js: "title", typ: "" },
        { json: "message", js: "message", typ: "" },
    ], false),
    "CameraLinks": o([
        { json: "copyActiveText", js: "copyActiveText", typ: "" },
        { json: "copyDefaultText", js: "copyDefaultText", typ: "" },
        { json: "copyToClipboard", js: "copyToClipboard", typ: "" },
        { json: "highStream", js: "highStream", typ: "" },
        { json: "lowStream", js: "lowStream", typ: "" },
        { json: "transcoding", js: "transcoding", typ: "" },
        { json: "unknown", js: "unknown", typ: "" },
    ], false),
    "CameraStates": o([
        { json: "error", js: "error", typ: "" },
        { json: "errorLoading", js: "errorLoading", typ: "" },
        { json: "flashOrWebmRequired", js: "flashOrWebmRequired", typ: "" },
        { json: "flashRequired", js: "flashRequired", typ: "" },
        { json: "iOSVideoTooLarge", js: "iOSVideoTooLarge", typ: "" },
        { json: "ieNoWebm", js: "ieNoWebm", typ: "" },
        { json: "ieWin10", js: "ieWin10", typ: "" },
        { json: "noArmSupport", js: "noArmSupport", typ: "" },
        { json: "noData", js: "noData", typ: "" },
        { json: "noFormat", js: "noFormat", typ: "" },
        { json: "offline", js: "offline", typ: "" },
        { json: "ubuntuNX", js: "ubuntuNX", typ: "" },
        { json: "unauthorized", js: "unauthorized", typ: "" },
    ], false),
    "Resolution": o([
        { json: "auto", js: "auto", typ: "" },
        { json: "high", js: "high", typ: "" },
        { json: "low", js: "low", typ: "" },
    ], false),
    "VoiceCommands": o([
        { json: "clear search", js: "clear search", typ: "" },
        { json: "collapse all servers", js: "collapse all servers", typ: "" },
        { json: "collapse server", js: "collapse server", typ: "" },
        { json: "expand all servers", js: "expand all servers", typ: "" },
        { json: "expand server", js: "expand server", typ: "" },
        { json: "help", js: "help", typ: "" },
        { json: "live", js: "live", typ: "" },
        { json: "pause", js: "pause", typ: "" },
        { json: "play", js: "play", typ: "" },
        { json: "search", js: "search", typ: "" },
        { json: "stop listening", js: "stop listening", typ: "" },
        { json: "view", js: "view", typ: "" },
    ], false),
    "Dialogs": o([
        { json: "buttons", js: "buttons", typ: r("Buttons") },
        { json: "merge", js: "merge", typ: r("DialogsMerge") },
        { json: "message", js: "message", typ: r("DialogsMessage") },
        { json: "removeSystem", js: "removeSystem", typ: r("RemoveSystem") },
        { json: "sharing", js: "sharing", typ: r("Sharing") },
        { json: "titles", js: "titles", typ: r("DialogsTitles") },
    ], false),
    "Buttons": o([
        { json: "cancel", js: "cancel", typ: "" },
        { json: "createAccount", js: "createAccount", typ: "" },
        { json: "delete", js: "delete", typ: "" },
        { json: "download", js: "download", typ: "" },
        { json: "logoutAuthorised", js: "logoutAuthorised", typ: "" },
        { json: "ok", js: "ok", typ: "" },
        { json: "remove", js: "remove", typ: "" },
        { json: "stayAs", js: "stayAs", typ: "" },
        { json: "stayLoggedIn", js: "stayLoggedIn", typ: "" },
    ], false),
    "DialogsMerge": o([
        { json: "adminPasswordTitle", js: "adminPasswordTitle", typ: "" },
        { json: "checking", js: "checking", typ: "" },
        { json: "commonText", js: "commonText", typ: "" },
        { json: "connectToCloud", js: "connectToCloud", typ: "" },
        { json: "duplicateServers", js: "duplicateServers", typ: "" },
        { json: "enterSystemAddressTitle", js: "enterSystemAddressTitle", typ: "" },
        { json: "mergeConfirmation", js: "mergeConfirmation", typ: "" },
        { json: "mergeSystemsTitle", js: "mergeSystemsTitle", typ: "" },
        { json: "mergeFailedTitle", js: "mergeFailedTitle", typ: "" },
        { json: "noServerFound", js: "noServerFound", typ: "" },
        { json: "newSystemDisplayName", js: "newSystemDisplayName", typ: "" },
        { json: "ownerCanMergeText", js: "ownerCanMergeText", typ: "" },
        { json: "passwordRequired", js: "passwordRequired", typ: "" },
        { json: "passwordWrong", js: "passwordWrong", typ: "" },
        { json: "primaryCannotMerge", js: "primaryCannotMerge", typ: "" },
        { json: "primarySystemOffline", js: "primarySystemOffline", typ: "" },
        { json: "primarySystemUnavailable", js: "primarySystemUnavailable", typ: "" },
        { json: "recommendSupport", js: "recommendSupport", typ: r("RecommendSupport") },
        { json: "secondaryCannotMerge", js: "secondaryCannotMerge", typ: "" },
        { json: "secondarySystemUnavailable", js: "secondarySystemUnavailable", typ: "" },
        { json: "serverNotAvailable", js: "serverNotAvailable", typ: "" },
        { json: "serverNotYours", js: "serverNotYours", typ: "" },
        { json: "serverVersionOld", js: "serverVersionOld", typ: "" },
        { json: "serverVersionNew", js: "serverVersionNew", typ: "" },
        { json: "systemVersionOld", js: "systemVersionOld", typ: "" },
        { json: "systemVersionNew", js: "systemVersionNew", typ: "" },
        { json: "systemOffline", js: "systemOffline", typ: "" },
        { json: "urlEmpty", js: "urlEmpty", typ: "" },
        { json: "urlNotValid", js: "urlNotValid", typ: "" },
        { json: "unknownError", js: "unknownError", typ: "" },
        { json: "warning", js: "warning", typ: "" },
    ], false),
    "RecommendSupport": o([
        { json: "a_recommend", js: "a_recommend", typ: "" },
        { json: "b_support", js: "b_support", typ: "" },
        { json: "c_proceeding", js: "c_proceeding", typ: "" },
    ], false),
    "DialogsMessage": o([
        { json: "settingsSaved", js: "settingsSaved", typ: "" },
        { json: "settingsNotSaved", js: "settingsNotSaved", typ: "" },
        { json: "failedToSend", js: "failedToSend", typ: "" },
        { json: "placeholders", js: "placeholders", typ: r("Placeholders") },
        { json: "sent", js: "sent", typ: "" },
        { json: "subject", js: "subject", typ: r("Subject") },
        { json: "title", js: "title", typ: r("Title") },
    ], false),
    "Placeholders": o([
        { json: "feedback", js: "feedback", typ: "" },
    ], false),
    "Subject": o([
        { json: "integration_feedback", js: "integration_feedback", typ: "" },
        { json: "ipvd_feedback_device", js: "ipvd_feedback_device", typ: "" },
        { json: "ipvd_feedback_page", js: "ipvd_feedback_page", typ: "" },
        { json: "sales_inquiry", js: "sales_inquiry", typ: "" },
        { json: "technical_inquiry", js: "technical_inquiry", typ: "" },
    ], false),
    "Title": o([
        { json: "integration", js: "integration", typ: "" },
        { json: "ipvd_feedback_device", js: "ipvd_feedback_device", typ: "" },
        { json: "ipvd_feedback_page", js: "ipvd_feedback_page", typ: "" },
    ], false),
    "RemoveSystem": o([
        { json: "action", js: "action", typ: "" },
        { json: "message", js: "message", typ: "" },
        { json: "title", js: "title", typ: "" },
    ], false),
    "Sharing": o([
        { json: "confirmOwner", js: "confirmOwner", typ: "" },
        { json: "editShareConfirmButton", js: "editShareConfirmButton", typ: "" },
        { json: "editShareTitle", js: "editShareTitle", typ: "" },
        { json: "shareConfirmButton", js: "shareConfirmButton", typ: "" },
        { json: "shareTitle", js: "shareTitle", typ: "" },
    ], false),
    "DialogsTitles": o([
        { json: "error", js: "error", typ: "" },
        { json: "success", js: "success", typ: "" },
        { json: "changeAccount", js: "changeAccount", typ: "" },
        { json: "deleteUser", js: "deleteUser", typ: "" },
        { json: "loggedFromOtherAccount", js: "loggedFromOtherAccount", typ: "" },
        { json: "noClientDetected", js: "noClientDetected", typ: "" },
        { json: "removeUser", js: "removeUser", typ: "" },
        { json: "serversDetach", js: "serversDetach", typ: "" },
        { json: "serversReset", js: "serversReset", typ: "" },
        { json: "serversRestart", js: "serversRestart", typ: "" },
    ], false),
    "Downloads": o([
        { json: "appTypes", js: "appTypes", typ: r("AppTypes") },
        { json: "groups", js: "groups", typ: r("Groups") },
        { json: "mobile", js: "mobile", typ: r("Mobile") },
        { json: "platforms", js: "platforms", typ: r("Platforms") },
        { json: "releasesTypes", js: "releasesTypes", typ: r("ReleasesTypes") },
    ], false),
    "AppTypes": o([
        { json: "bundle", js: "bundle", typ: "" },
        { json: "camera_sdk", js: "camera_sdk", typ: "" },
        { json: "client", js: "client", typ: "" },
        { json: "metadata_sdk", js: "metadata_sdk", typ: "" },
        { json: "package", js: "package", typ: "" },
        { json: "server", js: "server", typ: "" },
        { json: "servertool", js: "servertool", typ: "" },
        { json: "storage_sdk", js: "storage_sdk", typ: "" },
        { json: "video_source_sdk", js: "video_source_sdk", typ: "" },
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
        { json: "label", js: "label", typ: "" },
        { json: "shortLabel", js: "shortLabel", typ: "" },
    ], false),
    "MAC": o([
        { json: "label", js: "label", typ: "" },
    ], false),
    "Mobile": o([
        { json: "android", js: "android", typ: r("MobileAndroid") },
        { json: "ios", js: "ios", typ: r("MobileAndroid") },
    ], false),
    "MobileAndroid": o([
        { json: "link", js: "link", typ: "" },
    ], false),
    "Platforms": o([
        { json: "bananapi", js: "bananapi", typ: "" },
        { json: "bpi", js: "bpi", typ: "" },
        { json: "linux64", js: "linux64", typ: "" },
        { json: "linux_arm32", js: "linux_arm32", typ: "" },
        { json: "linux_arm64", js: "linux_arm64", typ: "" },
        { json: "mac", js: "mac", typ: "" },
        { json: "rpi", js: "rpi", typ: "" },
        { json: "universal", js: "universal", typ: "" },
        { json: "win64", js: "win64", typ: "" },
    ], false),
    "ReleasesTypes": o([
        { json: "beta", js: "beta", typ: "" },
        { json: "betas", js: "betas", typ: "" },
        { json: "patch", js: "patch", typ: "" },
        { json: "patches", js: "patches", typ: "" },
        { json: "rc", js: "rc", typ: "" },
        { json: "release", js: "release", typ: "" },
        { json: "releases", js: "releases", typ: "" },
    ], false),
    "ErrorCodes": o([
        { json: "DUPLICATE_MEDIASERVER_FOUND", js: "DUPLICATE_MEDIASERVER_FOUND", typ: "" },
        { json: "EmailAlreadyExists", js: "EmailAlreadyExists", typ: "" },
        { json: "FAIL", js: "FAIL", typ: "" },
        { json: "INCOMPATIBLE", js: "INCOMPATIBLE", typ: "" },
        { json: "accountAlreadyActivated", js: "accountAlreadyActivated", typ: "" },
        { json: "accountBlocked", js: "accountBlocked", typ: "" },
        { json: "accountNotActivated", js: "accountNotActivated", typ: "" },
        { json: "alreadyExists", js: "alreadyExists", typ: "" },
        { json: "brokenAccount", js: "brokenAccount", typ: "" },
        { json: "cantActivatePrefix", js: "cantActivatePrefix", typ: "" },
        { json: "cantAddYourOwnEmail", js: "cantAddYourOwnEmail", typ: "" },
        { json: "cantChangeAccountPrefix", js: "cantChangeAccountPrefix", typ: "" },
        { json: "cantChangePasswordPrefix", js: "cantChangePasswordPrefix", typ: "" },
        { json: "cantDisconnectSystemPrefix", js: "cantDisconnectSystemPrefix", typ: "" },
        { json: "cantEditAdmin", js: "cantEditAdmin", typ: "" },
        { json: "cantEditYourself", js: "cantEditYourself", typ: "" },
        { json: "cantGetSystemInfoPrefix", js: "cantGetSystemInfoPrefix", typ: "" },
        { json: "cantGetSystemsListPrefix", js: "cantGetSystemsListPrefix", typ: "" },
        { json: "cantGetUsersListPrefix", js: "cantGetUsersListPrefix", typ: "" },
        { json: "cantOpenClient", js: "cantOpenClient", typ: "" },
        { json: "cantRegisterPrefix", js: "cantRegisterPrefix", typ: "" },
        { json: "cantSendActivationPrefix", js: "cantSendActivationPrefix", typ: "" },
        { json: "cantSendConfirmationPrefix", js: "cantSendConfirmationPrefix", typ: "" },
        { json: "cantSharePrefix", js: "cantSharePrefix", typ: "" },
        { json: "cantUnshareWithMeSystemPrefix", js: "cantUnshareWithMeSystemPrefix", typ: "" },
        { json: "emailNotFound", js: "emailNotFound", typ: "" },
        { json: "failedToAccessSystem", js: "failedToAccessSystem", typ: "" },
        { json: "forbidden", js: "forbidden", typ: "" },
        { json: "lostConnection", js: "lostConnection", typ: "" },
        { json: "mergedSystemIsOffline", js: "mergedSystemIsOffline", typ: "" },
        { json: "notAuthorized", js: "notAuthorized", typ: "" },
        { json: "notFound", js: "notFound", typ: "" },
        { json: "ok", js: "ok", typ: "" },
        { json: "oldPasswordMistmatch", js: "oldPasswordMistmatch", typ: "" },
        { json: "oldSafariNotSupported", js: "oldSafariNotSupported", typ: "" },
        { json: "passwordMismatch", js: "passwordMismatch", typ: "" },
        { json: "thisSystem", js: "thisSystem", typ: "" },
        { json: "unknownError", js: "unknownError", typ: "" },
        { json: "unknownMergeError", js: "unknownMergeError", typ: "" },
        { json: "wrongAuthCode", js: "wrongAuthCode", typ: "" },
        { json: "wrongCode", js: "wrongCode", typ: "" },
        { json: "wrongCodeRestore", js: "wrongCodeRestore", typ: "" },
        { json: "wrongParameters", js: "wrongParameters", typ: "" },
    ], false),
    "LanguageI18NStaticTypesIntegration": o([
        { json: "Access Control", js: "Access Control", typ: "" },
        { json: "Connector", js: "Connector", typ: "" },
        { json: "Data Analytics", js: "Data Analytics", typ: "" },
        { json: "Drone", js: "Drone", typ: "" },
        { json: "Health Monitor", js: "Health Monitor", typ: "" },
        { json: "Storage", js: "Storage", typ: "" },
        { json: "myIntegrationsLabel", js: "myIntegrationsLabel", typ: "" },
        { json: "phoneNumberWithLabel", js: "phoneNumberWithLabel", typ: "" },
        { json: "requirements", js: "requirements", typ: "" },
        { json: "testedVersionLabel", js: "testedVersionLabel", typ: "" },
        { json: "testedVersionsLabel", js: "testedVersionsLabel", typ: "" },
    ], false),
    "Ipvd": o([
        { json: "Advanced PTZ cameras", js: "Advanced PTZ cameras", typ: "" },
        { json: "Cameras supporting H.265", js: "Cameras supporting H.265", typ: "" },
        { json: "Cameras with 2-way audio", js: "Cameras with 2-way audio", typ: "" },
        { json: "Extra high resolution cameras", js: "Extra high resolution cameras", typ: "" },
        { json: "Fisheye Cameras", js: "Fisheye Cameras", typ: "" },
        { json: "I / O modules", js: "I / O modules", typ: "" },
        { json: "Multisensor Cameras", js: "Multisensor Cameras", typ: "" },
        { json: "PTZ cameras", js: "PTZ cameras", typ: "" },
        { json: "camera", js: "camera", typ: "" },
        { json: "count", js: "count", typ: "" },
        { json: "disclaimer", js: "disclaimer", typ: "" },
        { json: "dvr", js: "dvr", typ: "" },
        { json: "encoder", js: "encoder", typ: "" },
        { json: "feedback", js: "feedback", typ: r("Feedback") },
        { json: "hardwareType", js: "hardwareType", typ: "" },
        { json: "isAnalyticsSupported", js: "isAnalyticsSupported", typ: "" },
        { json: "isAptzSupported", js: "isAptzSupported", typ: "" },
        { json: "isAptzSupportedShort", js: "isAptzSupportedShort", typ: "" },
        { json: "isAudioSupported", js: "isAudioSupported", typ: "" },
        { json: "isFisheye", js: "isFisheye", typ: "" },
        { json: "isH265", js: "isH265", typ: "" },
        { json: "isIoSupported", js: "isIoSupported", typ: "" },
        { json: "isMdSupported", js: "isMdSupported", typ: "" },
        { json: "isMultiSensor", js: "isMultiSensor", typ: "" },
        { json: "isPtzSupported", js: "isPtzSupported", typ: "" },
        { json: "isTwAudioSupported", js: "isTwAudioSupported", typ: "" },
        { json: "maxFps", js: "maxFps", typ: "" },
        { json: "maxResolution", js: "maxResolution", typ: "" },
        { json: "model", js: "model", typ: "" },
        { json: "multiSensorCamera", js: "multiSensorCamera", typ: "" },
        { json: "other", js: "other", typ: "" },
        { json: "primaryCodec", js: "primaryCodec", typ: "" },
        { json: "resolutionArea", js: "resolutionArea", typ: "" },
        { json: "topXByVolume", js: "topXByVolume", typ: "" },
        { json: "vendor", js: "vendor", typ: "" },
    ], false),
    "Feedback": o([
        { json: "a_Please", js: "a_Please", typ: "" },
        { json: "b_Link", js: "b_Link", typ: "" },
        { json: "c_Info", js: "c_Info", typ: "" },
    ], false),
    "Menu": o([
        { json: "titles", js: "titles", typ: r("MenuTitles") },
    ], false),
    "MenuTitles": o([
        { json: "systemAdministration", js: "systemAdministration", typ: "" },
        { json: "users", js: "users", typ: "" },
    ], false),
    "PageTitles": o([
        { json: "about", js: "about", typ: "" },
        { json: "account", js: "account", typ: "" },
        { json: "activate", js: "activate", typ: "" },
        { json: "activateCode", js: "activateCode", typ: "" },
        { json: "activateSuccess", js: "activateSuccess", typ: "" },
        { json: "changePassword", js: "changePassword", typ: "" },
        { json: "debug", js: "debug", typ: "" },
        { json: "default", js: "default", typ: "" },
        { json: "download", js: "download", typ: "" },
        { json: "downloadPlatform", js: "downloadPlatform", typ: "" },
        { json: "failedToAccessSystem", js: "failedToAccessSystem", typ: "" },
        { json: "integrations", js: "integrations", typ: "" },
        { json: "login", js: "login", typ: "" },
        { json: "pageNotFound", js: "pageNotFound", typ: "" },
        { json: "register", js: "register", typ: "" },
        { json: "registerSuccess", js: "registerSuccess", typ: "" },
        { json: "restorePassword", js: "restorePassword", typ: "" },
        { json: "restorePasswordSuccess", js: "restorePasswordSuccess", typ: "" },
        { json: "supportedDevices", js: "supportedDevices", typ: "" },
        { json: "system", js: "system", typ: "" },
        { json: "systemName", js: "systemName", typ: "" },
        { json: "systemShare", js: "systemShare", typ: "" },
        { json: "systems", js: "systems", typ: "" },
        { json: "template", js: "template", typ: "" },
        { json: "view", js: "view", typ: "" },
    ], false),
    "PasswordRequirements": o([
        { json: "common", js: "common", typ: "" },
        { json: "commonMessage", js: "commonMessage", typ: "" },
        { json: "fair", js: "fair", typ: "" },
        { json: "fairMessage", js: "fairMessage", typ: "" },
        { json: "good", js: "good", typ: "" },
        { json: "minLength", js: "minLength", typ: "" },
        { json: "minLengthMessage", js: "minLengthMessage", typ: "" },
        { json: "missingMessage", js: "missingMessage", typ: "" },
        { json: "required", js: "required", typ: "" },
        { json: "requiredMessage", js: "requiredMessage", typ: "" },
        { json: "strongMessage", js: "strongMessage", typ: "" },
        { json: "weak", js: "weak", typ: "" },
        { json: "weakMessage", js: "weakMessage", typ: "" },
    ], false),
    "PlaceholderTexts": o([
        { json: "merge", js: "merge", typ: r("PlaceholderTextsMerge") },
    ], false),
    "PlaceholderTextsMerge": o([
        { json: "title", js: "title", typ: "" },
        { json: "message", js: "message", typ: r("MergeMessage") },
    ], false),
    "MergeMessage": o([
        { json: "dependingOnSize", js: "dependingOnSize", typ: "" },
        { json: "untilFinished", js: "untilFinished", typ: "" },
        { json: "whenFinished", js: "whenFinished", typ: "" },
    ], false),
    "PrivacyPolicy": o([
        { json: "integration", js: "integration", typ: "" },
        { json: "ipvd", js: "ipvd", typ: "" },
    ], false),
    "Registration": o([
        { json: "agreement", js: "agreement", typ: "" },
    ], false),
    "Ribbon": o([
        { json: "beingMerged", js: "beingMerged", typ: r("BeingMerged") },
        { json: "finishingMerge", js: "finishingMerge", typ: "" },
        { json: "integration", js: "integration", typ: r("RibbonIntegration") },
        { json: "systemOffline", js: "systemOffline", typ: "" },
    ], false),
    "BeingMerged": o([
        { json: "to", js: "to", typ: "" },
        { json: "mayTake", js: "mayTake", typ: "" },
    ], false),
    "RibbonIntegration": o([
        { json: "backToEditText", js: "backToEditText", typ: "" },
        { json: "previewRibbon", js: "previewRibbon", typ: "" },
    ], false),
    "Search": o([
        { json: "Any", js: "Any", typ: "" },
        { json: "Search", js: "Search", typ: "" },
        { json: "analytics", js: "analytics", typ: "" },
        { json: "analyticsSelected", js: "analyticsSelected", typ: "" },
        { json: "filter applied", js: "filter applied", typ: "" },
        { json: "filters applied", js: "filters applied", typ: "" },
        { json: "hardwareType", js: "hardwareType", typ: "" },
        { json: "hardwareTypes", js: "hardwareTypes", typ: "" },
        { json: "minResolution", js: "minResolution", typ: "" },
        { json: "search_ipvd", js: "search_ipvd", typ: "" },
        { json: "selected", js: "selected", typ: "" },
        { json: "vendor", js: "vendor", typ: "" },
        { json: "vendors", js: "vendors", typ: "" },
    ], false),
    "Servers": o([
        { json: "beginDetach", js: "beginDetach", typ: "" },
        { json: "beginReset", js: "beginReset", typ: "" },
        { json: "beginRestart", js: "beginRestart", typ: "" },
        { json: "detachSystemFailed", js: "detachSystemFailed", typ: "" },
        { json: "detachSystemSuccess", js: "detachSystemSuccess", typ: "" },
        { json: "getModuleFailed", js: "getModuleFailed", typ: "" },
        { json: "portWarning", js: "portWarning", typ: "" },
        { json: "removeMediaserverFailed", js: "removeMediaserverFailed", typ: "" },
        { json: "resetFailed", js: "resetFailed", typ: "" },
        { json: "resetSuccessful", js: "resetSuccessful", typ: "" },
        { json: "restartFailed", js: "restartFailed", typ: "" },
        { json: "restartSuccessful", js: "restartSuccessful", typ: "" },
        { json: "servers", js: "servers", typ: "" },
        { json: "status", js: "status", typ: r("ServersStatus") },
        { json: "successRename", js: "successRename", typ: "" },
    ], false),
    "ServersStatus": o([
        { json: "checking", js: "checking", typ: "" },
        { json: "offline", js: "offline", typ: "" },
        { json: "reseting", js: "reseting", typ: "" },
        { json: "restarting", js: "restarting", typ: "" },
    ], false),
    "LanguageI18NStaticTypesSystem": o([
        { json: "MERGE_FINISHES", js: "MERGE_FINISHES", typ: "" },
        { json: "mergeUnknownName", js: "mergeUnknownName", typ: "" },
        { json: "mySystemSearch", js: "mySystemSearch", typ: "" },
        { json: "settings", js: "settings", typ: r("Settings") },
        { json: "status", js: "status", typ: r("SystemStatus") },
        { json: "users", js: "users", typ: r("Users") },
        { json: "yourSystem", js: "yourSystem", typ: "" },
    ], false),
    "Settings": o([
        { json: "notAbleToLoadSecurity", js: "notAbleToLoadSecurity", typ: "" },
        { json: "notAbleToLoadSystem", js: "notAbleToLoadSystem", typ: "" },
        { json: "sessionLimitDuration", js: "sessionLimitDuration", typ: r("SessionLimitDuration") },
        { json: "warningMessages", js: "warningMessages", typ: r("WarningMessages") },
    ], false),
    "SessionLimitDuration": o([
        { json: "hours", js: "hours", typ: "" },
        { json: "minutes", js: "minutes", typ: "" },
    ], false),
    "WarningMessages": o([
        { json: "videoEncryption", js: "videoEncryption", typ: "" },
    ], false),
    "SystemStatus": o([
        { json: "offline", js: "offline", typ: "" },
        { json: "unavailable", js: "unavailable", typ: "" },
    ], false),
    "Users": o([
        { json: "cloudDelete", js: "cloudDelete", typ: "" },
        { json: "localDelete", js: "localDelete", typ: "" },
    ], false),
    "SystemStatuses": o([
        { json: "activated", js: "activated", typ: "" },
        { json: "incompatible", js: "incompatible", typ: "" },
        { json: "merging", js: "merging", typ: "" },
        { json: "notActivated", js: "notActivated", typ: "" },
        { json: "offline", js: "offline", typ: "" },
        { json: "online", js: "online", typ: "" },
        { json: "unavailable", js: "unavailable", typ: "" },
    ], false),
    "ToastMessage": o([
        { json: "system", js: "system", typ: r("ToastMessageSystem") },
    ], false),
    "ToastMessageSystem": o([
        { json: "deleted", js: "deleted", typ: r("Deleted") },
        { json: "disconnected", js: "disconnected", typ: r("Deleted") },
        { json: "merge", js: "merge", typ: r("SystemMerge") },
        { json: "rename", js: "rename", typ: r("Deleted") },
        { json: "share", js: "share", typ: r("Share") },
    ], false),
    "Deleted": o([
        { json: "success", js: "success", typ: "" },
    ], false),
    "SystemMerge": o([
        { json: "failed", js: "failed", typ: "" },
        { json: "start", js: "start", typ: "" },
        { json: "success", js: "success", typ: "" },
    ], false),
    "Share": o([
        { json: "offline", js: "offline", typ: "" },
        { json: "unauthorized", js: "unauthorized", typ: "" },
    ], false),
};
