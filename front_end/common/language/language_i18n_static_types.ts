export interface LanguageI18NStaticTypes {
    language:              (params?: Record<string, string | number>) => string;
    "About %CLOUD_NAME%":  (params?: Record<string, string | number>) => string;
    Administration:        (params?: Record<string, string | number>) => string;
    "All Servers":         (params?: Record<string, string | number>) => string;
    "Download %VMS_NAME%": (params?: Record<string, string | number>) => string;
    "For developers":      (params?: Record<string, string | number>) => string;
    "Integrations (β)":    (params?: Record<string, string | number>) => string;
    Privacy:               (params?: Record<string, string | number>) => string;
    Support:               (params?: Record<string, string | number>) => string;
    Terms:                 (params?: Record<string, string | number>) => string;
    "Developers Console":  (params?: Record<string, string | number>) => string;
    productName:           (params?: Record<string, string | number>) => string;
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
    clientProtocol:        (params?: Record<string, string | number>) => string;
    cloudStorage:          LanguageI18NStaticTypesCloudStorage;
    common:                Common;
    components:            Components;
    cookieWarning:         (params?: Record<string, string | number>) => string;
    dashboard:             Dashboard;
    devConsole:            DevConsole;
    dialogs:               Dialogs;
    downloads:             Downloads;
    errorCodes:            { [key: string]: (params?: Record<string, string | number>) => string };
    appHeader:             AppHeader;
    integration:           LanguageI18NStaticTypesIntegration;
    ipvd:                  Ipvd;
    ipvdFeedback:          IpvdFeedback;
    layoutAutosave:        (params?: Record<string, string | number>) => string;
    systemsCount:          (params?: Record<string, string | number>) => string;
    alertsCount:           (params?: Record<string, string | number>) => string;
    ipvdTopXByVolume:      (params?: Record<string, string | number>) => string;
    ipvdDisclaimer:        (params?: Record<string, string | number>) => string;
    menu:                  Menu;
    tableHeaders:          TableHeaders;
    appFooter:             AppFooter;
    pages:                 Pages;
    pageTitles:            PageTitles;
    pageDescriptions:      PageDescriptions;
    passwordRequirements:  PasswordRequirements;
    placeholderTexts:      PlaceholderTexts;
    pleaseSelect:          (params?: Record<string, string | number>) => string;
    privacyPolicy:         PrivacyPolicy;
    registration:          Registration;
    ribbon:                Ribbon;
    search:                Search;
    servers:               Servers;
    serverTabTitles:       ServerTabTitles;
    setupWizard:           SetupWizard;
    system:                LanguageI18NStaticTypesSystem;
    systemGroups:          LanguageI18NStaticTypesSystemGroups;
    systemStatuses:        SystemStatuses;
    serverDocumentation:   ServerDocumentation;
    toastMessage:          ToastMessage;
    healthMonitor:         HealthMonitor;
    headerLabels:          HeaderLabels;
    license:               License;
    redirects:             Redirects;
    settingsConfig:        { [key: string]: (params?: Record<string, string | number>) => string };
    result:                (params?: Record<string, string | number>) => string;
    additionalSystems:     (params?: Record<string, string | number>) => string;
    security:              Security;
    storage:               Storage;
    metaDefaults:          MetaDefaults;
    metaDefaultsWebadmin:  MetaDefaultsWebadmin;
    maintenance:           Maintenance;
    view:                  View;
}

export interface AccessRole {
    description: (params?: Record<string, string | number>) => string;
    label:       (params?: Record<string, string | number>) => string;
}

export interface LanguageI18NStaticTypesAccount {
    account:                (params?: Record<string, string | number>) => string;
    key:                    (params?: Record<string, string | number>) => string;
    accountSavedSuccess:    (params?: Record<string, string | number>) => string;
    accountSettings:        (params?: Record<string, string | number>) => string;
    activationLinkSent:     (params?: Record<string, string | number>) => string;
    agreementAccepted:      (params?: Record<string, string | number>) => string;
    changePassword:         (params?: Record<string, string | number>) => string;
    security:               (params?: Record<string, string | number>) => string;
    newPasswordLabel:       (params?: Record<string, string | number>) => string;
    passwordChangedSuccess: (params?: Record<string, string | number>) => string;
    saveChanges:            (params?: Record<string, string | number>) => string;
}

export interface ActiveActions {
    resetPassword:       (params?: Record<string, string | number>) => string;
    sendConfirm:         (params?: Record<string, string | number>) => string;
    setNewPassword:      (params?: Record<string, string | number>) => string;
    setNewPasswordLabel: (params?: Record<string, string | number>) => string;
}

export interface AlarmLevels {
    offline: (params?: Record<string, string | number>) => string;
    error:   (params?: Record<string, string | number>) => string;
    warning: (params?: Record<string, string | number>) => string;
}

export interface AlarmTypes {
    Servers:              (params?: Record<string, string | number>) => string;
    Cameras:              (params?: Record<string, string | number>) => string;
    "Storage Locations":  (params?: Record<string, string | number>) => string;
    "Network Interfaces": (params?: Record<string, string | number>) => string;
}

export interface AlertFilters {
    all:     (params?: Record<string, string | number>) => string;
    warning: (params?: Record<string, string | number>) => string;
    error:   (params?: Record<string, string | number>) => string;
}

export interface AppFooter {
    copyright: (params?: Record<string, string | number>) => string;
}

export interface AppHeader {
    mySystems:       (params?: Record<string, string | number>) => string;
    systemList:      (params?: Record<string, string | number>) => string;
    headerMenuNodes: HeaderMenuNodes;
}

export interface HeaderMenuNodes {
    welcome:         AccountSettings;
    accountSettings: AccountSettings;
    system:          AccountSettings;
}

export interface AccountSettings {
    displayName: (params?: Record<string, string | number>) => string;
    nodes:       Node[];
}

export interface Node {
    displayName: (params?: Record<string, string | number>) => string;
}

export interface Authorize {
    loginCloudHeader:           (params?: Record<string, string | number>) => string;
    connectHeader:              (params?: Record<string, string | number>) => string;
    expiredHeader:              (params?: Record<string, string | number>) => string;
    loginSystemSubheader:       (params?: Record<string, string | number>) => string;
    connectSubheader:           (params?: Record<string, string | number>) => string;
    expiredSubheader:           (params?: Record<string, string | number>) => string;
    connectAdditional:          (params?: Record<string, string | number>) => string;
    createText:                 (params?: Record<string, string | number>) => string;
    setupText:                  (params?: Record<string, string | number>) => string;
    asAccountSubheader:         (params?: Record<string, string | number>) => string;
    toAccountSubheader:         (params?: Record<string, string | number>) => string;
    forAccountSubheader:        (params?: Record<string, string | number>) => string;
    passwordDisconnect:         (params?: Record<string, string | number>) => string;
    passwordMerge:              (params?: Record<string, string | number>) => string;
    passwordBackup:             (params?: Record<string, string | number>) => string;
    passwordRestore:            (params?: Record<string, string | number>) => string;
    passwordReset:              (params?: Record<string, string | number>) => string;
    passwordRestart:            (params?: Record<string, string | number>) => string;
    passwordDetach:             (params?: Record<string, string | number>) => string;
    passwordTransfer:           (params?: Record<string, string | number>) => string;
    expiredAccountSubheader:    (params?: Record<string, string | number>) => string;
    createAccountHeader:        (params?: Record<string, string | number>) => string;
    activateHeader:             (params?: Record<string, string | number>) => string;
    createdText:                (params?: Record<string, string | number>) => string;
    activatedText:              (params?: Record<string, string | number>) => string;
    createdAdditional:          (params?: Record<string, string | number>) => string;
    activatedAdditional:        (params?: Record<string, string | number>) => string;
    passResetHeader:            (params?: Record<string, string | number>) => string;
    newPassHeader:              (params?: Record<string, string | number>) => string;
    newPassConfirmText:         (params?: Record<string, string | number>) => string;
    newPassInvalidCode:         (params?: Record<string, string | number>) => string;
    notSecureText:              (params?: Record<string, string | number>) => string;
    confirmHeader:              (params?: Record<string, string | number>) => string;
    loginError:                 (params?: Record<string, string | number>) => string;
    loginErrorAdditional:       (params?: Record<string, string | number>) => string;
    connectErrorAdditional:     (params?: Record<string, string | number>) => string;
    setupErrorAdditional:       (params?: Record<string, string | number>) => string;
    connectedText:              (params?: Record<string, string | number>) => string;
    setupConnectedText:         (params?: Record<string, string | number>) => string;
    stayLoggedInHelpText:       (params?: Record<string, string | number>) => string;
    termsAndConditionsHelpText: (params?: Record<string, string | number>) => string;
    copiedToClipboard:          (params?: Record<string, string | number>) => string;
    authCode:                   AuthCode;
    emailSent:                  (params?: Record<string, string | number>) => string;
}

