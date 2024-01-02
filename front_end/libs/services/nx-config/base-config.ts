/* eslint-disable camelcase */
// To parse this data:
//
//   import { Convert, BaseConfig } from "./file";
//
//   const baseConfig = Convert.toBaseConfig(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type { MultiSelectItem } from '@components/dropdowns/multi-select/multi-select.component.types';
import type { SearchTag } from '@components/search/search.component.types';
import { BaseRole, PredefinedLegacyRole } from '@services/system-user.types';

import type { MenuNode } from '../menus.service.types';

export interface OauthStoreFlags {
    bindData: string;
    code: string;
    verify2fa: string;
}

export interface ThemeConfig {
    default: string;
    dark: string;
    light: string;
}

export interface MobileLinks {
    android_application_link: string;
    ios_application_link: string;
}

export interface TosConfig {
    hourly: number;
    daily: number;
}

export interface BaseConfig {
    preloadedAccount: unknown;
    preloadedTranslation: Object;
    accountDropdown: AccountDropdown[];
    accountDropdownStaff: AccountDropdown[];
    commonPasswordsList?: { [key: string]: number };
    capabilities?: Capabilities;
    viewsDir?: string;
    customization: string;
    previewPath?: string;
    featureFlags: FeatureFlags;
    featureFlagStrings: Record<FeatureFlagType, FeatureFlagType>;
    // TODO Need to double check this type, object in config but accessed as array in integrations.component.ts
    // This is on line 107
    integration: Integration | any;
    ipvd: Ipvd;
    isInIframe: boolean;
    isLocal: boolean;
    isDarkTheme: boolean;
    landing: Landing;
    licenseServer: string;
    downloads: Downloads;
    newSystem: boolean;
    system: System;
    tosConfig: TosConfig; // This will not be a cms setting, but we need it here so that qa can test faster.
    clientProtocol: string;
    timelineDebugData: boolean;
    cloudCapabilities: CloudCapabilities;
    cloudName: string;
    cloudHost: string;
    cloudSystemId: string;
    localSystemId: string;
    localServerId: string;
    company: Company;
    dynamicMenus: MenusStructure;
    docMenuMap: DocMenuMap;
    licenseTypes: LicenseTypes;
    googleTagManagerId: string;
    trialLicenseKey: string;
    pushConfig: {};
    testedOperatingSystems: Record<string, string>;
    trafficRelayHost: string;
    vmsName: string;
    accessRoles: AccessRoles;
    allowDebugMode: boolean;
    serverDocumentation: ServerDocumentation;
    defaultLanguage: string;
    supportedLanguages: string[];
    headerHeight: number;
    moreResultsHeight: number;
    browserNotSupported: boolean;
    metaDefaults: Record<string, Record<string, string>>;
    // loggersConfig: LoggersConfig;
    webadminRoutesLookup: RouteCheckTuple[];
    cloudMonitoring: CloudMonitoring;
    themeConfig: ThemeConfig;
    mobileLinks: MobileLinks;
    offlineCameraPollingInterval: number;
}

export type RouteCheckTuple = [
    lookup?: RegExp,
    replacementUrl?: string,
    additionalMessage?: string,
];

export interface Developers {
    landing: {
        adminLink: string;
    };
}

export interface Landing {
    description: string;
}

export interface FooterItem {
    name: string;
    url: string;
    newWindow: boolean;
    enabled: boolean;
}

export interface MenuStructure {
    title: string;
    description: string;
    nodes: MenuNode[];
}

export interface MenusStructure {
    [menuName: string]: MenuStructure;
}

export interface DocMenuMap {
    [key: string]: {
        [key: string]: string;
    };
}

export interface LicenseType {
    name: string;
    title: string;
    deactivationsAllowed: number;
}

export type LicenseTypes = LicenseType[];

export interface Capabilities {
    cloudMerge?: boolean;
    cloudStorageEnabled?: boolean;
    feedbackEnabled: boolean;
    healthMonitor?: boolean;
    // TODO One of these  two is incorrect, need to find out which one
    healthMonitoring?: boolean;
    integrationStore: boolean;
    publicDownloads: boolean;
    publicReleases: boolean;
}

