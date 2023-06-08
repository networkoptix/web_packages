
NEW_SYSTEM_NAME = f"Name Changed"
THREETWO_SYSTEM_URL = f"http://10.1.5.113:7001"
VISIBLE = f"/ancestor::nx-checkbox"
ADMIN_LINK = f"//a[@id='admin']"
GENERAL_LINK = f"//a[@id='general']"
USERS_LINK = f"//a[@id='users']"
SYSTEM_SETTINGS_FORM = f"//form[@name='systemSettingsForm']"
SECURITY_FORM = f"//form[@name='systemAndSecuritySettingsForm']"
PASSWORD = f"{BASE_PASSWORD}"

ENABLE_AUTO_DISCOVERY_CHECKBOX = f"//*[@id='autoDiscoveryEnabled']"
SEND_ANONYMOUS_USAGE_CHECKBOX = f"//*[@id='statisticsAllowed']"
ALLOW_SYSTEM_OPTIMIZE_CHECKBOX = f"//*[@id='cameraSettingsOptimization']"

checkboxes = [ENABLE_AUTO_DISCOVERY_CHECKBOX, 
            SEND_ANONYMOUS_USAGE_CHECKBOX, ALLOW_SYSTEM_OPTIMIZE_CHECKBOX,
            ENABLE_AUDIT_TRAIL_CHECKBOX, ALLOW_ONLY_SECURE_CHECKBOX,
            LIMIT_SESSION_DURATION_CHECKBOX]

default_settings = {
    'autoDiscoveryEnabled': True,
    'statisticsAllowed': True, 
    'cameraSettingsOptimization': True,
    'auditTrailEnabled': True,
    'trafficEncryptionForced': False,
    'videoTrafficEncryptionForced': False,
    'sessionLimitMinutes': 0
}

default settings5 = {
    'autoDiscoveryEnabled': True,
    'statisticsAllowed': True,
    'cameraSettingsOptimization': True,
    'auditTrailEnabled': True,
    'trafficEncryptionForced': False,
    'videoTrafficEncryptionForced': False,
    'sessionLimitMinutes': 0,
}

default_advanced_settings = {
    'autoDiscoveryResponseEnabled': True,
    'statisticsAllowed': True,
    'cameraSettingsOptimization': True,
    'auditTrailEnabled': True,
    'trafficEncryptionForced': False,
    'videoTrafficEncryptionForced': False,
    'sessionLimitMinutes': 0,
    'additionalLocalFsTypes': [],
    'arecontRtspEnabled': False,
    'auditTrailPeriodDays': 183,
    'autoDiscoveryResponseEnabled': True,
    'autoUpdateThumbnails': True,
    'cloudConnectRelayingEnabled': True,
    'cloudConnectUdpHolePunchingEnabled': True,
    'crossdomainEnabled': False,
    'defaultExportVideoCodec': 'mpeg4',
    'defaultVideoCodec': 'h263p',
    'disabledVendors': [],
    'downloaderPeers': [],
    'ec2AliveUpdateIntervalSec': 60,
    'enableEdgeRecording': True,
    'eventLogPeriodDays': 30,
    'forceLiveCacheForPrimaryStream': 'auto',
    'keepHanwhaIoPortStateIntactOnInitialization': False,
    'lastMergeMasterId': '',
    'lastMergeSlaveId': '',
    'ldapAdminDn': '',
    'ldapSearchBase': '',
    'ldapSearchFilter': '',
    'ldapSearchTimeoutS': 30,
    'ldapUri': '',
    'licenseServer': 'https://licensing.vmsproxy.com',
    'lowQualityScreenVideoCodec': 'mpeg2video',
    'maxDifferenceBetweenSynchronizedAndInternetTime': 2000,
    'maxDifferenceBetweenSynchronizedAndLocalTimeMs': 5000,
    'maxEventLogRecords': 100000,
    'maxP2pAllClientsSizeBytes': 1073741824,
    'maxP2pQueueSizeBytes': 52428800,
    'maxRecordQueueSizeBytes': 25165824,
    'maxRecordQueueSizeElements': 1000,
    'maxRemoteArchiveSynchronizationThreads': -1,
    'maxRtpRetryCount': 6,
    'maxRtspConnectDurationSeconds': 0,
    'maxSceneItems': 0,
    'maxVirtualCameraArchiveSynchronizationThreads': -1,
    'maxHttpTranscodingSessions': 2,
    'maxWearableArchiveSynchronizationThreads': -1,
    'rtspBufferSizeKb': 64,
    'metadataStorageChangePolicy': 'keep',
    'osTimeChangeCheckPeriodMs': 1000,
    'proxyConnectTimeoutSec': 5,
    'pushNotificationsLanguage': '',
    'resourceFileUri': 'http://resources.vmsproxy.com/resource_data.json',
    'rtpTimeoutMs': 10000,
    'sequentialFlirOnvifSearcherEnabled': False,
    'serverDiscoveryPingTimeoutSec': 60,
    'smtpConnectionType': 'Unsecure',
    'smtpHost': '',
    'smtpPort': 0,
    'smtpSimple': True,
    'smtpTimeout': 300,
    'smtpUser': '',
    'specificFeatures': '[]',
    'statisticsReportLastTime': '2021-01-21T20:07:05Z',
    'statisticsReportLastVersion': '4.1.0.32212-7259e0f382b5-default-patch',
    'statisticsReportServerApi': '',
    'statisticsReportTimeCycle': '',
    'statisticsReportUpdateDelay': '',
    'syncTimeEpsilon': 200,
    'syncTimeExchangePeriod': 600000,
    'takeCameraOwnershipWithoutLock': True,
    'timeSynchronizationEnabled': True,
    'updateNotificationsEnabled': True,
    'upnpPortMappingEnabled': True,
    'useTextEmailFormat': False,
    'useWindowsEmailLineFeed': False,
    'webSocketEnabled': True
}


ENABLE_AUDIT_TRAIL_CHECKBOX = f"//*[@id='auditTrailEnabled']"
ALLOW_ONLY_SECURE_CHECKBOX = f"//*[@id='trafficEncryptionForced']"
ENCRYPT_VIDEO_TRAFFIC_CHECKBOX = f"//*[@id='videoTrafficEncryptionForced']"
LIMIT_SESSION_DURATION_CHECKBOX = f"//*[@id='sessionLimitMinutesToggle']"
TIME_NUMBER_INPUT = f"//*[@type='number']"
TIME_DURATION_INTERVAL_BUTTON = f"//*[@id='genericSelect']"
TIME_DURATION_INTERVAL_TEXT = f"{TIME_DURATION_INTERVAL_BUTTON}/span"
TIME_DURATION_NEW_SELECTION = f"//*[@aria-labelledby='genericSelect']//a[contains(@class,'dropdown-item inset')]"
TIME_DURATION_SELECTION_HOURS = f"//li/a/span[contains(text(), {HOURS_TEXT})]"
TIME_DURATION_SELECTION_MINUTES = f"//li/a/span[contains(text(), {MINUTES_TEXT})]"

AVAILABLE_SYSTEMS_LIST = f"//a[@href='/systems']"