export interface AuthCode {
    message: (params?: Record<string, string | number>) => string;
    newPass: (params?: Record<string, string | number>) => string;
    login:   (params?: Record<string, string | number>) => string;
}

export interface CameraFilters {
    H265:        (params?: Record<string, string | number>) => string;
    IO:          (params?: Record<string, string | number>) => string;
    TwWayAudio:  (params?: Record<string, string | number>) => string;
    aptz:        (params?: Record<string, string | number>) => string;
    audio:       (params?: Record<string, string | number>) => string;
    encoder:     (params?: Record<string, string | number>) => string;
    fisheye:     (params?: Record<string, string | number>) => string;
    highRes:     (params?: Record<string, string | number>) => string;
    multiSensor: (params?: Record<string, string | number>) => string;
    ptz:         (params?: Record<string, string | number>) => string;
}

export interface LanguageI18NStaticTypesCloudStorage {
    keyTableFields: KeyTableFields;
    fromServer:     FromServer;
    notUsedWarning: (params?: Record<string, string | number>) => string;
}

export interface FromServer {
    ACTIVE:                                                                                   (params?: Record<string, string | number>) => string;
    INACTIVE:                                                                                 (params?: Record<string, string | number>) => string;
    Unassigned:                                                                               (params?: Record<string, string | number>) => string;
    until:                                                                                    (params?: Record<string, string | number>) => string;
    "This license was deactivated more than once AND was reactivated less than 24 hours ago": (params?: Record<string, string | number>) => string;
    "License key is already activated":                                                       (params?: Record<string, string | number>) => string;
    "Maximum number of items is 10000":                                                       (params?: Record<string, string | number>) => string;
    "This Cloud license does not exist":                                                      (params?: Record<string, string | number>) => string;
    "This license is already activated":                                                      (params?: Record<string, string | number>) => string;
    "This license is not activated":                                                          (params?: Record<string, string | number>) => string;
    "This license has already expired":                                                       (params?: Record<string, string | number>) => string;
    "Already has a cloud storage license active":                                             (params?: Record<string, string | number>) => string;
    "Cloud System ID does not match credentials used":                                        (params?: Record<string, string | number>) => string;
    "Not Authorized for cloud system":                                                        (params?: Record<string, string | number>) => string;
    "This license is not currently activated":                                                (params?: Record<string, string | number>) => string;
    "This license has no deactivations remaining":                                            (params?: Record<string, string | number>) => string;
    "Cloud system Id does not match license activation":                                      (params?: Record<string, string | number>) => string;
    used:                                                                                     (params?: Record<string, string | number>) => string;
    available:                                                                                (params?: Record<string, string | number>) => string;
    usedSpace:                                                                                (params?: Record<string, string | number>) => string;
}

export interface KeyTableFields {
    size:    (params?: Record<string, string | number>) => string;
    state:   (params?: Record<string, string | number>) => string;
    system:  (params?: Record<string, string | number>) => string;
    expires: (params?: Record<string, string | number>) => string;
    key:     (params?: Record<string, string | number>) => string;
}

export interface Common {
    account:                    CommonAccount;
    cameraLinks:                CameraLinks;
    cameraStates:               CameraStates;
    chromeCastWarning:          (params?: Record<string, string | number>) => string;
    copiedToClipboard:          (params?: Record<string, string | number>) => string;
    login:                      (params?: Record<string, string | number>) => string;
    recordingSettingsWarning:   (params?: Record<string, string | number>) => string;
    disableMotionWarning:       (params?: Record<string, string | number>) => string;
    recordingModes:             RecordingModes;
    resolution:                 Resolution;
    intervals:                  Intervals;
    general:                    (params?: Record<string, string | number>) => string;
    generalError:               (params?: Record<string, string | number>) => string;
    inaccessibleFeatureMessage: (params?: Record<string, string | number>) => string;
    morePlugins:                (params?: Record<string, string | number>) => string;
    searchCamPlaceholder:       (params?: Record<string, string | number>) => string;
    system:                     (params?: Record<string, string | number>) => string;
    systemHasNoCameras:         (params?: Record<string, string | number>) => string;
    systemHasNoCamerasMessage:  (params?: Record<string, string | number>) => string;
    systemNewVersion:           (params?: Record<string, string | number>) => string;
    systemNewVersionMessage:    (params?: Record<string, string | number>) => string;
    systemNoAlerts:             (params?: Record<string, string | number>) => string;
    systemNoAlertsMessage:      (params?: Record<string, string | number>) => string;
    systemOffline:              (params?: Record<string, string | number>) => string;
    systemOfflineMessage:       (params?: Record<string, string | number>) => string;
    systemServerError:          (params?: Record<string, string | number>) => string;
    systemServerErrorMessage:   (params?: Record<string, string | number>) => string;
    systemUnreachable:          (params?: Record<string, string | number>) => string;
    systemUnresponsive:         (params?: Record<string, string | number>) => string;
    unknown:                    (params?: Record<string, string | number>) => string;
    vendor:                     (params?: Record<string, string | number>) => string;
    model:                      (params?: Record<string, string | number>) => string;
    ip:                         (params?: Record<string, string | number>) => string;
    server:                     (params?: Record<string, string | number>) => string;
    os:                         (params?: Record<string, string | number>) => string;
    version:                    (params?: Record<string, string | number>) => string;
    voiceCommands:              VoiceCommands;
    viewingOutdatedReport:      (params?: Record<string, string | number>) => string;
}

export interface CommonAccount {
    created:   NoSettings;
    activated: Docs;
}

export interface Docs {
    title: (params?: Record<string, string | number>) => string;
}

export interface NoSettings {
    title:   (params?: Record<string, string | number>) => string;
    message: (params?: Record<string, string | number>) => string;
}

export interface CameraLinks {
    copyActiveText:  (params?: Record<string, string | number>) => string;
    copyDefaultText: (params?: Record<string, string | number>) => string;
    copyToClipboard: (params?: Record<string, string | number>) => string;
    highStream:      (params?: Record<string, string | number>) => string;
    lowStream:       (params?: Record<string, string | number>) => string;
    transcoding:     (params?: Record<string, string | number>) => string;
    unknown:         (params?: Record<string, string | number>) => string;
}

export interface CameraStates {
    error:               (params?: Record<string, string | number>) => string;
    errorLoading:        (params?: Record<string, string | number>) => string;
    flashOrWebmRequired: (params?: Record<string, string | number>) => string;
    flashRequired:       (params?: Record<string, string | number>) => string;
    iOSVideoTooLarge:    (params?: Record<string, string | number>) => string;
    ieNoWebm:            (params?: Record<string, string | number>) => string;
    ieWin10:             (params?: Record<string, string | number>) => string;
    noArmSupport:        (params?: Record<string, string | number>) => string;
    noData:              (params?: Record<string, string | number>) => string;
    noFormat:            (params?: Record<string, string | number>) => string;
    offline:             (params?: Record<string, string | number>) => string;
    ubuntuNX:            (params?: Record<string, string | number>) => string;
    unauthorized:        (params?: Record<string, string | number>) => string;
}