// Feature flags go here
const FeatureFlagKeys = [
    'customClients',
    'landingPage',
    'bookmarks',
    'kbInstantSearch',
    'dashboard',
    'archiveSelection',
    'systemGroups',
    'channelPartnersReports',
    'readonlyAPIs',
    'dashboardRedirect',
    'cloudOwnershipTransfer',
    'viewCameraDetails',
    'themesEnabled',
    'themeGenerator',
    'mergeRefactorEnabled',
    'paginatorExperimental',
    'newHeader',
    'cloudStorage',
    'fullStory',
    'layouts',
    'layoutsNonChrome',
    'layoutsEditable',
    'layoutsHelper',
    'layoutsServers',
    'layoutsWebpages',
    'layoutsTour',
    'layoutsRightMenu',
    'layoutsTimeline',
    'layoutsPtz',
    'layoutsDemo',
    'layoutsItemStatus',
    'layoutsChangeResolution',
    'layoutsItemChangeResolution',
    'layoutsAuthorizeCamera',
    'channelPartners',
    'requestCaching',
    'requestCachingRemoteSync',
    'useJsonRpc',
    'restCookieLogin',
    'cookieBanner',
    'crossTabSyncEnabled',
    'useAuthenticationInterceptor',
    'layoutsIoDevices',
    'layoutsDeviceSettings',
    'layoutsUnsavedSync',
    'layoutsCrossSystem',
    'layoutsCrossSystemEditing',
    'layoutsRemoveItemDialog',
    'enableAnimations',
    'tosRequired',
    'use500ErrorInterceptor',
] as const;

export type FeatureFlagType = (typeof FeatureFlagKeys)[number];

export const FeatureFlagStrings = FeatureFlagKeys.reduce((obj, key) => {
    obj[key] = key;
    return obj;
}, {}) as Record<FeatureFlagType, FeatureFlagType>;

export type FeatureFlags = {
    [key in FeatureFlagType]?: boolean;
};

export type APIDocType = 'main' | 'legacy' | 'deprecated';
export interface APIDocURL {
    main: string;
    legacy: string;
    deprecated: string;
}

export interface ManifestItem {
    name: string;
    sections: {
        name?: string;
        scheme: string;
    }[];
}

export type MenuManifest = ManifestItem[];

export interface AccessRoles {
    adminAccess: string[];
    unshare: string;
    default: string;
    custom: string;
    editUserPermissionFlag: string;
    editCameraPermissionFlag: string;
    exportPermissionFlag: string;
    globalAdminPermissionFlag: string;
    globalCustomUserPermission: string;
    globalViewBookmarksPermission: string;
    allMediaPermissionFlag: string;
    viewArchivesPermissionFlag: string;
    customPermission: BaseRole;
    predefinedRoles: PredefinedLegacyRole[];
    order: string[];
}

export interface AccountDropdown {
    name: string;
    route: string;
    newWindow: boolean;
}

export interface CloudCapabilities {
    developersEnabled: boolean;
    feedbackEnabled: boolean;
    healthMonitor?: string;
    healthMonitorCacheTimeout?: number;
    // TODO Need to find out which are valid
    healthMonitoring?: string;
    integrationStore: boolean;
    publicDownloads: boolean;
    publicReleases: boolean;
    cloudStorageEnabled: boolean;
    cloudStorageSize: number;
    customClientsEnabled: boolean;
    alexaIntegrationEnabled: boolean;
    bookmarksEnabled: boolean;
}

export interface CloudMonitoring {
    fullStory: string;
    isFullStoryActive: boolean;
}

export interface Company {
    copyrightYear: string;
    link?: string;
    links: Links;
    name: string;
}

export interface Links {
    privacy?: string;
    support?: string;
    website: string;
}

export interface Downloads {
    mobile: Mobile[];
    groups: Groups;
    platformMatch: PlatformMatch;
    downloadsPlatformNameOverride?: { [key: string]: string };
}

export interface Groups {
    windows: Arm;
    linux: Arm;
    macos: Arm;
    arm: Arm;
    sdk: Arm;
}

export interface Arm {
    name: string;
    os: string;
    appTypes: string[];
}

export interface ServerDocumentation {
    windowsPath: string;
    defaultPath: string;
    tableHeaders: string[];
}

export interface Mobile {
    name: string;
    os: string;
}

