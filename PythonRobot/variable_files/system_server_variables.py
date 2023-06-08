
PASSWORD = f"{BASE_PASSWORD}"
URL = f"{ENV}"
server_auth = {"admin" : "{password}"}

SERVERS_LINK = f"//nx-menu//a[@id='servers']"
SERVER_NAME = f"//header//nx-text-editable"
IP = f"//header//p[contains(text(),{IP_TEXT})]"
OS = f"//header//p[contains(text(),{OS_TEXT})]"
VERSION = f"//header//p[contains(text(),{VERSION_TEXT})]"
PORT_INPUT = f"//div/span[contains(text(),{PORT_TEXT})]/..//input[@type=number]"
SERVER_PORT_IS_REQUIRED_ERROR = f"//div/span[contains(@class,input-error) and contains(text(),{SERVER_PORT_IS_REQUIRED_TEXT})]"
PORT_TOO_LOW_ERROR = f"//nx-apply//div[contains(@class,warning-text) and contains(text(),{PORT_TOO_LOW_TEXT})]"
PORT_INPUT = f"//div/span[contains(text(),{PORT_TEXT})]/following-sibling::input"
CHECK_STATUS_BUTTON = f"//nx-alert-block//button/span[contains(text(),{CHECK_STATUS_TEXT})]/.."
SERVER_DETAILED_INFO_BUTTON = f"//div[contains(@class, server-info)]//header//button/span[contains(text(),{DETAILED_INFO_TEXT})]/.."
SERVER_1_LIST_MENU_NAME = f"//nx-level-3-item//a//span[contains(text(),'server 1')]"
SERVER_OFFLINE_ALERT = f"//nx-alert-block//span[contains(text(),{SERVER_OFFLINE_TEXT})]"
RENAME_SERVER_BUTTON = f"//nx-section//button/span[contains(text(),{RENAME})]/.."
RESTART_SERVER_BUTTON = f"//nx-section//button/span[contains(text(),{RESTART})]/.."
RESTART_SERVER_FORM = f"//nx-modal-restart-server-content"
RESTART_DIALOG_CLOSE_BUTTON = f"{RESTART_SERVER_FORM}//button[contains(@class,close)]"
RESTART_DIALOG_CANCEL_BUTTON = f"{RESTART_SERVER_FORM}//button[contains(text(),{CANCEL_BUTTON_TEXT})]"
RESTART_DIALOG_RESTART_BUTTON = f"{RESTART_SERVER_FORM}//button[@type=submit]"
RESTARTING_BANNER = f"//nx-alert-block//span[contains(text(),{RESTARTING})]"
RESET_SERVER_TO_DEFAULTS = f"//nx-section//button/span[contains(text(),{RESET_TO_DEFAULTS_TEXT})]/.."
RENAME_SERVER_FORM = f"//form[@name='renameServerForm']"
RENAME_SAVE_BUTTON = f"{RENAME_SERVER_FORM}//button[contains(text(),{SAVE_BUTTON_TEXT})]"
RENAME_CANCEL_BUTTON = f"{RENAME_SERVER_FORM}//button[contains(text(),{CANCEL_BUTTON_TEXT})]"
RENAME_CLOSE_BUTTON = f"{RENAME_SERVER_FORM}//button[contains(@class,close)]"
RENAME_SERVER_INPUT = f"{RENAME_SERVER_FORM}//input[@id=serverName]"
RENAME_ERROR_TEXT = f"{RENAME_SERVER_INPUT}/following-sibling::p/span[contains(@class,input-error)]"

ANALYTICS_DROPDOWN = f"//button[@id='system']"
ANALYTICS_WARNING = f"//p[contains(text(), {ANALYTICS_WARNING_TEXT})]"
CHANGE_ANALYTICS_MODAL = f"//nx-modal-change-storage/form[@id='changeStorageForm']"
CS_MODAL_CLOSE_BUTTON = f"{CHANGE_ANALYTICS_MODAL}/div[@class=modal-header]/button"
CS_MODAL_DELETE_BUTTON = f"{CHANGE_ANALYTICS_MODAL}/div[contains(@class, modal-footer)]/nx-process-button//button[contains(text(), {DELETE_BUTTON_TEXT})]"
CS_MODAL_KEEP_BUTTON = f"{CHANGE_ANALYTICS_MODAL}/div[contains(@class, modal-footer)]/nx-process-button//button[contains(text(), {KEEP_BUTTON_TEXT})]"
CS_MODAL_CANCEL_BUTTON = f"{CHANGE_ANALYTICS_MODAL}/div[contains(@class, modal-footer)]/nx-cancel-button//button"
CS_MODAL_PARAGRAPH = f"{CHANGE_ANALYTICS_MODAL}//p[contains(text(),{ANALYTICS_DATA_MOVE_TEXT})]"
CS_MODAL_CONTACT = f"{CHANGE_ANALYTICS_MODAL}//p[contains(text(),{ANALYTICS_DATA_MOVE_CONTACT_TEXT})]"
CS_MODAL_SUPPORT_LINK = f"{CHANGE_ANALYTICS_MODAL}//a"

