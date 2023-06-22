
f"variables-init.robot"
f"getCust.py"
f"getLang.py"
f"variables/front-end-variables.robot"
f"variables/cms-variables.robot"
#Resource     variables/cloud-merge-variables.robot


BASE_PASSWORD = "qweasd 123"

ALERT = f"//div[contains(@class,'toast')]//span[contains(@class,'toast-content')]"
ALERT_CLOSE = f"//div[contains(@class,'toast')]/button[contains(@class,'close') and @data-dismiss='alert']"

BROWSER = f"Chrome"

LANGUAGE_DROPDOWN = f"//header//nx-header-language-select//button[@data-testid='dropdownMenuButton']"
LANGUAGE_TO_SELECT = f"//header//nx-header-language-select//span[@lang={LANGUAGE}]/.."
DOWNLOAD_LINK = f"//footer//a[@href='/download']"

USER_TYPE_LIST = [
    OWNER_TEXT,
    ADMIN_TEXT,
    ADV_VIEWER_TEXT,
    VIEWER_TEXT,
    LIVE_VIEWER_TEXT,
    CUSTOM_TEXT,
    'Client Custom'
]


BACKDROP = f"//ngb-modal-backdrop"
MODAL_DIALOG = f"//nx-modal-generic-content"
MODAL_APPLY_DIALOG = f"//nx-modal-apply-content"

COMBO_TEXT = f"Кенг☿☂⊗⅓您都可以`~!@#$%계정이 이"
CYRILLIC_TEXT = f"Кенгшщзх"
SMILEY_TEXT = f"☠☿☂⊗⅓∠∩λ℘웃♞⊀☻★"
GLYPH_TEXT = f"您都可以享受源源不あなたのアカウント"
SYMBOL_TEXT = f'''`~!@#$%^&*()_:';'{}[]+<>?,./\\'''
TM_TEXT = f"qweasdzxc123®™"
KOREAN_TEXT = f"계정이 이미 활성"

#Apply changes dialog

APPLY_CHANGES_X_BUTTON = f"//ngb-modal-window//button[@class='close']"
APPLY_CHANGES_APPLY_BUTTON = f"//ngb-modal-window//button[@type='submit']"
APPLY_CHANGES_DISCARD_BUTTON = f"//ngb-modal-window//button[contains(text(),'')]"
APPLY_CHANGES_CANCEL_BUTTON = f"//ngb-modal-window//"

#Log In Elements

LOG_IN_MODAL = f"//nx-authorize-component/div[@class='authorize-main main-w']"
LOG_IN_NEXT_BUTTON = f"//nx-authorize-component//nx-process-button[@data-testid='btnLogin']"
EMAIL_INPUT = f"//nx-authorize-component//input[@id='authorizeEmail']"
PASSWORD_INPUT = f"//nx-authorize-component//input[@id='authorizePassword' and @name='password' and @type='password']"
LOG_IN_BUTTON = f"//nx-authorize-component//nx-process-button[@data-testid='btnLogin']"
LOG_IN_CREATE_ACCOUNT_BUTTON = f"//nx-authorize-component//footer//button[@type=button]//span[text()={CREATE_ACCOUNT_BUTTON_TEXT}]"
LOG_IN_BTN_REGISTER_ACCOUNT_PAGE = f"//nx-authorize-activate-account-component//footer//span[contains(text(), {LOG_IN_BUTTON_TEXT})]"
LOG_IN_BTN_CREATE_ACCOUNT_PAGE = f"//nx-authorize-create-account-component//footer//span[contains(text(), {LOG_IN_BUTTON_TEXT})]"
LOG_IN_BTN_ACTIVATE_ACCOUNT_PAGE = f"//nx-authorize-activate-account-component//footer//button[contains(text(), {LOG_IN_BUTTON_TEXT})]"
LOG_IN_BTN_RESET_PASSWORD_PAGE = f"//nx-authorize-reset-request-component//footer//button[contains(text(), {LOG_IN_BUTTON_TEXT})]"
LOG_IN_BTN_SET_NEW_PASSWORD_PAGE = f"//nx-authorize-reset-password-component//footer//nx-process-button//button[contains(text(), {LOG_IN_BUTTON_TEXT})]"

