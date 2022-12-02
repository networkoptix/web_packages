import {
    ActionType,
    ConfigType,
    ConsoleSection,
    ModalType,
    OptionalFeatures
} from '@components/console-table/console-table.component.types';
import { environment } from '@environments/environment';
import {
    GroupingOptions,
    SortOptions
} from '@pages/developer-console/console/edit/console-edit.component.types';
import * as configTypes from '@services/nx-config/base-config';

// const apiTool: configTypes.APIToolSettings = {

export const alertTimeout: number = 3 * 1000; // Alerts are shown for 3 seconds
export const apiBase: string = '/api';
export const apiRequestAttempts: number = 4; // combined with extendedRequestTimeout this mean we'll give up after 1 min
export const cameraCredentialUpdateTimeout: number = 1500;
export const longAlertTimeout: number = 6 * 1000; // Alerts are shown for 6 seconds
export const maxNumberServerChecked: number = 6; // checks server status for restart; checks every 4 seconds, so constant * 4 = # of secs it checks for
export const pollingTimeout: number = 30 * 1000;
export const simpleURLRegex: string = '^https:\\/\\/[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$';
export const buildFromEnv: string = '{{BUILD}}'.trim();
export const buildSubstituted: boolean = buildFromEnv && !buildFromEnv.includes('BUILD');
export const staticBase: string = buildSubstituted && !environment.isLocal ? 'static/{{BUILD}}' : 'static';
export const extendedRequestTimeout: number = 15 * 1000;
export const maxServers: number = 100;
export const maintenanceTimeout: number = 60 * 1000;
export const showHeaderAndFooter: boolean = true;
export const licenseDeactivations: number = 3;
export const allowBetaMode: boolean = false;
export const globalViewArchivePermission: string = 'GlobalViewArchivePermission';
export const openClientTimeout: number = 1000;
export const openClientError: string = 'notVisited';
export const openMobileClientTimeout: number = 300;
export const responseOk: string = 'ok';
export const timelineMouseEventTimeout: number = 300;
export const updateInterval: number = 30 * 1000;
export const ribbonHeight: number = 33;
export const sessionFreshnessSec: number = 600;

export const accountDropdown = [
    {
        name: 'Account Settings',
        route: '/account/',
        newWindow: false
    },
    {
        name: 'Change Password',
        route: '/account/password/',
        newWindow: false
    },
    {
        name: 'Security',
        route: '/account/security/',
        newWindow: false
    }
];

export const accountDropdownStaff = [
    {
        name: 'Administration',
        route: '/admin/',
        newWindow: true
    }
];

export const apiDocURL: object = {
    main: '/swagger-ui/openapi_v1.json',
    legacy: '/swagger-ui/openapi_legacy.json',
    deprecated: '/swagger-ui/openapi_deprecated.json'
};

export const animations: configTypes.Animations = {
    carouselImage: {
        enter: '0.25s ease-in',
        leave: '0.25s ease-out'
    }
};
export const apiTool: configTypes.APIToolSettings = {
    manualSystemChangeCooldown: 5000,
    apiTypes: {
        main: {
            type: 'main',
            displayName: 'Current API'
        },
        deprecated: {
            type: 'deprecated',
            displayName: 'Deprecated API'
        }
    },
    defaultManifest: [
        {
            name: 'Current API',
            sections: [
                {
                    name: 'REST',
                    scheme: 'openapi_v1.json'
                },
                {
                    name: 'LEGACY',
                    scheme: 'openapi_legacy.json'
                }
            ]
        },
        {
            name: 'Deprecated API',
            sections: [
                {
                    name: 'LEGACY',
                    scheme: 'openapi_deprecated.json'
                }
            ]
        }
    ],
    legacyManifest: [
        {
            name: 'Current API',
            sections: [
                {
                    scheme: 'openapi_legacy.json'
                }
            ]
        }
    ]
};