STORAGE_LOCATIONS_BLOCK = f"//nx-block/div[contains(@class, 'storage-info')]"
STORAGE_LOCATIONS_PLACEHOLDER = f"{STORAGE_LOCATIONS_BLOCK}//div[contains(@class, placeholder-preloader)]"
STORAGE_NOT_ABLE_TO_LOAD = f"//span[contains(text(), {NOT_ABLE_TO_LOAD_STORAGE_TEXT})]"
STORAGE_INFO_BUTTON = f"{STORAGE_LOCATIONS_BLOCK}//header//button/span[contains(text(), {DETAILED_INFO_TEXT})]/.."
STORAGE_LOCATIONS_TABLE = f"{STORAGE_LOCATIONS_BLOCK}//nx-section//form[@name=storageSettings]"
STORAGE_RESERVED_MODE = f"//span[contains(text(), {RESERVED})]"
STORAGE_INACCESSIBLE_MODE = f"{STORAGE_LOCATIONS_TABLE}//div[contains(@class, disabled-label)]/span[contains(text(), {INACCESSIBLE})]"
STORAGE_CHANGING_MODE = f"{STORAGE_LOCATIONS_TABLE}//div[contains(@class, disabled-label)]/span[contains(text(), {CHANGING})]"
STORAGE_DROPDOWN = f"{STORAGE_LOCATIONS_TABLE}//tbody/tr/td[2]//nx-select"
STORAGE_MAIN_MODE = f"//span[contains(text(), {MAIN})]"
STORAGE_BACKUP_MODE = f"//span[contains(text(), {BACKUP})]"
STORAGE_NOT_IN_USE_MODE = f"//span[contains(text(), {NOT_IN_USE})]"
STORAGE_BACKUP_MODE_DISABLED = f"//span[contains(text(), {BACKUP}) and @class=disabled]"
STORAGE_NOT_IN_USE_MODE_DISABLED = f"//span[contains(text(), {NOT_IN_USE}) and @class=disabled]"
STORAGE_MODE_LINE = f"//span[contains(text(), {BACKUP})]/ancestor::li/following-sibling::li/hr"
STORAGE_MAIN_MENU_ITEM = f"{STORAGE_MAIN_MODE}/parent::button/following-sibling::div/ul/li//span[contains(text(), {MAIN})]/parent::a"
STORAGE_BACKUP_MENU_ITEM = f"{STORAGE_MAIN_MODE}/parent::button/following-sibling::div/ul/li//span[contains(text(), {BACKUP})]/parent::a"
STORAGE_NOT_IN_USE_MENU_ITEM = f"{STORAGE_MAIN_MODE}/parent::button/following-sibling::div/ul/li//span[contains(text(), {NOT_IN_USE})]/parent::a"
STORAGE_SYSTEM_TOOLTIP = f"//ngb-tooltip-window//div[contains(text(), {RESERVED_SYSTEM_TOOLTIP})]"
STORAGE_NONSYSTEM_TOOLTIP = f"//ngb-tooltip-window//div[contains(text(), {RESERVED_NONSYSTEM_TOOLTIP})]"
STORAGE_LOCATIONS_FIRST_ROW = f"{STORAGE_LOCATIONS_TABLE}//tbody//tr[2]"
STORAGE_LOCATIONS_FIRST_SPACE = f"{STORAGE_LOCATIONS_FIRST_ROW}/td[3]/nx-storage-size-component/div[@class=container]"
STORAGE_POPOVER = f"//nx-popover"
STORAGE_ITEM = f"//span[contains(text(),'HD Witness Media') and @class='ellipsis']"
STORAGE_DISK_0 = f"//span[contains(text(), 'disk0') and @class='ellipsis']"
STORAGE_DISK_1 = f"//span[contains(text(), 'disk1') and @class='ellipsis']"
STORAGE_DISK_2 = f"//span[contains(text(), 'disk2') and @class='ellipsis']"
STORAGE_DISK_3 = f"//span[contains(text(), 'disk3') and @class='ellipsis']"
STORAGE_DISK_4 = f"//span[contains(text(), 'disk4') and @class='ellipsis']"
STORAGE_DISK_INVALID = f"//span[contains(text(), 'invalid') and @class='ellipsis']"
STORAGE_DISK_NETWORK = f"//span[contains(text(), 'networkdisk') and @class='ellipsis']"
STORAGE_DISABLED_INACCESSIBLE = f"{STORAGE_DISK_INVALID}/parent::td[@class=disabled-label]/following-sibling::td/div[contains(text(), {INACCESSIBLE})]"
STORAGE_DISABLED_NOT_IN_USE = f"{STORAGE_DISK_2}/parent::td[@class=disabled-label]/following-sibling::td{STORAGE_NOT_IN_USE_MODE}"
STORAGE_DISABLED_RESERVED = f"{STORAGE_DISK_3}/parent::td[@class=disabled-label]/following-sibling::td{STORAGE_RESERVED_MODE}"
STORAGE_ENABLED_MAIN = f"{STORAGE_DISK_0}/parent::td[not(@class=disabled-label)]/following-sibling::td{STORAGE_MAIN_MODE}"
STORAGE_ENABLED_BACKUP = f"{STORAGE_DISK_1}/parent::td[not(@class=disabled-label)]/following-sibling::td{STORAGE_BACKUP_MODE}"
STORAGE_DISABLED_RESERVED_ICON = f"{STORAGE_DISK_3}/parent::td[@class=disabled-label]//*[name()=svg-icon and contains(@data-src,/images/icons/text_buttons/storage_local.svg)]"
STORAGE_DISABLED_NOT_IN_USE_ICON = f"{STORAGE_DISK_2}/parent::td[@class=disabled-label]//*[name()=svg-icon and contains(@data-src,/images/icons/text_buttons/storage_local.svg)]"
STORAGE_DISABLED_INACCESSIBLE_ICON = f"{STORAGE_DISK_INVALID}/parent::td[@class=disabled-label]//*[name()=svg-icon and contains(@data-src,/images/icons/text_buttons/storage_local.svg)]"
STORAGE_ENABLED_MAIN_ICON = f"{STORAGE_DISK_0}/parent::td[not(@class=disabled-label)]//*[name()=svg-icon and contains(@data-src,/images/icons/text_buttons/storage_local.svg)]"
STORAGE_DISABLED_RESERVED_ADDRESS = f"{STORAGE_DISK_3}"
STORAGE_DISABLED_NOT_IN_USE_ADDRESS = f"{STORAGE_DISK_2}"
STORAGE_DISABLED_INACCESSIBLE_ADDRESS = f"{STORAGE_DISK_INVALID}"
STORAGE_ENABLED_MAIN_ADDRESS = f"{STORAGE_DISK_0}"
STORAGE_RESERVED_TOOLTIP_ICON = f"{STORAGE_DISABLED_RESERVED}/following-sibling::*[name()=svg-icon and contains(@data-src,/images/icons/text_buttons/info.svg)]"
STORAGE_RESERVED_TOOLTIP = f"//div[contains(@class, tooltip-body) and contains(text(), {RESERVED_NONSYSTEM_TOOLTIP})]"
STORAGE_INACCESSIBLE_SIZE = f"{STORAGE_DISABLED_INACCESSIBLE}/parent::td/following-sibling::td"
RESERVED_SPACE = f"{STORAGE_POPOVER}//td[contains(text(),Reserved)]/following-sibling::td"
RESERVED_SPACE_ADVANCED = f"//input[@id='reservedSpace0-numeric']"
MEDIA_ATTRIBUTES_DICT = {
                        "allowAutoRedundancy": False, "backupBitrate":-12500000,
                         "backupDaysOfTheWeek":254, "backupDuration":-1,
                         "backupStart": 0, "backupType" : EMPTY,
                         "maxCameras":0, "metadataStorageId": "00000000-0000-0000-0000-000000000000",
                         "serverId": EMPTY, "serverName": EMPTY
                         }