REMEMBER_ME_CHECKBOX_VISIBLE = f"//form[@name='loginForm']//input[@data-testid='remember']/following-sibling::span[@class='checkmark']/.."
REMEMBER_ME_CHECKBOX_REAL = f"//form[@name='loginForm']//input[@data-testid='remember']"

FORGOT_PASSWORD = f"//nx-authorize-component//button/span[text()={FORGOT_PASSWORD_TEXT}]/.."

ACCOUNT_NOT_FOUND = f"//nx-authorize-component//div[contains(text(),{ACCOUNT_NOT_FOUND_TEXT})]"
ACCOUNT_DOES_NOT_EXIST = f"//nx-authorize-component//p[contains(text(),{ACCOUNT_DOES_NOT_EXIST_TEXT})]"
YOU_CAN_CREATE_AN_ACCOUNT = f"//nx-authorize-component//p[contains(text(),{YOU_CAN_CREATE_ACCOUNT_TEXT})]"
RESEND_ACTIVATION_EMAIL_LINK = f"//nx-authorize-component//a[text()={RESEND_ACTIVATION_LINK_BUTTON_TEXT}]"
WRONG_PASSWORD_MESSAGE = f"//nx-authorize-component//p[contains(text(),{WRONG_PASSWORD})]"
ACCOUNT_NOT_FOUND_MESSAGE = f"//nx-authorize-component//p[contains(text(),{ACCOUNT_DOES_NOT_EXIST_TEXT})]"
TOO_MANY_ATTEMPTS_MESSAGE = f"//nx-authorize-component//p[contains(text(),{TOO_MANY_ATTEMPTS_TEXT})]"
RESET_PASSWORD_INPUT = f"//nx-authorize-reset-password-component//form//input[@id='resetPassword']"
RESET_PASSWORD_NEXT_BUTTON = f"//nx-authorize-reset-password-component//footer//nx-process-button//button[@type='submit']"
RESET_PASSWORD_SUCCESS_MESSAGE = f"//nx-authorize-reset-password-component//form//h3[(text()= {RESET_SUCCESS_MESSAGE_TEXT})]"

LOG_IN_NAV_BAR = f"//header//a[contains(text(),{LOG_IN_BUTTON_TEXT})]/.."
# ${LOG IN NAV BAR}                     //a[contains(@class, "login btn") and contains(text(),'${LOG IN BUTTON TEXT}')]

#Header

HEADER_ICON_LINK = f"//nx-header/header//div[@class='app-header-left']//a[contains(@class, 'navbar-brand')]"
LOGO_ICON = f"{HEADER_ICON_LINK}/img"
LOGO_ICON_SOURCE = f"{ENV}/static/images/logo.png"
LARGE_ACCOUNT_DROPDOWN = f"//header//nx-account-settings-select//button[@data-testid='accountSettingsSelect' and @data-toggle='dropdown' and not(contains(@class,'small-icon-overrides'))]"
SMALL_ACCOUNT_DROPDOWN = f"//header//nx-account-settings-select//button[@data-testid='accountSettingsSelect' and @data-toggle='dropdown' and contains(@class,'small-icon-overrides')]"
LARGE_CREATE_ACCOUNT_BUTTON = f"//header//a[@href='/register' and not(contains(@class, 'small-button'))]"
SMALL_CREATE_ACCOUNT_BUTTON = f"//header//a[@href='/register' and contains(@class, 'small-button')]"
LARGE_LOGIN_BUTTON = f"//nx-header/header//a[contains(@class, 'login-button')]"
SMALL_LOGIN_BUTTON = f"//nx-header/header//ul[contains(@class, 'navbar-right')]//span[contains(@class, 'glyphicon-login')]"
HEADER_LANGUAGE_DROPDOWN = f"//header//nx-header-language-select"

SYSTEM_NAME_HEADING = f"//nx-system-admin-component//div[contains(@class,'header-title')]/h2[@data-testid='editable-title']"
#${HEADER TAB WRAPPER}                 //nx-header/header//div[contains(@class, 'tab-wrapper')]

