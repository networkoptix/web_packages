import metaDefaults from '@common/scripts/metaDefaults.json';
import { environment } from '@environments/environment';
import { FeatureFlagStrings } from '@services/nx-config/base-config';

import { IConfig } from './config-types';

export const nxConfig: IConfig = {
    isInIframe: false,
    allowDebugMode: false,
    browserNotSupported: false,
    defaultLanguage: 'en_US',
    customization: 'default',
    accountDropdown: [
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
    ],
    accountDropdownStaff: [
        {
            name: 'Administration',
            route: '/admin/',
            newWindow: true
        }
    ],
    downloads: {
        mobile: [
            {
                name: 'ios',
                os: 'iOS'
            },
            {
                name: 'android',
                os: 'Android'
            }
        ],
        groups: {
            windows: {
                name: 'windows',
                os: 'windows',
                appTypes: ['bundle', 'client', 'server']
            },
            linux: {
                name: 'linux',
                os: 'linux',
                appTypes: ['bundle', 'client', 'server']
            },
            macos: {
                name: 'macos',
                os: 'MacOS',
                appTypes: ['client']
            },
            arm: {
                name: 'arm',
                os: '',
                appTypes: ['client', 'server']
            },
            sdk: {
                name: 'sdk',
                os: '',
                appTypes: ['universal']
            }
        },
        platformMatch: {
            unix: 'Linux',
            linux: 'Linux',
            mac: 'MacOS',
            windows: 'Windows',
            arm: 'ARM',
            skd: 'SDK'
        }
    },
    integration: {
        adminLink: '/admin/cms/asset/%ID%/pages/',
        defaultPlatformNames: {
            'arm-64-file': 'ARM 64bit',
            'linux-x64-file': 'Linux x64',
            'macos-file': 'Mac OS',
            'arm-32-file': 'ARM 32bit',
            'windows-x64-file': 'Windows x64',
            downloadableInstructions: 'Instructions / Manual'
        },
        embedInfo: {
            vimeo: {
                link: 'https://player.vimeo.com/video/',
                regex: 'https?:\\/\\/(?:www.)?vimeo.com\\/([0-9]{9})'
            },
            youtube: {
                link: 'https://www.youtube.com/embed/',
                // eslint-disable-next-line no-useless-escape
                regex: '(?:https?:\\/\\/)(?:www.)youtube.com\\/(?:watch[?]v=|embed\\/)([\\w-]{11})([&=\\w-]?){0,}'
            }
        },
        filter: {
            items: '',
            limitation: ''
        },
        myTagId: 'mine'
    },
    ipvd: {
        pagerMaxSizeMedium: 3,
        pagerMaxSize: 4,
        firmwaresToShow: 4,
        analyticsToShow: 4,
        sortSupportedDevicesByPopularity: '',
        supportedResolutions: [],
        supportedHardwareTypes: [],
        searchTags: [],
        vendorsShown: 0
    },
    isLocal: environment.isLocal,
    isDarkTheme: false,
    landing: {
        description: ''
    },
    licenseServer: '',
    newSystem: false,
    serverDocumentation: {
        windowsPath: 'HKEY_LOCAL_MACHINE\SOFTWARE\{VMS Vendor}\{VMS Vendor}',
        defaultPath: '/opt/{vmsvendor}/mediaserver/etc/mediaserver.conf.',
        tableHeaders: ['Name', 'Description', 'Default Value']
    },
    headerHeight: 48,
    moreResultsHeight: 60,
    supportedLanguages: [],
    system: {
        flags: {
            newSystem: 'SF_NewSystem'
        },
        name: '',
        status: {
            online: 'online',
            default: {
                style: 'default'
            },
            offline: {
                style: 'default'
            },
            unavailable: {
                style: 'default'
            },
            master: 'master',
            slave: 'slave'
        },
        auditTime: 500
    },

    // Dynamic from cloud_portal
    cloudCapabilities: {
        alexaIntegrationEnabled: false,
        bookmarksEnabled: false,
        developersEnabled: false,
        feedbackEnabled: false,
        healthMonitor: '',
        integrationStore: false,
        publicDownloads: false,
        publicReleases: false,
        cloudStorageEnabled: false,
        cloudStorageSize: 0,
        healthMonitorCacheTimeout: 60,
        customClientsEnabled: false
    },
    cloudMonitoring: {
        fullStory: '',
        isFullStoryActive: false
    },
    cloudName: '',
    cloudHost: '',
    cloudSystemId: '',
    featureFlags: {},
    featureFlagStrings: FeatureFlagStrings,
    localSystemId: '',
    localServerId: '',
    company: {
        copyrightYear: '',
        links: {
            privacy: '',
            support: '',
            website: ''
        },
        name: ''
    },
    dynamicMenus: {},
    docMenuMap: {},
    licenseTypes: [],
    googleTagManagerId: '',
    trialLicenseKey: '',
    pushConfig: '',
    testedOperatingSystems: {},
    trafficRelayHost: '',
    vmsName: '',
    // End of dynamic config
    // Legacy webadmin config
    accessRoles: {
        adminAccess: ['cloudadmin', 'owner', 'administrator'],
        unshare: 'none',
        default: 'Viewer',
        custom: 'custom',
        editUserPermissionFlag: 'GlobalAdminPermission',
        editCameraPermissionFlag: 'GlobalEditCamerasPermission',
        exportPermissionFlag: 'GlobalExportPermission',
        globalAdminPermissionFlag: 'GlobalAdminPermission',
        allMediaPermissionFlag: 'GlobalAccessAllMediaPermission',
        viewArchivesPermissionFlag: 'GlobalViewArchivePermission',
        customPermission: {
            name: 'Custom',
            permissions: 'NoPermission'
        },
        predefinedRoles: [
            {
                isOwner: true,
                name: 'Owner',
                permissions: 'GlobalAdminPermission|GlobalEditCamerasPermission|GlobalControlVideoWallPermission|GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission'
            },
            {
                name: 'Administrator',
                permissions: 'GlobalAdminPermission|GlobalEditCamerasPermission|GlobalControlVideoWallPermission|GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission'
            },
            {
                name: 'Advanced Viewer',
                permissions: 'GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission'
            },
            {
                name: 'Viewer',
                permissions: 'GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission'
            },
            {
                name: 'Live Viewer',
                permissions: 'GlobalAccessAllMediaPermission'
            },
            {
                name: 'Custom',
                permissions: 'NoPermission'
            }
        ],
        order: [
            'Live Viewer',
            'liveViewer',
            'Viewer',
            'viewer',
            'Advanced Viewer',
            'advancedViewer',
            'Cloud Administrator',
            'cloudAdmin',
            'Administrator',
            'admin',
            'Owner',
            'owner'
        ]
    },
    metaDefaults,
    webadminRoutesLookup: [
        [/^developers\/events/g, '/api-tool/api-createevent-post'],
        [/^developers\/changelog/g, '/api-tool/changelog'],
        [/^developers/g, '/api-tool'],
        [/^advanced/g, '/settings/advanced'],
        [/^settings\/server/g, '/settings/servers'],
        [/^settings\/system/g, '/settings'],
        [/^help/g, 'supportLink'],
        [/^info/g, '/health']
        // [/^another/g, '/another-redirect', 'redirects.customMessage'] Example with custom translated message
    ],
    themeConfig: {
        default: 'auto',
        dark: 'dark',
        light: 'light',
    }

};