export const cameraSettings: configTypes.CameraSettings = {
    sensitivityColors: [
        '#FFFFFF', '#627CD6', '#23A4CB', '#31BAA2', '#79BC66', '#B8BC37', '#FBA405', '#E97119', '#D24729', '#C22626'
    ]
};

export const clientMode: configTypes.ClientMode = {
    beta: false,
    debug: false
};

export const credentialsValidation: configTypes.CredentialsValidation = {
    emailRegex: '^[-!#$%&\'*+/=?^_`{}|~0-9a-zA-Z]+(\\.[-!#$%&\'*+/=?^_`{}|~0-9a-zA-Z]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,63}\\.?$',
    passwordRequirements: {
        maxLength: 255,
        minClassesCount: 2,
        minLength: 8,
        requiredRegex: '^[\x21-\x7E]$|^[\x21-\x7E][\x20-\x7E]*[\x21-\x7E]$',
        strongClassesCount: 3
    }
};

export const developers: configTypes.Developers = {
    landing: {
        adminLink: '/admin/cms/menu/%ID%/change/'
    }
};

export const dialogs: configTypes.Dialogs = {
    message: {
        subjects: {
            integration: ['sales_inquiry', 'technical_inquiry', 'integration_feedback'],
            ipvd_feedback_page: ['ipvd_feedback_page'],
            ipvd_feedback_device: ['ipvd_feedback_device']
        },
        type: {
            ipvd_page: 'ipvd_feedback_page',
            ipvd_device: 'ipvd_feedback_device',
            integration: 'integration',
            unknown: 'unknown'
        }
    }
};

export const healthMonitoring: configTypes.HealthMonitoring = {
    staleReportTimeout: 5, // Timeout before ribbon alert to refresh HM
    valueFormats: {
        '%': { multiplier: 100, decimals: 0 },
        TB: { multiplier: 1 / 1024 ** 4 },
        GB: { multiplier: 1 / 1024 ** 3 },
        MB: { multiplier: 1 / 1024 ** 2 },
        KB: { multiplier: 1 / 1024 },
        B: { multiplier: 1 },
        // Start deprecated formats
        GBps: { display: 'GB/s', multiplier: 1 / 1000 ** 3, decimals: 2 },
        MBps: { display: 'MB/s', multiplier: 1 / 1000 ** 2, decimals: 2 },
        KBps: { display: 'kB/s', multiplier: 1 / 1000, decimals: 2 },
        Bps: { display: 'B/s', multiplier: 1, decimals: 0 },
        Gbps: { display: 'Gbit/s', multiplier: 1 / 1000 ** 3, decimals: 2 },
        Mbps: { display: 'Mbit/s', multiplier: 1 / 1000 ** 2, decimals: 2 },
        kbps: { display: 'kbit/s', multiplier: 1 / 1000, decimals: 2 },
        bps: { display: 'bit/s', multiplier: 1, decimals: 0 },
        'Transactions/s': { multiplier: 1, decimals: 1 },
        // End deprecated formats
        'TB/s': { multiplier: 1 / 1024 ** 4 },
        'GB/s': { multiplier: 1 / 1024 ** 3 },
        'MB/s': { multiplier: 1 / 1024 ** 2 },
        'KB/s': { multiplier: 1 / 1024 },
        'B/s': { multiplier: 1 },

        Tbit: { multiplier: 8 * (1 / 1000 ** 4) },
        Gbit: { multiplier: 8 * (1 / 1000 ** 3) },
        Mbit: { multiplier: 8 * (1 / 1000 ** 2) },
        Kbit: { multiplier: 8 * (1 / 1000) },
        bit: { multiplier: 8 },

        'Tbit/s': { multiplier: 8 * (1 / 1000 ** 4) },
        'Gbit/s': { multiplier: 8 * (1 / 1000 ** 3) },
        'Mbit/s': { multiplier: 8 * (1 / 1000 ** 2) },
        'Kbit/s': { multiplier: 8 * (1 / 1000) },
        'bit/s': { multiplier: 8 },

        'TPix/s': { multiplier: 1 / 1000 ** 4 },
        'GPix/s': { multiplier: 1 / 1000 ** 3 },
        'MPix/s': { multiplier: 1 / 1000 ** 2 },
        'KPix/s': { multiplier: 1 / 1000 },
        'Tr/s': { multiplier: 1 }
    },
    classFormats: {
        resource: 'long-text',
        longText: 'long-text',
        shortText: 'short-text',
        text: 'text',
        number: '',
        GB: 'volume-metric',
        KB: 'volume-metric',
        MB: 'volume-metric',
        TB: 'volume-metric',
        '%': 'percent',
        'Mpix/s': '',
        'MB/s': '',
        'Mbit/s': '',
        'KB/s': '',
        'Kbit/s': '',
        'Tr/s': '',
        unset: 'no-max-width'
    }
};

