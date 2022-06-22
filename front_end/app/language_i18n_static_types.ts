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
    appHeader:             AppHeader;
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

export interface AppHeader {
    mySystems:  any;
    systemList: any;
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
