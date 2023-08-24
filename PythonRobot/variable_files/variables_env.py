
IMAGE = f"{IMAGE_5_0}"
IMAGE_5_1 = f"5.1"
IMAGE_5_0 = f"5.0"
IMAGE_4_3 = f"4.3_test"
IMAGE_4_2 = f"4.2_test"


LOCAL = f"https://localhost:9000/"
CLOUD_TEST = f"https://cloud-test.hdw.mx"
CLOUD_DEV = f"https://dev2.cloud.hdw.mx"
CLOUD_DEV3 = f"https://dev3.cloud.hdw.mx"
CLOUD_TEST_REGISTER = f"https://cloud-test.hdw.mx/register"
CLOUD_STAGE = f"https://cloud-stage.hdw.mx"
DOWNLOADS_DOMAIN = f"updates.networkoptix.com"
ENV = f"{CLOUD_TEST}"
f"admin"f"qweasd 123"


BROWSER = f"Chrome"

MODE = f"cloud"

THEME = f"light"

QA_BURBANK_SYSTEM_IP = f"10.1.5.106"
QA_BURBANK_SYSTEM_ID = f"032c7c41-0ddd-48d7-ab09-616bfad7b5cc"

#Emails

BASE_EMAIL = f"{TEST_EMAIL}+sendemail@gmail.com"
BASE_EMAIL_NO_SEND = f"{TEST_EMAIL}@gmail.com"
BASE_EMAIL_DOMAIN = f"@gmail.com"
BASE_EMAIL_PASSWORD = f"ulmgatwvhjbtylhc"

BASE_HOST = f"imap.gmail.com"
BASE_PORT = f"993"
FROM_EMAIL_DEFAULT = f"{False}"
EMAIL_VIEWER = f"{TEST_EMAIL}+viewer{BASE_EMAIL_DOMAIN}"
EMAIL_ADV_VIEWER = f"{TEST_EMAIL}+advviewer{BASE_EMAIL_DOMAIN}"
EMAIL_LIVE_VIEWER = f"{TEST_EMAIL}+liveviewer{BASE_EMAIL_DOMAIN}"
EMAIL_OWNER = f"{TEST_EMAIL}+owner{BASE_EMAIL_DOMAIN}"
EMAIL_NOT_OWNER = f"{TEST_EMAIL}+notowner{BASE_EMAIL_DOMAIN}"
EMAIL_ADMIN = f"{TEST_EMAIL}+admin{BASE_EMAIL_DOMAIN}"
EMAIL_CUSTOM = f"{TEST_EMAIL}+custom{BASE_EMAIL_DOMAIN}"
EMAIL_CUSTOM_CAMERAS = f"{TEST_EMAIL}+customcameras{BASE_EMAIL_DOMAIN}"
EMAIL_CUSTOM_CAMERAS_LIMITED = f"{TEST_EMAIL}+customcameraslimited{BASE_EMAIL_DOMAIN}"
EMAIL_CLIENT_CUSTOM = f"{TEST_EMAIL}+clientcustom{BASE_EMAIL_DOMAIN}"
EMAIL_AUTO_TESTS_ANCHOR = f"{TEST_EMAIL}+autotestsanchor{BASE_EMAIL_DOMAIN}"
EMAIL_AUTO_TESTS_2_ANCHOR = f"{TEST_EMAIL}+autotests2anchor{BASE_EMAIL_DOMAIN}"
EMAIL_MOBILE_CAMERA_DEV = f"{TEST_EMAIL}+mobile_camera-developer{BASE_EMAIL_DOMAIN}"
EMAIL_DELETE_USER = f"{TEST_EMAIL}+deleteuser{BASE_EMAIL_DOMAIN}"
EMAIL_PORTAL_MANAGER = f"{TEST_EMAIL}+portal_manager{BASE_EMAIL_DOMAIN}"
EMAIL_SUPER_USER = f"{TEST_EMAIL}+super{BASE_EMAIL_DOMAIN}"
EMAIL_FACE_REC_DEV = f"{TEST_EMAIL}+face_recognition-developer{BASE_EMAIL_DOMAIN}"

EMAIL_MOBILE_CAMERA_DEV = f"{TEST_EMAIL}+mobile_camera-developer{BASE_EMAIL_DOMAIN}"
EMAIL_MOBILE_CAMERA_DEV = f"{TEST_EMAIL}+mobile_camera-developer{BASE_EMAIL_DOMAIN}"
EMAIL_PORTAL_MANAGER = f"{TEST_EMAIL}+portal_manager{BASE_EMAIL_DOMAIN}"
EMAIL_SUPER_USER = f"{TEST_EMAIL}+super{BASE_EMAIL_DOMAIN}"
EMAIL_FACE_REC_DEV = f"{TEST_EMAIL}+face_recognition-developer{BASE_EMAIL_DOMAIN}"


f"{EMAIL_VIEWER}=viewer"
f"{EMAIL_ADV_VIEWER}=advancedViewer"
f"{EMAIL_LIVE_VIEWER}=liveViewer"
f"{EMAIL_NOT_OWNER}=viewer"
f"{EMAIL_ADMIN}=cloudAdmin"
f"{EMAIL_CUSTOM}=custom"
f"{EMAIL_AUTO_TESTS_ANCHOR}=viewer"