export const icons: configTypes.Icons = {
    default: `/${staticBase}/images/integration/integration_tile_preview_plugin.svg`,
    platforms: [
        { name: 'mac', src: `/${staticBase}/images/icons/platforms/mac.svg` },
        { name: 'android', src: `/${staticBase}/images/icons/platforms/android.svg` },
        { name: 'arm', src: `/${staticBase}/images/icons/platforms/arm.svg` },
        { name: 'linux', src: `/${staticBase}/images/icons/platforms/linux.svg` },
        { name: 'windows', src: `/${staticBase}/images/icons/platforms/windows.svg` }
    ],
    backgrounds: `/${staticBase}/images/icons/backgrounds/`,
    dir: `/${staticBase}/images/icons/standard/`,
    dirButtons: `/${staticBase}/images/icons/buttons/`,
    dirTextButtons: `/${staticBase}/images/icons/text_buttons/`,
    dirHeader: `/${staticBase}/images/icons/header/`,
    dirLayouts: `/${staticBase}/images/icons/layouts/`,
    dirNonStandard: `/${staticBase}/images/icons/`,
    dirNonStandardView: `/${staticBase}/images/icons/view/`,
    dirPagePlaceholder: `/${staticBase}/images/placeholders/page/`,
    dirSectionPlaceholder: `/${staticBase}/images/placeholders/section/`,
    dirConfirmations: `/${staticBase}/images/confirmations/`,
    dirDevCapabilities: `/${staticBase}/images/icons/dev_capabilities/`,
    dirCloudStorage: `/${staticBase}/images/icons/cloud_storage/`,
    dirLandingIcons: `/${staticBase}/images/landing/block_icons/`
};

export const images: configTypes.Images = {
    dir: `/${staticBase}/images/`,
    dirDevelopers: `/${staticBase}/images/developers/`,
    dirDevelopersDevtools: `/${staticBase}/images/developers/dev_tools/`,
    dirLanding: `/${staticBase}/images/landing/`,
    dirLandingGraphic: `/${staticBase}/images/landing/main_screen/`,
    dirHeader: `/${staticBase}/images/header/`,
    dirTheme: `/${staticBase}/images/themes/`
};

export const interceptor = {
    cloudUnavailable: {
        error: 'cloudInvalidResponse',
        timeout: 5 * 1000
    }
};

export const layout: configTypes.Layout = {
    table: {
        rows: 10
    },
    tableLarge: {
        rows: 20
    }
};

export const meta: configTypes.Meta = {
    viewport: {
        default: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no',
        desktopLayout: 'width=768, maximum-scale=1, user-scalable=yes, shrink-to-fit=no'
    }
};