SYSTEM_ADMINISTRATION_LINK = f"//a[@id='admin']"
SYSTEM_GENERAL_LINK = f"//a[@id='general']"
SYSTEM_STORAGE_LINK = f"//a[@id='cloudStorage']"
MENU_LEVEL_3_LINK = f"//a[contains(@class, 'menu-level-3')]"

USER_EMAIL = f"{SYSTEM_USER_DETAILS}//header//h2"
USER_NAME = f"{SYSTEM_USER_DETAILS}//header//span[contains(@class,user-name)]"
OWNER_LABEL = f"{SYSTEM_USER_DETAILS}//header//span[contains(@class,system-owner)]/span[contains(text(),{OWNER_TEXT})]"
OWNER_NAME = f"{OWNER_LABEL}//following-sibling::span//span[contains(text(),%OWNER_NAME%)]"
OWNER_EMAIL = f"{OWNER_LABEL}/following-sibling::span//span[contains(text(),{EMAIL_OWNER})]"

SAVE_BUTTON = f"//nx-process-button//button[contains(text(), {SAVE_BUTTON_TEXT})]"
CANCEL_BUTTON = f"//nx-cancel-button//button[contains(text(), {CANCEL_BUTTON_TEXT})]"

ENCRYPTING_VIDEO_WARNING = f"//div[contains(text(), {ENCRYPTING_VIDEO_WARNING_TEXT})]"

#Disconnect from cloud portal

DISCONNECT_FORM = f"//form[@name='disconnectForm']"
DISCONNECT_FORM_HEADER = f"{DISCONNECT_FORM}//h1[{DISCONNECT_FORM_HEADER_TEXT}]"
DISCONNECT_FORM_CLOSE_BUTTON = f"{DISCONNECT_FORM}//button[contains(@class, close)]"
DISCONNECT_FORM_ALL_USERS_WILL_BE_DELETED = f"{DISCONNECT_FORM}//p[contains(text(), {DISCONNECT_FORM_ALL_USERS_WILL_BE_DELETED_TEXT})]"
DISCONNECT_FORM_SYSTEM_WILL_BE_ACCESSIBLE = f"{DISCONNECT_FORM}//p[contains(text(), {DISCONNECT_FORM_SYSTEM_WILL_BE_ACCESSIBLE_TEXT})]"
DISCONNECT_FORM_ENTER_PASSWORD_TO_CONTINUE = f"{DISCONNECT_FORM}//p[contains(text(), {DISCONNECT_FORM_ENTER_PASSWORD_TO_CONTINUE_TEXT})]"
DISCONNECT_PASSWORD_INPUT = f"{DISCONNECT_FORM}//input[@id=password]"
DISCONNECT_FORM_DISCONNECT_BUTTON = f"{DISCONNECT_FORM}//nx-process-button/div[contains(@class, process-button)]//button[contains(text(),{CONTINUE_BUTTON_TEXT})]/.."
DISCONNECT_FORM_CANCEL_BUTTON = f"{DISCONNECT_FORM}//button[text()={CANCEL_BUTTON_TEXT}]"
DISCONNECT_FORM_WRONG_PASSWORD = f"{DISCONNECT_FORM}//div[contains(@class, error) and contains(text(), {WRONG_PASSWORD})]"
DISCONNECT_FORM_PASSWORD_IS_REQUIRED = f"{DISCONNECT_FORM}//div[contains(@class, error) and contains(text(), {PASSWORD_IS_REQUIRED_TEXT})]"
SYSTEM_IS_SUCCESSFULLY_DISCONNECTED = f"{SUCCESSFULLY_DISCONNECTED}"

# ADVANCED SETTINGS

ADVANCED_SETTINGS = f"?advanced"
HIDE_ADVANCED_SETTINGS_BUTTON = f"//button/span[text()={HIDE_ADVANCED_SETTINGS_TEXT}]"
HIDE_ADVANCED_SETTINGS_ICON = f"//*[name()='svg-icon' and contains(@data-src, 'images/icons/standard/eye_closed.svg')]"
ADVANCED_SETTINGS_ALERT_ICON = f"//*[name()='svg-icon' and contains(@data-src, 'images/icons/error.svg')]"
ADVANCED_SETTINGS_ALERT = f"//div[text()={ADVANCED_SETTINGS_ALERT_TEXT}]"
ADVANCED_SETTINGS_WARNING = f"//span[text()={ADVANCED_SETTINGS_WARNING_TEXT}]"

ADVANCED_SETTINGS_ALERT_BAR = [
    HIDE_ADVANCED_SETTINGS_BUTTON,
    HIDE_ADVANCED_SETTINGS_ICON,
    ADVANCED_SETTINGS_ALERT_ICON,
    ADVANCED_SETTINGS_ALERT,
    ADVANCED_SETTINGS_WARNING,
]

SUCCESS_DIALOG = f"//nx-modal-generic-content"
SUCCESS_DIALOG_TEXT = f"{SUCCESS_DIALOG}//p[contains(text(), {SETTINGS_SAVED_TEXT})]"
SUCCESS_DIALOG_HEADER = f"{SUCCESS_DIALOG}//h1/span[contains(text(), {SUCCESS_TEXT})]"
SUCCESS_DIALOG_X_BUTTON = f"{SUCCESS_DIALOG}//button[@data-dismiss=modal and contains(@class, close)]"
SUCCESS_DIALOG_CLOSE_BUTTON = f"{SUCCESS_DIALOG}//button[contains(text(), {CLOSE_TEXT})]"

ADDITIONAL_LOCAL_FS_TYPES_INPUT = f"//input[@id='additionalLocalFsTypes']"
ADDITIONAL_LOCAL_FS_TYPES_LABEL = f"//div[text()={ADDITIONAL_LOCAL_FS_TYPES_TEXT}]"
AUDIT_TRAIL_PERIOD_DAYS_INPUT = f"//input[@id='auditTrailPeriodDays']"
AUDIT_TRAIL_PERIOD_DAYS_LABEL = f"//div[text()={AUDIT_TRAIL_PERIOD_DAYS_TEXT}]"
BACKUP_SETTINGS_INPUT = f"//input[@id='backupSettings']"
BACKUP_QUALITIES_LABEL = f"//div[text()={BACKUP_QUALITIES_TEXT}]"
BACKUP_QUALITIES_INPUT = f"//input[@id='backupQualities']"
BACKUP_SETTINGS_DEFAULT_TEXT = f"{'backupNewCameras':True,'id':'{00000000-1111-0000-0000-000000000000}','quality':'CameraBackupBoth'}"
CLIENT_STATISTICS_RELATIVE_URL_INPUT = f"//input[@id='clientStatisticsSettingsUrl']"
CLIENT_STATISTICS_RELATIVE_URL_LABEL = f"//div[text()={CLIENT_STATISTICS_RELATIVE_URL_TEXT}]"