export interface Intervals {
    yearS:   (params?: Record<string, string | number>) => string;
    monthS:  (params?: Record<string, string | number>) => string;
    weekS:   (params?: Record<string, string | number>) => string;
    dayS:    (params?: Record<string, string | number>) => string;
    hourS:   (params?: Record<string, string | number>) => string;
    minuteS: (params?: Record<string, string | number>) => string;
}

export interface RecordingModes {
    always:       (params?: Record<string, string | number>) => string;
    motion:       (params?: Record<string, string | number>) => string;
    motionLowRes: (params?: Record<string, string | number>) => string;
}

export interface Resolution {
    various: (params?: Record<string, string | number>) => string;
    auto:    (params?: Record<string, string | number>) => string;
    best:    (params?: Record<string, string | number>) => string;
    high:    (params?: Record<string, string | number>) => string;
    medium:  (params?: Record<string, string | number>) => string;
    low:     (params?: Record<string, string | number>) => string;
}

export interface VoiceCommands {
    "clear search":         (params?: Record<string, string | number>) => string;
    "collapse all servers": (params?: Record<string, string | number>) => string;
    "collapse server":      (params?: Record<string, string | number>) => string;
    "expand all servers":   (params?: Record<string, string | number>) => string;
    "expand server":        (params?: Record<string, string | number>) => string;
    help:                   (params?: Record<string, string | number>) => string;
    live:                   (params?: Record<string, string | number>) => string;
    pause:                  (params?: Record<string, string | number>) => string;
    play:                   (params?: Record<string, string | number>) => string;
    search:                 (params?: Record<string, string | number>) => string;
    "stop listening":       (params?: Record<string, string | number>) => string;
    view:                   (params?: Record<string, string | number>) => string;
}

export interface Components {
    widgets: Widgets;
}

export interface Widgets {
    lastUpdated: (params?: Record<string, string | number>) => string;
    updatingIn:  (params?: Record<string, string | number>) => string;
}

export interface Dashboard {
    dashboardEditEnabled: (params?: Record<string, string | number>) => string;
    dashboardLocked:      (params?: Record<string, string | number>) => string;
    unlockToUpload:       (params?: Record<string, string | number>) => string;
    unlockToMove:         (params?: Record<string, string | number>) => string;
}

export interface DevConsole {
    create: (params?: Record<string, string | number>) => string;
}

export interface DeviceTypes {
    "All Device Types": (params?: Record<string, string | number>) => string;
    servers:            (params?: Record<string, string | number>) => string;
    cameras:            (params?: Record<string, string | number>) => string;
    storages:           (params?: Record<string, string | number>) => string;
    networkInterfaces:  (params?: Record<string, string | number>) => string;
}

export interface Dialogs {
    twoFa:             DialogsTwoFa;
    addUser:           AddUser;
    buttons:           Buttons;
    cloudStorage:      DialogsCloudStorage;
    changeStorage:     ChangeStorage;
    merge:             DialogsMerge;
    message:           DialogsMessage;
    removeSystem:      RemoveSystem;
    renewAuth:         RemoveSystem;
    systemGroups:      DialogsSystemGroups;
    transferOwnership: TransferOwnership;
    titles:            DialogsTitles;
    tooltips:          Tooltips;
    twoFactor:         DialogsTwoFactor;
}

export interface AddUser {
    alreadyExists: (params?: Record<string, string | number>) => string;
}

export interface Buttons {
    cancel:           (params?: Record<string, string | number>) => string;
    createAccount:    (params?: Record<string, string | number>) => string;
    delete:           (params?: Record<string, string | number>) => string;
    deleteAccount:    (params?: Record<string, string | number>) => string;
    disable:          (params?: Record<string, string | number>) => string;
    enable:           (params?: Record<string, string | number>) => string;
    download:         (params?: Record<string, string | number>) => string;
    logoutAuthorised: (params?: Record<string, string | number>) => string;
    ok:               (params?: Record<string, string | number>) => string;
    remove:           (params?: Record<string, string | number>) => string;
    stayAs:           (params?: Record<string, string | number>) => string;
    stayLoggedIn:     (params?: Record<string, string | number>) => string;
}

export interface ChangeStorage {
    support: (params?: Record<string, string | number>) => string;
}

export interface DialogsCloudStorage {
    title:                 (params?: Record<string, string | number>) => string;
    enableStorage:         (params?: Record<string, string | number>) => string;
    otherSystem:           (params?: Record<string, string | number>) => string;
    initial:               (params?: Record<string, string | number>) => string;
    available:             (params?: Record<string, string | number>) => string;
    camera:                (params?: Record<string, string | number>) => string;
    cameras:               (params?: Record<string, string | number>) => string;
    actions:               Actions;
    usageLabels:           UsageLabels;
    information:           Information;
    remove:                EnableCloudStorage;
    activationError:       NoSettings;
    systemDisconnectError: NoSettings;
    moveCloudStorage:      MoveCloudStorage;
    enableCloudStorage:    EnableCloudStorage;
    noOtherSystemsError:   NoOtherSystemsError;
}

export interface Actions {
    activate: Activate;
    modify:   Activate;
    move:     Activate;
    delete:   Activate;
}

export interface Activate {
    heading: (params?: Record<string, string | number>) => string;
    action:  (params?: Record<string, string | number>) => string;
    success: (params?: Record<string, string | number>) => string;
}

export interface EnableCloudStorage {
    success:     (params?: Record<string, string | number>) => string;
    errorPrefix: (params?: Record<string, string | number>) => string;
}

export interface Information {
    update:  Delete;
    migrate: Delete;
    delete:  Delete;
}

export interface Delete {
    title: (params?: Record<string, string | number>) => string;
    body:  (params?: Record<string, string | number>) => string;
}

export interface MoveCloudStorage {
    title:       (params?: Record<string, string | number>) => string;
    success:     (params?: Record<string, string | number>) => string;
    errorPrefix: (params?: Record<string, string | number>) => string;
    notFound:    (params?: Record<string, string | number>) => string;
    status:      MoveCloudStorageStatus;
}

export interface MoveCloudStorageStatus {
    offline: (params?: Record<string, string | number>) => string;
}

export interface NoOtherSystemsError {
    message: (params?: Record<string, string | number>) => string;
}

export interface UsageLabels {
    currentRecordings: (params?: Record<string, string | number>) => string;
    whenFullyUsed:     (params?: Record<string, string | number>) => string;
    amountUsed:        (params?: Record<string, string | number>) => string;
    archiveFrom:       (params?: Record<string, string | number>) => string;
    recordingBitrate:  (params?: Record<string, string | number>) => string;
    delayFromLive:     (params?: Record<string, string | number>) => string;
}