export const manifest = {
    [ConsoleSection.CUSTOM_CLIENTS]: {
        sort: 0,
        title: 'My Custom VMS Clients',
        url: 'custom-clients',
        icon: 'servers.svg',
        searchSubheading: 'Search works in all columns',
        noResultsMessage: 'No Custom Clients found matching search',
        minItemsAdvanced: 10,
        disabled: {
            [OptionalFeatures.FILTER]: true,
            [OptionalFeatures.SEARCH]: true,
            [OptionalFeatures.PER_PAGE]: true
        },
        perPage: 10,
        perPageOptions: [
            { name: '5', value: '5' },
            { name: '10', value: '10' },
            { name: '25', value: '25' },
            { name: '100', value: '100' },
            { name: 'All', value: '10000' }
        ],
        pagesToShow: 4,
        excludeFromSearch: ['last_modified', 'downloadLink', 'settingsModal'],
        contexts: [
            {
                type: ConfigType.TEXT,
                name: 'name',
                label: 'Internal Name',
                meta: {
                    filter: {
                        sortable: SortOptions.TEXT,
                        grouping: GroupingOptions.TEXT
                    }
                }
            },
            {
                type: ConfigType.DATE,
                name: 'last_modified',
                label: 'Last Modified',
                meta: {
                    options: {
                        defaultWidth: 108
                    },
                    filter: {
                        sortable: SortOptions.DATE,
                        grouping: GroupingOptions.DATE_AUTO,
                        multiSelect: true
                    }
                }
            },
            {
                type: ConfigType.ASYNC_HANDLER,
                name: 'downloadAsync',
                label: '',
                meta: {
                    options: {
                        defaultWidth: 184
                    },
                    icon: 'download.svg',
                    tooltip: 'Download'
                }
            },
            {
                type: ConfigType.ICON_MODAL,
                name: 'settingsModal',
                label: '',
                meta: {
                    icon: 'settings.svg',
                    tooltip: 'Settings'
                }
            }
        ],
        editManifest: {
            label: 'Edit Custom Client',
            fields: [
                {
                    type: ConfigType.TEXT,
                    name: 'name',
                    label: 'Internal Name',
                    placeholder: 'Custom VMS Client Name',
                    description: 'Name is hidden from external users',
                    meta: {
                        options: {
                            required: true
                        }
                    }
                },
                {
                    type: ConfigType.DROPDOWN,
                    name: 'base_vms',
                    label: 'Based on'
                }
            ]
        },
        downloadManifest: {
            label: 'Download Package',
            fields: [
                {
                    // Waiting on spec. Fields could potentially be used for configurations per modal view.
                    // For example this would be the preparing view, then we can add a ready view, and then an error view.
                    type: ConfigType.TEXT,
                    name: 'download',
                    label: 'Download',
                    meta: {
                        options: {
                            error: 'Download Error',
                            errorHeading: 'Error Generating Package:',
                            errorToastMessage: 'Error Generating Package for "%NAME%" custom client:',
                            toastMessage: 'Package ready for "%NAME%" custom client. If the package doesn\'t download automatically then <a href="%URL%">click here to download</a>'
                        },
                        icon: 'download.svg'
                    }
                },
                {
                    // Waiting on spec. Fields could potentially be used for configurations per modal view.
                    // For example this would be the preparing view, then we can add a ready view, and then an error view.
                    type: ConfigType.TEXT,
                    name: 'generating',
                    label: 'Generating...',
                    meta: {
                        icon: 'loading.svg',
                        styles: 'animate-rotation'
                    }
                }
            ]
        },
        actions: [
            {
                title: 'Create Custom Client',
                subheading: "You don't have any Custom Clients yet.",
                modal: ModalType.CLIENT_CREATE,
                icon: 'CustomClients.svg',
                type: ActionType.PRIMARY
            }
        ]
    }
};