ARECONT_RTSP_ENABLED_CHECKBOX = f"//*[@id='arecontRtspEnabled']"
ARECONT_RTSP_ENABLED_LABEL = f"//div[text()={ARECONT_RTSP_ENABLED_TEXT}]"
AUTO_DISCOVERY_RESPONSE_ENABLED_CHECKBOX = f"//*[@id='autoDiscoveryResponseEnabled']"
AUTO_DISCOVERY_RESPONSE_ENABLED_LABEL = f"//div[text()={AUTO_DISCOVERY_RESPONSE_TEXT}]"
AUTO_UPDATE_THUMBNAILS_CHECKBOX = f"//*[@id='autoUpdateThumbnails']"
AUTO_UPDATE_THUMBNAILS_LABEL = f"//div[text()={AUTO_UPDATE_THUMNAILS_TEXT}]"
BACKUP_NEW_CAMERAS_BY_DEFAULT_CHECKBOX = f"//*[@id='backupNewCamerasByDefault']"
BACKUP_NEW_CAMERAS_BY_DEFAULT_LABEL = f"//div[text()={BACKUP_NEW_CAMERAS_BY_DEFAULT_TEXT}]"

ADVANCED_SETTING_ELEMENT_BLOCK_ONE_5.0 = [
    ADDITIONAL_LOCAL_FS_TYPES_INPUT,
    ADDITIONAL_LOCAL_FS_TYPES_LABEL,
    AUDIT_TRAIL_PERIOD_DAYS_INPUT,
    AUDIT_TRAIL_PERIOD_DAYS_LABEL,
    BACKUP_SETTINGS_INPUT,
    CLIENT_STATISTICS_RELATIVE_URL_INPUT,
    CLIENT_STATISTICS_RELATIVE_URL_LABEL,
    ARECONT_RTSP_ENABLED_CHECKBOX + VISIBLE,
    ARECONT_RTSP_ENABLED_LABEL,
    AUTO_DISCOVERY_RESPONSE_ENABLED_CHECKBOX + VISIBLE,
    AUTO_DISCOVERY_RESPONSE_ENABLED_LABEL,
    AUTO_UPDATE_THUMBNAILS_CHECKBOX + VISIBLE,
    AUTO_UPDATE_THUMBNAILS_LABEL,
]

ADVANCED_SETTING_ELEMENT_BLOCK_ONE = [
    ADDITIONAL_LOCAL_FS_TYPES_INPUT,
    ADDITIONAL_LOCAL_FS_TYPES_LABEL,
    AUDIT_TRAIL_PERIOD_DAYS_INPUT,
    AUDIT_TRAIL_PERIOD_DAYS_LABEL,
    CLIENT_STATISTICS_RELATIVE_URL_INPUT,
    CLIENT_STATISTICS_RELATIVE_URL_LABEL,
    ARECONT_RTSP_ENABLED_CHECKBOX + VISIBLE,
    ARECONT_RTSP_ENABLED_LABEL,
    AUTO_DISCOVERY_RESPONSE_ENABLED_CHECKBOX + VISIBLE,
    AUTO_DISCOVERY_RESPONSE_ENABLED_LABEL,
    AUTO_UPDATE_THUMBNAILS_CHECKBOX + VISIBLE,
    AUTO_UPDATE_THUMBNAILS_LABEL,
    BACKUP_NEW_CAMERAS_BY_DEFAULT_CHECKBOX + VISIBLE,
    BACKUP_NEW_CAMERAS_BY_DEFAULT_LABEL,
]


CLOUD_CONNECT_RELAYING_ENABLED_CHECKBOX = f"//*[@id='cloudConnectRelayingEnabled']"
CLOUD_CONNECT_RELAYING_ENABLED_LABEL = f"//div[text()={CLOUD_CONNECT_RELAYING_TEXT}]"
CLOUD_CONNECT_UDP_HOLE_PUNCHING_ENABLED_CHECKBOX = f"//*[@id='cloudConnectUdpHolePunchingEnabled']"
CLOUD_CONNECT_UDP_HOLE_PUNCHING_ENABLED_LABEL = f"//div[text()={CLOUD_CONNECT_UDP_HOLE_PUNCHING_TEXT}]"
CROSS_DOMAIN_ENABLED_CHECKBOX = f"//*[@id='crossdomainEnabled']"
CROSS_DOMAIN_ENABLED_LABEL = f"//div[text()={CROSS_DOMAIN_TEXT}]"

CLOUD_HOST_LABEL = f"//div[text()={CLOUD_HOST_TEXT}]"
CLOUD_HOST = f"{CLOUD_HOST_LABEL}/parent::div/following-sibling::div/p"
CLOUD_SYSTEM_ID_LABEL = f"//div[text()={CLOUD_SYSTEM_ID_TEXT}]"
CLOUD_SYSTEM_ID = f"{CLOUD_SYSTEM_ID_LABEL}/parent::div/following-sibling::div/p"

DEFAULT_EXPORT_VIDEO_CODEC_INPUT = f"//input[@id='defaultExportVideoCodec']"
DEFAULT_EXPORT_VIDEO_CODEC_LABEL = f"//div[text()={DEFAULT_EXPORT_VIDEO_CODEC_TEXT}]"
DEFAULT_VIDEO_CODEC_INPUT = f"//input[@id='defaultVideoCodec']"
DEFAULT_VIDEO_CODEC_LABEL = f"//div[text()={DEFAULT_VIDEO_CODEC_TEXT}]"
DISABLED_VENDORS_INPUT = f"//input[@id='disabledVendors']"
DISABLED_VENDORS_LABEL = f"//div[text()={DISABLED_VENDORS_TEXT}]"
DOWNLOADER_PEERS_INPUT = f"//input[@id='downloaderPeers']"
DOWNLOADER_PEERS_LABEL = f"//div[text()={DOWNLOADER_PEERS_TEXT}]"
SYSTEM_ALIVE_INTERVAL_INPUT = f"//input[@id='ec2AliveUpdateIntervalSec']"
SYSTEM_ALIVE_INTERVAL_LABEL = f"//div[text()={SYSTEM_ALIVE_UPDATE_INTERVAL_TEXT}]"
SYSTEM_ALIVE_WARNING = f"//div[text()={SYSTEM_ALIVE_UPDATE_WARNING_TEXT}]"

ADVANCED_SETTING_ELEMENT_BLOCK_TWO = [
    CLOUD_CONNECT_RELAYING_ENABLED_CHECKBOX + VISIBLE,
    CLOUD_CONNECT_RELAYING_ENABLED_LABEL,
    CLOUD_CONNECT_UDP_HOLE_PUNCHING_ENABLED_CHECKBOX + VISIBLE, 
    CLOUD_CONNECT_UDP_HOLE_PUNCHING_ENABLED_LABEL,
    CROSS_DOMAIN_ENABLED_CHECKBOX + VISIBLE,
    CROSS_DOMAIN_ENABLED_LABEL,
    CLOUD_HOST_LABEL,
    CLOUD_HOST,
    CLOUD_SYSTEM_ID_LABEL,
    CLOUD_SYSTEM_ID,
    DEFAULT_EXPORT_VIDEO_CODEC_INPUT,
    DEFAULT_EXPORT_VIDEO_CODEC_LABEL,
    DEFAULT_VIDEO_CODEC_INPUT,
    DEFAULT_VIDEO_CODEC_LABEL,
    DISABLED_VENDORS_INPUT,
    DISABLED_VENDORS_LABEL,
    DOWNLOADER_PEERS_INPUT,
    DOWNLOADER_PEERS_LABEL,
    SYSTEM_ALIVE_INTERVAL_INPUT,
    SYSTEM_ALIVE_INTERVAL_LABEL,
    SYSTEM_ALIVE_WARNING,
]