HEADER_TAB_BUTTONS = f"//nx-header/header/nx-header-tabs"
HEADER_TAB_DROPDOWN = f"//nx-header/header/nx-nav-dropdown"
HEADER_ACTIVE_TAB = f"//nx-header/header//li[contains(@class, 'tab-link active')]/a"
SYSTEMS_DROPDOWN = f"//nx-header//button[@data-testid='systemsDropdown']"
SYSTEMS_GRID = f"//nx-drop-menu//li[contains(@class, 'systems-grid')]"
SYSTEMS_GRID_TILES = f"{SYSTEMS_GRID}//nx-system-tile"


LOG_OUT_BUTTON = f"//header//li[contains(@class, dropdown-item-container)]//a/span[contains(text(),{LOG_OUT_BUTTON_TEXT})]/.."
WELCOME_CAPTION = f"//h1[@data-testid='welcomeCaption']/span"
CHANGE_PASSWORD_BUTTON_DROPDOWN = f"//header//li//a[@href = '/account/password']"
SECURITY_DROPDOWN = f"//header//li//a[@href = '/account/security']"
RELEASE_HISTORY_BUTTON = f"//a[@href=/downloads/history and contains(text(),{RELEASE_HISTORY_BUTTON_TEXT})]"
OPEN_IN_NX_BUTTON = f"//nx-client-button//nx-process-button//button[contains(text(), {OPEN_IN_NX_WITNESS_BUTTON_TEXT})]"
ALL_SYSTEMS = f"//header//li[contains(@class, 'collapse-second')]//a[@href='/systems']"

AUTHORIZED_BODY = f"//body[contains(@class, 'authorized')]"
ANONYMOUS_BODY = f"//body[contains(@class,'anonymous')]//h1[@data-testid='welcomeCaption' or @id='welcomeCaption']"
CREATE_ACCOUNT_HEADER = f"//header//a[@href='/authorize?client_type=create']"
CREATE_ACCOUNT_BODY = f"//nx-landing-component//a[@href='/authorize?client_type=create']"

LOG_IN_BODY = f"//nx-app//a[@href='/login']"

FIRST_NAME_IS_REQUIRED = f"{REGISTER_FIRST_NAME_INPUT}/following-sibling::p[contains(@class,error-label) and contains(text(),{REQUIRED_TEXT})]"
LAST_NAME_IS_REQUIRED = f"{REGISTER_LAST_NAME_INPUT}/following-sibling::p[contains(@class,error-label) and contains(text(),{REQUIRED_TEXT})]"
EMAIL_IS_REQUIRED = f"{REGISTER_EMAIL_INPUT}/../following-sibling::p[contains(@class,error-label) and contains(text(),{REQUIRED_TEXT})]"
EMAIL_ALREADY_REGISTERED = f"//p[contains(@class,error-label) and contains(text(),{EMAIL_ALREADY_REGISTERED_TEXT})]"
EMAIL_INVALID = f"//p[contains(@class,error-label) and contains(text(),{EMAIL_INVALID_TEXT})]"
PASSWORD_SPECIAL_CHARS = f"//div[contains(@class,input-error) and contains(text(),{PASSWORD_SPECIAL_CHARS_TEXT})]"
PASSWORD_IS_WEAK = f"//div[contains(@class,input-error) and contains(text(),{PASSWORD_IS_WEAK_TEXT})]"
PASSWORD_TOO_SHORT = f"//div[contains(@class,input-error) and contains(text(),{PASSWORD_TOO_SHORT_TEXT})]"
PASSWORD_TOO_COMMON = f"//div[contains(@class,input-error) and contains(text(),{PASSWORD_TOO_COMMON_TEXT})]"
PASSWORD_IS_REQUIRED = f"//div[contains(@class,'input-error') and contains(text(),{REQUIRED_TEXT})]"

INVITED_TO_SYSTEM_EMAIL_SUBJECT_UNREGISTERED = f"{{message.sharer_name}} invites you to %PRODUCT_NAME%"

#targets the open nx witness button presented when logging in after activating with from=mobile or client

OPEN_NX_WITNESS_BUTTON_FROM_= = f"//button[text()={OPEN_NX_WITNESS_BUTTON_TEXT}]"