export interface DialogsMerge {
    adminPasswordTitle:                 (params?: Record<string, string | number>) => string;
    adminPasswordWrong:                 (params?: Record<string, string | number>) => string;
    knownBothSystemsConnectedToCloud:   (params?: Record<string, string | number>) => string;
    unknownBothSystemsConnectedToCloud: (params?: Record<string, string | number>) => string;
    checking:                           (params?: Record<string, string | number>) => string;
    cloud:                              (params?: Record<string, string | number>) => string;
    commonText:                         (params?: Record<string, string | number>) => string;
    connectToCloud:                     (params?: Record<string, string | number>) => string;
    failedToFindAnySystemHeader:        (params?: Record<string, string | number>) => string;
    failedToFindAnySystem:              (params?: Record<string, string | number>) => string;
    differentOwners:                    (params?: Record<string, string | number>) => string;
    duplicateServers:                   (params?: Record<string, string | number>) => string;
    enterSystemAddressTitle:            (params?: Record<string, string | number>) => string;
    latestBuild:                        (params?: Record<string, string | number>) => string;
    mergeConfirmation:                  (params?: Record<string, string | number>) => string;
    mergeFailedTitle:                   (params?: Record<string, string | number>) => string;
    mergeSuccess:                       (params?: Record<string, string | number>) => string;
    mergeSystemsTitle:                  (params?: Record<string, string | number>) => string;
    noServerFound:                      (params?: Record<string, string | number>) => string;
    newSystemDisplayName:               (params?: Record<string, string | number>) => string;
    otherSystem:                        (params?: Record<string, string | number>) => string;
    ownerCanMergeText:                  (params?: Record<string, string | number>) => string;
    passwordRequired:                   (params?: Record<string, string | number>) => string;
    passwordWrong:                      (params?: Record<string, string | number>) => string;
    primaryCannotMerge:                 (params?: Record<string, string | number>) => string;
    primarySystemOffline:               (params?: Record<string, string | number>) => string;
    primarySystemUnavailable:           (params?: Record<string, string | number>) => string;
    recommendSupport:                   (params?: Record<string, string | number>) => string;
    restError:                          RESTError;
    secondaryCannotMerge:               (params?: Record<string, string | number>) => string;
    secondarySystemUnavailable:         (params?: Record<string, string | number>) => string;
    serverAtUrl:                        (params?: Record<string, string | number>) => string;
    serverNotAvailable:                 (params?: Record<string, string | number>) => string;
    serverNotYours:                     (params?: Record<string, string | number>) => string;
    serverVersionOld:                   (params?: Record<string, string | number>) => string;
    serverVersionNew:                   (params?: Record<string, string | number>) => string;
    systemOffline:                      (params?: Record<string, string | number>) => string;
    systemOfflineUrl:                   (params?: Record<string, string | number>) => string;
    systemsIncompatible:                (params?: Record<string, string | number>) => string;
    systemVersionOld:                   (params?: Record<string, string | number>) => string;
    systemVersionNew:                   (params?: Record<string, string | number>) => string;
    systemVersionsNotMatch:             (params?: Record<string, string | number>) => string;
    targetSystemBoundToCloud:           (params?: Record<string, string | number>) => string;
    urlEmpty:                           (params?: Record<string, string | number>) => string;
    urlNotValid:                        (params?: Record<string, string | number>) => string;
    unknownError:                       (params?: Record<string, string | number>) => string;
    warning:                            (params?: Record<string, string | number>) => string;
    update:                             (params?: Record<string, string | number>) => string;
}

export interface RESTError {
    duplicateServer:      (params?: Record<string, string | number>) => string;
    useCloudMerge:        (params?: Record<string, string | number>) => string;
    differentCloudOwners: (params?: Record<string, string | number>) => string;
}

export interface DialogsMessage {
    system2faEnabled:        (params?: Record<string, string | number>) => string;
    system2faDisabled:       (params?: Record<string, string | number>) => string;
    storageSettingsSaved:    (params?: Record<string, string | number>) => string;
    storageSettingsNotSaved: (params?: Record<string, string | number>) => string;
    settingsSaved:           (params?: Record<string, string | number>) => string;
    settingsNotSaved:        (params?: Record<string, string | number>) => string;
    logLevelsSaved:          (params?: Record<string, string | number>) => string;
    logLevelsNotSaved:       (params?: Record<string, string | number>) => string;
    failedToSend:            (params?: Record<string, string | number>) => string;
    placeholders:            Placeholders;
    sent:                    (params?: Record<string, string | number>) => string;
    subject:                 Subject;
    title:                   MessageTitle;
    twoFactor:               MessageTwoFactor;
}

export interface Placeholders {
    feedback: (params?: Record<string, string | number>) => string;
}

export interface Subject {
    integration_feedback: (params?: Record<string, string | number>) => string;
    ipvd_feedback_device: (params?: Record<string, string | number>) => string;
    ipvd_feedback_page:   (params?: Record<string, string | number>) => string;
    sales_inquiry:        (params?: Record<string, string | number>) => string;
    technical_inquiry:    (params?: Record<string, string | number>) => string;
}

export interface MessageTitle {
    integration:          (params?: Record<string, string | number>) => string;
    ipvd_feedback_device: (params?: Record<string, string | number>) => string;
    ipvd_feedback_page:   (params?: Record<string, string | number>) => string;
}

export interface MessageTwoFactor {
    required:     (params?: Record<string, string | number>) => string;
    configure:    (params?: Record<string, string | number>) => string;
    accountLink:  (params?: Record<string, string | number>) => string;
    codeRequired: (params?: Record<string, string | number>) => string;
}

export interface RemoveSystem {
    action:  (params?: Record<string, string | number>) => string;
    message: (params?: Record<string, string | number>) => string;
    title:   (params?: Record<string, string | number>) => string;
}

export interface DialogsSystemGroups {
    createdInRoot:         (params?: Record<string, string | number>) => string;
    createdInCurrentGroup: (params?: Record<string, string | number>) => string;
}

export interface DialogsTitles {
    error:                  (params?: Record<string, string | number>) => string;
    success:                (params?: Record<string, string | number>) => string;
    changeAccount:          (params?: Record<string, string | number>) => string;
    changePasswordFor:      (params?: Record<string, string | number>) => string;
    deleteUser:             (params?: Record<string, string | number>) => string;
    failedLoginTo:          (params?: Record<string, string | number>) => string;
    loggedFromOtherAccount: (params?: Record<string, string | number>) => string;
    noClientDetected:       (params?: Record<string, string | number>) => string;
    removeUser:             (params?: Record<string, string | number>) => string;
    serversDetach:          (params?: Record<string, string | number>) => string;
    serversReset:           (params?: Record<string, string | number>) => string;
    serversRestart:         (params?: Record<string, string | number>) => string;
}

export interface Tooltips {
    deleteAccount: (params?: Record<string, string | number>) => string;
}

export interface TransferOwnership {
    userNotFound: (params?: Record<string, string | number>) => string;
}

export interface DialogsTwoFa {
    wizardWarning:      (params?: Record<string, string | number>) => string;
    wizardWarningDescr: (params?: Record<string, string | number>) => string;
    installAuthApp:     (params?: Record<string, string | number>) => string;
    nowEnabled:         (params?: Record<string, string | number>) => string;
}

export interface DialogsTwoFactor {
    action:            (params?: Record<string, string | number>) => string;
    message:           (params?: Record<string, string | number>) => string;
    title:             (params?: Record<string, string | number>) => string;
    wizardWarning:     (params?: Record<string, string | number>) => string;
    unsupportedSystem: (params?: Record<string, string | number>) => string;
}

export interface Downloads {
    appTypes:      AppTypes;
    groups:        DownloadsGroups;
    mobile:        Mobile;
    platforms:     Platforms;
    releasesTypes: ReleasesTypes;
}

export interface AppTypes {
    bundle:           (params?: Record<string, string | number>) => string;
    camera_sdk:       (params?: Record<string, string | number>) => string;
    client:           (params?: Record<string, string | number>) => string;
    metadata_sdk:     (params?: Record<string, string | number>) => string;
    package:          (params?: Record<string, string | number>) => string;
    server:           (params?: Record<string, string | number>) => string;
    servertool:       (params?: Record<string, string | number>) => string;
    storage_sdk:      (params?: Record<string, string | number>) => string;
    video_source_sdk: (params?: Record<string, string | number>) => string;
}

export interface DownloadsGroups {
    android:   ArmClass;
    arm:       ArmClass;
    ios:       ArmClass;
    linux:     ArmClass;
    mac:       MAC;
    macos:     MAC;
    sdk:       ArmClass;
    windows:   MAC;
    universal: MAC;
}

export interface ArmClass {
    label:      (params?: Record<string, string | number>) => string;
    shortLabel: (params?: Record<string, string | number>) => string;
}

export interface MAC {
    label: (params?: Record<string, string | number>) => string;
}

export interface Mobile {
    android: MobileAndroid;
    ios:     MobileAndroid;
}