ARCHIVE_BACKUP_CHECK_BOX = f"//nx-switch/div[@id='archive-backup-switch-wrapper']"
ARCHIVE_BACKUP_SWITCH_SLIDER = f"//span[@class='slider round']"
ARCHIVE_BACKUP_SWITCH_ENABLED = f"//input[@id='archive-backup-switch' and @class='selected']"
ARCHIVE_BACKUP_STREAMS_MSG = f"//p[contains(text(), {ARCHIVE_BACKUP_STREAMS_MSG_TEXT})]"
ARCHIVE_BACKUP_CLIENT_MSG = f"//p[contains(text(), {ARCHIVE_BACKUP_CLIENT_MSG_TEXT})]"
ARCHIVE_BACKUP_SET_CLIENT_MSG = f"//p[contains(text(), {ARCHIVE_BACKUP_SET_CLIENT_MSG_TEXT})]"
ARCHIVE_BACKUP_RESET_MSG = f"//p[contains(text(), {ARCHIVE_BACKUP_RESET_MSG_TEXT})]"
BACKUP_RESET_BUTTON = f"//button[contains(text(),{RESET_BACKUP_BUTTON_TEXT})]"
RESET_BACKUP_MODAL = f"//nx-modal-reset-backup"
RESET_BACKUP_MODAL_TITLE = f"{RESET_BACKUP_MODAL}//h1"
RESET_BACKUP_RESET_BUTTON = f"{RESET_BACKUP_MODAL}//button[@type=submit]"
RESET_BACKUP_CLOSE_BUTTON = f"{RESET_BACKUP_MODAL}//button[@aria-label=Close]"
RESET_BACKUP_CANCEL_BUTTON = f"{RESET_BACKUP_MODAL}//button[contains(text(), {CANCEL_BUTTON_TEXT})]"
RECORDING_STOP_WARNING = f"//*[contains(text(), {RECORDING_STOP_WARNING_TEXT})]"
STORAGE_LOCAL_ICON = f"*[name()='svg-icon' and contains(@data-src,'/images/icons/text_buttons/storage_local.svg')]"
STORAGE_LOADING_ICON = f"//*[name()='svg-icon' and contains(@data-src,'/images/icons/text_buttons/loading.svg')]"
STORAGE_DELETION_ALERT_ICON = f"//*[name()='svg-icon' and contains(@data-src,'/images/icons/error.svg')]"
STORAGE_DELETION_ALERT_TOOLTIP = f"//div[contains(@class, tooltip-body) and contains(text(), {STORAGE_DELETION_ALERT_TOOLTIP_TEXT})]"
STORAGE_SMB_ICON = f"*[name()='svg-icon' and contains(@data-src,'/images/icons/text_buttons/storage_smb.svg')]"
STORAGE_SMB_TOOLTIP = f"//div[contains(@class, tooltip-body) and contains(text(), {SMB_TOOLTIP_TEXT})]"
STORAGE_DELETE_ICON = f"//*[name()='svg-icon' and contains(@data-src,'/images/icons/standard/delete.svg')]"
STORAGE_DELETE_BUTTON = f"{STORAGE_DELETE_ICON}/parent::button"
SMB_STORAGE_DELETE_BUTTON = f"{STORAGE_DISK_NETWORK}/parent::td/following-sibling::td{STORAGE_DELETE_BUTTON}"
INACCESSIBLE_STORAGE_DELETE_BUTTON = f"{STORAGE_DISK_INVALID}/parent::td/following-sibling::td{STORAGE_DELETE_BUTTON}"
STORAGE_SCROLLBAR = f"//form[@name='storageSettings']"
STORAGE_ADDRESS_COLUMN = f"{STORAGE_SCROLLBAR}//th[contains(text(),{STORAGE_LOCATIONS_ADDRESS_TEXT})]"
STORAGE_MODE_COLUMN = f"{STORAGE_SCROLLBAR}//th[contains(text(),{STORAGE_LOCATIONS_MODE_TEXT})]"
STORAGE_SPACE_COLUMN = f"{STORAGE_SCROLLBAR}//th[contains(text(),{STORAGE_LOCATIONS_SPACE_TEXT})]"
STORAGE_SIZE_CHART = f"//td[@class='size-chart']"

