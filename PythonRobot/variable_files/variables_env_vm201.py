

LOCAL = f"https://localhost:9000/"
CLOUD_TEST = f"https://cloud-test.hdw.mx"
CLOUD_DEV = f"https://cloud-dev2.hdw.mx"
CLOUD_TEST_REGISTER = f"https://cloud-test.hdw.mx/register"
CLOUD_STAGE = f"https://cloud-stage.hdw.mx"
VM_201 = f"https://vm201.la.hdw.mx"
DOWNLOADS_DOMAIN = f"updates.networkoptix.com"
ENV = f"{VM_201}"
SCREENSHOTDIRECTORY = f"\Screenshots"

BROWSER = f"Chrome"

#Emails

BASE_EMAIL = f"noptixautoqat4@gmail.com"
BASE_EMAIL_PASSWORD = f"qweasd!@#$%"
BASE_HOST = f"imap.gmail.com"
BASE_PORT = f"993"
EMAIL_VIEWER = f"noptixautoqat4+viewer@gmail.com"
EMAIL_ADV_VIEWER = f"noptixautoqat4+advviewer@gmail.com"
EMAIL_LIVE_VIEWER = f"noptixautoqat4+liveviewer@gmail.com"
EMAIL_OWNER = f"noptixautoqat4+owner@gmail.com"
EMAIL_NOT_OWNER = f"noptixautoqat4+notowner@gmail.com"
EMAIL_ADMIN = f"noptixautoqat4+admin@gmail.com"
EMAIL_CUSTOM = f"noptixautoqat4+custom@gmail.com"
EMAIL_CLIENT_CUSTOM = f"noptixautoqat4+clientcustom@gmail.com"
EMAIL_AUTO_TESTS_ANCHOR = f"noptixautoqat4+autotestsanchor@gmail.com"
EMAIL_AUTO_TESTS_2_ANCHOR = f"noptixautoqat4+autotests2anchor@gmail.com"
EMAIL_MERGE_OWNER_1 = f"noptixautoqat4+mergeowner1@gmail.com"
EMAIL_MERGE_OWNER_2 = f"noptixautoqat4+mergeowner2@gmail.com"
EMAIL_MERGE_OWNER_3_0 = f"noptixautoqat4+mergeowner3.0@gmail.com"
f"{EMAIL_VIEWER}"f"{EMAIL_ADV_VIEWER}"f"{EMAIL_LIVE_VIEWER}"f"{EMAIL_OWNER}"f"{EMAIL_ADMIN}"f"{EMAIL_CUSTOM}"f"{EMAIL_CLIENT_CUSTOM}"
ADMIN_FIRST_NAME = f"mark"
ADMIN_LAST_NAME = f"hamil"
EMAIL_UNREGISTERED = f"noptixautoqa+unregistered@gmail.com"
EMAIL_NOPERM = f"noptixautoqat4+noperm@gmail.com"
BASE_PASSWORD = f"qweasd 123"
ALT_PASSWORD = f"qweasd1234"

TEST_FIRST_NAME = f"testFirstName"
TEST_LAST_NAME = f"testLastName"

#Related to Auto Tests system

AUTO_TESTS = f"Auto Tests"
AUTO_TESTS_TITLE = f"//div[@ng-repeat='system in systems | filter:searchSystems as filtered track by system.id']//h2[text()='Auto Tests']"
AUTO_TESTS_USER = f"//div[@ng-repeat='system in systems | filter:searchSystems as filtered track by system.id']//h2[text()='Auto Tests']/following-sibling::span[contains(@class,'user-name')]"
AUTO_TESTS_OPEN_NX = f"//div[@ng-repeat='system in systems | filter:searchSystems as filtered track by system.id']//h2[text()='Auto Tests']/..//button[@ng-click='checkForm()']"
SYSTEM_NAME_AUTO_TESTS_HEADER = f"//header//li/a/span[text()='Auto Tests']"
SYSTEMS_TILE = f"//div[@ng-repeat='system in systems | filter:searchSystems as filtered track by system.id']"
NOT_OWNER_IN_SYSTEM = f"//div[@process-loading=gettingSystemUsers]//tbody//tr//td[contains(text(), {EMAIL_NOT_OWNER})]"

#AUTO TESTS 2 is an offline system used for testing offline status on the systems page and offline status on the system page

AUTO_TESTS_2 = f"Auto Tests 2"
AUTOTESTS_OFFLINE = f"//div[@ng-repeat=system in systems | filter:searchSystems as filtered track by system.id]//h2[contains(text(),Auto Tests 2)]/following-sibling::span[contains(text(), {AUTOTESTS_OFFLINE_TEXT})]"
AUTOTESTS_OFFLINE_OPEN_NX = f"//div[@ng-repeat='system in systems | filter:searchSystems as filtered track by system.id']//h2[contains(text(),'Auto Tests 2')]/..//button[@ng-click='checkForm()']"

OUTLINE_ERROR_COLOR = f"rgb(217, 42, 42)"