export interface MobileAndroid {
    link: (params?: Record<string, string | number>) => string;
}

export interface Platforms {
    bananapi:    (params?: Record<string, string | number>) => string;
    bpi:         (params?: Record<string, string | number>) => string;
    linux64:     (params?: Record<string, string | number>) => string;
    linux_arm32: (params?: Record<string, string | number>) => string;
    linux_arm64: (params?: Record<string, string | number>) => string;
    mac:         (params?: Record<string, string | number>) => string;
    rpi:         (params?: Record<string, string | number>) => string;
    universal:   (params?: Record<string, string | number>) => string;
    win64:       (params?: Record<string, string | number>) => string;
}

export interface ReleasesTypes {
    beta:     (params?: Record<string, string | number>) => string;
    betas:    (params?: Record<string, string | number>) => string;
    patch:    (params?: Record<string, string | number>) => string;
    patches:  (params?: Record<string, string | number>) => string;
    rc:       (params?: Record<string, string | number>) => string;
    release:  (params?: Record<string, string | number>) => string;
    releases: (params?: Record<string, string | number>) => string;
}

export interface HeaderLabels {
    healthReportForSystem: (params?: Record<string, string | number>) => string;
}

export interface HealthMonitor {
    groups: HealthMonitorGroups;
    keys:   Keys;
}

export interface HealthMonitorGroups {
    info:         (params?: Record<string, string | number>) => string;
    availability: (params?: Record<string, string | number>) => string;
    load:         (params?: Record<string, string | number>) => string;
    activity:     (params?: Record<string, string | number>) => string;
}

export interface Keys {
    name:                    (params?: Record<string, string | number>) => string;
    servers:                 (params?: Record<string, string | number>) => string;
    cameras:                 (params?: Record<string, string | number>) => string;
    storages:                (params?: Record<string, string | number>) => string;
    users:                   (params?: Record<string, string | number>) => string;
    version:                 (params?: Record<string, string | number>) => string;
    cloudSystemId:           (params?: Record<string, string | number>) => string;
    status:                  (params?: Record<string, string | number>) => string;
    offlineEvents:           (params?: Record<string, string | number>) => string;
    uptimeS:                 (params?: Record<string, string | number>) => string;
    cpuUsageP:               (params?: Record<string, string | number>) => string;
    serverCpuUsageP:         (params?: Record<string, string | number>) => string;
    ramUsageB:               (params?: Record<string, string | number>) => string;
    ramUsageP:               (params?: Record<string, string | number>) => string;
    serverRamUsageB:         (params?: Record<string, string | number>) => string;
    serverRamUsageP:         (params?: Record<string, string | number>) => string;
    threads:                 (params?: Record<string, string | number>) => string;
    decodingThreads:         (params?: Record<string, string | number>) => string;
    decodingSpeed3s:         (params?: Record<string, string | number>) => string;
    encodingThreads:         (params?: Record<string, string | number>) => string;
    encodingSpeed3s:         (params?: Record<string, string | number>) => string;
    primaryStreams:          (params?: Record<string, string | number>) => string;
    secondaryStreams:        (params?: Record<string, string | number>) => string;
    incomingConnections:     (params?: Record<string, string | number>) => string;
    outgoingConnections:     (params?: Record<string, string | number>) => string;
    logLevel:                (params?: Record<string, string | number>) => string;
    publicIp:                (params?: Record<string, string | number>) => string;
    os:                      (params?: Record<string, string | number>) => string;
    osTime:                  (params?: Record<string, string | number>) => string;
    vmsTime:                 (params?: Record<string, string | number>) => string;
    cpu:                     (params?: Record<string, string | number>) => string;
    cpuCores:                (params?: Record<string, string | number>) => string;
    ramB:                    (params?: Record<string, string | number>) => string;
    guidConflict:            (params?: Record<string, string | number>) => string;
    vmsTimeChanged24h:       (params?: Record<string, string | number>) => string;
    transactionsPerSecond1m: (params?: Record<string, string | number>) => string;
    actionsTriggered1m:      (params?: Record<string, string | number>) => string;
    apiCalls1m:              (params?: Record<string, string | number>) => string;
    thumbnails1m:            (params?: Record<string, string | number>) => string;
    activePlugins:           (params?: Record<string, string | number>) => string;
}

export interface LanguageI18NStaticTypesIntegration {
    "Access Control":    (params?: Record<string, string | number>) => string;
    Connector:           (params?: Record<string, string | number>) => string;
    "Data Analytics":    (params?: Record<string, string | number>) => string;
    Drone:               (params?: Record<string, string | number>) => string;
    "Health Monitor":    (params?: Record<string, string | number>) => string;
    Storage:             (params?: Record<string, string | number>) => string;
    myIntegrationsLabel: (params?: Record<string, string | number>) => string;
    requirements:        (params?: Record<string, string | number>) => string;
    testedVersionLabel:  (params?: Record<string, string | number>) => string;
    testedVersionsLabel: (params?: Record<string, string | number>) => string;
}

export interface Ipvd {
    "Advanced PTZ cameras":          (params?: Record<string, string | number>) => string;
    "Cameras supporting H.265":      (params?: Record<string, string | number>) => string;
    "Cameras with 2-way audio":      (params?: Record<string, string | number>) => string;
    "Extra high resolution cameras": (params?: Record<string, string | number>) => string;
    "Fisheye Cameras":               (params?: Record<string, string | number>) => string;
    "I / O modules":                 (params?: Record<string, string | number>) => string;
    "Multisensor Cameras":           (params?: Record<string, string | number>) => string;
    "PTZ cameras":                   (params?: Record<string, string | number>) => string;
    camera:                          (params?: Record<string, string | number>) => string;
    count:                           (params?: Record<string, string | number>) => string;
    dvr:                             (params?: Record<string, string | number>) => string;
    encoder:                         (params?: Record<string, string | number>) => string;
    hardwareType:                    (params?: Record<string, string | number>) => string;
    isAnalyticsSupported:            (params?: Record<string, string | number>) => string;
    isAptzSupported:                 (params?: Record<string, string | number>) => string;
    isAptzSupportedShort:            (params?: Record<string, string | number>) => string;
    isAudioSupported:                (params?: Record<string, string | number>) => string;
    isDualStreamingSupported:        (params?: Record<string, string | number>) => string;
    isFisheye:                       (params?: Record<string, string | number>) => string;
    isH265:                          (params?: Record<string, string | number>) => string;
    isIoSupported:                   (params?: Record<string, string | number>) => string;
    isMdSupported:                   (params?: Record<string, string | number>) => string;
    isMultiSensor:                   (params?: Record<string, string | number>) => string;
    isPtzSupported:                  (params?: Record<string, string | number>) => string;
    isTwAudioSupported:              (params?: Record<string, string | number>) => string;
    maxFps:                          (params?: Record<string, string | number>) => string;
    maxResolution:                   (params?: Record<string, string | number>) => string;
    model:                           (params?: Record<string, string | number>) => string;
    multiSensorCamera:               (params?: Record<string, string | number>) => string;
    other:                           (params?: Record<string, string | number>) => string;
    primaryCodec:                    (params?: Record<string, string | number>) => string;
    resolutionArea:                  (params?: Record<string, string | number>) => string;
    sndResolution:                   (params?: Record<string, string | number>) => string;
    vendor:                          (params?: Record<string, string | number>) => string;
    sortKey:                         (params?: Record<string, string | number>) => string;
}

export interface IpvdFeedback {
    request: (params?: Record<string, string | number>) => string;
}

export interface License {
    licenseTypeTitles: LicenseTypeTitles;
    info:              Info;
    messages:          Messages;
}