DELETE_STORAGE_MODAL = f"//div[contains(@class, 'modal-body')]"
DELETE_STORAGE_CLOSE_BUTTON = f"//button[@aria-label='Close']"
DELETE_STORAGE_CANCEL_BUTTON = f"//div[contains(@class, 'modal-footer')]//button/span/parent::button"
DELETE_STORAGE_DELETE_BUTTON = f"//button[contains(text(), {DELETE_BUTTON_TEXT})]"

STORAGE_ADD_BUTTON = f"{STORAGE_LOCATIONS_BLOCK}//nx-section//button[contains(text(), {ADD_EXTERNAL_STORAGE})]"
ADD_STORAGE_MODAL = f"//nx-modal-add-storage/form[@id='addStorageForm']"
ADD_EXTERNAL_STORAGE_HEADER = f"//h1[@class=modal-title and contains(text(),{ADD_EXTERNAL_STORAGE})]"
AS_MODAL_CLOSE_BUTTON = f"{ADD_STORAGE_MODAL}/div[@class=modal-header]/button"
AS_MODAL_URL_INPUT = f"{ADD_STORAGE_MODAL}/div[contains(@class, modal-body)]//input[@id=addUrl]"
AS_MODAL_URL_INPUT_ERROR = f"{ADD_STORAGE_MODAL}/div[contains(@class, modal-body)]//input[@id=addUrl and contains(@class, ng-invalid)]"
AS_MODAL_URL_REQUIRED = f"{AS_MODAL_URL_INPUT}/parent::div/following-sibling::div/span[contains(text(), {URL_REQUIRED_TEXT})]"
AS_MODAL_URL_INVALID = f"{AS_MODAL_URL_INPUT}/parent::div/following-sibling::div/span[contains(text(), {INVALID_URL_TEXT})]"
AS_MODAL_URL_ALREADY_ADDED = f"{AS_MODAL_URL_INPUT}/parent::div/following-sibling::div/span[contains(text(), {STORAGE_PATH_ALREADY_ADDED_TEXT})]"
AS_MODAL_URL_NOT_FOUND = f"{AS_MODAL_URL_INPUT}/parent::div/following-sibling::div/span[contains(text(), {NO_STORAGE_FOUND_TEXT})]"
AS_MODAL_URL_NOT_INVALID = f"{ADD_STORAGE_MODAL}/div[contains(@class, modal-body)]//input[@id=addUrl and not(contains(@class, ng-invalid))]"
AS_MODAL_LOGIN_INPUT = f"{ADD_STORAGE_MODAL}/div[contains(@class, modal-body)]//input[@id=addLogin]"
AS_MODAL_LOGIN_INPUT_ERROR = f"{ADD_STORAGE_MODAL}/div[contains(@class, modal-body)]//input[@id=addLogin and contains(@class, ng-invalid)]"
AS_MODAL_LOGIN_REQUIRED = f"{AS_MODAL_LOGIN_INPUT}/parent::div/following-sibling::div/span[contains(text(), {LOGIN_IS_REQUIRED_TEXT})]"
AS_MODAL_PASSWORD_INPUT = f"{ADD_STORAGE_MODAL}/div[contains(@class, modal-body)]//input[@id=addPassword]"
AS_MODAL_PASSWORD_INPUT_ERROR = f"{ADD_STORAGE_MODAL}/div[contains(@class, modal-body)]//input[@id=addPassword and contains(@class, ng-invalid)]"
AS_MODAL_PASSWORD_REQUIRED = f"{AS_MODAL_PASSWORD_INPUT}/parent::div/following-sibling::div/span[contains(text(), {PASSWORD_IS_REQUIRED_TEXT})]"
AS_MODAL_PASSWORD_INVALID = f"{AS_MODAL_PASSWORD_INPUT}/parent::div/following-sibling::div/span[contains(text(), {LOGIN_OR_PASSWORD_INCORRECT_TEXT})]"
AS_MODAL_SUBMIT_BUTTON = f"{ADD_STORAGE_MODAL}/div[contains(@class, modal-footer)]/nx-process-button//button"
AS_MODAL_CANCEL_BUTTON = f"{ADD_STORAGE_MODAL}/div[contains(@class, modal-footer)]/nx-cancel-button//button"
AS_FAILED_TO_ADD_TOAST = f"//app-toasts//nx-toast/div[contains(@class, alert)]/span[contains(text(), {FAILED_TO_ADD_STORAGE_TEXT})]"
AS_MODAL_STORAGE_ADDED_BY_ANOTHER_SERVER = f"{ADD_STORAGE_MODAL}//*[contains(text(), {STORAGE_PATH_ALREADY_ADDED_TEXT})]"
AS_MODAL_STORAGE_USED_BY_ANOTHER_SERVER = f"{ADD_STORAGE_MODAL}//*[contains(text(), {STORAGE_PATH_ALREADY_USED_TEXT})]"
AS_MODAL_NOT_RECOMMENEDED = f"{ADD_STORAGE_MODAL}//*[contains(text(), {NOT_RECOMMENDED_DIFFERENT_SERVERS_TEXT})]"
AS_MODAL_ADD_ANYWAY = f"{ADD_STORAGE_MODAL}//*[contains(text(), {ADD_THIS_STORAGE_ANYWAY_TEXT})]"
AS_MODAL_BACK_BUTTON = f"{ADD_STORAGE_MODAL}/div[contains(@class, modal-footer)]//button[contains(text(), {BACK_TEXT})]"

