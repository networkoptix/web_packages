/* eslint-disable camelcase */
// To parse this data:
//
//   import { Convert, BaseConfig } from "./file";
//
//   const baseConfig = Convert.toBaseConfig(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import type {
    MultiSelectItem
} from '@components/dropdowns/multi-select/multi-select.component.types';
import type { SearchTag } from '@components/search/search.component.types';

import type { MenuNode } from '../menus.service.types';

export interface OauthStoreFlags {
    code: string;
    verify2fa: string;
}

export interface ThemeConfig {
    default: string;
    dark: string;
    light: string;
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
    browserNotSupported: boolean;
    metaDefaults: Record<string, Record<string, string>>;
    // loggersConfig: LoggersConfig;
    webadminRoutesLookup: RouteCheckTuple[];
    cloudMonitoring: CloudMonitoring;
    themeConfig: ThemeConfig;
}

export type RouteCheckTuple = [lookup?: RegExp, replacementUrl?: string, additionalMessage?: string];

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
    'readonlyAPIs',
    'dashboardRedirect',
    'cloudOwnershipTransfer',
    'viewCameraDetails',
    'themesEnabled',
    'usersWithGroups',
    'paginatorExperimental',
    'newHeader',
    'cloudStorage',
    'logRocket',
    'fullStory',
    'layouts',
    'layoutsEditable',
    'layoutsHelper',
    'layoutsServers',
    'layoutsWebpages',
    'layoutsTour',
    'layoutsRightMenu',
    'layoutsTimeline',
    'layoutsPtz',
    'layoutsDemo',
    'channelPartners',
    'requestCaching',
    'requestCachingRemoteSync'
] as const;

export type FeatureFlagType = typeof FeatureFlagKeys[number];

export const FeatureFlagStrings = FeatureFlagKeys.reduce((obj, key) => {
    obj[key] = key;
    return obj;
}, {}) as Record<FeatureFlagType, FeatureFlagType>;

export type FeatureFlags = {
    [key in FeatureFlagType]?: boolean
};

export type APIDocType = 'main' | 'legacy' | 'deprecated';
export interface APIDocURL {
    main: string;
    legacy: string;
    deprecated: string;
}

export interface APIToolSettings {
    manualSystemChangeCooldown: number;
    apiTypes: {
        main: APIType;
        deprecated: APIType;
    };
    defaultManifest: MenuManifest;
    legacyManifest : MenuManifest;
}

export interface ManifestItem {
    name: string;
    sections: {
        name?: string;
        scheme: string;
    }[];
}

export type MenuManifest = ManifestItem[];

interface APIType {
    type: string;
    displayName: string;
}

export interface AccessRoles {
    adminAccess: string[];
    unshare: string;
    default: string;
    custom: string;
    editUserPermissionFlag: string;
    editCameraPermissionFlag: string;
    globalAdminPermissionFlag: string;
    allMediaPermissionFlag: string;
    viewArchivesPermissionFlag: string;
    customPermission: CustomPermission;
    predefinedRoles: PredefinedRole[];
    order: string[];
}

export interface AccountDropdown {
    name: string;
    route: string;
    newWindow: boolean;
}

export interface CameraSettings {
    sensitivityColors: string[];
}

export interface CustomPermission {
    name: string;
    permissions: string;
}

export interface PredefinedRole {
    isOwner?: boolean;
    name: string;
    permissions: string;
}

export interface Animations {
    carouselImage: CarouselImage;
}

export interface CarouselImage {
    enter: string;
    leave: string;
}