ACTIVATION_SUCCESS = f"//h3[contains(@class,authorize-header) and contains(text(),{ACCOUNT_SUCCESSFULLY_ACTIVATED_TEXT})]"
ACTIVATION_SUCCESS_ICON = f"//nx-authorize-activate-account-component//svg-icon"
ACTIVATION_SUCCESS_LOG_IN_BUTTON = f"//nx-authorize-activate-account-component//button[contains(text(), {LOG_IN_BUTTON_TEXT})]"
SYSTEM_NAME_OFFLINE = f"//nx-ribbon//div[contains(text(),{SYSTEM_IS_OFFLINE_TEXT})]"

#In system settings

SYSTEM_NAME = f"//div/nx-editable-heading//nx-text-editable"
SYSTEM_OFFLINE = f"//div[contains(text(),{SYSTEM_IS_OFFLINE_TEXT})]"
SYSTEM_OFFLINE_HEADER = f"//h2[@name=OFFLINE and contains(text(),{SYSTEM_OFFLINE_TEXT})]"
THIS_SYSTEM_IS_OFFLINE = f"//div[@name=OFFLINE and contains(text(),{THIS_SYSTEM_IS_OFFLINE_TEXT})]"
FIRST_USER_OWNER = f"//table[@ng-if=system.users.length]/tbody/tr/td[3]/span[contains(text(),{OWNER_TEXT})]"
DISCONNECT_FROM_NX = f"//button[text()={DISCONNECT_FROM_CLOUD_TEXT}]"
RENAME_SYSTEM = f"{SYSTEM_NAME}/following-sibling::div[contains(@class, edit-button)]"
THIS_PAGE_CANNOT_BE_LOADED = f"//h2[@name=NO_SETTINGS and contains(text(),{THIS_PAGE_CANNOT_BE_LOADED_TEXT})]"
SYSTEM_USER_DETAILS = f"//nx-system-settings-component//nx-block/.."

SYSTEM_SAVE = f"//button[text()={SAVE_BUTTON_TEXT}]"
SYSTEM_CANCEL = f"//button[text()={CANCEL_BUTTON_TEXT}]"

YOUR_ACCESS_LEVEL = f"{SYSTEM_USER_DETAILS}//nx-section//span[contains(@class,system-owner)]/span[contains(text(),{YOUR_ACCESS_LEVEL_TEXT})]"

DISCONNECT_FROM_MY_ACCOUNT = f"//button[@data-testid=disconnectAccountBtn and contains(text(),{DISCONNECT_FROM_MY_ACCOUNT_TEXT})]"

ACCESS_LEVEL_DROPDOWN = f"{SYSTEM_USER_DETAILS}//nx-section//button[@id=componentId]"
ACCESS_LEVEL_DROPDOWN_MENU = f"{SYSTEM_USER_DETAILS}//nx-section//ul[contains(@class, dropdown-menu)]"
HELP_BLOCK = f"{SYSTEM_USER_DETAILS}//nx-section//span[contains(@class,help-block)]"
REMOVE_USER_BUTTON = f"{SYSTEM_USER_DETAILS}//button[contains(text(),{REMOVE_USER_BUTTON_TEXT})]"
DISABLE_USER_SWITCH = f"{SYSTEM_USER_DETAILS}//input[@id=user-active-status-switch]"
USER_DISABLED_MSG = f"{SYSTEM_USER_DETAILS}//span[contains(@class,text-danger)]"

REMOVE_USER_MODAL = f"//nx-modal-remove-user-content"
REMOVE_BUTTON = f"{REMOVE_USER_MODAL}//button[contains(text(),{REMOVE_BUTTON_TEXT})]"
REMOVE_CANCEL_BUTTON = f"{REMOVE_USER_MODAL}//button[contains(text(),{CANCEL_BUTTON_TEXT})]"

USERS_LIST_LINK = f"//a[@id='users']"
USERS_LIST = f"{USERS_LIST_LINK}/../../div[contains(@class,level-3-items)]"


SHARE_BUTTON_SYSTEMS = f"//nx-system-settings-component//nx-menu//nx-menu-button//button"f"# Currently called 'Add User'"
SYSTEM_NO_ACCESS = f"//h2[@name=FAILED_TO_ACCESS_SYSTEM and contains(text(),{SYSTEM_NO_ACCESS_TEXT})]"