CONNECTION_KEEP_ALIVE_TIMEOUT_INPUT = f"//input[@id='ec2ConnectionKeepAliveTimeoutSec']"
CONNECTION_KEEP_ALIVE_TIMEOUT_LABEL = f"//div[text()={CONNECTION_KEEP_ALIVE_TIMEOUT_TEXT}]"
CONNECTION_KEEP_ALIVE_PROBE_INPUT = f"//input[@id='ec2KeepAliveProbeCount']"
CONNECTION_KEEP_ALIVE_PROBE_LABEL = f"//div[text()={CONNECTION_KEEP_ALIVE_PROBES_TEXT}]"
EMAIL_FROM_INPUT = f"//input[@id='emailFrom']"
EMAIL_FROM_LABLE = f"//div[text()={EMAIL_FROM_TEXT}]"
EMAIL_SIGNATURE_INPUT = f"//input[@id='emailSignature']"
EMAIL_SIGNATURE_LABEL = f"//div[text()={EMAIL_SIGNATURE_TEXT}]"
SUPPORT_EMAIL_INPUT = f"//input[@id='emailSupportEmail']"
SUPPORT_EMAIL_LABEL = f"//div[text()={SUPPORT_EMAIL_TEXT}]"

ADVANCED_SETTING_ELEMENT_BLOCK_THREE = [
    CONNECTION_KEEP_ALIVE_TIMEOUT_INPUT,
    CONNECTION_KEEP_ALIVE_TIMEOUT_LABEL,
    CONNECTION_KEEP_ALIVE_PROBE_INPUT,
    CONNECTION_KEEP_ALIVE_PROBE_LABEL,
    EMAIL_FROM_INPUT,
    EMAIL_FROM_LABLE,
    EMAIL_SIGNATURE_INPUT,
    EMAIL_SIGNATURE_LABEL,
    SUPPORT_EMAIL_INPUT,
    SUPPORT_EMAIL_LABEL,
]

ADVANCED_SETTING_ELEMENT_BLOCK_THREE_5.0 = [
    EMAIL_FROM_INPUT,
    EMAIL_FROM_LABLE,
    EMAIL_SIGNATURE_INPUT,
    EMAIL_SIGNATURE_LABEL,
    SUPPORT_EMAIL_INPUT,
    SUPPORT_EMAIL_LABEL,
]


ENABLE_EDGE_RECORDING_CHECKBOX = f"//*[@id='enableEdgeRecording']"
ENABLE_EDGE_RECORDING_LABEL = f"//div[text()={ENABLE_EDGE_RECORDING_TEXT}]"
KEEP_HANWHA_PORT_STATE_CHECKBOX = f"//*[@id='keepHanwhaIoPortStateIntactOnInitialization']"
KEEP_PORT_STATE_CHECKBOX = f"//*[@id='keepIoPortStateIntactOnInitialization']"

EVENT_LOG_PERIOD_INPUT = f"//input[@id='eventLogPeriodDays']"
EVENT_LOG_PERIOD_LABEL = f"//div[text()={EVENT_LOG_PERIOD_TEXT}]"
FORCE_LIVE_CACHE_INPUT = f"//input[@id='forceLiveCacheForPrimaryStream']"
FORCE_LIVE_CACHE_LABEL = f"//div[text()={FORCE_LIVE_CACHE_TEXT}]"
LAST_MERGE_MASTERID_INPUT = f"//input[@id='lastMergeMasterId']"
LAST_MERGE_MASTERID_LABEL = f"//div[text()={LAST_MERGE_MASTERID_TEXT}]"
LAST_MERGE_SLAVEID_INPUT = f"//input[@id='lastMergeSlaveId']"
LAST_MERGE_SLAVEID_LABEL = f"//div[text()={LAST_MERGE_SLAVEID_TEXT}]"

ADVANCED_SETTING_ELEMENT_BLOCK_FOUR = [
    ENABLE_EDGE_RECORDING_CHECKBOX,
    ENABLE_EDGE_RECORDING_LABEL,
    KEEP_HANWHA_PORT_STATE_CHECKBOX,
    EVENT_LOG_PERIOD_INPUT,
    EVENT_LOG_PERIOD_LABEL,
    FORCE_LIVE_CACHE_INPUT,
    FORCE_LIVE_CACHE_LABEL,
    LAST_MERGE_MASTERID_INPUT,
    LAST_MERGE_MASTERID_LABEL,
    LAST_MERGE_SLAVEID_INPUT,
    LAST_MERGE_SLAVEID_LABEL,
]

ADVANCED_SETTING_ELEMENT_BLOCK_FOUR_5_0 = [
    ENABLE_EDGE_RECORDING_CHECKBOX + VISIBLE,
    ENABLE_EDGE_RECORDING_LABEL,
    KEEP_PORT_STATE_CHECKBOX + VISIBLE,
    EVENT_LOG_PERIOD_INPUT,
    EVENT_LOG_PERIOD_LABEL,
    FORCE_LIVE_CACHE_INPUT,
    FORCE_LIVE_CACHE_LABEL,
    LAST_MERGE_MASTERID_INPUT,
    LAST_MERGE_MASTERID_LABEL,
    LAST_MERGE_SLAVEID_INPUT,
    LAST_MERGE_SLAVEID_LABEL,
]

LDAP_ADMIN_DN_INPUT = f"//input[@id='ldapAdminDn']"
LDAP_ADMIN_DN_LABEL = f"//div[text()={LDAP_ADMIN_DN_TEXT}]"
LDAP_SEARCH_BASE_INPUT = f"//input[@id='ldapSearchBase']"
LDAP_SEARCH_BASE_LABEL = f"//div[text()={LDAP_SEARCH_BASE_TEXT}]"
LDAP_SEARCH_FILTER_INPUT = f"//input[@id='ldapSearchFilter']"
LDAP_SEARCH_FILTER_LABEL = f"//div[text()={LDAP_SEARCH_FILTER_TEXT}]"
LDAP_SEARCH_TIMEOUT_INPUT = f"//input[@id='ldapSearchTimeoutS']"
LDAP_SEARCH_TIMEOUT_LABEL = f"//div[text()={LDAP_SEARCH_TIMEOUT_TEXT}]"
LDAP_URI_INPUT = f"//input[@id='ldapUri']"
LDAP_URI_LABEL = f"//div[text()={LDAP_URI_TEXT}]"
LICENSE_SERVER_INPUT = f"//input[@id='licenseServer']"
LICENSE_SERVER_LABEL = f"//div[text()={LICENSE_SERVER_TEXT}]"
LOCAL_SYSTEM_ID = f"{LOCAL_SYSTEM_ID_LABEL}/parent::div/following-sibling::div/p"
LOCAL_SYSTEM_ID_LABEL = f"//div[text()={LOCAL_SYSTEM_ID_TEXT}]"

ADVANCED_SETTING_ELEMENT_BLOCK_FIVE =[
    LDAP_ADMIN_DN_INPUT,
    LDAP_ADMIN_DN_LABEL,
    LDAP_SEARCH_BASE_INPUT,
    LDAP_SEARCH_BASE_LABEL,
    LDAP_SEARCH_FILTER_INPUT,
    LDAP_SEARCH_FILTER_LABEL,
    LDAP_SEARCH_TIMEOUT_INPUT,
    LDAP_SEARCH_TIMEOUT_LABEL,
    LDAP_URI_INPUT,
    LDAP_URI_LABEL,
    LICENSE_SERVER_INPUT,
    LICENSE_SERVER_LABEL,
    LOCAL_SYSTEM_ID,
    LOCAL_SYSTEM_ID_LABEL,
]