permissions = {
    'cloudAdmin': 'GlobalAdminPermission|GlobalEditCamerasPermission|GlobalControlVideoWallPermission|GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission',
    'viewer': 'GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalAccessAllMediaPermission',
    'liveViewer': 'GlobalAccessAllMediaPermission',
    'advancedViewer': 'GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalExportPermission|GlobalViewBookmarksPermission|GlobalManageBookmarksPermission|GlobalUserInputPermission|GlobalAccessAllMediaPermission',
    'custom': 'NoGlobalPermissions'
}

role_names = {
    'cloudAdmin': ADMIN_TEXT,
    'viewer': VIEWER_TEXT,
    'liveViewer': LIVE_VIEWER_TEXT,
    'advancedViewer': ADV_VIEWER_TEXT,
    'custom': CUSTOM_TEXT
}


EMAIL_MERGE_OWNER_1 = f"{TEST_EMAIL}+mergeowner1{BASE_EMAIL_DOMAIN}"
EMAIL_MERGE_OWNER_2 = f"{TEST_EMAIL}+mergeowner2{BASE_EMAIL_DOMAIN}"
EMAIL_MERGE_OWNER_3_0 = f"{TEST_EMAIL}+mergeowner3.0{BASE_EMAIL_DOMAIN}"
f"{EMAIL_VIEWER}"f"{EMAIL_ADV_VIEWER}"f"{EMAIL_LIVE_VIEWER}"f"{EMAIL_OWNER}"f"{EMAIL_ADMIN}"f"{EMAIL_CUSTOM}"
ALT_BASE_EMAIL = f"qaburbank@gmail.com"
ALT_EMAIL_VIEWER = f"qaburbank+viewer@gmail.com"
ALT_EMAIL_ADV_VIEWER = f"qaburbank+advviewer@gmail.com"
ALT_EMAIL_LIVE_VIEWER = f"qaburbank+liveviewer@gmail.com"
ALT_EMAIL_OWNER = f"qaburbank+owner@gmail.com"
ALT_EMAIL_NOT_OWNER = f"qaburbank+notowner@gmail.com"
ALT_EMAIL_ADMIN = f"qaburbank+admin@gmail.com"
ALT_EMAIL_CUSTOM = f"qaburbank+custom@gmail.com"
ALT_EMAIL_CLIENT_CUSTOM = f"qaburbank+clientcustom@gmail.com"
ADMIN_FIRST_NAME = f"mark"
ADMIN_LAST_NAME = f"hamil"
EMAIL_UNREGISTERED = f"{TEST_EMAIL}+unregistered1{BASE_EMAIL_DOMAIN}"
EMAIL_NOPERM = f"{TEST_EMAIL}+noperm{BASE_EMAIL_DOMAIN}"
BASE_PASSWORD = f"qweasd 123"
ALT_PASSWORD = f"qweasd1234"



#Related to Auto Tests system

AUTO_TESTS = f"Auto Tests"
AUTO_TESTS_TITLE = f"{SYSTEMS_TILE}//h2[text()={AUTO_TESTS}]"
AUTO_TESTS_USER = f"{SYSTEMS_TILE}//h2[text()={AUTO_TESTS}]/following-sibling::span[contains(@class,user-name)]"
AUTO_TESTS_OPEN_NX = f"{SYSTEMS_TILE}//h2[text()={AUTO_TESTS}]/..//nx-client-button"
SYSTEM_NAME_AUTO_TESTS_HEADER = f"//header//li/a/span[text()={AUTO_TESTS}]"
SYSTEMS_TILE = f"//div[contains(@class,'system-button')]"
NOT_OWNER_IN_SYSTEM = f"//div[@process-loading=gettingSystemUsers]//tbody//tr//td[contains(text(),{EMAIL_NOT_OWNER})]"
VIEWER_IN_SYSTEM = f"//div[@process-loading=gettingSystemUsers]//tbody//tr//td[contains(text(),{EMAIL_VIEWER})]"
USER_IN_SYSTEM = f"//nx-level-3-item//nx-search-highlight[contains(text(),'%user%')]"
NOPTIXAUTOQA_SYSTEM_ID = f"a994749e-02a1-41c4-8ba4-ce3c4f91a40d"
NOPTIXAUTOQA_SYSTEM_NAME = f"{SYSTEMS_TILE}//h2[text()=d37113eeb066]"

DIFFERENT_OWNER_TITLE = f"{SYSTEMS_TILE}//h2[text()=different owner]"

ACCESS ROLES = {
    'liveViewer': 'Live Viewer',
    'viewer': 'Viewer',
    'advancedViewer': 'Advanced Viewer',
    'admin': 'Admin',
    'custom': 'Custom'
}

#AUTO TESTS 2 is an offline system used for testing offline status on the systems page and offline status on the system page

AUTO_TESTS_2 = f"Auto Tests 2"
AUTO_TESTS_OFFLINE_TITLE = f"{SYSTEMS_TILE}//h2[text()={AUTO_TESTS_2}]"
AUTOTESTS_OFFLINE = f"{AUTO_TESTS_OFFLINE_TITLE}/following-sibling::nx-tag/div[contains(text(),{AUTOTESTS_OFFLINE_TEXT})]"
AUTOTESTS_OFFLINE_OPEN_NX = f"{AUTO_TESTS_OFFLINE_TITLE}/..//nx-client-button"

#Cameras

NOAUTH_CAMERA_PASSWORD = f"qweasd123"

#Docker server machine info

QA_DOCKER_IPS = [
    'localhost',
    '192.168.1.157',
    '10.1.5.34'
]

#${QA BURBANK IP}                      10.1.5.48

QA_DOCKER_HOST_PORT = f"5555"
QA_BURBANK_USER = f"qaburbank"
QA_BURBANK_PASS = f"QABurbank777$"