NEW_FEATURE_MODAL = f"//nx-modal-new-feature-content"
NEW_FEATURE_CLOSE_BUTTON = f"{NEW_FEATURE_MODAL}//button//span[contains(@class,close-icon)]/../.."

#Disconnect from my account

DISCONNECT_MODAL_WARNING = f"{MODAL_DIALOG}//p[contains(text(),{DISCONNECT_MODAL_WARNING_TEXT})]"
# extra spaces here temporarily

DISCONNECT_MODAL_CANCEL = f"{MODAL_DIALOG}//button[@data-testid=cancelDisconnectSystemBtn and contains(text(),{CANCEL_BUTTON_TEXT})]"
DISCONNECT_MODAL_DISCONNECT_BUTTON = f"{MODAL_DIALOG}//button[@data-testid=disconnectSystemBtn and contains(text(),{DISCONNECT_BUTTON_TEXT})]"
DISCONNECT_MODAL_BUTTON = f"{MODAL_DIALOG}//button/span[contains(text(),{DISCONNECT_BUTTON_TEXT})]"

JUMBOTRON = f"//div[@class='mainContainer']"
PROMO_BLOCK = f"//div[contains(@class,'promo-block') and not(contains(@class, 'col-sm-4'))]"
ALREADY_ACTIVATED = f"//h1[contains(@class,process-success) and contains(text(),{ALREADY_ACTIVATED_TEXT})]"

#Share Elements (Note: Share and Permissions are the same form so these are the same variables.  Making two just in case they do diverge at some point.)
ADD_USER_BUTTON_SYSTEMS = f"//nx-menu-button[@data-testid='addUserBtn']//button"
ADD_USER_MODAL = f"//form[@name='addUserForm']"
ADD_USER_EMAIL = f"{ADD_USER_MODAL}//input[@id=addUserEmail]"
ADD_USER_PERMISSIONS_DROPDOWN = f"{ADD_USER_MODAL}//nx-permissions-select[@id=permissionsSelect]//button"
ADD_USER_BUTTON_MODAL = f"{ADD_USER_MODAL}//nx-process-button[@data-testid=addUserBtn]//button[text()={ADD_BUTTON_TEXT}]"
ADD_USER_CANCEL = f"{ADD_USER_MODAL}//button[@data-testid=cancelAddUserBtn and text()={CANCEL_BUTTON_TEXT}]"
ADD_USER_CLOSE = f"{ADD_USER_MODAL}//button[@data-testid=closeAddUser]"
ADD_USER_PERMISSIONS_HINT = f"{ADD_USER_MODAL}//span[@data-testid=addUserHelpBlock]"

EDIT_PERMISSIONS_EMAIL = f"//form[@name='shareForm']//input[@ng-model='user.email']"
EDIT_PERMISSIONS_DROPDOWN = f"//form[@name='shareForm']//button[@data-testid='permissionsSelect']"
EDIT_PERMISSIONS_SAVE = f"//form[@name=shareForm]//button[text()={SAVE_BUTTON_TEXT}]"
EDIT_PERMISSIONS_CANCEL = f"//form[@name='shareForm']//button[@ng-click='close()']"
EDIT_PERMISSIONS_CLOSE = f"//div[@uib-modal-transclude]//div[@ng-if='settings.title']//button[@ng-click='close()']"
EDIT_PERMISSIONS_ADMINISTRATOR = f"//form[@name='shareForm']//select[@ng-model='user.role']//option[@label='Administrator']"
EDIT_PERMISSIONS_ADVANCED_VIEWER = f"//form[@name='shareForm']//select[@ng-model='user.role']//option[@label='Advanced Viewer']"
EDIT_PERMISSIONS_VIEWER = f"//form[@name='shareForm']//select[@ng-model='user.role']//option[@label='Viewer']"
EDIT_PERMISSIONS_LIVE_VIEWER = f"//form[@name='shareForm']//select[@ng-model='user.role']//option[@label='Live Viewer']"
EDIT_PERMISSIONS_CUSTOM = f"//form[@name='shareForm']//select[@ng-model='user.role']//option[@label='Custom']"
EDIT_PERMISSIONS_HINT = f"//form[@name='shareForm']//span[contains(@class,'help-block')]"

#Account Page




#Downloads