export interface Info {
    type:           (params?: Record<string, string | number>) => string;
    channels:       (params?: Record<string, string | number>) => string;
    server:         (params?: Record<string, string | number>) => string;
    hwid:           (params?: Record<string, string | number>) => string;
    status:         (params?: Record<string, string | number>) => string;
    expires:        (params?: Record<string, string | number>) => string;
    deactivations:  (params?: Record<string, string | number>) => string;
    online:         (params?: Record<string, string | number>) => string;
    error:          (params?: Record<string, string | number>) => string;
    expired:        (params?: Record<string, string | number>) => string;
    ok:             (params?: Record<string, string | number>) => string;
    nvrError:       (params?: Record<string, string | number>) => string;
    serverNotFound: (params?: Record<string, string | number>) => string;
}

export interface LicenseTypeTitles {
    Time:             (params?: Record<string, string | number>) => string;
    Trial:            (params?: Record<string, string | number>) => string;
    Professional:     (params?: Record<string, string | number>) => string;
    Analog:           (params?: Record<string, string | number>) => string;
    Edge:             (params?: Record<string, string | number>) => string;
    VMAX:             (params?: Record<string, string | number>) => string;
    "Video Wall":     (params?: Record<string, string | number>) => string;
    "Analog Encoder": (params?: Record<string, string | number>) => string;
    Starter:          (params?: Record<string, string | number>) => string;
    "IO Module":      (params?: Record<string, string | number>) => string;
    Bridge:           (params?: Record<string, string | number>) => string;
    NVR:              (params?: Record<string, string | number>) => string;
    Invalid:          (params?: Record<string, string | number>) => string;
}

export interface Messages {
    required:       (params?: Record<string, string | number>) => string;
    activated:      (params?: Record<string, string | number>) => string;
    inuse:          (params?: Record<string, string | number>) => string;
    trialActivated: (params?: Record<string, string | number>) => string;
}

export interface Maintenance {
    description: (params?: Record<string, string | number>) => string;
}

export interface Menu {
    titles: MenuTitles;
}

export interface MenuTitles {
    cameras:              (params?: Record<string, string | number>) => string;
    systemAdministration: (params?: Record<string, string | number>) => string;
    general:              (params?: Record<string, string | number>) => string;
    licenses:             (params?: Record<string, string | number>) => string;
    users:                (params?: Record<string, string | number>) => string;
    servers:              (params?: Record<string, string | number>) => string;
    alerts:               (params?: Record<string, string | number>) => string;
    systems:              (params?: Record<string, string | number>) => string;
    storages:             (params?: Record<string, string | number>) => string;
    networkInterfaces:    (params?: Record<string, string | number>) => string;
    graphs:               (params?: Record<string, string | number>) => string;
    logs:                 (params?: Record<string, string | number>) => string;
}

export interface MetaDefaults {
    default:         MetaDefaultsDefault;
    "/systems":      Docs;
    "/integrations": Docs;
    "/docs":         Docs;
    "/ipvd":         Docs;
}

export interface MetaDefaultsDefault {
    site_name:   (params?: Record<string, string | number>) => string;
    title:       (params?: Record<string, string | number>) => string;
    description: (params?: Record<string, string | number>) => string;
}

export interface MetaDefaultsWebadmin {
    default:       MetaDefaultsWebadminDefault;
    "/settings":   Docs;
    "/view":       Docs;
    "/health":     Docs;
    "/monitoring": Docs;
}

export interface MetaDefaultsWebadminDefault {
    site_name: (params?: Record<string, string | number>) => string;
    title:     (params?: Record<string, string | number>) => string;
}

export interface Monitoring {
    unavailable: (params?: Record<string, string | number>) => string;
}

export interface PageDescriptions {
    integrations:       (params?: Record<string, string | number>) => string;
    integrationSetup:   (params?: Record<string, string | number>) => string;
    integrationDetails: (params?: Record<string, string | number>) => string;
}

export interface PageTitles {
    about:                  (params?: Record<string, string | number>) => string;
    account:                (params?: Record<string, string | number>) => string;
    activate:               (params?: Record<string, string | number>) => string;
    activateCode:           (params?: Record<string, string | number>) => string;
    activateSuccess:        (params?: Record<string, string | number>) => string;
    articleTitle:           (params?: Record<string, string | number>) => string;
    auth:                   (params?: Record<string, string | number>) => string;
    changePassword:         (params?: Record<string, string | number>) => string;
    debug:                  (params?: Record<string, string | number>) => string;
    default:                (params?: Record<string, string | number>) => string;
    download:               (params?: Record<string, string | number>) => string;
    downloadPlatform:       (params?: Record<string, string | number>) => string;
    failedToAccess2FA:      (params?: Record<string, string | number>) => string;
    failedToAccessSystem:   (params?: Record<string, string | number>) => string;
    failedToAccessCamera:   (params?: Record<string, string | number>) => string;
    information:            (params?: Record<string, string | number>) => string;
    integrations:           (params?: Record<string, string | number>) => string;
    login:                  (params?: Record<string, string | number>) => string;
    monitoring:             (params?: Record<string, string | number>) => string;
    pageNotFound:           (params?: Record<string, string | number>) => string;
    register:               (params?: Record<string, string | number>) => string;
    registerSuccess:        (params?: Record<string, string | number>) => string;
    restorePassword:        (params?: Record<string, string | number>) => string;
    restorePasswordSuccess: (params?: Record<string, string | number>) => string;
    supportedDevices:       (params?: Record<string, string | number>) => string;
    system:                 (params?: Record<string, string | number>) => string;
    systemShare:            (params?: Record<string, string | number>) => string;
    systems:                (params?: Record<string, string | number>) => string;
    template:               (params?: Record<string, string | number>) => string;
    templateWebadmin:       (params?: Record<string, string | number>) => string;
    view:                   (params?: Record<string, string | number>) => string;
    apiTool:                (params?: Record<string, string | number>) => string;
    security:               (params?: Record<string, string | number>) => string;
    twofaRequired:          (params?: Record<string, string | number>) => string;
}

export interface Pages {
    developers:      Developers;
    downloadHistory: DownloadHistory;
    health:          Health;
}

export interface Developers {
    menuNodeContainsErrors: (params?: Record<string, string | number>) => string;
}

export interface DownloadHistory {
    published: (params?: Record<string, string | number>) => string;
}

export interface Health {
    importedSystem: (params?: Record<string, string | number>) => string;
    importedTime:   (params?: Record<string, string | number>) => string;
}

export interface PasswordRequirements {
    common:           (params?: Record<string, string | number>) => string;
    commonMessage:    (params?: Record<string, string | number>) => string;
    fair:             (params?: Record<string, string | number>) => string;
    fairMessage:      (params?: Record<string, string | number>) => string;
    good:             (params?: Record<string, string | number>) => string;
    minLength:        (params?: Record<string, string | number>) => string;
    minLengthMessage: (params?: Record<string, string | number>) => string;
    missingMessage:   (params?: Record<string, string | number>) => string;
    required:         (params?: Record<string, string | number>) => string;
    requiredMessage:  (params?: Record<string, string | number>) => string;
    strongMessage:    (params?: Record<string, string | number>) => string;
    weak:             (params?: Record<string, string | number>) => string;
    weakMessage:      (params?: Record<string, string | number>) => string;
}

export interface PlaceholderTexts {
    noSettings:               NoSettings;
    merge:                    PlaceholderTextsMerge;
    server:                   NoSettings;
    noSystemApiTool:          NoSettings;
    systemLoadFailureApiTool: NoSettings;
}

export interface PlaceholderTextsMerge {
    title:   (params?: Record<string, string | number>) => string;
    message: MergeMessage;
}

export interface MergeMessage {
    dependingOnSize: (params?: Record<string, string | number>) => string;
    untilFinished:   (params?: Record<string, string | number>) => string;
    whenFinished:    (params?: Record<string, string | number>) => string;
}

export interface PrivacyPolicy {
    integration: (params?: Record<string, string | number>) => string;
    ipvd:        (params?: Record<string, string | number>) => string;
}

export interface Redirects {
    message:        (params?: Record<string, string | number>) => string;
    defaultMessage: (params?: Record<string, string | number>) => string;
    cloudLinks:     CloudLinks;
}