export interface PlatformMatch {
    unix: string;
    linux: string;
    mac: string;
    windows: string;
    arm: string;
    skd: string;
}

export interface Integration {
    adminLink: string;
    defaultPlatformNames: DefaultPlatformNames;
    embedInfo: EmbedInfo;
    filter: Filter;
    myTagId: string;
    seoPageDesc: string;
}

export interface DefaultPlatformNames {
    'arm-64-file': string;
    'linux-x64-file': string;
    'macos-file': string;
    'arm-32-file': string;
    'windows-x64-file': string;
    downloadableInstructions: string;
}

export interface EmbedInfo {
    vimeo: Vimeo;
    youtube: Vimeo;
}

export interface Vimeo {
    link: string;
    regex: string;
}

export interface Filter {
    items: string;
    limitation: string;
}

export interface Ipvd {
    pagerMaxSizeMedium: number;
    pagerMaxSize: number;
    firmwaresToShow: number;
    analyticsToShow: number;
    sortSupportedDevicesByPopularity: string;
    supportedResolutions: DropdownItem<string>[];
    supportedHardwareTypes: MultiSelectItem[];
    searchTags: SearchTag[];
    vendorsShown: number;
    showAnalyticsEvents?: boolean;
}

export interface Layout {
    table: Table;
    tableLarge: Table;
}

export interface Table {
    rows: number;
}

export interface Permissions {
    canViewRelease: string;
}

export interface Servers {
    checkStatusTimeout: number;
    minLoaderTime: number;
    port: Port;
    status: ServersStatus;
    errors: ServerError;
}

export interface Port {
    max: number;
    min: number;
    restrictedMax: number;
}

export interface ServerError {
    invalidParameter: string;
    oldSessionErrorId: string;
    unauthorized: string;
    badRequest: string;
    userPasswordRequired: string;
    vmsRequestFailure: string;
    wrongSessionToken: string;
}

export interface ServersStatus {
    online: string;
    offline: string;
    restarting: string;
    resetting: string;
    checking: string;
    mismatchedcertificate: string;
}

export interface System {
    auditTime: number;
    flags: Flags;
    name: string;
    status: SystemStatus;
    version?: {
        major: number;
        minor: number;
    }; // Only used for webadmin
}

export interface Flags {
    newSystem: string;
}

export interface SystemStatus {
    online: string;
    default: Default;
    offline: Default;
    unavailable: Default;
    master: string;
    slave: string;
}

export interface Default {
    style: string;
}

export interface Setting {
    type: 'object' | 'checkbox' | 'text' | 'number' | 'password' | 'static';
    alert?: string;
    setupWizard?: boolean;
    hiddenInAdvanced?: boolean;
    label?: string;
}

