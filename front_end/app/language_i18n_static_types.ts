// To parse this data:
//
//   import { Convert, LanguageI18NStaticTypes } from "./file";
//
//   const languageI18NStaticTypes = Convert.toLanguageI18NStaticTypes(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface LanguageI18NStaticTypes {
    language:              any;
    "About %CLOUD_NAME%":  any;
    "All Servers":         any;
    "Download %VMS_NAME%": any;
    "For developers":      any;
    "Integrations (β)":    any;
    Privacy:               any;
    Support:               any;
    Terms:                 any;
    "Developers Console":  any;
    productName:           any;
    monitoring:            Monitoring;
    alarmTypes:            AlarmTypes;
    alarmLevels:           AlarmLevels;
    alertFilters:          AlertFilters;
    deviceTypes:           DeviceTypes;
    accessRoles:           { [key: string]: AccessRole };
    account:               LanguageI18NStaticTypesAccount;
    activeActions:         ActiveActions;
    authorize:             Authorize;
    cameraFilters:         CameraFilters;
    clientProtocol:        any;
    common:                Common;
    dashboard:             Dashboard;
    devConsole:            DevConsole;
    dialogs:               Dialogs;
    downloads:             Downloads;
    errorCodes:            { [key: string]: any };
    integration:           LanguageI18NStaticTypesIntegration;
    ipvd:                  Ipvd;
    ipvdFeedback:          IpvdFeedback;
    systemsCount:          any;
    alertsCount:           any;
    ipvdTopXByVolume:      any;
    ipvdDisclaimer:        any;
    menu:                  Menu;
    tableHeaders:          TableHeaders;
    pageTitles:            PageTitles;
    pageDescriptions:      PageDescriptions;
    passwordRequirements:  PasswordRequirements;
    placeholderTexts:      PlaceholderTexts;
    pleaseSelect:          any;
    privacyPolicy:         PrivacyPolicy;
    registration:          Registration;
    ribbon:                Ribbon;
    search:                Search;
    servers:               Servers;
    serverTabTitles:       ServerTabTitles;
    system:                LanguageI18NStaticTypesSystem;
    systemStatuses:        SystemStatuses;
    tile:                  Tile;
    toastMessage:          ToastMessage;
    healthMonitor:         HealthMonitor;
    headerLabels:          HeaderLabels;
    license:               License;
    redirects:             Redirects;
    settingsConfig:        { [key: string]: any };
    result:                any;
    additionalSystems:     any;
    security:              Security;
    storage:               Storage;
    metaDefaults:          MetaDefaults;
    metaDefaultsWebadmin:  MetaDefaultsWebadmin;
    maintenance:           Maintenance;
    view:                  View;
}

export interface AccessRole {
    description: any;
    label:       any;
}

