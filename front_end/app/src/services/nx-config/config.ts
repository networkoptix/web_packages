import { IConfig } from './config-types';

export const nxConfig: IConfig = {
    alertTimeout : 3 * 1000, // Alerts are shown for 3 seconds
    animations   : {
        carouselImage: {
            enter : '0.25s ease-in',
            leave : '0.25s ease-out'
        }
    },
    apiBase                       : '/api',
    cameraCredentialUpdateTimeout : 1500,
    cameraSettings                : {
        sensitivityColors: [
            '#FFFFFF', '#627CD6', '#23A4CB', '#31BAA2', '#79BC66', '#B8BC37', '#FBA405', '#E97119', '#D24729', '#C22626'
        ]
    },
    clientMode: {
        beta  : false,
        debug : false
    },
    credentialsValidation: {
        emailRegex           : '^[-!#$%&\'*+/=?^_`{}|~0-9a-zA-Z]+(\\.[-!#$%&\'*+/=?^_`{}|~0-9a-zA-Z]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,63}\\.?$',
        passwordRequirements : {
            maxLength          : 255,
            minClassesCount    : 2,
            minLength          : 8,
            requiredRegex      : '^[\x21-\x7E]$|^[\x21-\x7E][\x20-\x7E]*[\x21-\x7E]$',
            strongClassesCount : 3
        }
    },
    dialogs: {
        message: {
            subjects: {
                integration          : ['sales_inquiry', 'technical_inquiry', 'integration_feedback'],
                ipvd_feedback_page   : ['ipvd_feedback_page'],
                ipvd_feedback_device : ['ipvd_feedback_device']
            },
            type: {
                ipvd_page   : 'ipvd_feedback_page',
                ipvd_device : 'ipvd_feedback_device',
                integration : 'integration',
                unknown     : 'unknown'
            }
        }
    },
    downloads: {
        mobile: [
            {
                name : 'ios',
                os   : 'iOS'
            },
            {
                name : 'android',
                os   : 'Android'
            }
        ],
        groups: {
            windows: {
                name     : 'windows',
                os       : 'windows',
                appTypes : ['bundle', 'client', 'server']
            },
            linux: {
                name     : 'linux',
                os       : 'linux',
                appTypes : ['bundle', 'client', 'server']
            },
            macos: {
                name     : 'macos',
                os       : 'MacOS',
                appTypes : ['client']
            },
            arm: {
                name     : 'arm',
                os       : '',
                appTypes : ['client', 'server']
            },
            sdk: {
                name     : 'sdk',
                os       : '',
                appTypes : ['universal']
            }
        },
        platformMatch: {
            unix    : 'Linux',
            linux   : 'Linux',
            mac     : 'MacOS',
            windows : 'Windows',
            arm     : 'ARM',
            skd     : 'SDK'
        }
    },
    healthMonitoring: {
        staleReportTimeout : 5, // Timeout before ribbon alert to refresh HM
        valueFormats       : {
            '%'              : { multiplier: 100, decimals: 0 },
            TB               : { multiplier: 1 / 1024 ** 4 },
            GB               : { multiplier: 1 / 1024 ** 3 },
            MB               : { multiplier: 1 / 1024 ** 2 },
            KB               : { multiplier: 1 / 1024 },
            B                : { multiplier: 1 },
            // Start deprecated formats
            GBps             : { display: 'GB/s', multiplier: 1 / 1000 ** 3, decimals: 2 },
            MBps             : { display: 'MB/s', multiplier: 1 / 1000 ** 2, decimals: 2 },
            KBps             : { display: 'kB/s', multiplier: 1 / 1000, decimals: 2 },
            Bps              : { display: 'B/s', multiplier: 1, decimals: 0 },
            Gbps             : { display: 'Gbit/s', multiplier: 1 / 1000 ** 3, decimals: 2 },
            Mbps             : { display: 'Mbit/s', multiplier: 1 / 1000 ** 2, decimals: 2 },
            kbps             : { display: 'kbit/s', multiplier: 1 / 1000, decimals: 2 },
            bps              : { display: 'bit/s', multiplier: 1, decimals: 0 },
            'Transactions/s' : { multiplier: 1, decimals: 1 },
            // End deprecated formats
            'TB/s'           : { multiplier: 1 / 1024 ** 4 },
            'GB/s'           : { multiplier: 1 / 1024 ** 3 },
            'MB/s'           : { multiplier: 1 / 1024 ** 2 },
            'KB/s'           : { multiplier: 1 / 1024 },
            'B/s'            : { multiplier: 1 },

            Tbit : { multiplier: 8 * (1 / 1000 ** 4) },
            Gbit : { multiplier: 8 * (1 / 1000 ** 3) },
            Mbit : { multiplier: 8 * (1 / 1000 ** 2) },
            Kbit : { multiplier: 8 * (1 / 1000) },
            bit  : { multiplier: 8 },

            'Tbit/s' : { multiplier: 8 * (1 / 1000 ** 4) },
            'Gbit/s' : { multiplier: 8 * (1 / 1000 ** 3) },
            'Mbit/s' : { multiplier: 8 * (1 / 1000 ** 2) },
            'Kbit/s' : { multiplier: 8 * (1 / 1000) },
            'bit/s'  : { multiplier: 8 },

            'TPix/s' : { multiplier: 1 / 1000 ** 4 },
            'GPix/s' : { multiplier: 1 / 1000 ** 3 },
            'MPix/s' : { multiplier: 1 / 1000 ** 2 },
            'KPix/s' : { multiplier: 1 / 1000 },
            'Tr/s'   : { multiplier: 1 }
        },
        classFormats: {
            resource  : 'long-text',
            longText  : 'long-text',
            shortText : 'short-text',
            text      : 'text',
            number    : '',
            GB        : 'volume-metric',
            KB        : 'volume-metric',
            MB        : 'volume-metric',
            TB        : 'volume-metric',
            '%'       : 'percent',
            'Mpix/s'  : '',
            'MB/s'    : '',
            'Mbit/s'  : '',
            'KB/s'    : '',
            'Kbit/s'  : '',
            'Tr/s'    : '',
            unset     : 'no-max-width'
        }
    },
    icons: {
        default   : '/static/images/integration/integration_tile_preview_plugin.svg',
        platforms : [
            { name: 'mac', src: '/static/images/integration/integration_tile_os_mac.svg' },
            { name: 'android', src: '/static/images/integration/integration_tile_os_android.svg' },
            { name: 'arm', src: '/static/images/integration/integration_tile_os_arm.svg' },
            { name: 'linux', src: '/static/images/integration/integration_tile_os_linux.svg' },
            { name: 'windows', src: '/static/images/integration/integration_tile_os_windows.svg' }
        ],
        dir                   : '/static/images/icons/standard/',
        dirNonStandard        : '/static/images/icons/',
        dirPagePlaceholder    : '/static/images/placeholders/page/',
        dirSectionPlaceholder : '/static/images/placeholders/section/'
    },
    integration: {
        adminLink            : '/admin/cms/asset/%ID%/pages/',
        defaultPlatformNames : {
            'arm-64-file'            : 'ARM 64bit',
            'linux-x64-file'         : 'Linux x64',
            'macos-file'             : 'Mac OS',
            'arm-32-file'            : 'ARM 32bit',
            'windows-x64-file'       : 'Windows x64',
            downloadableInstructions : 'Instructions / Manual'
        },
        embedInfo: {
            vimeo: {
                link  : 'https://player.vimeo.com/video/',
                regex : '^https?:\\/\\/vimeo\\.com\\/([\\d]+)$'
            },
            youtube: {
                link  : 'https://www.youtube.com/embed/',
                // eslint-disable-next-line no-useless-escape
                regex : '^https?:\\/\\/(?:www\\.youtube\\.com\\/(?:embed\\/|watch\\?v=)|youtu\\.be\\/)([\\w\-]+)$'
            }
        },
        filter: {
            items      : '',
            limitation : ''
        },
        myTagId: 'mine'
    },
    ipvd: {
        pagerMaxSizeMedium               : 3,
        pagerMaxSize                     : 4,
        firmwaresToShow                  : 4,
        analyticsToShow                  : 4,
        sortSupportedDevicesByPopularity : '',
        supportedResolutions             : '',
        supportedHardwareTypes           : [''],
        searchTags                       : '',
        vendorsShown                     : 0
    },
    layout: {
        table: {
            rows: 10
        },
        tableLarge: {
            rows: 20
        }
    },
    maintenanceTimeout : 60 * 1000,
    maxServers         : 100, // The maximum amount of server that can be in a system
    meta               : {
        viewport: {
            default       : 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no',
            desktopLayout : 'width=768, maximum-scale=1, user-scalable=yes, shrink-to-fit=no'
        }
    },
    menus: {
        account: {
            baseUrl  : '/account',
            icon     : 'glyphicon-user',
            settings : {
                id   : 'settings',
                path : ''
            },
            password: {
                id   : 'password',
                path : '/password'
            }
        },
        systemHealth: {
            baseUrl: '/health/'
        },
        systemSettings: {
            baseUrl : '/systems/',
            admin   : {
                id   : 'admin',
                icon : 'systems',
                path : ''
            },
            cloudStorage: {
                id   : 'cloudStorage',
                path : 'cloud-storage'
            },
            users: {
                id   : 'users',
                icon : 'users',
                path : 'users'
            },
            servers: {
                id   : 'servers',
                icon : 'servers',
                path : 'servers'
            },
            cameras: {
                id          : 'cameras',
                icon        : 'cameras',
                path        : 'cameras',
                statusIcons : {
                    archive      : 'camera_archive',
                    offline      : 'camera_offline',
                    recording    : 'camera_recording',
                    scheduled    : 'camera_scheduled',
                    unauthorized : 'camera_unauthorized',
                    online       : ''
                }
            },
            general: {
                id   : 'general',
                path : '/'
            },
            licenses: {
                id   : 'licenses',
                path : 'licenses'
            },
            buttons: {
                id: 'buttons'
            }
        }
    },
    permissions: {
        canViewRelease: 'can_view_release'
    },
    redirect: {
        authorised   : '/systems', // Page for redirecting all authorised users
        unauthorised : '/', // Page for redirecting all unauthorised users by default
        page404      : '/404',
        paths        : ['/', '/register', '/restore_password', '/activate', '/404']
    },
    showHeaderAndFooter : true,
    search              : {
        debounceTime : 500, // ms
        maxLength    : 200,
        minSystems   : 9 // We need at least 9 system to enable search
    },
    servers: {
        checkStatusTimeout : 3400,
        minLoaderTime      : 500,
        port               : {
            max           : 65535,
            min           : 1,
            restrictedMax : 1024
        },
        status: {
            online     : 'online',
            offline    : 'offline',
            restarting : 'restarting',
            reseting   : 'reseting',
            checking   : 'checking'
        }
    },
    system: {
        flags: {
            newSystem: 'SF_NewSystem'
        },
        status: {
            online  : 'online',
            default : {
                style: 'default'
            },
            offline: {
                style: 'default'
            },
            unavailable: {
                style: 'default'
            },
            master : 'master',
            slave  : 'slave'
        },
        auditTime: 500
    },
    toast: {
        success : 'success',
        warning : 'warning',
        danger  : 'danger',
        info    : 'info'
    },

    // Dynamic from cloud_portal
    cloudCapabilities: {
        feedbackEnabled           : '',
        healthMonitor             : '',
        integrationStore          : '',
        publicDownloads           : '',
        publicReleases            : '',
        cloudStorageEnabled       : '',
        cloudStorageSize          : 0,
        healthMonitorCacheTimeout : 60
    },
    cloudName : '',
    company   : {
        copyrightYear : '',
        links         : {
            privacy : '',
            support : '',
            website : ''
        },
        name: ''
    },
    footerItems          : '',
    googleTagManagerId   : '',
    trialLicenseKey      : '',
    licenseDeactivations : 3,
    pushConfig           : '',
    trafficRelayHost     : '',
    vmsName              : '',
    // End of dynamic config

    // Legacy webadmin config
    accessRoles: {
        adminAccess               : ['cloudadmin', 'owner', 'administrator'],
        unshare                   : 'none',
        default                   : 'Viewer',
        custom                    : 'custom',
        editUserPermissionFlag    : 'GlobalAdminPermission',
        editCameraPermissionFlag  : 'GlobalEditCamerasPermission',
        globalAdminPermissionFlag : 'GlobalAdminPermission',
        allMediaPermissionFlag    : 'GlobalAccessAllMediaPermission',
        customPermission          : {
            name        : 'Custom',
            permissions : 'NoPermission'
        },
        predefinedRoles: [
            {
                isOwner     : true,
                name        : 'Owner',
                permissions : 'GlobalAdminPermission|GlobalEditCamerasPermission|GlobalControlVideoWallPermission|GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission'
            },
            {
                name        : 'Administrator',
                permissions : 'GlobalAdminPermission|GlobalEditCamerasPermission|GlobalControlVideoWallPermission|GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission'
            },
            {
                name        : 'Advanced Viewer',
                permissions : 'GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission'
            },
            {
                name        : 'Viewer',
                permissions : 'GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission'
            },
            {
                name        : 'Live Viewer',
                permissions : 'GlobalAccessAllMediaPermission'
            },
            {
                name        : 'Custom',
                permissions : 'NoPermission'
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
    allowBetaMode  : false,
    allowDebugMode : false,
    debug          : {
        chunksOnTimeline: false // timeline.js - draw debug events
    },
    gatewayUrl                  : '/gateway',
    globalViewArchivePermission : 'GlobalViewArchivePermission',
    openClientTimeout           : 20 * 1000, // 20 seconds we wait for client to open
    openClientError             : 'notVisited',
    openMobileClientTimeout     : 300, // 300ms for mobile browsers
    responseOk                  : 'ok',
    timelineMouseEventTimeout   : 300, // milliseconds
    updateInterval              : 30 * 1000, // Update content on pages every 30 seconds
    webclient                   : {
        chunksToCheckFatal          : 30, // This is used in short cache when requesting chunks for jumpToPosition in timeline directive
        disableVolume               : true,
        endOfArchiveTime            : 30 * 1000,
        flashChromelessDebugPath    : 'components/flashlsChromeless_debug.swf',
        flashChromelessPath         : 'components/flashlsChromeless.swf',
        hlsLoadingTimeout           : 90 * 1000,
        leftPanelPreviewHeight      : 128,
        maxCrashCount               : 2,
        nativeTimeout               : 60 * 1000,
        playerReadyTimeout          : 100,
        reloadInterval              : 30 * 1000,
        resetDisplayedTextTimer     : 3 * 1000,
        staticResources             : 'static/web_common/',
        skipFramesRenderingTimeline : true,
        // One minute timeout for manifest:
        // * 30 seconds for gateway to open connection
        // * 30 seconds for server to init camera
        // * 20 seconds for chunks
        // * 10 seconds extra
        updateArchiveStateTimeout   : 60 * 1000,
        updateArchiveRecordsTimeout : 2 * 1000,
        useServerTime               : true,
        useSystemTime               : true
    },
    settingsConfig: {
        auditTrailEnabled          : { type: 'checkbox' },
        cameraSettingsOptimization : { type: 'checkbox', setupWizard: true },
        defaultMotionMask          : '5,0,0,44,32',
        disabledVendors            : { type: 'text' },
        ec2AliveUpdateIntervalSec  : {
            type  : 'number',
            alert : 'Warning! It is highly recommended to keep this value at least 10% greater than "Connection keep alive timeout" x "Connection keep probes"'
        },
        ec2ConnectionKeepAliveTimeoutSec : { type: 'number' },
        ec2KeepAliveProbeCount           : { type: 'number' },
        emailFrom                        : { type: 'text' },
        emailSignature                   : { type: 'text' },
        emailSupportEmail                : { type: 'text' },
        ldapAdminDn                      : { type: 'text' },
        ldapAdminPassword                : { type: 'password' },
        ldapSearchBase                   : { type: 'text' },
        ldapSearchFilter                 : { type: 'text' },
        ldapUri                          : { type: 'text' },
        autoDiscoveryEnabled             : { type: 'checkbox', setupWizard: true },
        smtpConnectionType               : { type: 'text' },
        smtpHost                         : { type: 'text' },
        smtpPort                         : { type: 'number' },
        smtpSimple                       : { type: 'checkbox' },
        smtpTimeout                      : { type: 'number' },
        smtpPassword                     : { type: 'password' },
        smtpUser                         : { type: 'text' },
        updateNotificationsEnabled       : { type: 'checkbox' },
        arecontRtspEnabled               : { type: 'checkbox' },
        backupNewCamerasByDefault        : { type: 'checkbox' },
        statisticsAllowed                : { type: 'checkbox', setupWizard: true },
        backupQualities                  : { type: 'text' },
        serverDiscoveryPingTimeoutSec    : { type: 'number' },

        cloudAccountName : { type: 'static' },
        cloudHost        : { type: 'static' },
        cloudAuthKey     : { type: 'static' },
        cloudSystemID    : { type: 'static' },

        systemName: { type: 'text' },

        newSystem                 : { type: 'static' },
        proxyConnectTimeoutSec    : { type: 'number' },
        crossdomainEnabled        : { type: 'checkbox' },
        maxRtspConnectDurationSec : { label: 'Maximum duration for RTSP connection (seconds)', type: 'number' },

        statisticsReportLastNumber     : { type: 'static' },
        statisticsReportLastTime       : { type: 'static' },
        statisticsReportLastVersion    : { type: 'static' },
        statisticsReportServerApi      : { type: 'text' },
        statisticsReportTimeCycle      : { type: 'number' },
        localSystemId                  : { type: 'static' },
        systemId                       : { type: 'static' },
        systemNameForId                : { type: 'text' },
        takeCameraOwnershipWithoutLock : { type: 'checkbox' },
        upnpPortMappingEnabled         : { type: 'checkbox' },

        trafficEncryptionForced      : { type: 'checkbox' },
        videoTrafficEncryptionForced : { type: 'checkbox' },
        updateStatus                 : { type: 'static' },
        watermarkSettings            : { type: 'static' },

        timeSynchronizationEnabled : { type: 'checkbox' },
        primaryTimeServer          : { type: 'static' },
        osTimeChangeCheckPeriodMs  : { type: 'number' },
        syncTimeExchangePeriod     : { type: 'number' },
        syncTimeEpsilon            : { type: 'number' },

        maxWearableArchiveSynchronizationThreads : { type: 'number' },
        maxEventLogRecords                       : { type: 'number' },

        forceLiveCacheForPrimaryStream: { type: 'text' }
    }
};