export interface SettingsConfig {
    additionalLocalFsTypes: Setting;
    arecontRtspEnabled: Setting;
    auditTrailPeriodDays: Setting;
    auditTrailEnabled: Setting;
    autoDiscoveryEnabled: Setting;
    autoDiscoveryResponseEnabled: Setting;
    autoUpdateThumbnails: Setting;
    backupNewCamerasByDefault: Setting;
    backupQualities: Setting;
    backupSettings: Setting;
    cameraSettingsOptimization: Setting;
    clientStatisticsSettingsUrl: Setting;
    clientUpdateSettings: Setting;
    cloudAccountName: Setting;
    cloudAuthKey: Setting;
    cloudConnectRelayingEnabled: Setting;
    cloudConnectRelayingOverSslForced: Setting;
    cloudConnectUdpHolePunchingEnabled: Setting;
    cloudHost: Setting;
    cloudNotificationsLanguage: Setting;
    cloudSystemID: Setting;
    crossdomainEnabled: Setting;
    currentStorageEncryptionKey: Setting;
    customReleaseListUrl: Setting;
    defaultExportVideoCodec: Setting;
    defaultVideoCodec: Setting;
    disabledVendors: Setting;
    downloaderPeers: Setting;
    ec2AliveUpdateIntervalSec: Setting;
    ec2ConnectionKeepAliveTimeoutSec: Setting;
    ec2KeepAliveProbeCount: Setting;
    emailFrom: Setting;
    emailSignature: Setting;
    emailSupportEmail: Setting;
    enableEdgeRecording: Setting;
    eventLogPeriodDays: Setting;
    exposeDeviceCredentials: Setting;
    exposeServerEndpoints: Setting;
    forceAnalyticsDbStoragePermissions: Setting;
    forceLiveCacheForPrimaryStream: Setting;
    frameOptionsHeader: Setting;
    insecureDeprecatedApiEnabled: Setting;
    insecureDeprecatedApiInUseEnabled: Setting;
    installedPersistentUpdateStorage: Setting;
    installedUpdateInformation: Setting;
    keepIoPortStateIntactOnInitialization: Setting;
    lastMergeMasterId: Setting;
    lastMergeSlaveId: Setting;
    ldapAdminDn: Setting;
    ldapAdminPassword: Setting;
    ldapPasswordExpirationPeriodMs: Setting;
    ldapSearchBase: Setting;
    ldapSearchFilter: Setting;
    ldapSearchTimeoutS: Setting;
    ldapUri: Setting;
    licenseServer: Setting;
    localSystemId: Setting;
    lowQualityScreenVideoCodec: Setting;
    maxDifferenceBetweenSynchronizedAndInternetTime: Setting;
    maxDifferenceBetweenSynchronizedAndLocalTimeMs: Setting;
    maxEventLogRecords: Setting;
    maxHttpTranscodingSessions: Setting;
    maxP2pAllClientsSizeBytes: Setting;
    maxP2pQueueSizeBytes: Setting;
    maxRecordQueueSizeBytes: Setting;
    maxRecordQueueSizeElements: Setting;
    maxRemoteArchiveSynchronizationThreads: Setting;
    maxRtpRetryCount: Setting;
    maxRtspConnectDurationSec: Setting;
    maxSceneItems: Setting;
    maxVirtualCameraArchiveSynchronizationThreads: Setting;
    mediaBufferSizeForAudioOnlyDeviceKb: Setting;
    mediaBufferSizeKb: Setting;
    metadataStorageChangePolicy: Setting;
    newSystem: Setting;
    osTimeChangeCheckPeriodMs: Setting;
    primaryTimeServer: Setting;
    proxyConnectTimeoutSec: Setting;
    remoteSessionTimeoutS: Setting;
    remoteSessionUpdateS: Setting;
    resourceFileUri: Setting;
    rtpTimeoutMs: Setting;
    securityForPowerUsers: Setting;
    sequentialFlirOnvifSearcherEnabled: Setting;
    serverDiscoveryPingTimeoutSec: Setting;
    sessionLimitMinutes: Setting;
    sessionsLimit: Setting;
    sessionsLimitPerUser: Setting;
    showMouseTimelinePreview: Setting;
    showServersInTreeForNonAdmins: Setting;
    smtpConnectionType: Setting;
    smtpHost: Setting;
    smtpName: Setting;
    smtpPassword: Setting;
    smtpPort: Setting;
    smtpSimple: Setting;
    smtpTimeout: Setting;
    smtpUser: Setting;
    specificFeatures: Setting;
    statisticsAllowed: Setting;
    statisticsReportLastNumber: Setting;
    statisticsReportLastTime: Setting;
    statisticsReportLastVersion: Setting;
    statisticsReportServerApi: Setting;
    statisticsReportTimeCycle: Setting;
    statisticsReportUpdateDelay: Setting;
    storageEncryption: Setting;
    supportedOrigins: Setting;
    syncTimeEpsilon: Setting;
    syncTimeExchangePeriod: Setting;
    system2faEnabled: Setting;
    systemId: Setting;
    systemName: Setting;
    systemNameForId: Setting;
    takeCameraOwnershipWithoutLock: Setting;
    targetPersistentUpdateStorage: Setting;
    targetUpdateInformation: Setting;
    timeSynchronizationEnabled: Setting;
    trafficEncryptionForced: Setting;
    updateNotificationsEnabled: Setting;
    updateStatus: Setting;
    upnpPortMappingEnabled: Setting;
    useCloudServiceToSendEmail: Setting;
    useHttpsOnlyForCameras: Setting;
    useTextEmailFormat: Setting;
    useWindowsEmailLineFeed: Setting;
    videoTrafficEncryptionForced: Setting;
    watermarkSettings: Setting;
    webSocketEnabled: Setting;

    // Other Settings
    defaultMotionMask: string;
}