DOWNLOADS_HEADER = f"//h1[contains(text(),{DOWNLOADS_HEADER_TEXT})]"
DOWNLOAD_WINDOWS_VMS_LINK = f"//a[contains(@class, 'download-button')]"
DOWNLOAD_WINDOWS_VMS_TEXT = f"{DOWNLOAD_WINDOWS_VMS_LINK}//div[contains(text(),Windows x64 - Client installer)]"
DOWNLOAD_LINUX_VMS_LINK = f"//a[contains(@class, 'download-button')]"
DOWNLOAD_LINUX_VMS_TEXT = f"{DOWNLOAD_LINUX_VMS_LINK}//div[contains(text(),Ubuntu x64 - Client installer)]"
DOWNLOAD_MAC_OS_VMS_LINK = f"//a[contains(@class, 'download-button')]"
DOWNLOAD_MAC_OS_VMS_TEXT = f"{DOWNLOAD_MAC_OS_VMS_LINK}//div[contains(text(),Mac OS - Client installer)]"
DOWNLOAD_ARM_VMS_LINK = f"//a[contains(@class, 'download-button')]"
DOWNLOAD_ARM_VMS_TEXT = f"{DOWNLOAD_ARM_VMS_LINK}//div[contains(text(),ARM) and contains(text(),Client)]"

ITUNES_STORE_DOWNLOAD_BUTTON = f"//a[contains(@class,'mobile-link iOS')]"
PLAY_STORE_DOWNLOAD_BUTTON = f"//a[contains(@class,'mobile-link Android')]"
DOWNLOAD_VMS_NAME = f"//h3[contains(text(),{DOWNLOAD_TITLE_TEXT})]"
DOWNLOAD_VERSION_NUMBER = f"//h2[@class='version-number d-flex']/b"
WHATS_NEW_LINK = f"//a[contains(text(),{WHATS_NEW_TEXT})]"

WINDOWS_TAB = f"//a[@data-testid='windows']"
LINUX_TAB = f"//a[@data-testid='linux']"
MAC_OS_TAB = f"//a[@data-testid='macos']"
ARM_TAB = f"//a[@data-testid='arm']"
SDK_TAB = f"//a[@data-testid='sdk']"

#History

RELEASE_NOTES_HEADER = f"//h1[contains(text(), {RELEASE_NOTES_TEXT})]"
RELEASES_TAB = f"//span[contains(@class,tab-heading) and text()={RELEASES_TAB_TEXT}]/.."
PATCHES_TAB = f"//span[contains(@class,tab-heading) and text()={PATCHES_TAB_TEXT}]/.."
BETAS_TAB = f"//span[contains(@class,tab-heading) and text()={BETAS_TAB_TEXT}]/.."
RELEASE_NUMBER = f"//div//h1[contains(@class,'title')]"


#Misc

PAGE_NOT_FOUND = f"//h2[@name=404 and contains(text(),{PAGE_NOT_FOUND_TEXT})]"
TAKE_ME_HOME = f"//button/a[text()={GO_TO_MAIN_PAGE_TEXT}]"
FOURZEROFOUR_ICON = f"//div[@name='404']/svg-icon"
OFFLINE_BADGE = f"//a[contains(@class, badge) and contains(text(), {AUTOTESTS_OFFLINE_TEXT})]"
RELEASE_NUMBER = f"//div[contains(@class,'active')]//div[@ng-repeat='release in activeBuilds']//h1/b"
RESET_PASSWORD_PAGE_BUTTON = f"//nx-authorize-reset-request-component//footer//nx-process-button//button[contains(text(), {RESET_PASSWORD_BUTTON_TEXT})]"

PRIVACY_POLICY_HEADER = f"//h1[contains(text(),'Personal data and privacy policy')]"

DROPDOWN_MENU = f"/..//div[contains(@class,'dropdown-menu')]"
DROPDOWN_MENU_LIST = f"{DROPDOWN_MENU}/ul[contains(@class,dropdown-menu--list)]"
DROPDOWN_MENU_ITEMS = f"{DROPDOWN_MENU_LIST}/li[contains(@class,dropdown-item-container)]/../../..//li"

DISABLED = f"\[@disabled]"

#Password badges