STORAGE_REINDEXING_BLOCK = f"//nx-block//div[contains(@class, 'reindex-container')]"
STORAGE_REINDEX_ARCHIVE_HEADER = f"//h4[contains(text(), {REINDEX_ARCHIVE_TEXT})]"
STORAGE_REINDEX_ARCHIVE_MSG = f"//p[contains(text(), {REINDEX_ARCHIVE_MSG_TEXT})]"
STORAGE_REINDEX_MAIN_BUTTON = f"{STORAGE_REINDEXING_BLOCK}//button[contains(text(), {REINDEX_MAIN_STORAGE_TEXT})]"
STORAGE_REINDEX_BACKUP_BUTTON = f"{STORAGE_REINDEXING_BLOCK}//button[contains(text(), {REINDEX_BACKUP_STORAGE_TEXT})]"
STORAGE_REINDEX_TOOLTIP_FIRST = f"//div[contains(@class, tooltip-body)]/p[contains(text(), {REINDEX_TOOLTIP_FIRST})]"
STORAGE_REINDEX_TOOLTIP_SECOND = f"//div[contains(@class, tooltip-body)]//p[contains(text(), {REINDEX_TOOLTIP_SECOND})]"
STORAGE_REINDEXING_MAIN = f"{STORAGE_REINDEXING_BLOCK}//section[@id=reindex-main]//div[contains(text(), {REINDEXING_MAIN})]"
REINDEXING_MAIN_PERCENT = f"{STORAGE_REINDEXING_MAIN}/following-sibling::span"
REINDEXING_MAIN_CANCEL_BUTTON = f"{STORAGE_REINDEXING_BLOCK}//section[@id=reindex-main]/button[contains(text(), {CANCEL_BUTTON_TEXT})]"
STORAGE_REINDEXING_BACKUP = f"{STORAGE_REINDEXING_BLOCK}//section[@id=reindex-backup]//div[contains(text(), {REINDEXING_BACKUP})]"
REINDEXING_BACKUP_PERCENT = f"{STORAGE_REINDEXING_BACKUP}/following-sibling::span"
REINDEXING_MAIN_CANCEL_BUTTON = f"{STORAGE_REINDEXING_BLOCK}//section[@id=reindex-backup]/button[contains(text(), {CANCEL_BUTTON_TEXT})]"