export const menus: configTypes.Menus = {
    account: {
        baseUrl: '/account',
        icon: 'user',
        settings: {
            id: 'settings',
            path: ''
        },
        password: {
            id: 'password',
            path: '/password'
        },
        security: {
            id: 'security',
            path: '/security'
        }
    },
    systemHealth: {
        baseUrl: '/health/',
        alerts: {
            id: 'alerts',
            icon: 'alerts',
            path: 'alerts'
        }
    },
    systemMonitoring: {
        baseUrl: '/monitoring/',
        graphs: {
            id: 'graphs',
            icon: 'system',
            path: '',
        },
        logs: {
            id: 'logs',
            icon: 'server',
            path: 'logs',
        }
    },
    systemSettings: {
        baseUrl: environment.isLocal ? '/settings/' : '/systems/',
        admin: {
            id: 'admin',
            icon: 'system',
            path: ''
        },
        cloudStorage: {
            id: 'cloudStorage',
            path: 'cloud-storage'
        },
        users: {
            id: 'users',
            icon: 'users',
            path: 'users'
        },
        servers: {
            id: 'servers',
            icon: 'server',
            path: 'servers',
            statusIcons: {
                offline: 'device_offline',
                online: ''
            }
        },
        cameras: {
            id: 'cameras',
            icon: 'camera',
            path: 'cameras',
            statusIcons: {
                archive: 'camera_archive',
                offline: 'device_offline',
                recording: 'camera_recording',
                scheduled: 'camera_scheduled',
                unauthorized: 'camera_unauthorized',
                online: ''
            }
        },
        general: {
            id: 'general',
            path: '/'
        },
        licenses: {
            id: 'licenses',
            path: 'licenses'
        },
        buttons: {
            id: 'buttons'
        }
    }
};

export const oauthStore: configTypes.OauthStoreFlags = {
    code: 'code',
    verify2fa: 'verify2fa'
};

export const permissions: configTypes.Permissions = {
    canViewRelease: 'can_view_release'
};

export const redirect: configTypes.Redirect = {
    authorised: environment.isLocal ? '/settings' : '/systems',
    unauthorised: '/',
    page404: '/404',
    paths: ['/', '/register', '/restore_password', '/activate', '/404']
};

export const search: configTypes.Search = {
    debounceShortTime: 100,
    debounceTime: 500,
    maxLength: 200,
    minSystems: 9 // We need at least 9 system to enable search
};

export const servers: configTypes.Servers = {
    checkStatusTimeout: 3400,
    minLoaderTime: 500,
    port: {
        max: 65535,
        min: 1,
        restrictedMax: 1024
    },
    status: {
        online: 'online',
        offline: 'offline',
        restarting: 'restarting',
        resetting: 'resetting',
        checking: 'checking',
        mismatchedcertificate: 'mismatchedcertificate'
    },
    errors: {
        oldSessionErrorId: 'sessionExpired',
        unauthorized: 'unauthorized'
    }
};

export const toast: configTypes.Toast = {
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'info'
};

export const debug: configTypes.Debug = {
    chunksOnTimeline: false // timeline.js - draw debug events
};

export const webclient: configTypes.Webclient = {
    chunksToCheckFatal: 30,
    disableVolume: true,
    endOfArchiveTime: 30 * 1000,
    flashChromelessDebugPath: 'components/flashlsChromeless_debug.swf',
    flashChromelessPath: 'components/flashlsChromeless.swf',
    hlsLoadingTimeout: 90 * 1000,
    leftPanelPreviewHeight: 128,
    maxCrashCount: 2,
    nativeTimeout: 60 * 1000,
    playerReadyTimeout: 100,
    reloadInterval: 30 * 1000,
    resetDisplayedTextTimer: 3 * 1000,
    // staticResources             : 'static/web_common/',
    skipFramesRenderingTimeline: true,
    // One minute timeout for manifest:
    // * 30 seconds for gateway to open connection
    // * 30 seconds for server to init camera
    // * 20 seconds for chunks
    // * 10 seconds extra
    updateArchiveStateTimeout: 60 * 1000,
    updateArchiveRecordsTimeout: 2 * 1000,
    useServerTime: true,
    useSystemTime: true
};