PASSWORD_BADGE = f"//nx-password-input-tag-validation"
PASSWORD_IS_WEAK_BADGE = f"{PASSWORD_BADGE}//nx-tag//a[contains(@class,badge) and contains(text(),{PASSWORD_IS_WEAK_BADGE_TEXT})]"
PASSWORD_IS_FAIR_BADGE = f"{PASSWORD_BADGE}//nx-tag//a[contains(@class,badge) and contains(text(),{PASSWORD_IS_FAIR_BADGE_TEXT})]"
PASSWORD_IS_GOOD_BADGE = f"{PASSWORD_BADGE}//nx-tag//a[contains(@class,badge) and contains(text(),{PASSWORD_IS_GOOD_BADGE_TEXT})]"
PASSWORD_IS_TOO_SHORT_BADGE = f"{PASSWORD_BADGE}//nx-tag//a[contains(@class,badge) and contains(text(),{PASSWORD_IS_TOO_SHORT_BADGE_TEXT})]"
PASSWORD_IS_TOO_COMMON_BADGE = f"{PASSWORD_BADGE}//nx-tag//a[contains(@class,badge) and contains(text(),{PASSWORD_IS_TOO_COMMON_BADGE_TEXT})]"
PASSWORD_INCORRECT_BADGE = f"{PASSWORD_BADGE}//nx-tag//a[contains(@class,badge) and contains(text(),{PASSWORD_INCORRECT_BADGE_TEXT})]"
PASSWORD_BADGE_TOOLTIP = f"//nx-tooltip-component"

#Already logged in modal

LOGGED_IN_STAY_LOGGED_IN_BUTTON = f"{MODAL_DIALOG}//button[contains(text(),{STAY_LOGGED_IN_BUTTON_TEXT})]"
LOGGED_IN_OK_BUTTON = f"{MODAL_DIALOG}//button[contains(text(),{OK_TEXT})]"
LOGGED_IN_LOG_OUT_BUTTON = f"{MODAL_DIALOG}//button/span[contains(text(),{LOG_OUT_BUTTON_TEXT})]/.."
LOGGED_IN_NEW_ACCOUNT_BUTTON = f"{MODAL_DIALOG}//button/span[contains(text(),{CREATE_NEW_ACCOUNT_BUTTON_TEXT})]/.."
LOGGED_IN_CANCEL_BUTTON = f"{MODAL_DIALOG}//button/span[contains(text(),{CANCEL_BUTTON_TEXT})]/.."
LOGGED_IN_CLOSE_BUTTON = f"{MODAL_DIALOG}//button//span[@class=close-icon]/../.."

THREEHUNDREDCHARS = f"QWErtyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmyy"
TWOHUNDREDFIFTYFIVECHARS = f"QWErtyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopas"

#Eye icons for password forms

EYE_ICON_OPEN = f"//svg-icon[contains(@data-src,'/images/icons/text_buttons/eye.svg')]"
EYE_ICON_CLOSED = f"//svg-icon[contains(@data-src,'/images/icons/text_buttons/eye_closed.svg')]"

# Form validation passwords

LOWERCASE_PASSWORD = f"adrhartjad"
UPPERCASE_PASSWORD = f"ADRHARTJAD"
NUMBERS_PASSWORD = f"13462344"
SEVENCHAR_PASSWORD = f"asdfghj"
SYMBOL_ONLY_PASSWORD = f"!@#$%^&*()_-+="
SEVEN_CHAR_PASSWORD = f"asdfghj"

WEAK_PASSWORDS = [
    UPPERCASE_PASSWORD,
    LOWERCASE_PASSWORD,
    COMMON_PASSWORD,
    NUMBERS_PASSWORD,
    SYMBOL_ONLY_PASSWORD
    ]

LOWER_UPPER_PASSWORD = f"multPASS"
LOWER_NUMBER_PASSWORD = f"mult1234"
LOWER_SYMBOL_PASSWORD = f"mult!@#$"
UPPER_NUMBER_PASSWORD = f"MULT1234"
UPPER_SYMBOL_PASSWORD = f"MULT!@#$"
NUMBER_SYMBOL_PASSWORD = f"1234!@#$"