LOW_QUALITY_SCREEN_VIDEO_CODEC_INPUT = f"//input[@id='lowQualityScreenVideoCodec']"
LOW_QUALITY_SCREEN_VIDEO_CODEC_LABEL = f"//div[text()={LOW_QUALITY_SCREEN_VIDEO_CODEC_TEXT}]"
MAX_DIF_SYNC_AND_INTERNET_TIME_INPUT = f"//input[@id='maxDifferenceBetweenSynchronizedAndInternetTime']"
MAX_DIF_SYNC_AND_INTERNET_TIME_LABEL = f"//div[text()={MAX_DIF_SYNC_AND_INTERNET_TIME_TEXT}]"
MAX_DIF_SYNC_AND_LOCAL_TIME_INPUT = f"//input[@id='maxDifferenceBetweenSynchronizedAndLocalTimeMs']"
MAX_DIF_SYNC_AND_LOCAL_TIME_LABEL = f"//div[text()={MAX_DIF_SYNC_AND_LOCAL_TIME_TEXT}]"
MAX_EVENT_LOG_RECORDS_INPUT = f"//input[@id='maxEventLogRecords']"
MAX_EVENT_LOG_RECORDS_LABEL = f"//div[text()={MAX_EVENT_LOG_RECORDS_TEXT}]"

ADVANCED_SETTING_ELEMENT_BLOCK_SIX = [
    LOW_QUALITY_SCREEN_VIDEO_CODEC_INPUT,
    LOW_QUALITY_SCREEN_VIDEO_CODEC_LABEL,
    MAX_DIF_SYNC_AND_INTERNET_TIME_INPUT,
    MAX_DIF_SYNC_AND_INTERNET_TIME_LABEL,
    MAX_DIF_SYNC_AND_LOCAL_TIME_INPUT,
    MAX_DIF_SYNC_AND_LOCAL_TIME_LABEL,
    MAX_EVENT_LOG_RECORDS_INPUT,
    MAX_EVENT_LOG_RECORDS_LABEL,
]

MAX_P2P_ALL_CLIENTS_SIZE_INPUT = f"//input[@id='maxP2pAllClientsSizeBytes']"
MAX_P2P_ALL_CLIENTS_SIZE_LABEL = f"//div[text()={MAX_P2P_ALL_CLIENTS_SIZE_TEXT}]"
MAX_P2P_QUEUE_SIZE_INPUT = f"//input[@id='maxP2pQueueSizeBytes']"
MAX_P2P_QUEUE_SIZE_LABEL = f"//div[text()={MAX_P2P_QUEUE_SIZE_TEXT}]"
MAX_RECORD_QUEUE_SIZE_INPUT = f"//input[@id='maxRecordQueueSizeBytes']"
MAX_RECORD_QUEUE_SIZE_LABEL = f"//div[text()={MAX_RECORD_QUEUE_SIZE_TEXT}]"
MAX_RECORD_QUEUE_ELEMENTS_INPUT = f"//input[@id='maxRecordQueueSizeElements']"
MAX_RECORD_QUEUE_ELEMENTS_LABEL = f"//div[text()={MAX_RECORD_QUEUE_ELEMENTS_TEXT}]"
MAX_REMOTE_ARCHIVE_SYNC_THREADS_INPUT = f"//input[@id='maxRemoteArchiveSynchronizationThreads']"
MAX_REMOTE_ARCHIVE_SYNC_THREADS_LABEL = f"//div[text()={MAX_REMOTE_ARCHIVE_SYNC_THREADS_TEXT}]"

ADVANCED_SETTING_ELEMENT_BLOCK_SEVEN= [
    MAX_P2P_ALL_CLIENTS_SIZE_INPUT,
    MAX_P2P_ALL_CLIENTS_SIZE_LABEL,
    MAX_P2P_QUEUE_SIZE_INPUT,
    MAX_P2P_QUEUE_SIZE_LABEL,
    MAX_RECORD_QUEUE_SIZE_INPUT,
    MAX_RECORD_QUEUE_SIZE_LABEL,
    MAX_RECORD_QUEUE_ELEMENTS_INPUT,
    MAX_RECORD_QUEUE_ELEMENTS_LABEL,
    MAX_REMOTE_ARCHIVE_SYNC_THREADS_INPUT,
    MAX_REMOTE_ARCHIVE_SYNC_THREADS_LABEL,
]

MAX_RTP_RETRY_COUNT_INPUT = f"//input[@id='maxRtpRetryCount']"
MAX_RTP_RETRY_COUNT_LABEL = f"//div[text()={MAX_RTP_RETRY_COUNT_TEXT}]"
MAX_RTSP_CONNECT_DURATION_INPUT = f"//input[@id='maxRtspConnectDurationSeconds']"
MAX_RTSP_CONNECT_DURATION_LABEL = f"//div[text()={MAX_RTSP_CONNECT_DURATION_TEXT}]"
MAX_SCENE_ITEMS_INPUT = f"//input[@id='maxSceneItems']"
MAX_SCENE_ITEMS_LABEL = f"//div[text()={MAX_SCENE_ITEMS_TEXT}]"
MAX_VIRTUAL_CAM_ARCHIVE_SYNC_THREADS_INPUT = f"//input[@id='maxVirtualCameraArchiveSynchronizationThreads']"
MAX_VIRTUAL_CAM_ARCHIVE_SYNC_THREADS_LABEL = f"//div[text()={MAX_VIRTUAL_CAM_ARCHIVE_SYNC_THREADS_TEXT}]"
MAX_HTTP_TRANSCODERS_INPUT = f"//input[@id='maxHttpTranscodingSessions']"
MAX_HTTP_TRANSCODERS_LABEL = f"//div[text()={MAX_HTTP_TRANSCODERS_TEXT}]"
MAX_WEBM_TRANSFER = f"//input[@id='maxWebMTranscoders']"
MAX_WEARABLE_ARCHIVE_SYNC_INPUT = f"//input[@id='maxWearableArchiveSynchronizationThreads']"
MAX_WEARABLE_ARCHIVE_SYNC_LABEL = f"//div[text()='maxWearableArchiveSynchronizationThreads']"

ADVANCED_SETTING_ELEMENT_BLOCK_EIGHT = [
    MAX_RTP_RETRY_COUNT_INPUT,
    MAX_RTP_RETRY_COUNT_LABEL,
    MAX_RTSP_CONNECT_DURATION_INPUT,
    MAX_RTSP_CONNECT_DURATION_LABEL,
    MAX_SCENE_ITEMS_INPUT,
    MAX_SCENE_ITEMS_LABEL,
    # MAX_VIRTUAL_CAM_ARCHIVE_SYNC_THREADS_INPUT,
    # MAX_VIRTUAL_CAM_ARCHIVE_SYNC_THREADS_LABEL,
    # MAX_HTTP_TRANSCODERS_INPUT,
    # MAX_HTTP_TRANSCODERS_LABEL,
]