export interface LanguageI18NStaticTypesAccount {
    account:                any;
    key:                    any;
    accountSavedSuccess:    any;
    accountSettings:        any;
    activationLinkSent:     any;
    agreementAccepted:      any;
    changePassword:         any;
    security:               any;
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

export interface AlarmLevels {
    offline: any;
    error:   any;
    warning: any;
}

export interface AlarmTypes {
    Servers:              any;
    Cameras:              any;
    "Storage Locations":  any;
    "Network Interfaces": any;
}

export interface AlertFilters {
    all:     any;
    warning: any;
    error:   any;
}

export interface Authorize {
    loginCloudHeader:           any;
    connectHeader:              any;
    expiredHeader:              any;
    loginSystemSubheader:       any;
    connectSubheader:           any;
    expiredSubheader:           any;
    connectAdditional:          any;
    createText:                 any;
    setupText:                  any;
    asAccountSubheader:         any;
    toAccountSubheader:         any;
    forAccountSubheader:        any;
    passwordDisconnect:         any;
    passwordMerge:              any;
    passwordBackup:             any;
    passwordRestore:            any;
    passwordReset:              any;
    passwordRestart:            any;
    passwordDetach:             any;
    expiredAccountSubheader:    any;
    createAccountHeader:        any;
    activateHeader:             any;
    createdText:                any;
    activatedText:              any;
    createdAdditional:          any;
    activatedAdditional:        any;
    passResetHeader:            any;
    newPassHeader:              any;
    newPassConfirmText:         any;
    newPassInvalidCode:         any;
    notSecureText:              any;
    confirmHeader:              any;
    loginError:                 any;
    loginErrorAdditional:       any;
    connectErrorAdditional:     any;
    setupErrorAdditional:       any;
    connectedText:              any;
    setupConnectedText:         any;
    stayLoggedInHelpText:       any;
    termsAndConditionsHelpText: any;
    copiedToClipboard:          any;
    authCode:                   AuthCode;
    emailSent:                  any;
}

export interface AuthCode {
    message: any;
    newPass: any;
    login:   any;
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
    copiedToClipboard:          any;
    login:                      any;
    recordingSettingsWarning:   any;
    disableMotionWarning:       any;
    recordingModes:             RecordingModes;
    resolution:                 Resolution;
    intervals:                  Intervals;
    general:                    any;
    generalError:               any;
    inaccessibleFeatureMessage: any;
    morePlugins:                any;
    searchCamPlaceholder:       any;
    system:                     any;
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
    systemUnresponsive:         any;
    unknown:                    any;
    vendor:                     any;
    model:                      any;
    ip:                         any;
    server:                     any;
    os:                         any;
    version:                    any;
    voiceCommands:              VoiceCommands;
    viewingOutdatedReport:      any;
}

export interface CommonAccount {
    created:   NoSettings;
    activated: Docs;
}

export interface Docs {
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

export interface Intervals {
    yearS:   any;
    monthS:  any;
    weekS:   any;
    dayS:    any;
    hourS:   any;
    minuteS: any;
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

export interface Dashboard {
    dashboardEditEnabled: any;
    dashboardLocked:      any;
    unlockToUpload:       any;
    unlockToMove:         any;
}

export interface DevConsole {
    create: any;
}

export interface DeviceTypes {
    "All Device Types": any;
    servers:            any;
    cameras:            any;
    storages:           any;
    networkInterfaces:  any;
}

export interface Dialogs {
    twoFa:             DialogsTwoFa;
    addUser:           AddUser;
    buttons:           Buttons;
    cloudStorage:      CloudStorage;
    changeStorage:     ChangeStorage;
    merge:             DialogsMerge;
    message:           DialogsMessage;
    removeSystem:      RemoveSystem;
    renewAuth:         RemoveSystem;
    transferOwnership: TransferOwnership;
    titles:            DialogsTitles;
    tooltips:          Tooltips;
    twoFactor:         DialogsTwoFactor;
}

export interface AddUser {
    alreadyExists: any;
}

export interface Buttons {
    cancel:           any;
    createAccount:    any;
    delete:           any;
    deleteAccount:    any;
    disable:          any;
    enable:           any;
    download:         any;
    logoutAuthorised: any;
    ok:               any;
    remove:           any;
    stayAs:           any;
    stayLoggedIn:     any;
}

export interface ChangeStorage {
    support: any;
}

export interface CloudStorage {
    title:                 any;
    enableStorage:         any;
    otherSystem:           any;
    initial:               any;
    available:             any;
    camera:                any;
    cameras:               any;
    usageLabels:           UsageLabels;
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

export interface UsageLabels {
    currentRecordings: any;
    whenFullyUsed:     any;
    amountUsed:        any;
    archiveFrom:       any;
    recordingBitrate:  any;
    delayFromLive:     any;
}

export interface DialogsMerge {
    adminPasswordTitle:                 any;
    adminPasswordWrong:                 any;
    knownBothSystemsConnectedToCloud:   any;
    unknownBothSystemsConnectedToCloud: any;
    checking:                           any;
    cloud:                              any;
    commonText:                         any;
    connectToCloud:                     any;
    failedToFindAnySystemHeader:        any;
    failedToFindAnySystem:              any;
    differentOwners:                    any;
    duplicateServers:                   any;
    enterSystemAddressTitle:            any;
    latestBuild:                        any;
    mergeConfirmation:                  any;
    mergeFailedTitle:                   any;
    mergeSuccess:                       any;
    mergeSystemsTitle:                  any;
    noServerFound:                      any;
    newSystemDisplayName:               any;
    otherSystem:                        any;
    ownerCanMergeText:                  any;
    passwordRequired:                   any;
    passwordWrong:                      any;
    primaryCannotMerge:                 any;
    primarySystemOffline:               any;
    primarySystemUnavailable:           any;
    recommendSupport:                   any;
    restError:                          RESTError;
    secondaryCannotMerge:               any;
    secondarySystemUnavailable:         any;
    serverAtUrl:                        any;
    serverNotAvailable:                 any;
    serverNotYours:                     any;
    serverVersionOld:                   any;
    serverVersionNew:                   any;
    systemOffline:                      any;
    systemOfflineUrl:                   any;
    systemsIncompatible:                any;
    systemVersionOld:                   any;
    systemVersionNew:                   any;
    systemVersionsNotMatch:             any;
    targetSystemBoundToCloud:           any;
    urlEmpty:                           any;
    urlNotValid:                        any;
    unknownError:                       any;
    warning:                            any;
}

export interface RESTError {
    duplicateServer:      any;
    useCloudMerge:        any;
    differentCloudOwners: any;
}

export interface DialogsMessage {
    system2faEnabled:        any;
    system2faDisabled:       any;
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
    twoFactor:               MessageTwoFactor;
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

export interface MessageTwoFactor {
    required:     any;
    configure:    any;
    accountLink:  any;
    codeRequired: any;
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
    changePasswordFor:      any;
    deleteUser:             any;
    failedLoginTo:          any;
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

export interface TransferOwnership {
    userNotFound: any;
}

export interface DialogsTwoFa {
    wizardWarning:      any;
    wizardWarningDescr: any;
    installAuthApp:     any;
    nowEnabled:         any;
}

export interface DialogsTwoFactor {
    action:            any;
    message:           any;
    title:             any;
    wizardWarning:     any;
    unsupportedSystem: any;
}

export interface Downloads {
    appTypes:      AppTypes;
    groups:        DownloadsGroups;
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

export interface DownloadsGroups {
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

export interface HeaderLabels {
    healthReportForSystem: any;
}

export interface HealthMonitor {
    groups: HealthMonitorGroups;
    keys:   Keys;
}

export interface HealthMonitorGroups {
    info:         any;
    availability: any;
    load:         any;
    activity:     any;
}

export interface Keys {
    name:                    any;
    servers:                 any;
    cameras:                 any;
    storages:                any;
    users:                   any;
    version:                 any;
    cloudSystemId:           any;
    status:                  any;
    offlineEvents:           any;
    uptimeS:                 any;
    cpuUsageP:               any;
    serverCpuUsageP:         any;
    ramUsageB:               any;
    ramUsageP:               any;
    serverRamUsageB:         any;
    serverRamUsageP:         any;
    threads:                 any;
    decodingThreads:         any;
    decodingSpeed3s:         any;
    encodingThreads:         any;
    encodingSpeed3s:         any;
    primaryStreams:          any;
    secondaryStreams:        any;
    incomingConnections:     any;
    outgoingConnections:     any;
    logLevel:                any;
    publicIp:                any;
    os:                      any;
    osTime:                  any;
    vmsTime:                 any;
    cpu:                     any;
    cpuCores:                any;
    ramB:                    any;
    guidConflict:            any;
    vmsTimeChanged24h:       any;
    transactionsPerSecond1m: any;
    actionsTriggered1m:      any;
    apiCalls1m:              any;
    thumbnails1m:            any;
    activePlugins:           any;
}

export interface LanguageI18NStaticTypesIntegration {
    "Access Control":    any;
    Connector:           any;
    "Data Analytics":    any;
    Drone:               any;
    "Health Monitor":    any;
    Storage:             any;
    myIntegrationsLabel: any;
    requirements:        any;
    testedVersionLabel:  any;
    testedVersionsLabel: any;
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
    request: any;
}

export interface License {
    licenseTypeTitles: LicenseTypeTitles;
    info:              Info;
    messages:          Messages;
}

export interface Info {
    type:           any;
    channels:       any;
    server:         any;
    hwid:           any;
    status:         any;
    expires:        any;
    deactivations:  any;
    online:         any;
    error:          any;
    expired:        any;
    ok:             any;
    nvrError:       any;
    serverNotFound: any;
}

export interface LicenseTypeTitles {
    Time:             any;
    Trial:            any;
    Professional:     any;
    Analog:           any;
    Edge:             any;
    VMAX:             any;
    "Video Wall":     any;
    "Analog Encoder": any;
    Starter:          any;
    "IO Module":      any;
    Bridge:           any;
    NVR:              any;
    Invalid:          any;
}

export interface Messages {
    required:       any;
    activated:      any;
    inuse:          any;
    trialActivated: any;
}

export interface Maintenance {
    description: any;
}

export interface Menu {
    titles: MenuTitles;
}

export interface MenuTitles {
    cameras:              any;
    systemAdministration: any;
    general:              any;
    licenses:             any;
    users:                any;
    servers:              any;
    alerts:               any;
    systems:              any;
    storages:             any;
    networkInterfaces:    any;
    graphs:               any;
    logs:                 any;
}

export interface MetaDefaults {
    default:         MetaDefaultsDefault;
    "/systems":      Docs;
    "/integrations": Docs;
    "/docs":         Docs;
    "/ipvd":         Docs;
}

export interface MetaDefaultsDefault {
    site_name:   any;
    title:       any;
    description: any;
}

export interface MetaDefaultsWebadmin {
    default:       MetaDefaultsWebadminDefault;
    "/settings":   Docs;
    "/view":       Docs;
    "/health":     Docs;
    "/monitoring": Docs;
}

export interface MetaDefaultsWebadminDefault {
    site_name: any;
    title:     any;
}

export interface Monitoring {
    unavailable: any;
}

export interface PageDescriptions {
    integrations:       any;
    integrationSetup:   any;
    integrationDetails: any;
}

export interface PageTitles {
    about:                  any;
    account:                any;
    activate:               any;
    activateCode:           any;
    activateSuccess:        any;
    articleTitle:           any;
    auth:                   any;
    changePassword:         any;
    debug:                  any;
    default:                any;
    download:               any;
    downloadPlatform:       any;
    failedToAccess2FA:      any;
    failedToAccessSystem:   any;
    failedToAccessCamera:   any;
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
    templateWebadmin:       any;
    view:                   any;
    apiTool:                any;
    security:               any;
    twofaRequired:          any;
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
    noSettings:               NoSettings;
    merge:                    PlaceholderTextsMerge;
    server:                   NoSettings;
    noSystemApiTool:          NoSettings;
    systemLoadFailureApiTool: NoSettings;
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

export interface Redirects {
    message:        any;
    defaultMessage: any;
    cloudLinks:     CloudLinks;
}

export interface CloudLinks {
    supportLink: any;
}

export interface Registration {
    agreement: any;
}

export interface Ribbon {
    beingMerged:         BeingMerged;
    finishingMerge:      any;
    integration:         RibbonIntegration;
    newVersionAvailable: NewVersionAvailable;
    systemOffline:       any;
    systemsMerging:      any;
}

export interface BeingMerged {
    to:      any;
    mayTake: any;
}

export interface RibbonIntegration {
    accept:          any;
    reject:          any;
    backToEditText:  any;
    previewRibbon:   any;
    publishedRibbon: any;
}

export interface NewVersionAvailable {
    notification:  any;
    installButton: any;
}

export interface Search {
    Any:               any;
    Search:            any;
    analytics:         any;
    analyticsSelected: any;
    appliedFilters:    any;
    hardwareType:      any;
    hardwareTypes:     any;
    minResolution:     any;
    search_ipvd:       any;
    selected:          any;
    vendor:            any;
    vendors:           any;
    resultsFound:      any;
}

export interface Security {
    twoFa: SecurityTwoFa;
}

export interface SecurityTwoFa {
    twoFADescription:     any;
    systemsRemainder:     any;
    v5Warning:            any;
    v5WarningExplanation: any;
    disableWarning:       any;
}

export interface ServerTabTitles {
    View:        any;
    Settings:    any;
    Information: any;
    Bookmarks:   any;
    Monitoring:  any;
}

export interface Servers {
    analyticsDataPolicyError: any;
    autoRefresh:              any;
    beginDetach:              any;
    beginReset:               any;
    detachSystemFailed:       any;
    detachSystemSuccess:      any;
    portWarning:              any;
    refresh:                  any;
    refreshing:               any;
    removeMediaserverFailed:  any;
    resetFailed:              any;
    resetSuccessful:          any;
    restartFailed:            any;
    restartSuccessful:        any;
    serverOffline:            any;
    servers:                  any;
    status:                   ServersStatus;
    successRename:            any;
}

export interface ServersStatus {
    checking:   any;
    offline:    any;
    resetting:  any;
    restarting: any;
}

export interface Storage {
    reindexingDone:             ReindexingDone;
    modes:                      Modes;
    alreadyUsed:                any;
    deleteExternalStorage:      any;
    failed:                     any;
    invalidPath:                any;
    stillHasArchivesPreWarning: any;
    stillHasArchives:           any;
    storageDeleted:             any;
    failedRemove:               any;
    reservedTooSmallTooltip:    any;
    reservedSystemTooltip:      any;
    serverOffline:              any;
    success:                    any;
    urlPlaceholder:             any;
}

export interface Modes {
    main:         any;
    backup:       any;
    notInUse:     any;
    reserved:     any;
    inaccessible: any;
    changing:     any;
    disabled:     any;
}

export interface ReindexingDone {
    mainSuccess:   any;
    backupSuccess: any;
    mainFailed:    any;
    backupFailed:  any;
}

export interface LanguageI18NStaticTypesSystem {
    connected:           any;
    not_connected:       any;
    MERGE_FINISHES:      any;
    mergeUnknownName:    any;
    mySystemSearch:      any;
    settings:            Settings;
    status:              SystemStatus;
    users:               Users;
    yourSystem:          any;
    loggers:             Loggers;
    loggerDropdownLabel: any;
    storageToolTips:     StorageToolTips;
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
    notAbleToLoadStorageInfo: any;
    notAbleToLoadSecurity:    any;
    notAbleToLoadSystem:      any;
    sessionLimitDuration:     SessionLimitDuration;
    warningMessages:          WarningMessages;
}

export interface SessionLimitDuration {
    hours:   any;
    minutes: any;
    days:    any;
}

export interface WarningMessages {
    videoEncryption: any;
}

export interface SystemStatus {
    offline:     any;
    unavailable: any;
}

export interface StorageToolTips {
    local:   any;
    usb:     any;
    network: any;
    smb:     any;
    cloud:   any;
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

export interface TableHeaders {
    type:   any;
    server: any;
    alert:  any;
}

export interface Tile {
    groupCount:  any;
    systemCount: any;
}

export interface ToastMessage {
    cloudUnavailable:             any;
    nameFail:                     any;
    noConnection:                 any;
    noInternet:                   any;
    userChangesFail:              any;
    reviewAccepted:               any;
    system:                       ToastMessageSystem;
    webAdminCloudCredentialError: any;
    twoFaRequired:                any;
    loggingIn:                    any;
    sessionRenewed:               any;
    failedToUpdateSession:        any;
}

export interface ToastMessageSystem {
    deleted:      Deleted;
    disconnected: Deleted;
    cloudConnect: CloudConnect;
    merge:        CloudConnect;
    rename:       Deleted;
}

export interface CloudConnect {
    success: any;
    failed:  any;
}

export interface Deleted {
    success: any;
}

export interface View {
    timeline: Timeline;
}

export interface Timeline {
    dayNames:   DayNames;
    monthNames: MonthNames;
    timeNames:  TimeNames;
}

export interface DayNames {
    Sun:       any;
    Mon:       any;
    Tue:       any;
    Wed:       any;
    Thu:       any;
    Fri:       any;
    Sat:       any;
    Sunday:    any;
    Monday:    any;
    Tuesday:   any;
    Wednesday: any;
    Thursday:  any;
    Friday:    any;
    Saturday:  any;
}

export interface MonthNames {
    Jan:       any;
    Feb:       any;
    Mar:       any;
    Apr:       any;
    May:       any;
    Jun:       any;
    Jul:       any;
    Aug:       any;
    Sep:       any;
    Oct:       any;
    Nov:       any;
    Dec:       any;
    January:   any;
    February:  any;
    March:     any;
    April:     any;
    June:      any;
    July:      any;
    August:    any;
    September: any;
    October:   any;
    November:  any;
    December:  any;
}

export interface TimeNames {
    a:  any;
    p:  any;
    am: any;
    pm: any;
    A:  any;
    P:  any;
    AM: any;
    PM: any;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toLanguageI18NStaticTypes(json: string): LanguageI18NStaticTypes {
        return cast(JSON.parse(json), r("LanguageI18NStaticTypes"));
    }