CLOUD_STORAGE_INFO_BLOCK = f"//nx-cloud-storage/nx-block//h2[contains(text(), {CLOUD_STORAGE_TITLE})]/.."

SERVER_NOT_ACCESIBLE_IMAGE = f"//div[contains(@class,'placeholder-icon') and @name='NO_SETTINGS']"
OFFLINE_BANNER = f"//nx-alert-block//span[contains(text(),{SERVER_OFFLINE_TEXT})]"
CHECKING_BANNER = f"//nx-alert-block//span[contains(text(),{CHECKING_TEXT})]"
OUTDATED_BANNER = f"//div[@class=warning-margin]/div[contains(text(), {STORAGES_OUTDATED_WARNING_TEXT})]"
RELOAD_ICON = f"//*[name()='svg-icon' and contains(@data-src,'/images/icons/text_buttons/reload.svg')]"

# ADVANCED

# Storage Locations Block

STORAGE_LOCATIONS_TITLE = f"//div[@class=card mt-3]//h4[text()={STORAGE_LOCATIONS_TEXT}]"
RESERVED_SPACE_INPUT = f"//input[@id='reservedSpace0-numeric']"
RESERVED_SPACE_DROPDOWN = f"//select[@id='reservedSpaceUnit0']"
RESERVED_DROPDOWN_SELECTED = f"{RESERVED_SPACE_DROPDOWN}//option[@selected]"
RESERVED_DROPDOWN_OPTION_GB = f"{RESERVED_SPACE_DROPDOWN}//option[@value=GB]"
RESERVED_DROPDOWN_OPTION_TB = f"{RESERVED_SPACE_DROPDOWN}//option[@value=TB]"
STORAGE_ENABLE_SWITCH = f"//div[@id='isUsedForWriting0-switch-wrapper']"
STORAGE_LOCATIONS_BLOCK_ITEMS = [STORAGE_LOCATIONS_TITLE,
                                 RESERVED_SPACE_INPUT,
                                 RESERVED_SPACE_DROPDOWN,
                                 STORAGE_ENABLE_SWITCH
                                 ]