ADVANCED_SETTING_ELEMENT_BLOCK_EIGHT_5_0 = [
    MAX_RTP_RETRY_COUNT_INPUT,
    MAX_RTP_RETRY_COUNT_LABEL,
    MAX_RTSP_CONNECT_DURATION_INPUT,
    MAX_RTSP_CONNECT_DURATION_LABEL,
    MAX_SCENE_ITEMS_INPUT,
    MAX_SCENE_ITEMS_LABEL,
    MAX_VIRTUAL_CAM_ARCHIVE_SYNC_THREADS_INPUT,
    MAX_VIRTUAL_CAM_ARCHIVE_SYNC_THREADS_LABEL,
    MAX_HTTP_TRANSCODERS_INPUT,
    MAX_HTTP_TRANSCODERS_LABEL,
]


RTSP_BUFFER_SIZE_INPUT = f"//input[@id='rtspBufferSizeKb']"
META_DATA_STORAGE_CHANGE_POLICY_INPUT = f"//input[@id='metadataStorageChangePolicy']"
META_DATA_STORAGE_CHANGE_POLICY_LABEL = f"//div[text()={META_DATA_STORAGE_CHANGE_TEXT}]"
OS_TIME_CHANGE_CHECK_PERIOD_INPUT = f"//input[@id='osTimeChangeCheckPeriodMs']"
OS_TIME_CHANGE_CHECK_PERIOD_LABEL = f"//div[text()={OS_TIME_CHANGE_CHECK_PERIOD_TEXT}]"
PRIMARY_TIME_SYNC_SERVER = f"{PRIMARY_TIME_SYNC_SERVER_LABEL}/parent::div/following-sibling::div/p"
PRIMARY_TIME_SYNC_SERVER_LABEL = f"//div[text()={PRIMARY_TIME_SYNC_SERVER_TEXT}]"
PROXY_CONNECTION_TIMEOUT_INPUT = f"//input[@id='proxyConnectTimeoutSec']"
PROXY_CONNECTION_TIMEOUT_LABEL = f"//div[text()={PROXY_CONNECTION_TIMEOUT_TEXT}]"
PUSH_NOTIFICATION_LANGUAGE_INPUT = f"//input[@id='pushNotificationsLanguage']"
PUSH_NOTIFICATION_LANGUAGE_LABEL = f"//div[text()={PUSH_NOTIFICATION_LANGUAGE_TEXT}]"


ADVANCED_SETTING_ELEMENT_BLOCK_NINE = [
    #Parameter is hidden on cloud due to VMS-18838
    #RTSP_BUFFER_SIZE_INPUT,
    META_DATA_STORAGE_CHANGE_POLICY_INPUT,
    META_DATA_STORAGE_CHANGE_POLICY_LABEL,
    OS_TIME_CHANGE_CHECK_PERIOD_INPUT,
    OS_TIME_CHANGE_CHECK_PERIOD_LABEL,
    PRIMARY_TIME_SYNC_SERVER,
    PRIMARY_TIME_SYNC_SERVER_LABEL,
    PROXY_CONNECTION_TIMEOUT_INPUT,
    PROXY_CONNECTION_TIMEOUT_LABEL,
    PUSH_NOTIFICATION_LANGUAGE_INPUT,
    PUSH_NOTIFICATION_LANGUAGE_LABEL,
]

RESOURCE_FILE_URI_INPUT = f"//input[@id='resourceFileUri']"
RESOURCE_FILE_URI_LABEL = f"//div[text()={RESOURCE_FILE_URI_TEXT}]"
RTP_TIMEOUT_INPUT = f"//input[@id='rtpTimeoutMs']"
RTP_TIMEOUT_LABEL = f"//div[text()={RTP_TIMEOUT_TEXT}]"
USE_SEQUENCIAL_FLIR_CHECKBOX = f"//*[@id='sequentialFlirOnvifSearcherEnabled']"
USE_SEQUENCIAL_FLIR_LABEL = f"//div[text()={USE_SEQUENCIAL_FLIR_TEXT}]"
SERVER_DISCOVERY_TIMEOUT_INPUT = f"//input[@id='serverDiscoveryPingTimeoutSec']"
SERVER_DISCOVERY_TIMEOUT_LABEL = f"//div[text()={SERVER_DISCOVERY_TIMEOUT_TEXT}]"


ADVANCED_SETTING_ELEMENT_BLOCK_TEN = [
    RESOURCE_FILE_URI_INPUT,
    RESOURCE_FILE_URI_LABEL,
    RTP_TIMEOUT_INPUT,
    RTP_TIMEOUT_LABEL,
    USE_SEQUENCIAL_FLIR_CHECKBOX,
    USE_SEQUENCIAL_FLIR_LABEL,
    #SERVER_DISCOVERY_TIMEOUT_INPUT,
    #SERVER_DISCOVERY_TIMEOUT_LABEL,
]


SMTP_CONNECTION_TYPE_INPUT = f"//input[@id='smtpConnectionType']"
SMTP_CONNECTION_TYPE_LABEL = f"//div[text()={SMTP_CONNECTION_TYPE_TEXT}]"
SMTP_HOST_INPUT = f"//input[@id='smtpHost']"
SMTP_HOST_LABEL = f"//div[text()={SMTP_HOST_TEXT}]"
SMTP_PORT_INPUT = f"//input[@id='smtpPort']"
SMTP_PORT_LABEL = f"//div[text()={SMTP_PORT_TEXT}]"
SMTP_SIMPLE_CHECKBOX = f"//*[@id='smtpSimple']"
SMTP_SIMPLE_LABEL = f"//div[text()={SMTP_SIMPLE_TEXT}]"
SMTP_TIMEOUT_INPUT = f"//input[@id='smtpTimeout']"
SMTP_TIMEOUT_LABEL = f"//div[text()={SMTP_TIMEOUT_TEXT}]"
SMTP_USER_INPUT = f"//input[@id='smtpUser']"
SMTP_USER_LABEL = f"//div[text()={SMTP_USER_TEXT}]"

ADVANCED_SETTING_ELEMENT_BLOCK_ELEVEN = [
    SMTP_CONNECTION_TYPE_INPUT,
    SMTP_CONNECTION_TYPE_LABEL,
    SMTP_HOST_INPUT,
    SMTP_HOST_LABEL,
    SMTP_PORT_INPUT,
    SMTP_PORT_LABEL,
    SMTP_SIMPLE_CHECKBOX + VISIBLE,
    SMTP_SIMPLE_LABEL,
    SMTP_TIMEOUT_INPUT,
    SMTP_TIMEOUT_LABEL,
    SMTP_USER_INPUT,
    SMTP_USER_LABEL,
]