export interface CloudLinks {
    supportLink: (params?: Record<string, string | number>) => string;
}

export interface Registration {
    agreement: (params?: Record<string, string | number>) => string;
}

export interface Ribbon {
    beingMerged:         BeingMerged;
    finishingMerge:      (params?: Record<string, string | number>) => string;
    integration:         RibbonIntegration;
    newVersionAvailable: NewVersionAvailable;
    systemOffline:       (params?: Record<string, string | number>) => string;
    systemsMerging:      (params?: Record<string, string | number>) => string;
}

export interface BeingMerged {
    to:      (params?: Record<string, string | number>) => string;
    mayTake: (params?: Record<string, string | number>) => string;
}

export interface RibbonIntegration {
    accept:          (params?: Record<string, string | number>) => string;
    reject:          (params?: Record<string, string | number>) => string;
    backToEditText:  (params?: Record<string, string | number>) => string;
    previewRibbon:   (params?: Record<string, string | number>) => string;
    publishedRibbon: (params?: Record<string, string | number>) => string;
}

export interface NewVersionAvailable {
    notification:  (params?: Record<string, string | number>) => string;
    installButton: (params?: Record<string, string | number>) => string;
}

export interface Search {
    Any:               (params?: Record<string, string | number>) => string;
    Search:            (params?: Record<string, string | number>) => string;
    analytics:         (params?: Record<string, string | number>) => string;
    analyticsSelected: (params?: Record<string, string | number>) => string;
    appliedFilters:    (params?: Record<string, string | number>) => string;
    hardwareType:      (params?: Record<string, string | number>) => string;
    hardwareTypes:     (params?: Record<string, string | number>) => string;
    minResolution:     (params?: Record<string, string | number>) => string;
    search_ipvd:       (params?: Record<string, string | number>) => string;
    selected:          (params?: Record<string, string | number>) => string;
    vendor:            (params?: Record<string, string | number>) => string;
    vendors:           (params?: Record<string, string | number>) => string;
    resultsFound:      (params?: Record<string, string | number>) => string;
    noMatches:         (params?: Record<string, string | number>) => string;
    userNotFound:      (params?: Record<string, string | number>) => string;
}

export interface Security {
    twoFa: SecurityTwoFa;
}

export interface SecurityTwoFa {
    twoFADescription:     (params?: Record<string, string | number>) => string;
    systemsRemainder:     (params?: Record<string, string | number>) => string;
    v5Warning:            (params?: Record<string, string | number>) => string;
    v5WarningExplanation: (params?: Record<string, string | number>) => string;
    disableWarning:       (params?: Record<string, string | number>) => string;
}

export interface ServerDocumentation {
    accessibleAt: (params?: Record<string, string | number>) => string;
}

export interface ServerTabTitles {
    View:        (params?: Record<string, string | number>) => string;
    Settings:    (params?: Record<string, string | number>) => string;
    Information: (params?: Record<string, string | number>) => string;
    Bookmarks:   (params?: Record<string, string | number>) => string;
    Layouts:     (params?: Record<string, string | number>) => string;
    Monitoring:  (params?: Record<string, string | number>) => string;
}

export interface Servers {
    analyticsDataPolicyError: (params?: Record<string, string | number>) => string;
    autoRefresh:              (params?: Record<string, string | number>) => string;
    beginDetach:              (params?: Record<string, string | number>) => string;
    beginReset:               (params?: Record<string, string | number>) => string;
    detachSystemFailed:       (params?: Record<string, string | number>) => string;
    detachSystemSuccess:      (params?: Record<string, string | number>) => string;
    portWarning:              (params?: Record<string, string | number>) => string;
    refresh:                  (params?: Record<string, string | number>) => string;
    refreshing:               (params?: Record<string, string | number>) => string;
    removeMediaserverFailed:  (params?: Record<string, string | number>) => string;
    resetFailed:              (params?: Record<string, string | number>) => string;
    resetSuccessful:          (params?: Record<string, string | number>) => string;
    restartFailed:            (params?: Record<string, string | number>) => string;
    restartSuccessful:        (params?: Record<string, string | number>) => string;
    serverOffline:            (params?: Record<string, string | number>) => string;
    servers:                  (params?: Record<string, string | number>) => string;
    status:                   ServersStatus;
    successRename:            (params?: Record<string, string | number>) => string;
}

export interface ServersStatus {
    checking:   (params?: Record<string, string | number>) => string;
    offline:    (params?: Record<string, string | number>) => string;
    resetting:  (params?: Record<string, string | number>) => string;
    restarting: (params?: Record<string, string | number>) => string;
}

export interface SetupWizard {
    title:            SetupWizardTitle;
    advancedSettings: AdvancedSettings;
}

export interface AdvancedSettings {
    cameraSettingsOptimization: (params?: Record<string, string | number>) => string;
    autoDiscoveryEnabled:       (params?: Record<string, string | number>) => string;
    statisticsAllowed:          (params?: Record<string, string | number>) => string;
    standard:                   (params?: Record<string, string | number>) => string;
    high:                       (params?: Record<string, string | number>) => string;
}

export interface SetupWizardTitle {
    advanced:     (params?: Record<string, string | number>) => string;
    brokenSystem: (params?: Record<string, string | number>) => string;
    initFailure:  (params?: Record<string, string | number>) => string;
    localFailure: (params?: Record<string, string | number>) => string;
    localLogin:   (params?: Record<string, string | number>) => string;
    localSuccess: (params?: Record<string, string | number>) => string;
    merge:        (params?: Record<string, string | number>) => string;
    mergeFailure: (params?: Record<string, string | number>) => string;
    mergeProcess: (params?: Record<string, string | number>) => string;
    start:        (params?: Record<string, string | number>) => string;
    systemName:   (params?: Record<string, string | number>) => string;
}

export interface Storage {
    reindexingDone:             ReindexingDone;
    modes:                      Modes;
    alreadyUsed:                (params?: Record<string, string | number>) => string;
    deleteExternalStorage:      (params?: Record<string, string | number>) => string;
    failed:                     (params?: Record<string, string | number>) => string;
    invalidPath:                (params?: Record<string, string | number>) => string;
    stillHasArchivesPreWarning: (params?: Record<string, string | number>) => string;
    stillHasArchives:           (params?: Record<string, string | number>) => string;
    storageDeleted:             (params?: Record<string, string | number>) => string;
    failedRemove:               (params?: Record<string, string | number>) => string;
    reservedTooSmallTooltip:    (params?: Record<string, string | number>) => string;
    reservedSystemTooltip:      (params?: Record<string, string | number>) => string;
    serverOffline:              (params?: Record<string, string | number>) => string;
    success:                    (params?: Record<string, string | number>) => string;
    urlPlaceholder:             (params?: Record<string, string | number>) => string;
}

export interface Modes {
    main:         (params?: Record<string, string | number>) => string;
    backup:       (params?: Record<string, string | number>) => string;
    notInUse:     (params?: Record<string, string | number>) => string;
    reserved:     (params?: Record<string, string | number>) => string;
    inaccessible: (params?: Record<string, string | number>) => string;
    changing:     (params?: Record<string, string | number>) => string;
    disabled:     (params?: Record<string, string | number>) => string;
}

export interface ReindexingDone {
    mainSuccess:   (params?: Record<string, string | number>) => string;
    backupSuccess: (params?: Record<string, string | number>) => string;
    mainFailed:    (params?: Record<string, string | number>) => string;
    backupFailed:  (params?: Record<string, string | number>) => string;
}