FAIR_PASSWORDS = [
    LOWER_UPPER_PASSWORD,
    LOWER_NUMBER_PASSWORD,
    LOWER_SYMBOL_PASSWORD,
    UPPER_NUMBER_PASSWORD,
    UPPER_SYMBOL_PASSWORD,
    NUMBER_SYMBOL_PASSWORD,
    SYMBOL_PASSWORD,
    ]

LOWER_UPPPER_NUMBER_PASSWORD = f"qweASD123"
LOWER_UPPER_SYMBOL_PASSWORD = f"qweASD!@#"
LOWER_NUMBER_SYMBOL_PASSWORD = f"qwe123!@#"
UPPER_NUMBER_SYMBOL_PASSWORD = f"QWE123!@#"
GOOD_PASSWORDS = [LOWER_UPPPER_NUMBER_PASSWORD, LOWER_UPPER_SYMBOL_PASSWORD, LOWER_NUMBER_SYMBOL_PASSWORD, UPPER_NUMBER_SYMBOL_PASSWORD, BASE_PASSWORD]

SYMBOL_PASSWORD = f"pass!@#$%^&*()_-+=;:''`~,./\|?[]{}"
COMMON_PASSWORD = f"qweasd123"

INCORRECT_PASSWORDS = [
    CYRILLIC_TEXT,
    SMILEY_TEXT,
    GLYPH_TEXT,
    TM_TEXT,
    f" {BASE_PASSWORD}",
    f"{BASE_PASSWORD} "
]

#Local User in System Users

LOCAL_USER_LOGIN = f"//h2"
LOCAL_USER_NAME = f"//input[@id='fullName']"
LOCAL_USER_EMAIL = f"//input[@id='email']"
LOCAL_USER_CHANGE_PASSWORD_BUTTON = f"//button[contains(text(), {CHANGE_PASSWORD_BUTTON_TEXT})]"
LOCAL_USER_CHANGE_PASSWORD_SAVE = f"//form[@name=changePasswordForm]//button[contains(text(), {SAVE_BUTTON_TEXT})]"
LOCAL_USER_CHANGE_PASSWORD_CANCEL = f"//form[@name=changePasswordForm]//button[text()={CANCEL_BUTTON_TEXT}]"
LOCAL_USER_PASSWORD_INPUT = f"//input[@id='newPassword']"
LOCAL_USER_DELETE_BUTTON = f"//button[contains(text(),{DELETE_USER_TEXT})]"
LOCAL_USER_DELETE_CONFIRM_BUTTON = f"//div[@class='process-button']/button"
LOCAL_USER_DELETE_CANCEL_BUTTON = f"//button[contains(text(), {CANCEL_BUTTON_TEXT})]"
USER_CANCEL = f"//nx-apply//nx-cancel-button/button[@type='reset']"
ACCOUNT_CREATION_EMAIL_SUCCESS = f"//nx-authorize-component//nx-authorize-activate-account-component//main//h3"
ACTIVATE_MODAL_LOGIN_BTN = f"//nx-authorize-component//nx-authorize-activate-account-component//main//nx-process-button//button[@type='submit']"
LOCAL_USER_NAME_HEADER = f"//nx-system-user-component//nx-block//header//span[contains(@class,'user-name')]"

#svg icons

USERS_ICON = f"*[name()='svg-icon' and contains(@data-src,'/images/icons/standard/users.svg')]"
LOCAL_USER_ICON = f"*[name()='svg-icon' and contains(@data-src,'/images/icons/standard/user.svg')]"
CAMERAS_ICON = f"*[name()='svg-icon' and contains(@data-src,'/images/icons/standard/cameras.svg')]"
SERVERS_ICON = f"*[name()='svg-icon' and contains(@data-src,'/images/icons/standard/servers.svg')]"
SYSTEMS_ICON = f"*[name()='svg-icon' and contains(@data-src,'/images/icons/standard/systems.svg')]"
PLACEHOLDER_ICON = f"//*[name()='svg-icon' and contains(@data-src,'/images/placeholders/section/system_settings_placeholder.svg')]"
PLACEHOLDER_NO_SETTINGS = f"//*[name()='svg-icon' and contains(@data-src,'/images/placeholders/page/NoSettings.svg')]"

FROM_EMAIL_DEFAULT = False