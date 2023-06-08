

EMAIL = f"{EMAIL_OWNER}"
PASSWORD = f"{BASE_PASSWORD}"
auth = [EMAIL, PASSWORD ]
URL = f"{ENV}"
CAMERA_NAME1 = f"good cam 1"
CAMERA_NAME = f"unauth cam"
CAMERA_NAME3 = f"offline cam"
CAMERA_NAME4 = f"good cam 2"

camera_auth1 = ['admin', 'QAbur777$']
camera_auth2 = ['admin', 'wrongPass']
camera_auth3 = ['admin', 'admin']
camera_auth4 = ['admin', 'QAbur777$']

#view-page web elements

SERVER_LIST = f"//nx-system-view-index-page//div[@class='server-list']"
SERVER_LIST_MENU = f"//nx-system-view-index-page//media-server-list"
SERVER_LIST_INFO_OFF_BTN = f"//nx-system-view-index-page//media-server-list//div[@class='details-toggler']"
SERVER_LIST_INFO_ON_BTN = f"//nx-system-view-index-page//media-server-list//div[@class='details-toggler active']"
SERVER_LIST_NAME_INFO = f"//nx-system-view-index-page//media-server-list//div[@class='server-name']"
SERVER_LIST_SEARCH_BAR = f"//nx-system-view-index-page//media-server-list//nx-media-server-list-header//input"
SERVER_LIST_SEARCH_RESULT_PANE = f"//nx-system-view-index-page//media-server-list//div[@class='server-list']//div"
SERVER_LIST_SEARCH_CLEAR_INPUT = f"//nx-system-view-index-page//media-server-list//nx-media-server-list-header//*[local-name() = 'svg']"
CAMERA_PAGE_LIVE_INDICATOR = f"//nx-system-view-index-page//playback-state-indicator//div[@class='is-live active playing']"
SERVER_LIST_IP_INFO = f"//nx-system-view-index-page//media-server-list//div[@class='server-name']//span/following-sibling::span"
VERTICAL_TOGGLE_EAR_BEFORE_CLICK = f"//nx-system-view-index-page//nx-system-view-camera-page//div[contains(@class,'controls-toggling-ear')]/div/div"
STREAM_AND_CONTROLS_VISIBLE = f"//nx-system-view-index-page//nx-system-view-camera-page[contains(@class,'controls-shown')]"
SERVER_LIST_IS_VISIBLE = f"//nx-system-view-index-page[contains(@class,'sidebarShown')]"
HORIZONTAL_TOGGLE_EAR = f"//nx-system-view-index-page//div[contains(@class,'sidebar-toggling-ear')]"
SETTINGS_HEADER_TAB = f"//nx-app//header//nav//a[text()={SETTINGS_TEXT}]"
VIEW_HEADER_TAB = f"//nx-app//header//nav//a[text()='View']"
VIEW_SETTINGS_TOGGLER = f"//nx-system-view-index-page//nx-system-view-camera-page//div[@class='settings-toggler']"
VIEW_SETTINGS_TRANSPORT_WEBM = f"//nx-system-view-index-page//nx-system-view-camera-page//div[text()={VIEW_PAGE_WEBM_TEXT}]"
VIEW_SETTINGS_QUALITY_HIGH = f"//nx-system-view-index-page//nx-system-view-camera-page//div[text()={HIGH_TEXT}]"
VIEW_SETTINGS_QUALITY_LOW = f"//nx-system-view-index-page//nx-system-view-camera-page//div[text()={LOW_TEXT}]"
VIEW_SETTINGS_MENU_EXPAND = f"//nx-system-view-index-page//nx-system-view-camera-page//div[text()={VIEW_PAGE_TRANSPORT_TEXT}]"
VIEW_SETTINGS_TRANSPORT_HLS = f"//nx-system-view-index-page//nx-system-view-camera-page//div[text()={VIEW_PAGE_HLS_TEXT}]"
VIEW_SETTINGS_QUALITY_1080P = f"//nx-system-view-index-page//nx-system-view-camera-page//div[text()='1080p']"
VIEW_CAMERA_QUALITY = f"//nx-system-view-index-page//nx-system-view-camera-page//span[@class='name']/span"
VIEW_CAMERA_NAME_AND_QUALITY = f"//nx-system-view-index-page//nx-system-view-camera-page//span[@class='name']"
CAMERA_PLAYER = f"//nx-system-view-camera-page//player//player-js"
VIEW_CAMERA_LOADING = f"//nx-system-view-camera-page//div[@name='placeholder']//div"
VIEW_CAMERA_IS_LIVE_INDICATOR = f"//nx-system-view-camera-page//div[@class='is-live active playing']"
VIEW_CAMERA_PLAYER_OFFLINE = f"//nx-system-view-index-page//nx-player-placeholder//span[text()={VIEW_PAGE_CAMERA_OFFLINE_TEXT}]"
VIEW_CAMERA_PLAYER_AUTHENTICATION = f"//nx-system-view-index-page//nx-player-placeholder//span[text()={VIEW_PAGE_CAMERA_AUTHENTICATION_TEXT}]"
SYSTEM_NAME = f"//div/nx-editable-heading[@id='systemName']"
SYSTEM_OFFLINE = f"//nx-system-view-index-page//div[@name='OFFLINE']"