SPECIFIC_FEATURES_INPUT = f"//input[@id='specificFeatures']"
SPECIFIC_FEATURES_LABEL = f"//div[text()={SPECIFIC_FEATURES_TEXT}]"
SPECIFIC_FEATURES_DEFAULT = f"{'advanced_lens_control':1,'camera_auth_server_side_encryption':1,'get_camera_param_manifest':1,'get_time_of_servers_version':2,'layoutApiVersion':1,'mediaserver_metrics':1,'merge_history':1,'merge_systems':1,'primaryTimeServerDefinesInternetTimeSync':1,'restartMethodVersion':2,'set_camera_param_post':1,'vms_metrics':1}"
STATISTICS_REPORT_LAST_NUMBER = f"{STATISTICS_REPORT_LAST_NUMBER_LABEL}/parent::div/following-sibling::div/p"
STATISTICS_REPORT_LAST_NUMBER_LABEL = f"//div[text()={STATISTICS_REPORT_LAST_NUMBER_TEXT}]"
STATISTICS_REPORT_LAST_TIME_LABEL = f"//div[text()={STATISTICS_REPORT_LAST_TIME_TEXT}]"
STATISTICS_REPORT_LAST_TIME = f"{STATISTICS_REPORT_LAST_TIME_LABEL}/parent::div/following-sibling::div/p"
STATISTICS_REPORT_LAST_VERSION = f"{STATISTICS_REPORT_LAST_VERSION_LABEL}/parent::div/following-sibling::div/p"
STATISTICS_REPORT_LAST_VERSION_LABEL = f"//div[text()={STATISTICS_REPORT_LAST_VERSION_TEXT}]"
STATISTICS_SERVER_API_INPUT = f"//input[@id='statisticsReportServerApi']"
STATISTICS_SERVER_API_LABEL = f"//div[text()={STATISTICS_SERVER_API_TEXT}]"
STATISTICS_REPORT_INTERVAL_INPUT = f"//input[@id='statisticsReportTimeCycle']"
STATISTICS_REPORT_INTERVAL_LABEL = f"//div[text()={STATISTICS_REPORT_INTERVAL_TEXT}]"
STATISTICS_REPORT_UPDATE_DELAY_INPUT = f"//input[@id='statisticsReportUpdateDelay']"
STATISTICS_REPORT_UPDATE_DELAY_LABEL = f"//div[text()={STATISTICS_REPORT_UPDATE_DELAY_TEXT}]"

ADVANCED_SETTING_ELEMENT_BLOCKTWELVE = [
    SPECIFIC_FEATURES_INPUT,
    SPECIFIC_FEATURES_LABEL,
    STATISTICS_REPORT_LAST_NUMBER,
    STATISTICS_REPORT_LAST_NUMBER_LABEL,
    STATISTICS_REPORT_LAST_TIME_LABEL,
    STATISTICS_REPORT_LAST_TIME,
    STATISTICS_REPORT_LAST_TIME_VERSION,
    STATISTICS_REPORT_LAST_VERSION_LABEL,
    STATISTICS_SERVER_API_INPUT,
    STATISTICS_SERVER_API_LABEL,
    STATISTICS_REPORT_INTERVAL_INPUT,
    STATISTICS_REPORT_INTERVAL_LABEL,
    STATISTICS_REPORT_UPDATE_DELAY_INPUT,
    STATISTICS_REPORT_UPDATE_DELAY_LABEL,
]

SYNC_TIME_EPSILON_INPUT = f"//input[@id='syncTimeEpsilon']"
SYNC_TIME_EPSILON_LABEL = f"//div[text()={SYNC_TIME_EPSILON_TEXT}]"
SYNC_TIME_INTERVAL_NETWORK_INPUT = f"//input[@id='syncTimeExchangePeriod']"
SYNC_TIME_INTERVAL_NETWORK_LABEL = f"//div[text()={SYNC_TIME_INTERVAL_NETWORK_TEXT}]"
SYSTEM_NAME_INPUT = f"//input[@id='systemName']"
SYSTEM_NAME_LABEL = f"//div[text()={SYSTEM_NAME_TEXT}]"
TAKE_CAMERA_OWNERSHIP_WITHOUT_LOCK_CHECKBOX = f"//*[@id='takeCameraOwnershipWithoutLock']"
TAKE_CAMERA_OWNERSHIP_WITHOUT_LOCK_LABEL = f"//div[text()={TAKE_CAMERA_OWNERSHIP_WITHOUT_LOCK_TEXT}]"
TIME_SYNC_ENABLED_CHECKBOX = f"//*[@id='timeSynchronizationEnabled']"
TIME_SYNC_ENABLED_LABEL = f"//div[text()={TIME_SYNC_ENABLED_TEXT}]"
UPDATE_NOTIFICATIONS_ENABLED_CHECKBOX = f"//*[@id='updateNotificationsEnabled']"
UPDATE_NOTIFICATIONS_ENABLED_LABEL = f"//div[text()={UPDATE_NOTIFICATIONS_ENABLED_TEXT}]"
UPNP_PORT_MAPPING_ENABLED_CHECKBOX = f"//*[@id='upnpPortMappingEnabled']"
UPNP_PORT_MAPPING_ENABLED_LABEL = f"//div[text()={UPNP_PORT_MAPPING_ENABLED_TEXT}]"
USE_TEXT_EMAIL_FORMAT_CHECKBOX = f"//*[@id='useTextEmailFormat']"
USE_TEXT_EMAIL_FORMAT_LABEL = f"//div[text()={USE_TEXT_EMAIL_FORMAT_TEXT}]"
USE_WINDOWS_EMAIL_LINE_FEED_CHECKBOX = f"//*[@id='useWindowsEmailLineFeed']"
USE_WINDOWS_EMAIL_LINE_FEED_LABEL = f"//div[text()={USE_WINDOWS_EMAIL_LINE_FEED}]"
USE_WINDOWS_EMAIL_LINE_FEED_LABEL_HEBREW = f"//div[text()={USE_WINDOWS_EMAIL_LINE_FEED}]"
WATERMARK_SETTINGS = f"{WATERMARK_SETTINGS_LABEL}/parent::div/following-sibling::div/p"
WATERMARK_SETTINGS_LABEL = f"//div[text()={WATERMARK_SETTINGS_TEXT}]"
WEB_SOCKET_ENABLED_CHECKBOX = f"//*[@id='webSocketEnabled']"
WEB_SOCKET_ENABLED_LABEL = f"//div[text()={WEB_SOCKET_ENABLED_TEXT}]"

ADVANCED_SETTING_ELEMENT_BLOCK_THIRTEEN = [
    SYNC_TIME_EPSILON_INPUT,
    SYNC_TIME_EPSILON_LABEL,
    SYNC_TIME_INTERVAL_NETWORK_INPUT,
    SYNC_TIME_INTERVAL_NETWORK_LABEL,
    SYSTEM_NAME_INPUT,
    SYSTEM_NAME_LABEL,
]

ADVANCED_SETTING_ELEMENT_BLOCK_FOURTEEN = [
    TAKE_CAMERA_OWNERSHIP_WITHOUT_LOCK_CHECKBOX + VISIBLE,
    TAKE_CAMERA_OWNERSHIP_WITHOUT_LOCK_LABEL,
]

ADVANCED_SETTING_ELEMENT_BLOCK_FIFTEEN = [
    TIME_SYNC_ENABLED_CHECKBOX + VISIBLE,
    TIME_SYNC_ENABLED_LABEL,
    UPDATE_NOTIFICATIONS_ENABLED_CHECKBOX + VISIBLE,
    UPDATE_NOTIFICATIONS_ENABLED_LABEL,
]