export interface LanguageI18NStaticTypesSystem {
    connected:            (params?: Record<string, string | number>) => string;
    not_connected:        (params?: Record<string, string | number>) => string;
    MERGE_FINISHES:       (params?: Record<string, string | number>) => string;
    mergeUnknownName:     (params?: Record<string, string | number>) => string;
    mySystemSearch:       (params?: Record<string, string | number>) => string;
    settings:             Settings;
    status:               SystemStatus;
    users:                Users;
    yourSystem:           (params?: Record<string, string | number>) => string;
    loggers:              Loggers;
    loggerDropdownLabel:  (params?: Record<string, string | number>) => string;
    storageToolTips:      StorageToolTips;
    ownerWantsToTransfer: (params?: Record<string, string | number>) => string;
    transferTo:           (params?: Record<string, string | number>) => string;
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
    text: (params?: Record<string, string | number>) => string;
    help: (params?: Record<string, string | number>) => string;
}

export interface Settings {
    notAbleToLoadStorageInfo: (params?: Record<string, string | number>) => string;
    notAbleToLoadSecurity:    (params?: Record<string, string | number>) => string;
    notAbleToLoadSystem:      (params?: Record<string, string | number>) => string;
    sessionLimitDuration:     SessionLimitDuration;
    warningMessages:          WarningMessages;
}

export interface SessionLimitDuration {
    hours:   (params?: Record<string, string | number>) => string;
    minutes: (params?: Record<string, string | number>) => string;
    days:    (params?: Record<string, string | number>) => string;
}

export interface WarningMessages {
    videoEncryption: (params?: Record<string, string | number>) => string;
}

export interface SystemStatus {
    offline:     (params?: Record<string, string | number>) => string;
    unavailable: (params?: Record<string, string | number>) => string;
}

export interface StorageToolTips {
    local:   (params?: Record<string, string | number>) => string;
    usb:     (params?: Record<string, string | number>) => string;
    network: (params?: Record<string, string | number>) => string;
    smb:     (params?: Record<string, string | number>) => string;
    cloud:   (params?: Record<string, string | number>) => string;
}

export interface Users {
    cloudDelete: (params?: Record<string, string | number>) => string;
    localDelete: (params?: Record<string, string | number>) => string;
}

export interface LanguageI18NStaticTypesSystemGroups {
    root:               (params?: Record<string, string | number>) => string;
    groupCount:         (params?: Record<string, string | number>) => string;
    systemCount:        (params?: Record<string, string | number>) => string;
    connectionLost:     (params?: Record<string, string | number>) => string;
    connectionRestored: (params?: Record<string, string | number>) => string;
    couldNotReconnect:  (params?: Record<string, string | number>) => string;
    noConnection:       (params?: Record<string, string | number>) => string;
    groupAlreadyIn:     (params?: Record<string, string | number>) => string;
    systemAlreadyIn:    (params?: Record<string, string | number>) => string;
    addGroupToSelf:     (params?: Record<string, string | number>) => string;
    errorMsg:           ErrorMsg;
}

export interface ErrorMsg {
    "You can only delete groups that you own":                     (params?: Record<string, string | number>) => string;
    "You can only move systems that you own.":                     (params?: Record<string, string | number>) => string;
    "You can only move systems into groups that you own.":         (params?: Record<string, string | number>) => string;
    "You cannot add a group to itself":                            (params?: Record<string, string | number>) => string;
    "You cannot add a parent group to its child.":                 (params?: Record<string, string | number>) => string;
    "You can only move groups that you own.":                      (params?: Record<string, string | number>) => string;
    "Adding src group to dst group would create a cycle in tree.": (params?: Record<string, string | number>) => string;
    "User does not exist in group":                                (params?: Record<string, string | number>) => string;
}

export interface SystemStatuses {
    activated:    (params?: Record<string, string | number>) => string;
    incompatible: (params?: Record<string, string | number>) => string;
    merging:      (params?: Record<string, string | number>) => string;
    notActivated: (params?: Record<string, string | number>) => string;
    offline:      (params?: Record<string, string | number>) => string;
    online:       (params?: Record<string, string | number>) => string;
    unavailable:  (params?: Record<string, string | number>) => string;
}

export interface TableHeaders {
    type:   (params?: Record<string, string | number>) => string;
    server: (params?: Record<string, string | number>) => string;
    alert:  (params?: Record<string, string | number>) => string;
}

export interface ToastMessage {
    cloudUnavailable:             (params?: Record<string, string | number>) => string;
    nameFail:                     (params?: Record<string, string | number>) => string;
    noConnection:                 (params?: Record<string, string | number>) => string;
    noInternet:                   (params?: Record<string, string | number>) => string;
    userChangesFail:              (params?: Record<string, string | number>) => string;
    reviewAccepted:               (params?: Record<string, string | number>) => string;
    system:                       ToastMessageSystem;
    webAdminCloudCredentialError: (params?: Record<string, string | number>) => string;
    twoFaRequired:                (params?: Record<string, string | number>) => string;
    loggingIn:                    (params?: Record<string, string | number>) => string;
    sessionRenewed:               (params?: Record<string, string | number>) => string;
    failedToUpdateSession:        (params?: Record<string, string | number>) => string;
}

export interface ToastMessageSystem {
    deleted:      Deleted;
    disconnected: Deleted;
    cloudConnect: CloudConnect;
    merge:        CloudConnect;
    rename:       Deleted;
}

export interface CloudConnect {
    success: (params?: Record<string, string | number>) => string;
    failed:  (params?: Record<string, string | number>) => string;
}

export interface Deleted {
    success: (params?: Record<string, string | number>) => string;
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
    Sun:       (params?: Record<string, string | number>) => string;
    Mon:       (params?: Record<string, string | number>) => string;
    Tue:       (params?: Record<string, string | number>) => string;
    Wed:       (params?: Record<string, string | number>) => string;
    Thu:       (params?: Record<string, string | number>) => string;
    Fri:       (params?: Record<string, string | number>) => string;
    Sat:       (params?: Record<string, string | number>) => string;
    Sunday:    (params?: Record<string, string | number>) => string;
    Monday:    (params?: Record<string, string | number>) => string;
    Tuesday:   (params?: Record<string, string | number>) => string;
    Wednesday: (params?: Record<string, string | number>) => string;
    Thursday:  (params?: Record<string, string | number>) => string;
    Friday:    (params?: Record<string, string | number>) => string;
    Saturday:  (params?: Record<string, string | number>) => string;
}

export interface MonthNames {
    Jan:       (params?: Record<string, string | number>) => string;
    Feb:       (params?: Record<string, string | number>) => string;
    Mar:       (params?: Record<string, string | number>) => string;
    Apr:       (params?: Record<string, string | number>) => string;
    May:       (params?: Record<string, string | number>) => string;
    Jun:       (params?: Record<string, string | number>) => string;
    Jul:       (params?: Record<string, string | number>) => string;
    Aug:       (params?: Record<string, string | number>) => string;
    Sep:       (params?: Record<string, string | number>) => string;
    Oct:       (params?: Record<string, string | number>) => string;
    Nov:       (params?: Record<string, string | number>) => string;
    Dec:       (params?: Record<string, string | number>) => string;
    January:   (params?: Record<string, string | number>) => string;
    February:  (params?: Record<string, string | number>) => string;
    March:     (params?: Record<string, string | number>) => string;
    April:     (params?: Record<string, string | number>) => string;
    June:      (params?: Record<string, string | number>) => string;
    July:      (params?: Record<string, string | number>) => string;
    August:    (params?: Record<string, string | number>) => string;
    September: (params?: Record<string, string | number>) => string;
    October:   (params?: Record<string, string | number>) => string;
    November:  (params?: Record<string, string | number>) => string;
    December:  (params?: Record<string, string | number>) => string;
}

export interface TimeNames {
    a:  (params?: Record<string, string | number>) => string;
    p:  (params?: Record<string, string | number>) => string;
    am: (params?: Record<string, string | number>) => string;
    pm: (params?: Record<string, string | number>) => string;
    A:  (params?: Record<string, string | number>) => string;
    P:  (params?: Record<string, string | number>) => string;
    AM: (params?: Record<string, string | number>) => string;
    PM: (params?: Record<string, string | number>) => string;
}