    public static languageI18NStaticTypesToJson(value: LanguageI18NStaticTypes): any {
        return JSON.stringify(uncast(value, r("LanguageI18NStaticTypes")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any = ''): never {
    if (key) {
        throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
    }
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`, );
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

function transform(val: any, typ: any, getProps: any, key: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key);
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
            result[prop.key] = transform(v, prop.typ, getProps, prop.key);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key);
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
        { json: "language", js: "language", typ: "any" },
        { json: "About %CLOUD_NAME%", js: "About %CLOUD_NAME%", typ: "any" },
        { json: "All Servers", js: "All Servers", typ: "any" },
        { json: "Download %VMS_NAME%", js: "Download %VMS_NAME%", typ: "any" },
        { json: "For developers", js: "For developers", typ: "any" },
        { json: "Integrations (β)", js: "Integrations (β)", typ: "any" },
        { json: "Privacy", js: "Privacy", typ: "any" },
        { json: "Support", js: "Support", typ: "any" },
        { json: "Terms", js: "Terms", typ: "any" },
        { json: "Developers Console", js: "Developers Console", typ: "any" },
        { json: "productName", js: "productName", typ: "any" },
        { json: "monitoring", js: "monitoring", typ: r("Monitoring") },
        { json: "alarmTypes", js: "alarmTypes", typ: r("AlarmTypes") },
        { json: "alarmLevels", js: "alarmLevels", typ: r("AlarmLevels") },
        { json: "alertFilters", js: "alertFilters", typ: r("AlertFilters") },
        { json: "deviceTypes", js: "deviceTypes", typ: r("DeviceTypes") },
        { json: "accessRoles", js: "accessRoles", typ: m(r("AccessRole")) },
        { json: "account", js: "account", typ: r("LanguageI18NStaticTypesAccount") },
        { json: "activeActions", js: "activeActions", typ: r("ActiveActions") },
        { json: "authorize", js: "authorize", typ: r("Authorize") },
        { json: "cameraFilters", js: "cameraFilters", typ: r("CameraFilters") },
        { json: "clientProtocol", js: "clientProtocol", typ: "any" },
        { json: "common", js: "common", typ: r("Common") },
        { json: "dashboard", js: "dashboard", typ: r("Dashboard") },
        { json: "devConsole", js: "devConsole", typ: r("DevConsole") },
        { json: "dialogs", js: "dialogs", typ: r("Dialogs") },
        { json: "downloads", js: "downloads", typ: r("Downloads") },
        { json: "errorCodes", js: "errorCodes", typ: m("") },
        { json: "integration", js: "integration", typ: r("LanguageI18NStaticTypesIntegration") },
        { json: "ipvd", js: "ipvd", typ: r("Ipvd") },
        { json: "ipvdFeedback", js: "ipvdFeedback", typ: r("IpvdFeedback") },
        { json: "systemsCount", js: "systemsCount", typ: "any" },
        { json: "alertsCount", js: "alertsCount", typ: "any" },
        { json: "ipvdTopXByVolume", js: "ipvdTopXByVolume", typ: "any" },
        { json: "ipvdDisclaimer", js: "ipvdDisclaimer", typ: "any" },
        { json: "menu", js: "menu", typ: r("Menu") },
        { json: "tableHeaders", js: "tableHeaders", typ: r("TableHeaders") },
        { json: "pageTitles", js: "pageTitles", typ: r("PageTitles") },
        { json: "pageDescriptions", js: "pageDescriptions", typ: r("PageDescriptions") },
        { json: "passwordRequirements", js: "passwordRequirements", typ: r("PasswordRequirements") },
        { json: "placeholderTexts", js: "placeholderTexts", typ: r("PlaceholderTexts") },
        { json: "pleaseSelect", js: "pleaseSelect", typ: "any" },
        { json: "privacyPolicy", js: "privacyPolicy", typ: r("PrivacyPolicy") },
        { json: "registration", js: "registration", typ: r("Registration") },
        { json: "ribbon", js: "ribbon", typ: r("Ribbon") },
        { json: "search", js: "search", typ: r("Search") },
        { json: "servers", js: "servers", typ: r("Servers") },
        { json: "serverTabTitles", js: "serverTabTitles", typ: r("ServerTabTitles") },
        { json: "system", js: "system", typ: r("LanguageI18NStaticTypesSystem") },
        { json: "systemStatuses", js: "systemStatuses", typ: r("SystemStatuses") },
        { json: "tile", js: "tile", typ: r("Tile") },
        { json: "toastMessage", js: "toastMessage", typ: r("ToastMessage") },
        { json: "healthMonitor", js: "healthMonitor", typ: r("HealthMonitor") },
        { json: "headerLabels", js: "headerLabels", typ: r("HeaderLabels") },
        { json: "license", js: "license", typ: r("License") },
        { json: "redirects", js: "redirects", typ: r("Redirects") },
        { json: "settingsConfig", js: "settingsConfig", typ: m("") },
        { json: "result", js: "result", typ: "any" },
        { json: "additionalSystems", js: "additionalSystems", typ: "any" },
        { json: "security", js: "security", typ: r("Security") },
        { json: "storage", js: "storage", typ: r("Storage") },
        { json: "metaDefaults", js: "metaDefaults", typ: r("MetaDefaults") },
        { json: "metaDefaultsWebadmin", js: "metaDefaultsWebadmin", typ: r("MetaDefaultsWebadmin") },
        { json: "maintenance", js: "maintenance", typ: r("Maintenance") },
        { json: "view", js: "view", typ: r("View") },
    ], false),
    "AccessRole": o([
        { json: "description", js: "description", typ: "any" },
        { json: "label", js: "label", typ: "any" },
    ], false),
    "LanguageI18NStaticTypesAccount": o([
        { json: "account", js: "account", typ: "any" },
        { json: "key", js: "key", typ: "any" },
        { json: "accountSavedSuccess", js: "accountSavedSuccess", typ: "any" },
        { json: "accountSettings", js: "accountSettings", typ: "any" },
        { json: "activationLinkSent", js: "activationLinkSent", typ: "any" },
        { json: "agreementAccepted", js: "agreementAccepted", typ: "any" },
        { json: "changePassword", js: "changePassword", typ: "any" },
        { json: "security", js: "security", typ: "any" },
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
    "AlarmLevels": o([
        { json: "offline", js: "offline", typ: "any" },
        { json: "error", js: "error", typ: "any" },
        { json: "warning", js: "warning", typ: "any" },
    ], false),
    "AlarmTypes": o([
        { json: "Servers", js: "Servers", typ: "any" },
        { json: "Cameras", js: "Cameras", typ: "any" },
        { json: "Storage Locations", js: "Storage Locations", typ: "any" },
        { json: "Network Interfaces", js: "Network Interfaces", typ: "any" },
    ], false),
    "AlertFilters": o([
        { json: "all", js: "all", typ: "any" },
        { json: "warning", js: "warning", typ: "any" },
        { json: "error", js: "error", typ: "any" },
    ], false),
    "Authorize": o([
        { json: "loginCloudHeader", js: "loginCloudHeader", typ: "any" },
        { json: "connectHeader", js: "connectHeader", typ: "any" },
        { json: "expiredHeader", js: "expiredHeader", typ: "any" },
        { json: "loginSystemSubheader", js: "loginSystemSubheader", typ: "any" },
        { json: "connectSubheader", js: "connectSubheader", typ: "any" },
        { json: "expiredSubheader", js: "expiredSubheader", typ: "any" },
        { json: "connectAdditional", js: "connectAdditional", typ: "any" },
        { json: "createText", js: "createText", typ: "any" },
        { json: "setupText", js: "setupText", typ: "any" },
        { json: "asAccountSubheader", js: "asAccountSubheader", typ: "any" },
        { json: "toAccountSubheader", js: "toAccountSubheader", typ: "any" },
        { json: "forAccountSubheader", js: "forAccountSubheader", typ: "any" },
        { json: "passwordDisconnect", js: "passwordDisconnect", typ: "any" },
        { json: "passwordMerge", js: "passwordMerge", typ: "any" },
        { json: "passwordBackup", js: "passwordBackup", typ: "any" },
        { json: "passwordRestore", js: "passwordRestore", typ: "any" },
        { json: "passwordReset", js: "passwordReset", typ: "any" },
        { json: "passwordRestart", js: "passwordRestart", typ: "any" },
        { json: "passwordDetach", js: "passwordDetach", typ: "any" },
        { json: "expiredAccountSubheader", js: "expiredAccountSubheader", typ: "any" },
        { json: "createAccountHeader", js: "createAccountHeader", typ: "any" },
        { json: "activateHeader", js: "activateHeader", typ: "any" },
        { json: "createdText", js: "createdText", typ: "any" },
        { json: "activatedText", js: "activatedText", typ: "any" },
        { json: "createdAdditional", js: "createdAdditional", typ: "any" },
        { json: "activatedAdditional", js: "activatedAdditional", typ: "any" },
        { json: "passResetHeader", js: "passResetHeader", typ: "any" },
        { json: "newPassHeader", js: "newPassHeader", typ: "any" },
        { json: "newPassConfirmText", js: "newPassConfirmText", typ: "any" },
        { json: "newPassInvalidCode", js: "newPassInvalidCode", typ: "any" },
        { json: "notSecureText", js: "notSecureText", typ: "any" },
        { json: "confirmHeader", js: "confirmHeader", typ: "any" },
        { json: "loginError", js: "loginError", typ: "any" },
        { json: "loginErrorAdditional", js: "loginErrorAdditional", typ: "any" },
        { json: "connectErrorAdditional", js: "connectErrorAdditional", typ: "any" },
        { json: "setupErrorAdditional", js: "setupErrorAdditional", typ: "any" },
        { json: "connectedText", js: "connectedText", typ: "any" },
        { json: "setupConnectedText", js: "setupConnectedText", typ: "any" },
        { json: "stayLoggedInHelpText", js: "stayLoggedInHelpText", typ: "any" },
        { json: "termsAndConditionsHelpText", js: "termsAndConditionsHelpText", typ: "any" },
        { json: "copiedToClipboard", js: "copiedToClipboard", typ: "any" },
        { json: "authCode", js: "authCode", typ: r("AuthCode") },
        { json: "emailSent", js: "emailSent", typ: "any" },
    ], false),
    "AuthCode": o([
        { json: "message", js: "message", typ: "any" },
        { json: "newPass", js: "newPass", typ: "any" },
        { json: "login", js: "login", typ: "any" },
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
        { json: "copiedToClipboard", js: "copiedToClipboard", typ: "any" },
        { json: "login", js: "login", typ: "any" },
        { json: "recordingSettingsWarning", js: "recordingSettingsWarning", typ: "any" },
        { json: "disableMotionWarning", js: "disableMotionWarning", typ: "any" },
        { json: "recordingModes", js: "recordingModes", typ: r("RecordingModes") },
        { json: "resolution", js: "resolution", typ: r("Resolution") },
        { json: "intervals", js: "intervals", typ: r("Intervals") },
        { json: "general", js: "general", typ: "any" },
        { json: "generalError", js: "generalError", typ: "any" },
        { json: "inaccessibleFeatureMessage", js: "inaccessibleFeatureMessage", typ: "any" },
        { json: "morePlugins", js: "morePlugins", typ: "any" },
        { json: "searchCamPlaceholder", js: "searchCamPlaceholder", typ: "any" },
        { json: "system", js: "system", typ: "any" },
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
        { json: "systemUnresponsive", js: "systemUnresponsive", typ: "any" },
        { json: "unknown", js: "unknown", typ: "any" },
        { json: "vendor", js: "vendor", typ: "any" },
        { json: "model", js: "model", typ: "any" },
        { json: "ip", js: "ip", typ: "any" },
        { json: "server", js: "server", typ: "any" },
        { json: "os", js: "os", typ: "any" },
        { json: "version", js: "version", typ: "any" },
        { json: "voiceCommands", js: "voiceCommands", typ: r("VoiceCommands") },
        { json: "viewingOutdatedReport", js: "viewingOutdatedReport", typ: "any" },
    ], false),
    "CommonAccount": o([
        { json: "created", js: "created", typ: r("NoSettings") },
        { json: "activated", js: "activated", typ: r("Docs") },
    ], false),
    "Docs": o([
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
    "Intervals": o([
        { json: "yearS", js: "yearS", typ: "any" },
        { json: "monthS", js: "monthS", typ: "any" },
        { json: "weekS", js: "weekS", typ: "any" },
        { json: "dayS", js: "dayS", typ: "any" },
        { json: "hourS", js: "hourS", typ: "any" },
        { json: "minuteS", js: "minuteS", typ: "any" },
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
    "Dashboard": o([
        { json: "dashboardEditEnabled", js: "dashboardEditEnabled", typ: "any" },
        { json: "dashboardLocked", js: "dashboardLocked", typ: "any" },
        { json: "unlockToUpload", js: "unlockToUpload", typ: "any" },
        { json: "unlockToMove", js: "unlockToMove", typ: "any" },
    ], false),
    "DevConsole": o([
        { json: "create", js: "create", typ: "any" },
    ], false),
    "DeviceTypes": o([
        { json: "All Device Types", js: "All Device Types", typ: "any" },
        { json: "servers", js: "servers", typ: "any" },
        { json: "cameras", js: "cameras", typ: "any" },
        { json: "storages", js: "storages", typ: "any" },
        { json: "networkInterfaces", js: "networkInterfaces", typ: "any" },
    ], false),
    "Dialogs": o([
        { json: "twoFa", js: "twoFa", typ: r("DialogsTwoFa") },
        { json: "addUser", js: "addUser", typ: r("AddUser") },
        { json: "buttons", js: "buttons", typ: r("Buttons") },
        { json: "cloudStorage", js: "cloudStorage", typ: r("CloudStorage") },
        { json: "changeStorage", js: "changeStorage", typ: r("ChangeStorage") },
        { json: "merge", js: "merge", typ: r("DialogsMerge") },
        { json: "message", js: "message", typ: r("DialogsMessage") },
        { json: "removeSystem", js: "removeSystem", typ: r("RemoveSystem") },
        { json: "renewAuth", js: "renewAuth", typ: r("RemoveSystem") },
        { json: "transferOwnership", js: "transferOwnership", typ: r("TransferOwnership") },
        { json: "titles", js: "titles", typ: r("DialogsTitles") },
        { json: "tooltips", js: "tooltips", typ: r("Tooltips") },
        { json: "twoFactor", js: "twoFactor", typ: r("DialogsTwoFactor") },
    ], false),
    "AddUser": o([
        { json: "alreadyExists", js: "alreadyExists", typ: "any" },
    ], false),
    "Buttons": o([
        { json: "cancel", js: "cancel", typ: "any" },
        { json: "createAccount", js: "createAccount", typ: "any" },
        { json: "delete", js: "delete", typ: "any" },
        { json: "deleteAccount", js: "deleteAccount", typ: "any" },
        { json: "disable", js: "disable", typ: "any" },
        { json: "enable", js: "enable", typ: "any" },
        { json: "download", js: "download", typ: "any" },
        { json: "logoutAuthorised", js: "logoutAuthorised", typ: "any" },
        { json: "ok", js: "ok", typ: "any" },
        { json: "remove", js: "remove", typ: "any" },
        { json: "stayAs", js: "stayAs", typ: "any" },
        { json: "stayLoggedIn", js: "stayLoggedIn", typ: "any" },
    ], false),
    "ChangeStorage": o([
        { json: "support", js: "support", typ: "any" },
    ], false),
    "CloudStorage": o([
        { json: "title", js: "title", typ: "any" },
        { json: "enableStorage", js: "enableStorage", typ: "any" },
        { json: "otherSystem", js: "otherSystem", typ: "any" },
        { json: "initial", js: "initial", typ: "any" },
        { json: "available", js: "available", typ: "any" },
        { json: "camera", js: "camera", typ: "any" },
        { json: "cameras", js: "cameras", typ: "any" },
        { json: "usageLabels", js: "usageLabels", typ: r("UsageLabels") },
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
    "UsageLabels": o([
        { json: "currentRecordings", js: "currentRecordings", typ: "any" },
        { json: "whenFullyUsed", js: "whenFullyUsed", typ: "any" },
        { json: "amountUsed", js: "amountUsed", typ: "any" },
        { json: "archiveFrom", js: "archiveFrom", typ: "any" },
        { json: "recordingBitrate", js: "recordingBitrate", typ: "any" },
        { json: "delayFromLive", js: "delayFromLive", typ: "any" },
    ], false),
    "DialogsMerge": o([
        { json: "adminPasswordTitle", js: "adminPasswordTitle", typ: "any" },
        { json: "adminPasswordWrong", js: "adminPasswordWrong", typ: "any" },
        { json: "knownBothSystemsConnectedToCloud", js: "knownBothSystemsConnectedToCloud", typ: "any" },
        { json: "unknownBothSystemsConnectedToCloud", js: "unknownBothSystemsConnectedToCloud", typ: "any" },
        { json: "checking", js: "checking", typ: "any" },
        { json: "cloud", js: "cloud", typ: "any" },
        { json: "commonText", js: "commonText", typ: "any" },
        { json: "connectToCloud", js: "connectToCloud", typ: "any" },
        { json: "failedToFindAnySystemHeader", js: "failedToFindAnySystemHeader", typ: "any" },
        { json: "failedToFindAnySystem", js: "failedToFindAnySystem", typ: "any" },
        { json: "differentOwners", js: "differentOwners", typ: "any" },
        { json: "duplicateServers", js: "duplicateServers", typ: "any" },
        { json: "enterSystemAddressTitle", js: "enterSystemAddressTitle", typ: "any" },
        { json: "latestBuild", js: "latestBuild", typ: "any" },
        { json: "mergeConfirmation", js: "mergeConfirmation", typ: "any" },
        { json: "mergeFailedTitle", js: "mergeFailedTitle", typ: "any" },
        { json: "mergeSuccess", js: "mergeSuccess", typ: "any" },
        { json: "mergeSystemsTitle", js: "mergeSystemsTitle", typ: "any" },
        { json: "noServerFound", js: "noServerFound", typ: "any" },
        { json: "newSystemDisplayName", js: "newSystemDisplayName", typ: "any" },
        { json: "otherSystem", js: "otherSystem", typ: "any" },
        { json: "ownerCanMergeText", js: "ownerCanMergeText", typ: "any" },
        { json: "passwordRequired", js: "passwordRequired", typ: "any" },
        { json: "passwordWrong", js: "passwordWrong", typ: "any" },
        { json: "primaryCannotMerge", js: "primaryCannotMerge", typ: "any" },
        { json: "primarySystemOffline", js: "primarySystemOffline", typ: "any" },
        { json: "primarySystemUnavailable", js: "primarySystemUnavailable", typ: "any" },
        { json: "recommendSupport", js: "recommendSupport", typ: "any" },
        { json: "restError", js: "restError", typ: r("RESTError") },
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
        { json: "systemVersionsNotMatch", js: "systemVersionsNotMatch", typ: "any" },
        { json: "targetSystemBoundToCloud", js: "targetSystemBoundToCloud", typ: "any" },
        { json: "urlEmpty", js: "urlEmpty", typ: "any" },
        { json: "urlNotValid", js: "urlNotValid", typ: "any" },
        { json: "unknownError", js: "unknownError", typ: "any" },
        { json: "warning", js: "warning", typ: "any" },
    ], false),
    "RESTError": o([
        { json: "duplicateServer", js: "duplicateServer", typ: "any" },
        { json: "useCloudMerge", js: "useCloudMerge", typ: "any" },
        { json: "differentCloudOwners", js: "differentCloudOwners", typ: "any" },
    ], false),
    "DialogsMessage": o([
        { json: "system2faEnabled", js: "system2faEnabled", typ: "any" },
        { json: "system2faDisabled", js: "system2faDisabled", typ: "any" },
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
        { json: "twoFactor", js: "twoFactor", typ: r("MessageTwoFactor") },
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
    "MessageTwoFactor": o([
        { json: "required", js: "required", typ: "any" },
        { json: "configure", js: "configure", typ: "any" },
        { json: "accountLink", js: "accountLink", typ: "any" },
        { json: "codeRequired", js: "codeRequired", typ: "any" },
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
        { json: "changePasswordFor", js: "changePasswordFor", typ: "any" },
        { json: "deleteUser", js: "deleteUser", typ: "any" },
        { json: "failedLoginTo", js: "failedLoginTo", typ: "any" },
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
    "TransferOwnership": o([
        { json: "userNotFound", js: "userNotFound", typ: "any" },
    ], false),
    "DialogsTwoFa": o([
        { json: "wizardWarning", js: "wizardWarning", typ: "any" },
        { json: "wizardWarningDescr", js: "wizardWarningDescr", typ: "any" },
        { json: "installAuthApp", js: "installAuthApp", typ: "any" },
        { json: "nowEnabled", js: "nowEnabled", typ: "any" },
    ], false),
    "DialogsTwoFactor": o([
        { json: "action", js: "action", typ: "any" },
        { json: "message", js: "message", typ: "any" },
        { json: "title", js: "title", typ: "any" },
        { json: "wizardWarning", js: "wizardWarning", typ: "any" },
        { json: "unsupportedSystem", js: "unsupportedSystem", typ: "any" },
    ], false),
    "Downloads": o([
        { json: "appTypes", js: "appTypes", typ: r("AppTypes") },
        { json: "groups", js: "groups", typ: r("DownloadsGroups") },
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
    "DownloadsGroups": o([
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
    "HeaderLabels": o([
        { json: "healthReportForSystem", js: "healthReportForSystem", typ: "any" },
    ], false),
    "HealthMonitor": o([
        { json: "groups", js: "groups", typ: r("HealthMonitorGroups") },
        { json: "keys", js: "keys", typ: r("Keys") },
    ], false),
    "HealthMonitorGroups": o([
        { json: "info", js: "info", typ: "any" },
        { json: "availability", js: "availability", typ: "any" },
        { json: "load", js: "load", typ: "any" },
        { json: "activity", js: "activity", typ: "any" },
    ], false),
    "Keys": o([
        { json: "name", js: "name", typ: "any" },
        { json: "servers", js: "servers", typ: "any" },
        { json: "cameras", js: "cameras", typ: "any" },
        { json: "storages", js: "storages", typ: "any" },
        { json: "users", js: "users", typ: "any" },
        { json: "version", js: "version", typ: "any" },
        { json: "cloudSystemId", js: "cloudSystemId", typ: "any" },
        { json: "status", js: "status", typ: "any" },
        { json: "offlineEvents", js: "offlineEvents", typ: "any" },
        { json: "uptimeS", js: "uptimeS", typ: "any" },
        { json: "cpuUsageP", js: "cpuUsageP", typ: "any" },
        { json: "serverCpuUsageP", js: "serverCpuUsageP", typ: "any" },
        { json: "ramUsageB", js: "ramUsageB", typ: "any" },
        { json: "ramUsageP", js: "ramUsageP", typ: "any" },
        { json: "serverRamUsageB", js: "serverRamUsageB", typ: "any" },
        { json: "serverRamUsageP", js: "serverRamUsageP", typ: "any" },
        { json: "threads", js: "threads", typ: "any" },
        { json: "decodingThreads", js: "decodingThreads", typ: "any" },
        { json: "decodingSpeed3s", js: "decodingSpeed3s", typ: "any" },
        { json: "encodingThreads", js: "encodingThreads", typ: "any" },
        { json: "encodingSpeed3s", js: "encodingSpeed3s", typ: "any" },
        { json: "primaryStreams", js: "primaryStreams", typ: "any" },
        { json: "secondaryStreams", js: "secondaryStreams", typ: "any" },
        { json: "incomingConnections", js: "incomingConnections", typ: "any" },
        { json: "outgoingConnections", js: "outgoingConnections", typ: "any" },
        { json: "logLevel", js: "logLevel", typ: "any" },
        { json: "publicIp", js: "publicIp", typ: "any" },
        { json: "os", js: "os", typ: "any" },
        { json: "osTime", js: "osTime", typ: "any" },
        { json: "vmsTime", js: "vmsTime", typ: "any" },
        { json: "cpu", js: "cpu", typ: "any" },
        { json: "cpuCores", js: "cpuCores", typ: "any" },
        { json: "ramB", js: "ramB", typ: "any" },
        { json: "guidConflict", js: "guidConflict", typ: "any" },
        { json: "vmsTimeChanged24h", js: "vmsTimeChanged24h", typ: "any" },
        { json: "transactionsPerSecond1m", js: "transactionsPerSecond1m", typ: "any" },
        { json: "actionsTriggered1m", js: "actionsTriggered1m", typ: "any" },
        { json: "apiCalls1m", js: "apiCalls1m", typ: "any" },
        { json: "thumbnails1m", js: "thumbnails1m", typ: "any" },
        { json: "activePlugins", js: "activePlugins", typ: "any" },
    ], false),
    "LanguageI18NStaticTypesIntegration": o([
        { json: "Access Control", js: "Access Control", typ: "any" },
        { json: "Connector", js: "Connector", typ: "any" },
        { json: "Data Analytics", js: "Data Analytics", typ: "any" },
        { json: "Drone", js: "Drone", typ: "any" },
        { json: "Health Monitor", js: "Health Monitor", typ: "any" },
        { json: "Storage", js: "Storage", typ: "any" },
        { json: "myIntegrationsLabel", js: "myIntegrationsLabel", typ: "any" },
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
        { json: "request", js: "request", typ: "any" },
    ], false),
    "License": o([
        { json: "licenseTypeTitles", js: "licenseTypeTitles", typ: r("LicenseTypeTitles") },
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
        { json: "deactivations", js: "deactivations", typ: "any" },
        { json: "online", js: "online", typ: "any" },
        { json: "error", js: "error", typ: "any" },
        { json: "expired", js: "expired", typ: "any" },
        { json: "ok", js: "ok", typ: "any" },
        { json: "nvrError", js: "nvrError", typ: "any" },
        { json: "serverNotFound", js: "serverNotFound", typ: "any" },
    ], false),
    "LicenseTypeTitles": o([
        { json: "Time", js: "Time", typ: "any" },
        { json: "Trial", js: "Trial", typ: "any" },
        { json: "Professional", js: "Professional", typ: "any" },
        { json: "Analog", js: "Analog", typ: "any" },
        { json: "Edge", js: "Edge", typ: "any" },
        { json: "VMAX", js: "VMAX", typ: "any" },
        { json: "Video Wall", js: "Video Wall", typ: "any" },
        { json: "Analog Encoder", js: "Analog Encoder", typ: "any" },
        { json: "Starter", js: "Starter", typ: "any" },
        { json: "IO Module", js: "IO Module", typ: "any" },
        { json: "Bridge", js: "Bridge", typ: "any" },
        { json: "NVR", js: "NVR", typ: "any" },
        { json: "Invalid", js: "Invalid", typ: "any" },
    ], false),
    "Messages": o([
        { json: "required", js: "required", typ: "any" },
        { json: "activated", js: "activated", typ: "any" },
        { json: "inuse", js: "inuse", typ: "any" },
        { json: "trialActivated", js: "trialActivated", typ: "any" },
    ], false),
    "Maintenance": o([
        { json: "description", js: "description", typ: "any" },
    ], false),
    "Menu": o([
        { json: "titles", js: "titles", typ: r("MenuTitles") },
    ], false),
    "MenuTitles": o([
        { json: "cameras", js: "cameras", typ: "any" },
        { json: "systemAdministration", js: "systemAdministration", typ: "any" },
        { json: "general", js: "general", typ: "any" },
        { json: "licenses", js: "licenses", typ: "any" },
        { json: "users", js: "users", typ: "any" },
        { json: "servers", js: "servers", typ: "any" },
        { json: "alerts", js: "alerts", typ: "any" },
        { json: "systems", js: "systems", typ: "any" },
        { json: "storages", js: "storages", typ: "any" },
        { json: "networkInterfaces", js: "networkInterfaces", typ: "any" },
        { json: "graphs", js: "graphs", typ: "any" },
        { json: "logs", js: "logs", typ: "any" },
    ], false),
    "MetaDefaults": o([
        { json: "default", js: "default", typ: r("MetaDefaultsDefault") },
        { json: "/systems", js: "/systems", typ: r("Docs") },
        { json: "/integrations", js: "/integrations", typ: r("Docs") },
        { json: "/docs", js: "/docs", typ: r("Docs") },
        { json: "/ipvd", js: "/ipvd", typ: r("Docs") },
    ], false),
    "MetaDefaultsDefault": o([
        { json: "site_name", js: "site_name", typ: "any" },
        { json: "title", js: "title", typ: "any" },
        { json: "description", js: "description", typ: "any" },
    ], false),
    "MetaDefaultsWebadmin": o([
        { json: "default", js: "default", typ: r("MetaDefaultsWebadminDefault") },
        { json: "/settings", js: "/settings", typ: r("Docs") },
        { json: "/view", js: "/view", typ: r("Docs") },
        { json: "/health", js: "/health", typ: r("Docs") },
        { json: "/monitoring", js: "/monitoring", typ: r("Docs") },
    ], false),
    "MetaDefaultsWebadminDefault": o([
        { json: "site_name", js: "site_name", typ: "any" },
        { json: "title", js: "title", typ: "any" },
    ], false),
    "Monitoring": o([
        { json: "unavailable", js: "unavailable", typ: "any" },
    ], false),
    "PageDescriptions": o([
        { json: "integrations", js: "integrations", typ: "any" },
        { json: "integrationSetup", js: "integrationSetup", typ: "any" },
        { json: "integrationDetails", js: "integrationDetails", typ: "any" },
    ], false),
    "PageTitles": o([
        { json: "about", js: "about", typ: "any" },
        { json: "account", js: "account", typ: "any" },
        { json: "activate", js: "activate", typ: "any" },
        { json: "activateCode", js: "activateCode", typ: "any" },
        { json: "activateSuccess", js: "activateSuccess", typ: "any" },
        { json: "articleTitle", js: "articleTitle", typ: "any" },
        { json: "auth", js: "auth", typ: "any" },
        { json: "changePassword", js: "changePassword", typ: "any" },
        { json: "debug", js: "debug", typ: "any" },
        { json: "default", js: "default", typ: "any" },
        { json: "download", js: "download", typ: "any" },
        { json: "downloadPlatform", js: "downloadPlatform", typ: "any" },
        { json: "failedToAccess2FA", js: "failedToAccess2FA", typ: "any" },
        { json: "failedToAccessSystem", js: "failedToAccessSystem", typ: "any" },
        { json: "failedToAccessCamera", js: "failedToAccessCamera", typ: "any" },
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
        { json: "templateWebadmin", js: "templateWebadmin", typ: "any" },
        { json: "view", js: "view", typ: "any" },
        { json: "apiTool", js: "apiTool", typ: "any" },
        { json: "security", js: "security", typ: "any" },
        { json: "twofaRequired", js: "twofaRequired", typ: "any" },
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
        { json: "noSystemApiTool", js: "noSystemApiTool", typ: r("NoSettings") },
        { json: "systemLoadFailureApiTool", js: "systemLoadFailureApiTool", typ: r("NoSettings") },
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
    "Redirects": o([
        { json: "message", js: "message", typ: "any" },
        { json: "defaultMessage", js: "defaultMessage", typ: "any" },
        { json: "cloudLinks", js: "cloudLinks", typ: r("CloudLinks") },
    ], false),
    "CloudLinks": o([
        { json: "supportLink", js: "supportLink", typ: "any" },
    ], false),
    "Registration": o([
        { json: "agreement", js: "agreement", typ: "any" },
    ], false),
    "Ribbon": o([
        { json: "beingMerged", js: "beingMerged", typ: r("BeingMerged") },
        { json: "finishingMerge", js: "finishingMerge", typ: "any" },
        { json: "integration", js: "integration", typ: r("RibbonIntegration") },
        { json: "newVersionAvailable", js: "newVersionAvailable", typ: r("NewVersionAvailable") },
        { json: "systemOffline", js: "systemOffline", typ: "any" },
        { json: "systemsMerging", js: "systemsMerging", typ: "any" },
    ], false),
    "BeingMerged": o([
        { json: "to", js: "to", typ: "any" },
        { json: "mayTake", js: "mayTake", typ: "any" },
    ], false),
    "RibbonIntegration": o([
        { json: "accept", js: "accept", typ: "any" },
        { json: "reject", js: "reject", typ: "any" },
        { json: "backToEditText", js: "backToEditText", typ: "any" },
        { json: "previewRibbon", js: "previewRibbon", typ: "any" },
        { json: "publishedRibbon", js: "publishedRibbon", typ: "any" },
    ], false),
    "NewVersionAvailable": o([
        { json: "notification", js: "notification", typ: "any" },
        { json: "installButton", js: "installButton", typ: "any" },
    ], false),
    "Search": o([
        { json: "Any", js: "Any", typ: "any" },
        { json: "Search", js: "Search", typ: "any" },
        { json: "analytics", js: "analytics", typ: "any" },
        { json: "analyticsSelected", js: "analyticsSelected", typ: "any" },
        { json: "appliedFilters", js: "appliedFilters", typ: "any" },
        { json: "hardwareType", js: "hardwareType", typ: "any" },
        { json: "hardwareTypes", js: "hardwareTypes", typ: "any" },
        { json: "minResolution", js: "minResolution", typ: "any" },
        { json: "search_ipvd", js: "search_ipvd", typ: "any" },
        { json: "selected", js: "selected", typ: "any" },
        { json: "vendor", js: "vendor", typ: "any" },
        { json: "vendors", js: "vendors", typ: "any" },
        { json: "resultsFound", js: "resultsFound", typ: "any" },
    ], false),
    "Security": o([
        { json: "twoFa", js: "twoFa", typ: r("SecurityTwoFa") },
    ], false),
    "SecurityTwoFa": o([
        { json: "twoFADescription", js: "twoFADescription", typ: "any" },
        { json: "systemsRemainder", js: "systemsRemainder", typ: "any" },
        { json: "v5Warning", js: "v5Warning", typ: "any" },
        { json: "v5WarningExplanation", js: "v5WarningExplanation", typ: "any" },
        { json: "disableWarning", js: "disableWarning", typ: "any" },
    ], false),
    "ServerTabTitles": o([
        { json: "View", js: "View", typ: "any" },
        { json: "Settings", js: "Settings", typ: "any" },
        { json: "Information", js: "Information", typ: "any" },
        { json: "Bookmarks", js: "Bookmarks", typ: "any" },
        { json: "Monitoring", js: "Monitoring", typ: "any" },
    ], false),
    "Servers": o([
        { json: "analyticsDataPolicyError", js: "analyticsDataPolicyError", typ: "any" },
        { json: "autoRefresh", js: "autoRefresh", typ: "any" },
        { json: "beginDetach", js: "beginDetach", typ: "any" },
        { json: "beginReset", js: "beginReset", typ: "any" },
        { json: "detachSystemFailed", js: "detachSystemFailed", typ: "any" },
        { json: "detachSystemSuccess", js: "detachSystemSuccess", typ: "any" },
        { json: "portWarning", js: "portWarning", typ: "any" },
        { json: "refresh", js: "refresh", typ: "any" },
        { json: "refreshing", js: "refreshing", typ: "any" },
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
    "Storage": o([
        { json: "reindexingDone", js: "reindexingDone", typ: r("ReindexingDone") },
        { json: "modes", js: "modes", typ: r("Modes") },
        { json: "alreadyUsed", js: "alreadyUsed", typ: "any" },
        { json: "deleteExternalStorage", js: "deleteExternalStorage", typ: "any" },
        { json: "failed", js: "failed", typ: "any" },
        { json: "invalidPath", js: "invalidPath", typ: "any" },
        { json: "stillHasArchivesPreWarning", js: "stillHasArchivesPreWarning", typ: "any" },
        { json: "stillHasArchives", js: "stillHasArchives", typ: "any" },
        { json: "storageDeleted", js: "storageDeleted", typ: "any" },
        { json: "failedRemove", js: "failedRemove", typ: "any" },
        { json: "reservedTooSmallTooltip", js: "reservedTooSmallTooltip", typ: "any" },
        { json: "reservedSystemTooltip", js: "reservedSystemTooltip", typ: "any" },
        { json: "serverOffline", js: "serverOffline", typ: "any" },
        { json: "success", js: "success", typ: "any" },
        { json: "urlPlaceholder", js: "urlPlaceholder", typ: "any" },
    ], false),
    "Modes": o([
        { json: "main", js: "main", typ: "any" },
        { json: "backup", js: "backup", typ: "any" },
        { json: "notInUse", js: "notInUse", typ: "any" },
        { json: "reserved", js: "reserved", typ: "any" },
        { json: "inaccessible", js: "inaccessible", typ: "any" },
        { json: "changing", js: "changing", typ: "any" },
        { json: "disabled", js: "disabled", typ: "any" },
    ], false),
    "ReindexingDone": o([
        { json: "mainSuccess", js: "mainSuccess", typ: "any" },
        { json: "backupSuccess", js: "backupSuccess", typ: "any" },
        { json: "mainFailed", js: "mainFailed", typ: "any" },
        { json: "backupFailed", js: "backupFailed", typ: "any" },
    ], false),
    "LanguageI18NStaticTypesSystem": o([
        { json: "connected", js: "connected", typ: "any" },
        { json: "not_connected", js: "not_connected", typ: "any" },
        { json: "MERGE_FINISHES", js: "MERGE_FINISHES", typ: "any" },
        { json: "mergeUnknownName", js: "mergeUnknownName", typ: "any" },
        { json: "mySystemSearch", js: "mySystemSearch", typ: "any" },
        { json: "settings", js: "settings", typ: r("Settings") },
        { json: "status", js: "status", typ: r("SystemStatus") },
        { json: "users", js: "users", typ: r("Users") },
        { json: "yourSystem", js: "yourSystem", typ: "any" },
        { json: "loggers", js: "loggers", typ: r("Loggers") },
        { json: "loggerDropdownLabel", js: "loggerDropdownLabel", typ: "any" },
        { json: "storageToolTips", js: "storageToolTips", typ: r("StorageToolTips") },
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
        { json: "notAbleToLoadStorageInfo", js: "notAbleToLoadStorageInfo", typ: "any" },
        { json: "notAbleToLoadSecurity", js: "notAbleToLoadSecurity", typ: "any" },
        { json: "notAbleToLoadSystem", js: "notAbleToLoadSystem", typ: "any" },
        { json: "sessionLimitDuration", js: "sessionLimitDuration", typ: r("SessionLimitDuration") },
        { json: "warningMessages", js: "warningMessages", typ: r("WarningMessages") },
    ], false),
    "SessionLimitDuration": o([
        { json: "hours", js: "hours", typ: "any" },
        { json: "minutes", js: "minutes", typ: "any" },
        { json: "days", js: "days", typ: "any" },
    ], false),
    "WarningMessages": o([
        { json: "videoEncryption", js: "videoEncryption", typ: "any" },
    ], false),
    "SystemStatus": o([
        { json: "offline", js: "offline", typ: "any" },
        { json: "unavailable", js: "unavailable", typ: "any" },
    ], false),
    "StorageToolTips": o([
        { json: "local", js: "local", typ: "any" },
        { json: "usb", js: "usb", typ: "any" },
        { json: "network", js: "network", typ: "any" },
        { json: "smb", js: "smb", typ: "any" },
        { json: "cloud", js: "cloud", typ: "any" },
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
    "TableHeaders": o([
        { json: "type", js: "type", typ: "any" },
        { json: "server", js: "server", typ: "any" },
        { json: "alert", js: "alert", typ: "any" },
    ], false),
    "Tile": o([
        { json: "groupCount", js: "groupCount", typ: "any" },
        { json: "systemCount", js: "systemCount", typ: "any" },
    ], false),
    "ToastMessage": o([
        { json: "cloudUnavailable", js: "cloudUnavailable", typ: "any" },
        { json: "nameFail", js: "nameFail", typ: "any" },
        { json: "noConnection", js: "noConnection", typ: "any" },
        { json: "noInternet", js: "noInternet", typ: "any" },
        { json: "userChangesFail", js: "userChangesFail", typ: "any" },
        { json: "reviewAccepted", js: "reviewAccepted", typ: "any" },
        { json: "system", js: "system", typ: r("ToastMessageSystem") },
        { json: "webAdminCloudCredentialError", js: "webAdminCloudCredentialError", typ: "any" },
        { json: "twoFaRequired", js: "twoFaRequired", typ: "any" },
        { json: "loggingIn", js: "loggingIn", typ: "any" },
        { json: "sessionRenewed", js: "sessionRenewed", typ: "any" },
        { json: "failedToUpdateSession", js: "failedToUpdateSession", typ: "any" },
    ], false),
    "ToastMessageSystem": o([
        { json: "deleted", js: "deleted", typ: r("Deleted") },
        { json: "disconnected", js: "disconnected", typ: r("Deleted") },
        { json: "cloudConnect", js: "cloudConnect", typ: r("CloudConnect") },
        { json: "merge", js: "merge", typ: r("CloudConnect") },
        { json: "rename", js: "rename", typ: r("Deleted") },
    ], false),
    "CloudConnect": o([
        { json: "success", js: "success", typ: "any" },
        { json: "failed", js: "failed", typ: "any" },
    ], false),
    "Deleted": o([
        { json: "success", js: "success", typ: "any" },
    ], false),
    "View": o([
        { json: "timeline", js: "timeline", typ: r("Timeline") },
    ], false),
    "Timeline": o([
        { json: "dayNames", js: "dayNames", typ: r("DayNames") },
        { json: "monthNames", js: "monthNames", typ: r("MonthNames") },
        { json: "timeNames", js: "timeNames", typ: r("TimeNames") },
    ], false),
    "DayNames": o([
        { json: "Sun", js: "Sun", typ: "any" },
        { json: "Mon", js: "Mon", typ: "any" },
        { json: "Tue", js: "Tue", typ: "any" },
        { json: "Wed", js: "Wed", typ: "any" },
        { json: "Thu", js: "Thu", typ: "any" },
        { json: "Fri", js: "Fri", typ: "any" },
        { json: "Sat", js: "Sat", typ: "any" },
        { json: "Sunday", js: "Sunday", typ: "any" },
        { json: "Monday", js: "Monday", typ: "any" },
        { json: "Tuesday", js: "Tuesday", typ: "any" },
        { json: "Wednesday", js: "Wednesday", typ: "any" },
        { json: "Thursday", js: "Thursday", typ: "any" },
        { json: "Friday", js: "Friday", typ: "any" },
        { json: "Saturday", js: "Saturday", typ: "any" },
    ], false),
    "MonthNames": o([
        { json: "Jan", js: "Jan", typ: "any" },
        { json: "Feb", js: "Feb", typ: "any" },
        { json: "Mar", js: "Mar", typ: "any" },
        { json: "Apr", js: "Apr", typ: "any" },
        { json: "May", js: "May", typ: "any" },
        { json: "Jun", js: "Jun", typ: "any" },
        { json: "Jul", js: "Jul", typ: "any" },
        { json: "Aug", js: "Aug", typ: "any" },
        { json: "Sep", js: "Sep", typ: "any" },
        { json: "Oct", js: "Oct", typ: "any" },
        { json: "Nov", js: "Nov", typ: "any" },
        { json: "Dec", js: "Dec", typ: "any" },
        { json: "January", js: "January", typ: "any" },
        { json: "February", js: "February", typ: "any" },
        { json: "March", js: "March", typ: "any" },
        { json: "April", js: "April", typ: "any" },
        { json: "June", js: "June", typ: "any" },
        { json: "July", js: "July", typ: "any" },
        { json: "August", js: "August", typ: "any" },
        { json: "September", js: "September", typ: "any" },
        { json: "October", js: "October", typ: "any" },
        { json: "November", js: "November", typ: "any" },
        { json: "December", js: "December", typ: "any" },
    ], false),
    "TimeNames": o([
        { json: "a", js: "a", typ: "any" },
        { json: "p", js: "p", typ: "any" },
        { json: "am", js: "am", typ: "any" },
        { json: "pm", js: "pm", typ: "any" },
        { json: "A", js: "A", typ: "any" },
        { json: "P", js: "P", typ: "any" },
        { json: "AM", js: "AM", typ: "any" },
        { json: "PM", js: "PM", typ: "any" },
    ], false),
};