STORAGE_ENABLE_SWITCH_STYLE = f"{STORAGE_ENABLE_SWITCH}//span[@class=slider round]"
STORAGE_SWITCH_ENABLED_COLOR = f"rgba(58, 145, 30, 1)"
STORAGE_SWITCH_DISABLED_COLOR = f"rgba(185, 199, 206, 1)"
SERVER_ADVANCED_DISABLED_COLOR = f"rgba(195, 207, 213, 1)"
STORAGE_FREE_SPACE_VALUE = f"//td[@title='/recordings/HD Witness Media']//following-sibling::td[2]"

# Log settings block

LOG_SETTINGS_TITLE = f"//h4[text()={LOG_SETTINGS_TEXT}]"
EC2_TRAN_LOG_LEVEL_DROPDOWN = f"//button[@id='EC2_TRAN']"
HTTP_LOG_LEVEL_DROPDOWN = f"//button[@id='HTTP']"
HWID_LOG_LEVEL_DROPDOWN = f"//button[@id='HWID']"
MAIN_LOG_LEVEL_DROPDOWN = f"//button[@id='MAIN']"
PERMISSIONS_LOG_LEVEL_DROPDOWN = f"//button[@id='PERMISSIONS']"

LOG_SETTINGS_BLOCK = [
    LOG_SETTINGS_TITLE,
    EC2_TRAN_LOG_LEVEL_DROPDOWN,
    HTTP_LOG_LEVEL_DROPDOWN,
    HWID_LOG_LEVEL_DROPDOWN,
    MAIN_LOG_LEVEL_DROPDOWN,
    PERMISSIONS_LOG_LEVEL_DROPDOWN
]

LOGLEVEL_IDS = [
    EC2_TRAN_LOG_LEVEL_DROPDOWN,
    HTTP_LOG_LEVEL_DROPDOWN,
    HWID_LOG_LEVEL_DROPDOWN,
    MAIN_LOG_LEVEL_DROPDOWN,
    PERMISSIONS_LOG_LEVEL_DROPDOWN
]

LOGLEVEL_OPTIONS = [
    ERROR_TEXT,
    WARNING_TEXT,
    INFO_TEXT,
    DEBUG_TEXT,
    VERBOSE_TEXT,
    NONE_TEXT
]

STORAGE_SAVE_BUTTON = f"{STORAGE_LOCATIONS_TITLE}//ancestor::div[@class=card--header]//following-sibling::nx-section[@class=ng-star-inserted]//button[contains(text(), {SAVE_BUTTON_TEXT})]"
STORAGE_CANCEL_BUTTON = f"{STORAGE_LOCATIONS_TITLE}//ancestor::div[@class=card--header]//following-sibling::nx-section[@class=ng-star-inserted]//button[contains(text(), {CANCEL_BUTTON_TEXT})]"
LOG_SAVE_BUTTON = f"{LOG_SETTINGS_TITLE}//ancestor::div[@class=card]//button[text()={SAVE_BUTTON_TEXT}]"

ADVANCED_SAVE_MODAL_CLOSE_BUTTON = f"//nx-modal-generic-content//button[contains(text(), {CLOSE_TEXT})]"