export const settingsConfig: configTypes.SettingsConfig = {
    auditTrailEnabled: { type: 'checkbox', hiddenInAdvanced: true },
    cameraSettingsOptimization: {
        type: 'checkbox',
        setupWizard: true,
        hiddenInAdvanced: true,
        label: 'Allow device setting optimization'
    },
    cloudConnectUdpHolePunchingEnabled: { type: 'checkbox' },
    defaultMotionMask: '5,0,0,44,32',
    disabledVendors: { type: 'text' },
    ec2AliveUpdateIntervalSec: {
        type: 'number',
        alert: 'Warning! It is highly recommended to keep this value at least 10% greater than "Connection keep alive timeout" x "Connection keep probes"'
    },
    ec2ConnectionKeepAliveTimeoutSec: { type: 'number' },
    ec2KeepAliveProbeCount: { type: 'number' },
    emailFrom: { type: 'text' },
    emailSignature: { type: 'text' },
    emailSupportEmail: { type: 'text' },
    ldapAdminDn: { type: 'text' },
    ldapAdminPassword: { type: 'password' },
    ldapSearchBase: { type: 'text' },
    ldapSearchFilter: { type: 'text' },
    ldapUri: { type: 'text' },
    autoDiscoveryEnabled: {
        type: 'checkbox',
        setupWizard: true,
        hiddenInAdvanced: true,
        label: 'Enable device auto discovery'
    },
    smtpConnectionType: { type: 'text' },
    smtpHost: { type: 'text' },
    smtpPort: { type: 'number' },
    smtpSimple: { type: 'checkbox' },
    smtpTimeout: { type: 'number' },
    smtpPassword: { type: 'password' },
    smtpUser: { type: 'text' },
    updateNotificationsEnabled: { type: 'checkbox' },
    arecontRtspEnabled: { type: 'checkbox' },
    backupNewCamerasByDefault: { type: 'checkbox' },
    statisticsAllowed: {
        type: 'checkbox',
        setupWizard: true,
        hiddenInAdvanced: true,
        label: 'Send anonymous usage statistics and crash reports'
    },
    backupQualities: { type: 'text' },
    serverDiscoveryPingTimeoutSec: { type: 'number' },

    cloudAccountName: { type: 'static' },
    cloudHost: { type: 'static' },
    cloudAuthKey: { type: 'static' },
    cloudSystemID: { type: 'static' },

    systemName: { type: 'text' },

    licenseServer: { type: 'text' },
    newSystem: { type: 'static' },
    proxyConnectTimeoutSec: { type: 'number' },
    crossdomainEnabled: { type: 'checkbox' },
    maxRtspConnectDurationSec: { label: 'Maximum duration for RTSP connection (seconds)', type: 'number' },

    statisticsReportLastNumber: { type: 'static' },
    statisticsReportLastTime: { type: 'static' },
    statisticsReportLastVersion: { type: 'static' },
    statisticsReportServerApi: { type: 'text' },
    statisticsReportTimeCycle: { type: 'number' },
    localSystemId: { type: 'static' },
    systemId: { type: 'static' },
    systemNameForId: { type: 'text' },
    takeCameraOwnershipWithoutLock: { type: 'checkbox' },
    upnpPortMappingEnabled: { type: 'checkbox' },

    trafficEncryptionForced: { type: 'checkbox', hiddenInAdvanced: true },
    videoTrafficEncryptionForced: { type: 'checkbox', hiddenInAdvanced: true },
    updateStatus: { type: 'static' },
    watermarkSettings: { type: 'static' },

    timeSynchronizationEnabled: { type: 'checkbox' },
    primaryTimeServer: { type: 'static' },
    osTimeChangeCheckPeriodMs: { type: 'number' },
    syncTimeExchangePeriod: { type: 'number' },
    syncTimeEpsilon: { type: 'number' },

    maxVirtualCameraArchiveSynchronizationThreads: { type: 'number' },
    maxEventLogRecords: { type: 'number' },

    forceLiveCacheForPrimaryStream: { type: 'text' }
};