ADVANCED_SETTING_ELEMENT_BLOCK_SIXTEEN = [
    UPNP_PORT_MAPPING_ENABLED_CHECKBOX + VISIBLE,
    UPNP_PORT_MAPPING_ENABLED_LABEL,
    USE_TEXT_EMAIL_FORMAT_CHECKBOX + VISIBLE,
    USE_TEXT_EMAIL_FORMAT_LABEL,
    USE_WINDOWS_EMAIL_LINE_FEED_CHECKBOX + VISIBLE,
    USE_WINDOWS_EMAIL_LINE_FEED_LABEL,
]

ADVANCED_SETTING_ELEMENT_BLOCK_SIXTEEN_HEBREW = [
    UPNP_PORT_MAPPING_ENABLED_CHECKBOX + VISIBLE,
    UPNP_PORT_MAPPING_ENABLED_LABEL,
    USE_TEXT_EMAIL_FORMAT_CHECKBOX + VISIBLE,
    USE_TEXT_EMAIL_FORMAT_LABEL,
    USE_WINDOWS_EMAIL_LINE_FEED_CHECKBOX + VISIBLE,
    USE_WINDOWS_EMAIL_LINE_FEED_LABEL_HEBREW,
]

ADVANCED_SETTING_ELEMENT_BLOCK_SEVENTEEN = [
    WATERMARK_SETTINGS,
    WATERMARK_SETTINGS_LABEL,
    WEB_SOCKET_ENABLED_CHECKBOX + VISIBLE,
    WEB_SOCKET_ENABLED_LABEL,
]


# Search

NX_SEARCH = f"//nx-menu/nx-search[@layout='search']"
SEARCH_INPUT = f"{NX_SEARCH}/div[contains(@class, search)]//input[@placeholder={SEARCH_PLACEHOLDER_TEXT}]"
SEARCH_ICON = f"{SEARCH_INPUT}/following-sibling::span[contains(@class, web-icon-search)]"
SEARCH_CLOSE_BUTTON = f"{SEARCH_INPUT}/following-sibling::button[contains(@class, search-clear)]"
SEARCH_NOTHING_FOUND = f"{NX_SEARCH}/following-sibling::div/div[contains(@class, nx-menu-placeholder) and contains(text(), {NOTHING_FOUND_TEXT})]"
MENU_SECTION = f"//nx-menu//div[contains(@class, 'nx-menu-section')]"
SEARCHABLE_MENU = f"{NX_SEARCH}/following-sibling::div[contains(@class, searchable)]"
SEARCH_RESULT_ARROW = f"{SEARCHABLE_MENU}//div[contains(@class, search-results)]"

VIEW_SEARCH_BOX = f"//div[contains(@class, 'search-box')]"
VIEW_SEARCH_INPUT = f"{VIEW_SEARCH_BOX}//input[@placeholder=Search]"
VIEW_SEARCH_DETAILS_TOGGLER = f"//div[contains(@class, 'search-box')]//div[contains(@class, 'details-toggler')]"
VIEW_SEARCH_SERVER_IP_INFO = f"//div[contains(@class, 'server-name')]/span[contains(text(), '%SERVER NAME%')]/following-sibling::span[contains(@class, 'ip-info')]"
USERS_EXPAND_BUTTON = f"{USERS_LINK}//div[contains(@class,search-results ng-star-inserted)]"
USERS_RESULTS_SUMMARY = f"{USERS_LINK}//span[contains(text(),result)]"
USERS_EXPAND_RESULTS = f"//*[@id='level3users']"

CAMERA_NAME = f"VirtualCamera"
CAMERA_IP = f"172.17.0.1"

# Webadmin

CLOUD_BLOCK = f"//nx-system-admin-component//nx-block[contains(@header-style, 'extended')]//div[contains(@class, 'extended-header')]//header"
CLOUD_NAME = f"{CLOUD_BLOCK}//div//h2[contains(text(), {PRODUCT_NAME})]"
CONNECTION_STATUS = f"{CLOUD_BLOCK}//nx-tag/a[contains(@class, badge)]"
CLOUD_LINK = f"{CLOUD_BLOCK}//a[@href={ENV}]"
CONNECT_TO_CLOUD_BUTTON = f"//button/span[contains(text(), {CONNECT_TO_CLOUD_TEXT})]/.."

# Webadmin - connect to cloud form

CONNECT_TO_CLOUD_MODAL = f"//cloud-connect-modal-content"
CONNECT_TO_CLOUD_FORM = f"{CONNECT_TO_CLOUD_MODAL}/form[@name=connectForm]"
CONNECT_TO_CLOUD_MODAL_HEADER = f"{CONNECT_TO_CLOUD_FORM}/div[contains(@class, modal-header)]"
CONNECT_TO_CLOUD_HEADER = f"{CONNECT_TO_CLOUD_MODAL_HEADER}/h1[contains(text(), {CONNECT_SYSTEM_TO_CLOUD_TEXT})]"
CONNECT_TO_CLOUD_X_BUTTON = f"{CONNECT_TO_CLOUD_MODAL_HEADER}//button/div[contains(@class, close-content)]/span[contains(@class, close-icon)]/../.."
CONNECT_TO_CLOUD_MODAL_BODY = f"{CONNECT_TO_CLOUD_FORM}/div[contains(@class, modal-body)]"
CONNECT_TO_CLOUD_MESSAGE = f"{CONNECT_TO_CLOUD_MODAL_BODY}/p"
CONNECT_TO_CLOUD_EMAIL_INPUT = f"{CONNECT_TO_CLOUD_MODAL_BODY}//label[@for=login_email and text()=Email]/following-sibling::input[@id=login_email and @name=login_email]"
CONNECT_TO_CLOUD_EMAIL_ERROR = f"{CONNECT_TO_CLOUD_EMAIL_INPUT}/..//div[contains(@class, input-error) and contains(text(), %ERROR TEXT%)]"
CONNECT_TO_CLOUD_PASSWORD_INPUT = f"{CONNECT_TO_CLOUD_MODAL_BODY}//label[@for=login_password and text()=Password]/following-sibling::input[@id=login_password and @name=login_password]"
CONNECT_TO_CLOUD_PASSWORD_ERROR = f"{CONNECT_TO_CLOUD_PASSWORD_INPUT}/following-sibling::div[contains(@class, input-error) and contains(text(), %ERROR TEXT%) ]"
CONNECT_TO_CLOUD_FORGOT_PASSWORD_LINK = f"{CONNECT_TO_CLOUD_FORM}//a[contains(@href, {ENV}/restore_password)]"
CONNECT_TO_CLOUD_CREATE_ACCOUNT_LINK = f"{CONNECT_TO_CLOUD_FORM}//a[contains(@href, {ENV}/register)]"
CONNECT_TO_CLOUD_MODAL_FOOTER = f"{CONNECT_TO_CLOUD_FORM}/div[contains(@class, modal-footer)]"
CONNECT_TO_CLOUD_OK_BUTTON = f"{CONNECT_TO_CLOUD_MODAL_FOOTER}//nx-process-button//button[contains(text(), {OK_TEXT})]"
CONNECT_TO_CLOUD_CANCEL_BUTTON = f"{CONNECT_TO_CLOUD_MODAL_FOOTER}//nx-cancel-button//button[contains(text(), {CANCEL_BUTTON_TEXT})]"
COMMON_CLOSE_BUTTON = f"//div[contains(@class, 'close-content')]/span[contains(@class, 'close-icon')]/../.."