export interface ClientMode {
    beta: boolean;
    debug: boolean;
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
    isLogRocketActive: boolean;
    logRocket: string;
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

export interface CredentialsValidation {
    emailRegex: string;
    passwordRequirements: PasswordRequirements;
}

export interface PasswordRequirements {
    maxLength: number;
    minClassesCount: number;
    minLength: number;
    requiredRegex: string;
    strongClassesCount: number;
}

export interface Debug {
    chunksOnTimeline: boolean;
}

export interface Dialogs {
    message: Message;
}

export interface Message {
    subjects: Subjects;
    type: Type;
}

export interface Subjects {
    integration: string[];
    ipvd_feedback_page: string[];
    ipvd_feedback_device: string[];
}

export interface Type {
    ipvd_page: string;
    ipvd_device: string;
    integration: string;
    unknown: string;
}

export interface Downloads {
    mobile: Mobile[];
    groups: Groups;
    platformMatch: PlatformMatch;
}

export interface Groups {
    windows: Arm;
    linux: Arm;
    macos: Arm;
    arm: Arm;
    sdk: Arm;
}

export interface ServerDocumentation {
    windowsPath: string;
    defaultPath: string;
    tableHeaders: string[];
}

export interface Arm {
    name: string;
    os: string;
    appTypes: string[];
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

export interface HealthMonitoring {
    staleReportTimeout: number;
    valueFormats: ValueFormats;
    classFormats: ClassFormats;
}

export interface ClassFormats {
    resource: string;
    longText: string;
    shortText: string;
    text: string;
    number: string;
    GB: string;
    KB: string;
    MB: string;
    TB: string;
    '%': string;
    'Mpix/s': string;
    'MB/s': string;
    'Mbit/s': string;
    'KB/s': string;
    'Kbit/s': string;
    'Tr/s': string;
    unset: string;
}

export interface ValueFormats {
    '%': Empty;
    TB: LivingstoneSouthernWhiteFacedOwl;
    GB: LivingstoneSouthernWhiteFacedOwl;
    MB: LivingstoneSouthernWhiteFacedOwl;
    KB: LivingstoneSouthernWhiteFacedOwl;
    B: LivingstoneSouthernWhiteFacedOwl;
    GBps: Bps;
    MBps: Bps;
    KBps: Bps;
    Bps: Bps;
    Gbps: Bps;
    Mbps: Bps;
    kbps: Bps;
    bps: Bps;
    'Transactions/s': Empty;
    'TB/s': LivingstoneSouthernWhiteFacedOwl;
    'GB/s': LivingstoneSouthernWhiteFacedOwl;
    'MB/s': LivingstoneSouthernWhiteFacedOwl;
    'KB/s': LivingstoneSouthernWhiteFacedOwl;
    'B/s': LivingstoneSouthernWhiteFacedOwl;
    Tbit: LivingstoneSouthernWhiteFacedOwl;
    Gbit: LivingstoneSouthernWhiteFacedOwl;
    Mbit: LivingstoneSouthernWhiteFacedOwl;
    Kbit: LivingstoneSouthernWhiteFacedOwl;
    bit: LivingstoneSouthernWhiteFacedOwl;
    'Tbit/s': LivingstoneSouthernWhiteFacedOwl;
    'Gbit/s': LivingstoneSouthernWhiteFacedOwl;
    'Mbit/s': LivingstoneSouthernWhiteFacedOwl;
    'Kbit/s': LivingstoneSouthernWhiteFacedOwl;
    'bit/s': LivingstoneSouthernWhiteFacedOwl;
    'TPix/s': LivingstoneSouthernWhiteFacedOwl;
    'GPix/s': LivingstoneSouthernWhiteFacedOwl;
    'MPix/s': LivingstoneSouthernWhiteFacedOwl;
    'KPix/s': LivingstoneSouthernWhiteFacedOwl;
    'Tr/s': LivingstoneSouthernWhiteFacedOwl;
}

export interface Empty {
    multiplier: number;
    decimals: number;
}

export interface LivingstoneSouthernWhiteFacedOwl {
    multiplier: number;
}

export interface Bps {
    display: string;
    multiplier: number;
    decimals: number;
}

export interface Icons {
    default: string;
    platforms: Platform[];
    backgrounds: string;
    dir: string;
    dirButtons: string;
    dirTextButtons: string;
    dirHeader: string;
    dirLayouts: string;
    dirNonStandard: string;
    dirNonStandardView: string;
    dirPagePlaceholder: string;
    dirSectionPlaceholder: string;
    dirDevCapabilities: string;
    dirLandingIcons: string;
    dirCloudStorage: string;
    dirConfirmations: string;
}

export interface Images {
    dir: string;
    dirDevelopers: string;
    dirDevelopersDevtools: string;
    dirLanding: string;
    dirLandingGraphic: string;
    dirHeader: string;
    dirTheme: string;
}

export interface Platform {
    name: string;
    src: string;
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

export interface Menus {
    customization: Customization;
    account: Account;
    systemHealth: SystemHealth;
    systemSettings: SystemSettings;
    systemMonitoring: SystemMonitoring;
}

export interface Customization {
    id: string;
    baseUrl: string;
    icon: string;
    partners: Partners;
    buttons: Buttons;
}

export interface Partners {
    id: string;
    icon?: string;
    path: string;
}

export interface Account {
    baseUrl: string;
    icon: string;
    settings: Path;
    password: Path;
    security: Path;
}

export interface Path {
    id: string;
    path: string;
}

export interface SystemHealth {
    baseUrl: string;
    alerts: Admin;
}

export interface SystemMonitoring {
    baseUrl: string;
    graphs: Admin;
    logs: Admin;
}

export interface SystemSettings {
    baseUrl: string;
    admin: Admin;
    cloudStorage: Admin;
    users: Admin;
    servers: Server;
    general: Admin;
    licenses: Admin;
    buttons: Buttons;
    cameras: Cameras;
}

export interface Admin {
    id: string;
    icon?: string;
    path: string;
}

export interface Server extends Admin {
    statusIcons: {
        offline: string;
        online: string;
    };
}

export interface Cameras extends Admin {
    statusIcons: {
        archive: string;
        offline: string;
        recording: string;
        scheduled: string;
        unauthorized: string;
        online: string;
    };
}

export interface Buttons {
    id: string;
}

export interface Meta {
    viewport: Viewport;
}

export interface Viewport {
    default: string;
    desktopLayout: string;
}

export interface Permissions {
    canViewRelease: string;
}

export interface Redirect {
    authorised: string;
    unauthorised: string;
    page404: string;
    paths: string[];
}

export interface Search {
    debounceShortTime: number;
    debounceTime: number;
    maxLength: number;
    minSystems: number;
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

export interface Toast {
    success: string;
    warning: string;
    danger: string;
    info: string;
}

export interface Webclient {
    chunksToCheckFatal: number;
    disableVolume: boolean;
    endOfArchiveTime: number;
    flashChromelessDebugPath: string;
    flashChromelessPath: string;
    hlsLoadingTimeout: number;
    leftPanelPreviewHeight: number;
    maxCrashCount: number;
    nativeTimeout: number;
    playerReadyTimeout: number;
    reloadInterval: number;
    resetDisplayedTextTimer: number;
    // staticResources: string;
    skipFramesRenderingTimeline: boolean;
    updateArchiveStateTimeout: number;
    updateArchiveRecordsTimeout: number;
    useServerTime: boolean;
    useSystemTime: boolean;
}

export interface Setting {
    type: string;
    alert?: string;
    setupWizard?: boolean;
    hiddenInAdvanced?: boolean;
    label?: string;
}

export interface SettingsConfig {
    auditTrailEnabled: Setting;
    cameraSettingsOptimization: Setting;
    cloudConnectUdpHolePunchingEnabled: Setting;
    defaultMotionMask: string;
    disabledVendors: Setting;
    ec2AliveUpdateIntervalSec: Setting;
    ec2ConnectionKeepAliveTimeoutSec: Setting;
    ec2KeepAliveProbeCount:Setting;
    emailFrom: Setting;
    emailSignature: Setting;
    emailSupportEmail: Setting;
    ldapAdminDn: Setting;
    ldapAdminPassword: Setting;
    ldapSearchBase: Setting;
    ldapSearchFilter: Setting;
    ldapUri: Setting;
    autoDiscoveryEnabled: Setting;
    smtpConnectionType: Setting;
    smtpHost: Setting;
    smtpPort:Setting;
    smtpSimple: Setting;
    smtpTimeout:Setting;
    smtpPassword: Setting;
    smtpUser: Setting;
    updateNotificationsEnabled: Setting;
    arecontRtspEnabled: Setting;
    backupNewCamerasByDefault: Setting;
    statisticsAllowed: Setting;
    backupQualities: Setting;
    serverDiscoveryPingTimeoutSec:Setting;
    cloudAccountName: Setting;
    cloudHost: Setting;
    cloudAuthKey: Setting;
    cloudSystemID: Setting;
    systemName: Setting;
    licenseServer: Setting;
    newSystem: Setting;
    proxyConnectTimeoutSec:Setting;
    crossdomainEnabled: Setting;
    maxRtspConnectDurationSec: Setting;
    statisticsReportLastNumber: Setting;
    statisticsReportLastTime: Setting;
    statisticsReportLastVersion: Setting;
    statisticsReportServerApi: Setting;
    statisticsReportTimeCycle:Setting;
    localSystemId: Setting;
    systemId: Setting;
    systemNameForId: Setting;
    takeCameraOwnershipWithoutLock: Setting;
    upnpPortMappingEnabled: Setting;
    trafficEncryptionForced: Setting;
    videoTrafficEncryptionForced: Setting;
    updateStatus: Setting;
    watermarkSettings: Setting;
    timeSynchronizationEnabled: Setting;
    primaryTimeServer: Setting;
    osTimeChangeCheckPeriodMs:Setting;
    syncTimeExchangePeriod:Setting;
    syncTimeEpsilon:Setting;
    maxVirtualCameraArchiveSynchronizationThreads:Setting;
    maxEventLogRecords:Setting;
    forceLiveCacheForPrimaryStream: Setting;
}

// export interface LoggersConfig {
//     EC2_TRAN: string,
//     HTTP: string,
//     HWID: string,
//     MAIN: string,
//     PERMISSIONS: string
// }

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
// export class Convert {
//     public static toBaseConfig(json: string): BaseConfig {
//         return cast(JSON.parse(json), r('BaseConfig'));
//     }

//     public static baseConfigToJson(value: BaseConfig): string {
//         return JSON.stringify(uncast(value, r('BaseConfig')), null, 2);
//     }
// }

// function invalidValue(typ: unknown, val: unknown): never {
//     throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`);
// }

// function jsonToJSProps(typ: unknown): unknown {
//     if (typ.jsonToJS === undefined) {
//         var map: unknown = {};
//         typ.props.forEach((p: unknown) => map[p.json] = { key: p.js, typ: p.typ });
//         typ.jsonToJS = map;
//     }
//     return typ.jsonToJS;
// }

// function jsToJSONProps(typ: unknown): unknown {
//     if (typ.jsToJSON === undefined) {
//         var map: unknown = {};
//         typ.props.forEach((p: unknown) => map[p.js] = { key: p.json, typ: p.typ });
//         typ.jsToJSON = map;
//     }
//     return typ.jsToJSON;
// }

// function transform(val: unknown, typ: unknown, getProps: unknown): unknown {
//     function transformPrimitive(typ: string, val: unknown): unknown {
//         if (typeof typ === typeof val) return val;
//         return invalidValue(typ, val);
//     }

//     function transformUnion(typs: unknown[], val: unknown): unknown {
//         // val must validate against one typ in typs
//         var l = typs.length;
//         for (var i = 0; i < l; i++) {
//             var typ = typs[i];
//             try {
//                 return transform(val, typ, getProps);
//             } catch (_) {}
//         }
//         return invalidValue(typs, val);
//     }

//     function transformEnum(cases: string[], val: unknown): unknown {
//         if (cases.indexOf(val) !== -1) return val;
//         return invalidValue(cases, val);
//     }

//     function transformArray(typ: unknown, val: unknown): unknown {
//         // val must be an array with no invalid elements
//         if (!Array.isArray(val)) return invalidValue('array', val);
//         return val.map(el => transform(el, typ, getProps));
//     }

//     function transformDate(typ: unknown, val: unknown): unknown {
//         if (val === null) {
//             return null;
//         }
//         const d = new Date(val);
//         if (isNaN(d.valueOf())) {
//             return invalidValue('Date', val);
//         }
//         return d;
//     }

//     function transformObject(props: { [k: string]: unknown }, additional: unknown, val: unknown): unknown {
//         if (val === null || typeof val !== 'object' || Array.isArray(val)) {
//             return invalidValue('object', val);
//         }
//         var result: unknown = {};
//         Object.getOwnPropertyNames(props).forEach(key => {
//             const prop = props[key];
//             const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
//             result[prop.key] = transform(v, prop.typ, getProps);
//         });
//         Object.getOwnPropertyNames(val).forEach(key => {
//             if (!Object.prototype.hasOwnProperty.call(props, key)) {
//                 result[key] = transform(val[key], additional, getProps);
//             }
//         });
//         return result;
//     }

//     if (typ === 'any') return val;
//     if (typ === null) {
//         if (val === null) return val;
//         return invalidValue(typ, val);
//     }
//     if (typ === false) return invalidValue(typ, val);
//     while (typeof typ === 'object' && typ.ref !== undefined) {
//         typ = typeMap[typ.ref];
//     }
//     if (Array.isArray(typ)) return transformEnum(typ, val);
//     if (typeof typ === 'object') {
//         return typ.hasOwnProperty('unionMembers') ? transformUnion(typ.unionMembers, val)
//             : typ.hasOwnProperty('arrayItems') ? transformArray(typ.arrayItems, val)
//                 : typ.hasOwnProperty('props') ? transformObject(getProps(typ), typ.additional, val)
//                     : invalidValue(typ, val);
//     }
//     // Numbers can be parsed by Date but shouldn't be.
//     if (typ === Date && typeof val !== 'number') return transformDate(typ, val);
//     return transformPrimitive(typ, val);
// }

// function cast<T>(val: unknown, typ: unknown): T {
//     return transform(val, typ, jsonToJSProps);
// }

// function uncast<T>(val: T, typ: unknown): unknown {
//     return transform(val, typ, jsToJSONProps);
// }

// function a(typ: unknown) {
//     return { arrayItems: typ };
// }

// function u(...typs: unknown[]) {
//     return { unionMembers: typs };
// }

// function o(props: unknown[], additional: unknown) {
//     return { props, additional };
// }

// function m(additional: unknown) {
//     return { props: [], additional };
// }

// function r(name: string) {
//     return { ref: name };
// }

// const typeMap: unknown = {
//     BaseConfig: o([
//         { json: 'alertTimeout', js: 'alertTimeout', typ: 0 },
//         { json: 'animations', js: 'animations', typ: r('Animations') },
//         { json: 'apiBase', js: 'apiBase', typ: '' },
//         { json: 'clientMode', js: 'clientMode', typ: r('ClientMode') },
//         { json: 'credentialsValidation', js: 'credentialsValidation', typ: r('CredentialsValidation') },
//         { json: 'dialogs', js: 'dialogs', typ: r('Dialogs') },
//         { json: 'downloads', js: 'downloads', typ: r('Downloads') },
//         { json: 'healthMonitoring', js: 'healthMonitoring', typ: r('HealthMonitoring') },
//         { json: 'icons', js: 'icons', typ: r('Icons') },
//         { json: 'integration', js: 'integration', typ: r('Integration') },
//         { json: 'ipvd', js: 'ipvd', typ: r('Ipvd') },
//         { json: 'layout', js: 'layout', typ: r('Layout') },
//         { json: 'maxServers', js: 'maxServers', typ: 0 },
//         { json: 'meta', js: 'meta', typ: r('Meta') },
//         { json: 'menus', js: 'menus', typ: r('Menus') },
//         { json: 'permissions', js: 'permissions', typ: r('Permissions') },
//         { json: 'redirect', js: 'redirect', typ: r('Redirect') },
//         { json: 'showHeaderAndFooter', js: 'showHeaderAndFooter', typ: true },
//         { json: 'search', js: 'search', typ: r('Search') },
//         { json: 'servers', js: 'servers', typ: r('Servers') },
//         { json: 'system', js: 'system', typ: r('System') },
//         { json: 'toast', js: 'toast', typ: r('Toast') },
//         { json: 'cloudCapabilities', js: 'cloudCapabilities', typ: r('CloudCapabilities') },
//         { json: 'cloudName', js: 'cloudName', typ: '' },
//         { json: 'company', js: 'company', typ: r('Company') },
//         { json: 'footerItems', js: 'footerItems', typ: '' },
//         { json: 'googleTagManagerId', js: 'googleTagManagerId', typ: '' },
//         { json: 'pushConfig', js: 'pushConfig', typ: '' },
//         { json: 'trafficRelayHost', js: 'trafficRelayHost', typ: '' },
//         { json: 'vmsName', js: 'vmsName', typ: '' },
//         { json: 'accessRoles', js: 'accessRoles', typ: r('AccessRoles') },
//         { json: 'allowBetaMode', js: 'allowBetaMode', typ: true },
//         { json: 'debug', js: 'debug', typ: r('Debug') },
//         { json: 'globalViewArchivePermission', js: 'globalViewArchivePermission', typ: '' },
//         { json: 'openClientTimeout', js: 'openClientTimeout', typ: 0 },
//         { json: 'openClientError', js: 'openClientError', typ: '' },
//         { json: 'openMobileClientTimeout', js: 'openMobileClientTimeout', typ: 0 },
//         { json: 'responseOk', js: 'responseOk', typ: '' },
//         { json: 'timelineMouseEventTimeout', js: 'timelineMouseEventTimeout', typ: 0 },
//         { json: 'updateInterval', js: 'updateInterval', typ: 0 },
//         { json: 'webclient', js: 'webclient', typ: r('Webclient') }
//     ], false),
//     AccessRoles: o([
//         { json: 'adminAccess', js: 'adminAccess', typ: a('') },
//         { json: 'unshare', js: 'unshare', typ: '' },
//         { json: 'default', js: 'default', typ: '' },
//         { json: 'custom', js: 'custom', typ: '' },
//         { json: 'editUserPermissionFlag', js: 'editUserPermissionFlag', typ: '' },
//         { json: 'globalAdminPermissionFlag', js: 'globalAdminPermissionFlag', typ: '' },
//         { json: 'customPermission', js: 'customPermission', typ: r('CustomPermission') },
//         { json: 'predefinedRoles', js: 'predefinedRoles', typ: a(r('PredefinedRole')) },
//         { json: 'order', js: 'order', typ: a('') }
//     ], false),
//     CustomPermission: o([
//         { json: 'name', js: 'name', typ: '' },
//         { json: 'permissions', js: 'permissions', typ: '' }
//     ], false),
//     PredefinedRole: o([
//         { json: 'isOwner', js: 'isOwner', typ: u(undefined, true) },
//         { json: 'name', js: 'name', typ: '' },
//         { json: 'permissions', js: 'permissions', typ: '' }
//     ], false),
//     Animations: o([
//         { json: 'carouselImage', js: 'carouselImage', typ: r('CarouselImage') }
//     ], false),
//     CarouselImage: o([
//         { json: 'enter', js: 'enter', typ: '' },
//         { json: 'leave', js: 'leave', typ: '' }
//     ], false),
//     ClientMode: o([
//         { json: 'beta', js: 'beta', typ: true },
//         { json: 'debug', js: 'debug', typ: true }
//     ], false),
//     CloudCapabilities: o([
//         { json: 'feedbackEnabled', js: 'feedbackEnabled', typ: '' },
//         { json: 'healthMonitor', js: 'healthMonitor', typ: '' },
//         { json: 'integrationStore', js: 'integrationStore', typ: '' },
//         { json: 'publicDownloads', js: 'publicDownloads', typ: '' },
//         { json: 'publicReleases', js: 'publicReleases', typ: '' }
//     ], false),
//     Company: o([
//         { json: 'copyrightYear', js: 'copyrightYear', typ: '' },
//         { json: 'links', js: 'links', typ: r('Links') },
//         { json: 'name', js: 'name', typ: '' }
//     ], false),
//     Links: o([
//         { json: 'privacy', js: 'privacy', typ: '' },
//         { json: 'support', js: 'support', typ: '' },
//         { json: 'website', js: 'website', typ: '' }
//     ], false),
//     CredentialsValidation: o([
//         { json: 'emailRegex', js: 'emailRegex', typ: '' },
//         { json: 'passwordRequirements', js: 'passwordRequirements', typ: r('PasswordRequirements') }
//     ], false),
//     PasswordRequirements: o([
//         { json: 'maxLength', js: 'maxLength', typ: 0 },
//         { json: 'minClassesCount', js: 'minClassesCount', typ: 0 },
//         { json: 'minLength', js: 'minLength', typ: 0 },
//         { json: 'requiredRegex', js: 'requiredRegex', typ: '' },
//         { json: 'strongClassesCount', js: 'strongClassesCount', typ: 0 }
//     ], false),
//     Debug: o([
//         { json: 'chunksOnTimeline', js: 'chunksOnTimeline', typ: true }
//     ], false),
//     Dialogs: o([
//         { json: 'message', js: 'message', typ: r('Message') }
//     ], false),
//     Message: o([
//         { json: 'subjects', js: 'subjects', typ: r('Subjects') },
//         { json: 'type', js: 'type', typ: r('Type') }
//     ], false),
//     Subjects: o([
//         { json: 'integration', js: 'integration', typ: a('') },
//         { json: 'ipvd_feedback_page', js: 'ipvd_feedback_page', typ: a('') },
//         { json: 'ipvd_feedback_device', js: 'ipvd_feedback_device', typ: a('') }
//     ], false),
//     Type: o([
//         { json: 'ipvd_page', js: 'ipvd_page', typ: '' },
//         { json: 'ipvd_device', js: 'ipvd_device', typ: '' },
//         { json: 'integration', js: 'integration', typ: '' },
//         { json: 'unknown', js: 'unknown', typ: '' }
//     ], false),
//     Downloads: o([
//         { json: 'mobile', js: 'mobile', typ: a(r('Mobile')) },
//         { json: 'groups', js: 'groups', typ: r('Groups') },
//         { json: 'platformMatch', js: 'platformMatch', typ: r('PlatformMatch') }
//     ], false),
//     Groups: o([
//         { json: 'windows', js: 'windows', typ: r('Arm') },
//         { json: 'linux', js: 'linux', typ: r('Arm') },
//         { json: 'macos', js: 'macos', typ: r('Arm') },
//         { json: 'arm', js: 'arm', typ: r('Arm') },
//         { json: 'sdk', js: 'sdk', typ: r('Arm') }
//     ], false),
//     Arm: o([
//         { json: 'name', js: 'name', typ: '' },
//         { json: 'os', js: 'os', typ: '' },
//         { json: 'appTypes', js: 'appTypes', typ: a('') }
//     ], false),
//     Mobile: o([
//         { json: 'name', js: 'name', typ: '' },
//         { json: 'os', js: 'os', typ: '' }
//     ], false),
//     PlatformMatch: o([
//         { json: 'unix', js: 'unix', typ: '' },
//         { json: 'linux', js: 'linux', typ: '' },
//         { json: 'mac', js: 'mac', typ: '' },
//         { json: 'windows', js: 'windows', typ: '' },
//         { json: 'arm', js: 'arm', typ: '' },
//         { json: 'skd', js: 'skd', typ: '' }
//     ], false),
//     HealthMonitoring: o([
//         { json: 'staleReportTimeout', js: 'staleReportTimeout', typ: 0 },
//         { json: 'valueFormats', js: 'valueFormats', typ: r('ValueFormats') },
//         { json: 'classFormats', js: 'classFormats', typ: r('ClassFormats') }
//     ], false),
//     ClassFormats: o([
//         { json: 'resource', js: 'resource', typ: '' },
//         { json: 'longText', js: 'longText', typ: '' },
//         { json: 'shortText', js: 'shortText', typ: '' },
//         { json: 'text', js: 'text', typ: '' },
//         { json: 'number', js: 'number', typ: '' },
//         { json: 'GB', js: 'GB', typ: '' },
//         { json: 'KB', js: 'KB', typ: '' },
//         { json: 'MB', js: 'MB', typ: '' },
//         { json: 'TB', js: 'TB', typ: '' },
//         { json: '%', js: '%', typ: '' },
//         { json: 'Mpix/s', js: 'Mpix/s', typ: '' },
//         { json: 'MB/s', js: 'MB/s', typ: '' },
//         { json: 'Mbit/s', js: 'Mbit/s', typ: '' },
//         { json: 'KB/s', js: 'KB/s', typ: '' },
//         { json: 'Kbit/s', js: 'Kbit/s', typ: '' },
//         { json: 'Tr/s', js: 'Tr/s', typ: '' },
//         { json: 'unset', js: 'unset', typ: '' }
//     ], false),
//     ValueFormats: o([
//         { json: '%', js: '%', typ: r('Empty') },
//         { json: 'TB', js: 'TB', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'GB', js: 'GB', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'MB', js: 'MB', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'KB', js: 'KB', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'B', js: 'B', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'GBps', js: 'GBps', typ: r('Bps') },
//         { json: 'MBps', js: 'MBps', typ: r('Bps') },
//         { json: 'KBps', js: 'KBps', typ: r('Bps') },
//         { json: 'Bps', js: 'Bps', typ: r('Bps') },
//         { json: 'Gbps', js: 'Gbps', typ: r('Bps') },
//         { json: 'Mbps', js: 'Mbps', typ: r('Bps') },
//         { json: 'kbps', js: 'kbps', typ: r('Bps') },
//         { json: 'bps', js: 'bps', typ: r('Bps') },
//         { json: 'Transactions/s', js: 'Transactions/s', typ: r('Empty') },
//         { json: 'TB/s', js: 'TB/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'GB/s', js: 'GB/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'MB/s', js: 'MB/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'KB/s', js: 'KB/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'B/s', js: 'B/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'Tbit', js: 'Tbit', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'Gbit', js: 'Gbit', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'Mbit', js: 'Mbit', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'Kbit', js: 'Kbit', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'bit', js: 'bit', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'Tbit/s', js: 'Tbit/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'Gbit/s', js: 'Gbit/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'Mbit/s', js: 'Mbit/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'Kbit/s', js: 'Kbit/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'bit/s', js: 'bit/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'TPix/s', js: 'TPix/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'GPix/s', js: 'GPix/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'MPix/s', js: 'MPix/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'KPix/s', js: 'KPix/s', typ: r('LivingstoneSouthernWhiteFacedOwl') },
//         { json: 'Tr/s', js: 'Tr/s', typ: r('LivingstoneSouthernWhiteFacedOwl') }
//     ], false),
//     Empty: o([
//         { json: 'multiplier', js: 'multiplier', typ: 0 },
//         { json: 'decimals', js: 'decimals', typ: 0 }
//     ], false),
//     LivingstoneSouthernWhiteFacedOwl: o([
//         { json: 'multiplier', js: 'multiplier', typ: 3.14 }
//     ], false),
//     Bps: o([
//         { json: 'display', js: 'display', typ: '' },
//         { json: 'multiplier', js: 'multiplier', typ: 3.14 },
//         { json: 'decimals', js: 'decimals', typ: 0 }
//     ], false),
//     Icons: o([
//         { json: 'default', js: 'default', typ: '' },
//         { json: 'platforms', js: 'platforms', typ: a(r('Platform')) },
//         { json: 'dir', js: 'dir', typ: '' },
//         { json: 'dirNonStandard', js: 'dirNonStandard', typ: '' },
//         { json: 'dirPagePlaceholder', js: 'dirPagePlaceholder', typ: '' },
//         { json: 'dirSectionPlaceholder', js: 'dirSectionPlaceholder', typ: '' }
//     ], false),
//     Platform: o([
//         { json: 'name', js: 'name', typ: '' },
//         { json: 'src', js: 'src', typ: '' }
//     ], false),
//     Integration: o([
//         { json: 'adminLink', js: 'adminLink', typ: '' },
//         { json: 'defaultPlatformNames', js: 'defaultPlatformNames', typ: r('DefaultPlatformNames') },
//         { json: 'embedInfo', js: 'embedInfo', typ: r('EmbedInfo') },
//         { json: 'filter', js: 'filter', typ: r('Filter') },
//         { json: 'myTagId', js: 'myTagId', typ: '' }
//     ], false),
//     DefaultPlatformNames: o([
//         { json: 'arm-64-file', js: 'arm-64-file', typ: '' },
//         { json: 'linux-x64-file', js: 'linux-x64-file', typ: '' },
//         { json: 'macos-file', js: 'macos-file', typ: '' },
//         { json: 'arm-32-file', js: 'arm-32-file', typ: '' },
//         { json: 'windows-x64-file', js: 'windows-x64-file', typ: '' },
//         { json: 'downloadableInstructions', js: 'downloadableInstructions', typ: '' }
//     ], false),
//     EmbedInfo: o([
//         { json: 'vimeo', js: 'vimeo', typ: r('Vimeo') },
//         { json: 'youtube', js: 'youtube', typ: r('Vimeo') }
//     ], false),
//     Vimeo: o([
//         { json: 'link', js: 'link', typ: '' },
//         { json: 'regex', js: 'regex', typ: '' }
//     ], false),
//     Filter: o([
//         { json: 'items', js: 'items', typ: '' },
//         { json: 'limitation', js: 'limitation', typ: '' }
//     ], false),
//     Ipvd: o([
//         { json: 'pagerMaxSizeMedium', js: 'pagerMaxSizeMedium', typ: 0 },
//         { json: 'pagerMaxSize', js: 'pagerMaxSize', typ: 0 },
//         { json: 'firmwaresToShow', js: 'firmwaresToShow', typ: 0 },
//         { json: 'analyticsToShow', js: 'analyticsToShow', typ: 0 },
//         { json: 'sortSupportedDevicesByPopularity', js: 'sortSupportedDevicesByPopularity', typ: '' },
//         { json: 'supportedResolutions', js: 'supportedResolutions', typ: '' },
//         { json: 'supportedHardwareTypes', js: 'supportedHardwareTypes', typ: '' },
//         { json: 'searchTags', js: 'searchTags', typ: '' },
//         { json: 'vendorsShown', js: 'vendorsShown', typ: '' }
//     ], false),
//     Layout: o([
//         { json: 'table', js: 'table', typ: r('Table') },
//         { json: 'tableLarge', js: 'tableLarge', typ: r('Table') }
//     ], false),
//     Table: o([
//         { json: 'rows', js: 'rows', typ: 0 }
//     ], false),
//     Menus: o([
//         { json: 'account', js: 'account', typ: r('Account') },
//         { json: 'systemHealth', js: 'systemHealth', typ: r('SystemHealth') },
//         { json: 'systemSettings', js: 'systemSettings', typ: r('SystemSettings') }
//     ], false),
//     Account: o([
//         { json: 'baseUrl', js: 'baseUrl', typ: '' },
//         { json: 'icon', js: 'icon', typ: '' },
//         { json: 'settings', js: 'settings', typ: r('Password') },
//         { json: 'password', js: 'password', typ: r('Password') }
//     ], false),
//     Password: o([
//         { json: 'id', js: 'id', typ: '' },
//         { json: 'path', js: 'path', typ: '' }
//     ], false),
//     SystemHealth: o([
//         { json: 'baseUrl', js: 'baseUrl', typ: '' }
//     ], false),
//     SystemSettings: o([
//         { json: 'baseUrl', js: 'baseUrl', typ: '' },
//         { json: 'admin', js: 'admin', typ: r('Admin') },
//         { json: 'users', js: 'users', typ: r('Admin') },
//         { json: 'servers', js: 'servers', typ: r('Admin') },
//         { json: 'buttons', js: 'buttons', typ: r('Buttons') }
//     ], false),
//     Admin: o([
//         { json: 'id', js: 'id', typ: '' },
//         { json: 'icon', js: 'icon', typ: '' },
//         { json: 'path', js: 'path', typ: '' }
//     ], false),
//     Buttons: o([
//         { json: 'id', js: 'id', typ: '' }
//     ], false),
//     Meta: o([
//         { json: 'viewport', js: 'viewport', typ: r('Viewport') }
//     ], false),
//     Viewport: o([
//         { json: 'default', js: 'default', typ: '' },
//         { json: 'desktopLayout', js: 'desktopLayout', typ: '' }
//     ], false),
//     Permissions: o([
//         { json: 'canViewRelease', js: 'canViewRelease', typ: '' }
//     ], false),
//     Redirect: o([
//         { json: 'authorised', js: 'authorised', typ: '' },
//         { json: 'unauthorised', js: 'unauthorised', typ: '' },
//         { json: 'page404', js: 'page404', typ: '' },
//         { json: 'paths', js: 'paths', typ: a('') }
//     ], false),
//     Search: o([
//         { json: 'debounceTime', js: 'debounceTime', typ: 0 },
//         { json: 'maxLength', js: 'maxLength', typ: 0 },
//         { json: 'minSystems', js: 'minSystems', typ: 0 }
//     ], false),
//     Servers: o([
//         { json: 'port', js: 'port', typ: r('Port') },
//         { json: 'status', js: 'status', typ: r('ServersStatus') }
//     ], false),
//     Port: o([
//         { json: 'max', js: 'max', typ: 0 },
//         { json: 'min', js: 'min', typ: 0 },
//         { json: 'restrictedMax', js: 'restrictedMax', typ: 0 }
//     ], false),
//     ServersStatus: o([
//         { json: 'online', js: 'online', typ: '' },
//         { json: 'offline', js: 'offline', typ: '' },
//         { json: 'restarting', js: 'restarting', typ: '' },
//         { json: 'resetting', js: 'resetting', typ: '' },
//         { json: 'checking', js: 'checking', typ: '' }
//     ], false),
//     System: o([
//         { json: 'flags', js: 'flags', typ: r('Flags') },
//         { json: 'status', js: 'status', typ: r('SystemStatus') },
//         { json: 'throttleTime', js: 'throttleTime', typ: 0 }
//     ], false),
//     Flags: o([
//         { json: 'newSystem', js: 'newSystem', typ: '' }
//     ], false),
//     SystemStatus: o([
//         { json: 'online', js: 'online', typ: '' },
//         { json: 'default', js: 'default', typ: r('Default') },
//         { json: 'offline', js: 'offline', typ: r('Default') },
//         { json: 'unavailable', js: 'unavailable', typ: r('Default') },
//         { json: 'master', js: 'master', typ: '' },
//         { json: 'slave', js: 'slave', typ: '' }
//     ], false),
//     Default: o([
//         { json: 'style', js: 'style', typ: '' }
//     ], false),
//     Toast: o([
//         { json: 'success', js: 'success', typ: '' },
//         { json: 'warning', js: 'warning', typ: '' },
//         { json: 'danger', js: 'danger', typ: '' },
//         { json: 'info', js: 'info', typ: '' }
//     ], false),
//     Webclient: o([
//         { json: 'chunksToCheckFatal', js: 'chunksToCheckFatal', typ: 0 },
//         { json: 'disableVolume', js: 'disableVolume', typ: true },
//         { json: 'endOfArchiveTime', js: 'endOfArchiveTime', typ: 0 },
//         { json: 'flashChromelessDebugPath', js: 'flashChromelessDebugPath', typ: '' },
//         { json: 'flashChromelessPath', js: 'flashChromelessPath', typ: '' },
//         { json: 'hlsLoadingTimeout', js: 'hlsLoadingTimeout', typ: 0 },
//         { json: 'leftPanelPreviewHeight', js: 'leftPanelPreviewHeight', typ: 0 },
//         { json: 'maxCrashCount', js: 'maxCrashCount', typ: 0 },
//         { json: 'nativeTimeout', js: 'nativeTimeout', typ: 0 },
//         { json: 'playerReadyTimeout', js: 'playerReadyTimeout', typ: 0 },
//         { json: 'reloadInterval', js: 'reloadInterval', typ: 0 },
//         { json: 'resetDisplayedTextTimer', js: 'resetDisplayedTextTimer', typ: 0 },
//         { json: 'staticResources', js: 'staticResources', typ: '' },
//         { json: 'skipFramesRenderingTimeline', js: 'skipFramesRenderingTimeline', typ: true },
//         { json: 'updateArchiveStateTimeout', js: 'updateArchiveStateTimeout', typ: 0 },
//         { json: 'updateArchiveRecordsTimeout', js: 'updateArchiveRecordsTimeout', typ: 0 },
//         { json: 'useServerTime', js: 'useServerTime', typ: true },
//         { json: 'useSystemTime', js: 'useSystemTime', typ: true }
//     ], false),
//     SettingsConfig: o([
//         { json: 'auditTrailEnabled', js: 'auditTrailEnabled', typ: r('Setting') },
//         { json: 'cameraSettingsOptimization', js: 'cameraSettingsOptimization', typ: r('Setting') },
//         { json: 'disabledVendors', js: 'disabledVendors', typ: r('Setting') },
//         { json: 'ec2AliveUpdateIntervalSec', js: 'ec2AliveUpdateIntervalSec', typ: r('Setting') },
//         { json: 'ec2ConnectionKeepAliveTimeoutSec', js: 'ec2ConnectionKeepAliveTimeoutSec', typ: r('Setting') },
//         { json: 'ec2KeepAliveProbeCount', js: 'ec2KeepAliveProbeCount', typ: r('Setting') },
//         { json: 'emailFrom', js: 'emailFrom', typ: r('Setting') },
//         { json: 'emailSignature', js: 'emailSignature', typ: r('Setting') },
//         { json: 'emailSupportEmail', js: 'emailSupportEmail', typ: r('Setting') },
//         { json: 'ldapAdminDn', js: 'ldapAdminDn', typ: r('Setting') },
//         { json: 'ldapAdminPassword', js: 'ldapAdminPassword', typ: r('Setting') },
//         { json: 'ldapSearchBase', js: 'ldapSearchBase', typ: r('Setting') },
//         { json: 'ldapSearchFilter', js: 'ldapSearchFilter', typ: r('Setting') },
//         { json: 'ldapUri', js: 'ldapUri', typ: r('Setting') },
//         { json: 'autoDiscoveryEnabled', js: 'autoDiscoveryEnabled', typ: r('Setting') },
//         { json: 'smtpConnectionType', js: 'smtpConnectionType', typ: r('Setting') },
//         { json: 'smtpHost', js: 'smtpHost', typ: r('Setting') },
//         { json: 'smtpPort', js: 'smtpPort', typ: r('Setting') },
//         { json: 'smtpSimple', js: 'smtpSimple', typ: r('Setting') },
//         { json: 'smtpTimeout', js: 'smtpTimeout', typ: r('Setting') },
//         { json: 'smtpPassword', js: 'smtpPassword', typ: r('Setting') },
//         { json: 'smtpUser', js: 'smtpUser', typ: r('Setting') },
//         { json: 'updateNotificationsEnabled', js: 'updateNotificationsEnabled', typ: r('Setting') },
//         { json: 'arecontRtspEnabled', js: 'arecontRtspEnabled', typ: r('Setting') },
//         { json: 'backupNewCamerasByDefault', js: 'backupNewCamerasByDefault', typ: r('Setting') },
//         { json: 'statisticsAllowed', js: 'statisticsAllowed', typ: r('Setting') },
//         { json: 'backupQualities', js: 'backupQualities', typ: r('Setting') },
//         { json: 'serverDiscoveryPingTimeoutSec', js: 'serverDiscoveryPingTimeoutSec', typ: r('Setting') },
//         { json: 'cloudAccountName', js: 'cloudAccountName', typ: r('Setting') },
//         { json: 'cloudHost', js: 'cloudHost', typ: r('Setting') },
//         { json: 'cloudAuthKey', js: 'cloudAuthKey', typ: r('Setting') },
//         { json: 'cloudSystemID', js: 'cloudSystemID', typ: r('Setting') },
//         { json: 'systemName', js: 'systemName', typ: r('Setting') },
//         { json: 'newSystem', js: 'newSystem', typ: r('Setting') },
//         { json: 'proxyConnectTimeoutSec', js: 'proxyConnectTimeoutSec', typ: r('Setting') },
//         { json: 'crossdomainEnabled', js: 'crossdomainEnabled', typ: r('Setting') },
//         { json: 'maxRtspConnectDurationSec', js: 'maxRtspConnectDurationSec', typ: r('Setting') },
//         { json: 'statisticsReportLastNumber', js: 'statisticsReportLastNumber', typ: r('Setting') },
//         { json: 'statisticsReportLastTime', js: 'statisticsReportLastTime', typ: r('Setting') },
//         { json: 'statisticsReportServerApi', js: 'statisticsReportServerApi', typ: r('Setting') },
//         { json: 'statisticsReportTimeCycle', js: 'statisticsReportTimeCycle', typ: r('Setting') },
//         { json: 'localSystemId', js: 'localSystemId', typ: r('Setting') },
//         { json: 'systemId', js: 'systemId', typ: r('Setting') },
//         { json: 'systemNameForId', js: 'systemNameForId', typ: r('Setting') },
//         { json: 'takeCameraOwnershipWithoutLock', js: 'takeCameraOwnershipWithoutLock', typ: r('Setting') },
//         { json: 'upnpPortMappingEnabled', js: 'upnpPortMappingEnabled', typ: r('Setting') },
//         { json: 'trafficEncryptionForced', js: 'trafficEncryptionForced', typ: r('Setting') },
//         { json: 'videoTrafficEncryptionForced', js: 'videoTrafficEncryptionForced', typ: r('Setting') },
//         { json: 'updateStatus', js: 'updateStatus', typ: r('Setting') },
//         { json: 'watermarkSettings', js: 'watermarkSettings', typ: r('Setting') },
//         { json: 'timeSynchronizationEnabled', js: 'timeSynchronizationEnabled', typ: r('Setting') },
//         { json: 'primaryTimeServer', js: 'primaryTimeServer', typ: r('Setting') },
//         { json: 'osTimeChangeCheckPeriodMs', js: 'osTimeChangeCheckPeriodMs', typ: r('Setting') },
//         { json: 'syncTimeExchangePeriod', js: 'syncTimeExchangePeriod', typ: r('Setting') },
//         { json: 'syncTimeEpsilon', js: 'syncTimeEpsilon', typ: r('Setting') },
//         { json: 'maxVirtualCameraArchiveSynchronizationThreads', js: 'maxVirtualCameraArchiveSynchronizationThreads', typ: r('Setting') },
//         { json: 'maxEventLogRecords', js: 'maxEventLogRecords', typ: r('Setting') },
//         { json: 'forceLiveCacheForPrimaryStream', js: 'forceLiveCacheForPrimaryStream', typ: r('Setting') }
//     ], false)
//     // LoggersConfig: o([
//     //     { json: 'EC2_TRAN', js: 'EC2_TRAN', typ: r('') },
//     //     { json: 'HTTP', js: 'HTTP', typ: r('') },
//     //     { json: 'HWID', js: 'HWID', typ: r('') },
//     //     { json: 'MAIN', js: 'MAIN', typ: r('') },
//     //     { json: 'PERMISSIONS', js: 'PERMISSIONS', typ: r('') }
//     // ], false)
// };
