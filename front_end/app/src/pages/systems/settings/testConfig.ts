import { IConfig } from '../../../services/nx-config';

export function setupConfig(): IConfig {
    return {
        "alertTimeout": 3000,
        "animations": {
        "carouselImage": {
            "enter": "0.25s ease-in",
            "leave": "0.25s ease-out"
        }
        },
        "apiBase": "/api",
        "cameraCredentialUpdateTimeout": 1500,
        "cameraSettings": {
        "sensitivityColors": [
            "#FFFFFF",
            "#627CD6",
            "#23A4CB",
            "#31BAA2",
            "#79BC66",
            "#B8BC37",
            "#FBA405",
            "#E97119",
            "#D24729",
            "#C22626"
        ]
        },
        "clientMode": {
        "beta": false,
        "debug": false
        },
        "credentialsValidation": {
        "emailRegex": "^[-!#$%&'*+/=?^_`{}|~0-9a-zA-Z]+(\\.[-!#$%&'*+/=?^_`{}|~0-9a-zA-Z]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,63}\\.?$",
        "passwordRequirements": {
            "maxLength": 255,
            "minClassesCount": 2,
            "minLength": 8,
            "requiredRegex": "^[!-~]$|^[!-~][ -~]*[!-~]$",
            "strongClassesCount": 3
        }
        },
        "defaultLanguage": "en_US",
        "dialogs": {
        "message": {
            "subjects": {
            "integration": [
                "sales_inquiry",
                "technical_inquiry",
                "integration_feedback"
            ],
            "ipvd_feedback_page": [
                "ipvd_feedback_page"
            ],
            "ipvd_feedback_device": [
                "ipvd_feedback_device"
            ]
            },
            "type": {
            "ipvd_page": "ipvd_feedback_page",
            "ipvd_device": "ipvd_feedback_device",
            "integration": "integration",
            "unknown": "unknown"
            }
        }
        },
        "downloads": {
        "mobile": [
            {
            "name": "ios",
            "os": "iOS"
            },
            {
            "name": "android",
            "os": "Android"
            }
        ],
        "groups": {
            "windows": {
            "name": "windows",
            "os": "windows",
            "appTypes": [
                "bundle",
                "client",
                "server"
            ]
            },
            "linux": {
            "name": "linux",
            "os": "linux",
            "appTypes": [
                "bundle",
                "client",
                "server"
            ]
            },
            "macos": {
            "name": "macos",
            "os": "MacOS",
            "appTypes": [
                "client"
            ]
            },
            "arm": {
            "name": "arm",
            "os": "",
            "appTypes": [
                "client",
                "server"
            ]
            },
            "sdk": {
            "name": "sdk",
            "os": "",
            "appTypes": [
                "metadata_sdk",
                "storage_sdk",
                "video_source_sdk"
            ]
            }
        },
        "platformMatch": {
            "unix": "Linux",
            "linux": "Linux",
            "mac": "MacOS",
            "windows": "Windows",
            "arm": "ARM",
            "skd": "SDK"
        }
        },
        "healthMonitoring": {
        "staleReportTimeout": 5,
        "valueFormats": {
            "%": {
            "multiplier": 100,
            "decimals": 0
            },
            "TB": {
            "multiplier": 9.094947017729282e-13
            },
            "GB": {
            "multiplier": 9.313225746154785e-10
            },
            "MB": {
            "multiplier": 9.5367431640625e-7
            },
            "KB": {
            "multiplier": 0.0009765625
            },
            "B": {
            "multiplier": 1
            },
            "GBps": {
            "display": "GB/s",
            "multiplier": 1e-9,
            "decimals": 2
            },
            "MBps": {
            "display": "MB/s",
            "multiplier": 0.000001,
            "decimals": 2
            },
            "KBps": {
            "display": "kB/s",
            "multiplier": 0.001,
            "decimals": 2
            },
            "Bps": {
            "display": "B/s",
            "multiplier": 1,
            "decimals": 0
            },
            "Gbps": {
            "display": "Gbit/s",
            "multiplier": 1e-9,
            "decimals": 2
            },
            "Mbps": {
            "display": "Mbit/s",
            "multiplier": 0.000001,
            "decimals": 2
            },
            "kbps": {
            "display": "kbit/s",
            "multiplier": 0.001,
            "decimals": 2
            },
            "bps": {
            "display": "bit/s",
            "multiplier": 1,
            "decimals": 0
            },
            "Transactions/s": {
            "multiplier": 1,
            "decimals": 1
            },
            "TB/s": {
            "multiplier": 9.094947017729282e-13
            },
            "GB/s": {
            "multiplier": 9.313225746154785e-10
            },
            "MB/s": {
            "multiplier": 9.5367431640625e-7
            },
            "KB/s": {
            "multiplier": 0.0009765625
            },
            "B/s": {
            "multiplier": 1
            },
            "Tbit": {
            "multiplier": 8e-12
            },
            "Gbit": {
            "multiplier": 8e-9
            },
            "Mbit": {
            "multiplier": 0.000008
            },
            "Kbit": {
            "multiplier": 0.008
            },
            "bit": {
            "multiplier": 8
            },
            "Tbit/s": {
            "multiplier": 8e-12
            },
            "Gbit/s": {
            "multiplier": 8e-9
            },
            "Mbit/s": {
            "multiplier": 0.000008
            },
            "Kbit/s": {
            "multiplier": 0.008
            },
            "bit/s": {
            "multiplier": 8
            },
            "TPix/s": {
            "multiplier": 1e-12
            },
            "GPix/s": {
            "multiplier": 1e-9
            },
            "MPix/s": {
            "multiplier": 0.000001
            },
            "KPix/s": {
            "multiplier": 0.001
            },
            "Tr/s": {
            "multiplier": 1
            }
        },
        "classFormats": {
            "resource": "long-text",
            "longText": "long-text",
            "shortText": "short-text",
            "text": "text",
            "number": "",
            "GB": "volume-metric",
            "KB": "volume-metric",
            "MB": "volume-metric",
            "TB": "volume-metric",
            "%": "percent",
            "Mpix/s": "",
            "MB/s": "",
            "Mbit/s": "",
            "KB/s": "",
            "Kbit/s": "",
            "Tr/s": "",
            "unset": "no-max-width"
        }
        },
        "icons": {
        "default": "/static/images/integration/integration_tile_preview_plugin.svg",
        "platforms": [
            {
            "name": "mac",
            "src": "/static/images/integration/integration_tile_os_mac.svg"
            },
            {
            "name": "android",
            "src": "/static/images/integration/integration_tile_os_android.svg"
            },
            {
            "name": "arm",
            "src": "/static/images/integration/integration_tile_os_arm.svg"
            },
            {
            "name": "linux",
            "src": "/static/images/integration/integration_tile_os_linux.svg"
            },
            {
            "name": "windows",
            "src": "/static/images/integration/integration_tile_os_windows.svg"
            }
        ],
        "dir": "/static/images/icons/standard/",
        "dirButtons": "/static/images/icons/buttons/",
        "dirNonStandard": "/static/images/icons/",
        "dirPagePlaceholder": "/static/images/placeholders/page/",
        "dirSectionPlaceholder": "/static/images/placeholders/section/"
        },
        "integration": {
        "adminLink": "/admin/cms/asset/%ID%/pages/",
        "defaultPlatformNames": {
            "arm-64-file": "ARM 64bit",
            "linux-x64-file": "Linux x64",
            "macos-file": "Mac OS",
            "arm-32-file": "ARM 32bit",
            "windows-x64-file": "Windows x64",
            "downloadableInstructions": "Instructions / Manual"
        },
        "embedInfo": {
            "vimeo": {
            "link": "https://player.vimeo.com/video/",
            "regex": "^https?:\\/\\/vimeo\\.com\\/([\\d]+)$"
            },
            "youtube": {
            "link": "https://www.youtube.com/embed/",
            "regex": "^https?:\\/\\/(?:www\\.youtube\\.com\\/(?:embed\\/|watch\\?v=)|youtu\\.be\\/)([\\w-]+)$"
            }
        },
        "filter": {
            "items": [
            {
                "id": "access",
                "name": "Access Control",
                "enabled": false
            },
            {
                "id": "connector",
                "name": "Connector",
                "enabled": false
            },
            {
                "id": "analytics",
                "name": "Data Analytics",
                "enabled": false
            },
            {
                "id": "drone",
                "name": "Drone",
                "enabled": false
            },
            {
                "id": "health",
                "name": "Health Monitor",
                "enabled": false
            },
            {
                "id": "storage",
                "name": "Storage",
                "enabled": false
            },
            {
                "id": "mine",
                "name": "My Integrations",
                "enabled": false
            }
            ],
            "limitation": "3"
        },
        "myTagId": "mine"
        },
        "ipvd": {
        "pagerMaxSizeMedium": 3,
        "pagerMaxSize": 4,
        "firmwaresToShow": 4,
        "analyticsToShow": 4,
        "sortSupportedDevicesByPopularity": false,
        "supportedResolutions": [
            {
            "value": "0",
            "name": "All"
            },
            {
            "value": "84480",
            "name": "1CIF"
            },
            {
            "value": "168960",
            "name": "2CIF"
            },
            {
            "value": "337920",
            "name": "D1"
            },
            {
            "value": "307200",
            "name": "VGA"
            },
            {
            "value": "786432",
            "name": "SVGA"
            },
            {
            "value": "921600",
            "name": "720p"
            },
            {
            "value": "1310720",
            "name": "1mp"
            },
            {
            "value": "2073600",
            "name": "1080p"
            },
            {
            "value": "1920000",
            "name": "2mp"
            },
            {
            "value": "3145728",
            "name": "3mp"
            },
            {
            "value": "4915200",
            "name": "5mp"
            },
            {
            "value": "8000000",
            "name": "8mp"
            },
            {
            "value": "10039296",
            "name": "10mp"
            }
        ],
        "supportedHardwareTypes": [
            {
            "id": "camera",
            "label": "Camera"
            },
            {
            "id": "multiSensorCamera",
            "label": "Multi-Sensor Camera"
            },
            {
            "id": "encoder",
            "label": "Encoder"
            },
            {
            "id": "dvr",
            "label": "DVR"
            },
            {
            "id": "other",
            "label": "Other"
            }
        ],
        "searchTags": [
            {
            "id": "isAudioSupported",
            "value": false
            },
            {
            "id": "isTwAudioSupported",
            "value": false
            },
            {
            "id": "isPtzSupported",
            "value": false
            },
            {
            "id": "isAptzSupported",
            "value": false
            },
            {
            "id": "isFisheye",
            "value": false
            },
            {
            "id": "isMdSupported",
            "value": false
            },
            {
            "id": "isIoSupported",
            "value": false
            },
            {
            "id": "isH265",
            "value": false
            },
            {
            "id": "isMultiSensor",
            "value": false
            },
            {
            "id": "isAnalyticsSupported",
            "value": true
            }
        ],
        "vendorsShown": 30
        },
        "isInIframe": false,
        "isLocal": false,
        "layout": {
        "table": {
            "rows": 10
        },
        "tableLarge": {
            "rows": 20
        }
        },
        "maintenanceTimeout": 60000,
        "maxServers": 100,
        "meta": {
        "viewport": {
            "default": "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no",
            "desktopLayout": "width=768, maximum-scale=1, user-scalable=yes, shrink-to-fit=no"
        }
        },
        "menus": {
        "account": {
            "baseUrl": "/account",
            "icon": "glyphicon-user",
            "settings": {
            "id": "settings",
            "path": ""
            },
            "password": {
            "id": "password",
            "path": "/password"
            }
        },
        "systemHealth": {
            "baseUrl": "/health/"
        },
        "systemSettings": {
            "baseUrl": "/systems/",
            "admin": {
            "id": "admin",
            "icon": "systems",
            "path": ""
            },
            "cloudStorage": {
            "id": "cloudStorage",
            "path": "cloud-storage"
            },
            "users": {
            "id": "users",
            "icon": "users",
            "path": "users"
            },
            "servers": {
            "id": "servers",
            "icon": "servers",
            "path": "servers"
            },
            "cameras": {
            "id": "cameras",
            "icon": "cameras",
            "path": "cameras",
            "statusIcons": {
                "archive": "camera_archive",
                "offline": "camera_offline",
                "recording": "camera_recording",
                "scheduled": "camera_scheduled",
                "unauthorized": "camera_unauthorized",
                "online": ""
            }
            },
            "general": {
            "id": "general",
            "path": "/"
            },
            "licenses": {
            "id": "licenses",
            "path": "licenses"
            },
            "buttons": {
            "id": "buttons"
            }
        }
        },
        "newSystem": false,
        "permissions": {
        "canViewRelease": "can_view_release"
        },
        "redirect": {
        "authorised": "/systems",
        "unauthorised": "/",
        "page404": "/404",
        "paths": [
            "/",
            "/register",
            "/restore_password",
            "/activate",
            "/404"
        ]
        },
        "showHeaderAndFooter": true,
        "headerHeight": 48,
        "ribbonHeight": 33,
        "search": {
        "debounceTime": 500,
        "maxLength": 200,
        "minSystems": 9
        },
        "servers": {
        "checkStatusTimeout": 3400,
        "minLoaderTime": 500,
        "port": {
            "max": 65535,
            "min": 1,
            "restrictedMax": 1024
        },
        "status": {
            "online": "online",
            "offline": "offline",
            "restarting": "restarting",
            "resetting": "resetting",
            "checking": "checking"
        }
        },
        "supportedLanguages": [],
        "system": {
        "flags": {
            "newSystem": "SF_NewSystem"
        },
        "status": {
            "online": "online",
            "default": {
            "style": "default"
            },
            "offline": {
            "style": "default"
            },
            "unavailable": {
            "style": "default"
            },
            "master": "master",
            "slave": "slave"
        },
        "auditTime": 500
        },
        "toast": {
        "success": "success",
        "warning": "warning",
        "danger": "danger",
        "info": "info"
        },
        "cloudCapabilities": {
        "feedbackEnabled": true,
        "integrationStore": true,
        "publicDownloads": false,
        "publicReleases": false,
        "cloudStorageEnabled": true,
        "cloudStorageSize": "53687091200"
        },
        "cloudName": "Cloud",
        "cloudHost": "",
        "cloudSystemId": "",
        "localSystemId": "",
        "company": {
        "copyrightYear": "2019",
        "links": {
            "privacy": "/content/privacy",
            "support": "http://support.networkoptix.com",
            "website": "http://networkoptix.com"
        },
        "name": "Network Optix"
        },
        "dynamicMenus": {
        "Header": [
            {
            "name": "For Developers",
            "url": "",
            "new_window": false,
            "icon": "",
            "authentication": "Both",
            "order": 0,
            "display_name": "For Developers",
            "nodes": [
                {
                "name": "Knowlege Base",
                "url": "developers/knowledge-base",
                "new_window": false,
                "icon": "",
                "authentication": "Both",
                "order": 0,
                "display_name": "Knowledge Base"
                },
                {
                "name": "Developer Tools",
                "url": "https://support.networkoptix.com/hc/en-us/sections/360007229354-Developer-Tools",
                "new_window": true,
                "icon": "",
                "authentication": "Both",
                "order": 1,
                "display_name": "Developer Tools"
                },
                {
                "name": "Developers Support",
                "url": "https://support.networkoptix.com/hc/en-us/community/topics/115000552988-Developer-Forum",
                "new_window": true,
                "icon": "",
                "authentication": "Both",
                "order": 2,
                "display_name": "Developers Support"
                },
                {
                "name": "API Documentation",
                "url": "https://support.networkoptix.com/hc/en-us/articles/219573367-Nx-Server-HTTP-REST-API",
                "new_window": true,
                "icon": "",
                "authentication": "Both",
                "order": 3,
                "display_name": "API Documentation"
                }
            ]
            },
            {
            "name": "Services",
            "url": "",
            "new_window": false,
            "icon": "",
            "authentication": "Both",
            "order": 1,
            "display_name": "Services",
            "nodes": [
                {
                "name": "Downloads",
                "url": "/download",
                "new_window": false,
                "icon": "",
                "authentication": "Both",
                "order": 0,
                "display_name": "Downloads"
                },
                {
                "name": "Supported Devices",
                "url": "/ipvd",
                "new_window": false,
                "icon": "",
                "authentication": "Both",
                "order": 1,
                "display_name": "Supported Devices"
                },
                {
                "name": "Health Report Viewer",
                "url": "",
                "new_window": false,
                "icon": "",
                "authentication": "Both",
                "order": 2,
                "display_name": "Health Report Viewer"
                }
            ]
            },
            {
            "name": "External Links",
            "url": "",
            "new_window": false,
            "icon": "",
            "authentication": "Both",
            "order": 2,
            "display_name": "External Links",
            "nodes": [
                {
                "name": "Support",
                "url": "http://support.networkoptix.com",
                "new_window": true,
                "icon": "",
                "authentication": "Both",
                "order": 1,
                "display_name": "Support"
                },
                {
                "name": "Privacy Policy",
                "url": "/content/privacy",
                "new_window": false,
                "icon": "",
                "authentication": "Both",
                "order": 3,
                "display_name": "Privacy Policy"
                }
            ]
            }
        ],
        "Footer": [
            {
            "name": "About Cloud",
            "url": "/content/about",
            "new_window": false,
            "icon": "",
            "authentication": "Both",
            "order": 1,
            "display_name": "About Cloud"
            },
            {
            "name": "Download Witness",
            "url": "/download",
            "new_window": false,
            "icon": "",
            "authentication": "Both",
            "order": 2,
            "display_name": "Download Witness"
            },
            {
            "name": "Integrations",
            "url": "/integrations",
            "new_window": false,
            "icon": "",
            "authentication": "Both",
            "order": 3,
            "display_name": "Integrations"
            },
            {
            "name": "Support",
            "url": "http://support.networkoptix.com",
            "new_window": true,
            "icon": "",
            "authentication": "Both",
            "order": 5,
            "display_name": "Support"
            },
            {
            "name": "Terms",
            "url": "/content/eula",
            "new_window": false,
            "icon": "",
            "authentication": "Both",
            "order": 6,
            "display_name": "Terms"
            },
            {
            "name": "Privacy",
            "url": "/content/privacy",
            "new_window": true,
            "icon": "",
            "authentication": "Both",
            "order": 7,
            "display_name": "Privacy"
            },
            {
            "name": "Supported Devices",
            "url": "/ipvd",
            "new_window": false,
            "icon": "",
            "authentication": "Both",
            "order": 8,
            "display_name": "Supported Devices"
            }
        ],
        "KnowledgeBase": [],
        "Developers About Page": []
        },
        "googleTagManagerId": "GTM-5MRNWP",
        "trialLicenseKey": "",
        "licenseDeactivations": 3,
        "pushConfig": {
        "apiKey": "AIzaSyA8bA6jCS4GnzmfGEg_I6mQyG5JIBKFrLI",
        "authDomain": "nx-push-test.firebaseapp.com",
        "databaseURL": "https://nx-push-test.firebaseio.com",
        "projectId": "nx-push-test",
        "storageBucket": "nx-push-test.appspot.com",
        "messagingSenderId": "627461092708",
        "appId": "1:627461092708:web:1b140238961b4213"
        },
        "testedOperatingSystems": {
        "arm": "<a href='/content/arm'>ARM based servers support policy</a>",
        "linux": "Ubuntu LTS: 16.04, 18.04, 20.04",
        "macos": "MacOS 10.14: “Mojave”, 10.15 “Catalina”.",
        "sdk": "C++ cross platform SDK",
        "windows": "Windows 7, 8, 8.1, 10/Enterprise, 2008 R2, 2012, 2012 R2, 2016 v1607, 2019"
        },
        "trafficRelayHost": "{systemId}.relay.vmsproxy.hdw.mx",
        "vmsName": "Witness",
        "accessRoles": {
        "adminAccess": [
            "cloudadmin",
            "owner",
            "administrator"
        ],
        "unshare": "none",
        "default": "Viewer",
        "custom": "custom",
        "editUserPermissionFlag": "GlobalAdminPermission",
        "editCameraPermissionFlag": "GlobalEditCamerasPermission",
        "globalAdminPermissionFlag": "GlobalAdminPermission",
        "allMediaPermissionFlag": "GlobalAccessAllMediaPermission",
        "customPermission": {
            "name": "Custom",
            "permissions": "NoPermission"
        },
        "predefinedRoles": [
            {
            "isOwner": true,
            "name": "Owner",
            "permissions": "GlobalAccessAllMediaPermission|GlobalAdminPermission|GlobalControlVideoWallPermission|GlobalEditCamerasPermission|GlobalExportPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalViewArchivePermission|GlobalViewBookmarksPermission|GlobalViewLogsPermission"
            },
            {
            "name": "Administrator",
            "permissions": "GlobalAccessAllMediaPermission|GlobalAdminPermission|GlobalControlVideoWallPermission|GlobalEditCamerasPermission|GlobalExportPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalViewArchivePermission|GlobalViewBookmarksPermission|GlobalViewLogsPermission"
            },
            {
            "name": "Advanced Viewer",
            "permissions": "GlobalAccessAllMediaPermission|GlobalExportPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalViewArchivePermission|GlobalViewBookmarksPermission|GlobalViewLogsPermission"
            },
            {
            "name": "Viewer",
            "permissions": "GlobalAccessAllMediaPermission|GlobalExportPermission|GlobalViewArchivePermission|GlobalViewBookmarksPermission"
            },
            {
            "name": "Live Viewer",
            "permissions": "GlobalAccessAllMediaPermission"
            },
            {
            "name": "Custom",
            "permissions": "NoPermission"
            }
        ],
        "order": [
            "Live Viewer",
            "liveViewer",
            "Viewer",
            "viewer",
            "Advanced Viewer",
            "advancedViewer",
            "Cloud Administrator",
            "cloudAdmin",
            "Administrator",
            "admin",
            "Owner",
            "owner"
        ]
        },
        "allowBetaMode": false,
        "allowDebugMode": false,
        "debug": {
        "chunksOnTimeline": false
        },
        "globalViewArchivePermission": "GlobalViewArchivePermission",
        "openClientTimeout": 20000,
        "openClientError": "notVisited",
        "openMobileClientTimeout": 300,
        "responseOk": "ok",
        "timelineMouseEventTimeout": 300,
        "updateInterval": 30000,
        "webclient": {
        "chunksToCheckFatal": 30,
        "disableVolume": true,
        "endOfArchiveTime": 30000,
        "flashChromelessDebugPath": "components/flashlsChromeless_debug.swf",
        "flashChromelessPath": "components/flashlsChromeless.swf",
        "hlsLoadingTimeout": 90000,
        "leftPanelPreviewHeight": 128,
        "maxCrashCount": 2,
        "nativeTimeout": 60000,
        "playerReadyTimeout": 100,
        "reloadInterval": 30000,
        "resetDisplayedTextTimer": 3000,
        "skipFramesRenderingTimeline": true,
        "updateArchiveStateTimeout": 60000,
        "updateArchiveRecordsTimeout": 2000,
        "useServerTime": true,
        "useSystemTime": true
        },
        "settingsConfig": {
        "auditTrailEnabled": {
            "type": "checkbox"
        },
        "cameraSettingsOptimization": {
            "type": "checkbox",
            "setupWizard": true
        },
        "defaultMotionMask": "5,0,0,44,32",
        "disabledVendors": {
            "type": "text"
        },
        "ec2AliveUpdateIntervalSec": {
            "type": "number",
            "alert": "Warning! It is highly recommended to keep this value at least 10% greater than \"Connection keep alive timeout\" x \"Connection keep probes\""
        },
        "ec2ConnectionKeepAliveTimeoutSec": {
            "type": "number"
        },
        "ec2KeepAliveProbeCount": {
            "type": "number"
        },
        "emailFrom": {
            "type": "text"
        },
        "emailSignature": {
            "type": "text"
        },
        "emailSupportEmail": {
            "type": "text"
        },
        "ldapAdminDn": {
            "type": "text"
        },
        "ldapAdminPassword": {
            "type": "password"
        },
        "ldapSearchBase": {
            "type": "text"
        },
        "ldapSearchFilter": {
            "type": "text"
        },
        "ldapUri": {
            "type": "text"
        },
        "autoDiscoveryEnabled": {
            "type": "checkbox",
            "setupWizard": true
        },
        "smtpConnectionType": {
            "type": "text"
        },
        "smtpHost": {
            "type": "text"
        },
        "smtpPort": {
            "type": "number"
        },
        "smtpSimple": {
            "type": "checkbox"
        },
        "smtpTimeout": {
            "type": "number"
        },
        "smtpPassword": {
            "type": "password"
        },
        "smtpUser": {
            "type": "text"
        },
        "updateNotificationsEnabled": {
            "type": "checkbox"
        },
        "arecontRtspEnabled": {
            "type": "checkbox"
        },
        "backupNewCamerasByDefault": {
            "type": "checkbox"
        },
        "statisticsAllowed": {
            "type": "checkbox",
            "setupWizard": true
        },
        "backupQualities": {
            "type": "text"
        },
        "serverDiscoveryPingTimeoutSec": {
            "type": "number"
        },
        "cloudAccountName": {
            "type": "static"
        },
        "cloudHost": {
            "type": "static"
        },
        "cloudAuthKey": {
            "type": "static"
        },
        "cloudSystemID": {
            "type": "static"
        },
        "systemName": {
            "type": "text"
        },
        "newSystem": {
            "type": "static"
        },
        "proxyConnectTimeoutSec": {
            "type": "number"
        },
        "crossdomainEnabled": {
            "type": "checkbox"
        },
        "maxRtspConnectDurationSec": {
            "label": "Maximum duration for RTSP connection (seconds)",
            "type": "number"
        },
        "statisticsReportLastNumber": {
            "type": "static"
        },
        "statisticsReportLastTime": {
            "type": "static"
        },
        "statisticsReportLastVersion": {
            "type": "static"
        },
        "statisticsReportServerApi": {
            "type": "text"
        },
        "statisticsReportTimeCycle": {
            "type": "number"
        },
        "localSystemId": {
            "type": "static"
        },
        "systemId": {
            "type": "static"
        },
        "systemNameForId": {
            "type": "text"
        },
        "takeCameraOwnershipWithoutLock": {
            "type": "checkbox"
        },
        "upnpPortMappingEnabled": {
            "type": "checkbox"
        },
        "trafficEncryptionForced": {
            "type": "checkbox"
        },
        "videoTrafficEncryptionForced": {
            "type": "checkbox"
        },
        "updateStatus": {
            "type": "static"
        },
        "watermarkSettings": {
            "type": "static"
        },
        "timeSynchronizationEnabled": {
            "type": "checkbox"
        },
        "primaryTimeServer": {
            "type": "static"
        },
        "osTimeChangeCheckPeriodMs": {
            "type": "number"
        },
        "syncTimeExchangePeriod": {
            "type": "number"
        },
        "syncTimeEpsilon": {
            "type": "number"
        },
        "maxWearableArchiveSynchronizationThreads": {
            "type": "number"
        },
        "maxEventLogRecords": {
            "type": "number"
        },
        "forceLiveCacheForPrimaryStream": {
            "type": "text"
        }
        },
        "viewsDir": "static/lang_en_US/views/"
    }
}