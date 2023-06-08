


ALERT = f"//span[@ng-if='!message.compileContent']"
ALERT_CLOSE = f"//div[contains(@class, 'ng-toast')]//span[@ng-bind-html='message.content']/../preceding-sibling::button[@ng-click='!message.dismissOnClick && dismiss()']"

BROWSER = f"Chrome"

LANGUAGE_DROPDOWN = f"//nx-footer//button[@id='dropdownMenuButton']"
LANGUAGE_TO_SELECT = f"//nx-footer//span[@lang={LANGUAGE}]/.."
DOWNLOAD_LINK = f"//footer//a[@href='/download']"

LANGUAGES_LIST = [ 'en_US',
                   'en_GB',
                   'ru_RU',
                   'fr_FR',
                   'de_DE',
                   'es_ES',
                   'hu_HU',
                   'zh_CN',
                   'zh_TW',
                   'ja_JP',
                   'ko_KR',
                   'tr_TR',
                   'th_TH',
                   'nl_NL',
                   'he_IL',
                   'pl_PL',
                   'vi_VN'
                   ]

LANGUAGES_ACCOUNT_TEXT_LIST = [ 'Account',
                               'Account',
                               'Учетная запись',
                               'Compte',
                               
                               'Account',
                               'Cuenta',
                               'Fiók',
                               '帐户',
                               '帳號',
                               'アカウント',
                               '계정',
                               'Hesap',
                               'บัญชีผู้ใช้',
                               'Account',
                               'חשבון',
                               'Konto',
                               'Tài khoản'
                               ]

ANGUAGES_CREATE_ACCOUNT_TEXT_LIST = [ 'Create Account',
                                        'Create Account',
                                        'Создать аккаунт',
                                        'Créer compte',
                                        'Account erstellen',
                                        'Crear Cuenta',
                                        'Fiók létrehozása',
                                        '创建帐户',
                                        '新建帳號',
                                        'アカウント作成',
                                        '계정 만들기',
                                        'Hesap oluştur',
                                        'สร้างบัญชี',
                                        'Account aanmaken',
                                        'צור חשבון',
                                        'Utwórz konto',
                                        'Tạo tài khoản'
                                        ]

USER_TYPE_LIST = [ 'Owner_TEXT',
                     'Admin_TEXT',
                        'Adv_Viewer_TEXT',
                        'Viewer_TEXT',
                        'Live_Viewer_TEXT',
                        'Custom_TEXT'
                        ]


BACKDROP = f"//ngb-modal-window"

CYRILLIC_TEXT = f"Кенгшщзх"
SMILEY_TEXT = f"☠☿☂⊗⅓∠∩λ℘웃♞⊀☻★"
GLYPH_TEXT = f"您都可以享受源源不絕的好禮及優惠"
SYMBOL_TEXT = f"`~!@#$%^&*()_:';'{}[]+<>?,./\"
TM_TEXT = f"qweasdzxc123®™"

#Log In Elements

LOG_IN_MODAL = f"//form[@name='loginForm']"
EMAIL_INPUT = f"//form[@name='loginForm']//input[@id='login_email']"
PASSWORD_INPUT = f"//form[@name='loginForm']//input[@id='login_password' and @name='login_password' and @type='password']"
LOG_IN_BUTTON = f"//form[@name='loginForm']//nx-process-button//button"

REMEMBER_ME_CHECKBOX_VISIBLE = f"//form[@name='loginForm']//input[@id='remember']/following-sibling::span[@class='checkmark']/.."
REMEMBER_ME_CHECKBOX_REAL = f"//form[@name='loginForm']//input[@id='remember']"

FORGOT_PASSWORD = f"//form[@name='loginForm']//a[@href='/restore_password']"
LOG_IN_CLOSE_BUTTON = f"//button[@data-dismiss='modal']"
ACCOUNT_NOT_FOUND = f"//form[@name=loginForm]//label[contains(text(), {ACCOUNT_NOT_FOUND_TEXT})]"
RESEND_ACTIVATION_EMAIL_LINK = f"//form[@name=loginForm]//a[text()={RESEND_ACTIVATION_LINK_BUTTON_TEXT}]"
WRONG_PASSWORD_MESSAGE = f"//form[@name=loginForm]//label[text()={WRONG_PASSWORD}]"
ACCOUNT_NOT_FOUND_MESSAGE = f"//form[@name=loginForm]//label[text()={ACCOUNT_DOES_NOT_EXIST_TEXT}]"
TOO_MANY_ATTEMPTS_MESSAGE = f"//form[@name=loginForm]//label[text()={TOO_MANY_ATTEMPTS_TEXT}]"

LOG_IN_NAV_BAR = f"//nav//a[contains(@ng-click, 'login()')]"
YOU_HAVE_NO_SYSTEMS = f"//span[contains(text(),{YOU_HAVE_NO_SYSTEMS_TEXT})]"

#Header

ACCOUNT_DROPDOWN = f"//header//nx-account-settings-select//button[@id='accountSettingsSelect' and @data-toggle='dropdown']"
LOG_OUT_BUTTON = f"//li[contains(@class, collapse-first)]//a[contains(text(), {LOG_OUT_BUTTON_TEXT})]"
LOGO_LINK = f"//header//a[@href='/']"
ACCOUNT_SETTINGS_BUTTON = f"//li//a[@href = '/account']"
CHANGE_PASSWORD_BUTTON_DROPDOWN = f"//li//a[@href = '/account/password']"
RELEASE_HISTORY_BUTTON = f"//a[@href=/downloads/history and contains(text(), {RELEASE_HISTORY_BUTTON_TEXT})]"
SYSTEMS_DROPDOWN = f"//header//li[contains(@class, 'collapse-second')]//button[@id='systemsDropdown']"
ALL_SYSTEMS = f"//header//li[contains(@class, 'collapse-second')]//a[@href='/systems']"

AUTHORIZED_BODY = f"//body[contains(@class, 'authorized')]"
ANONYMOUS_BODY = f"//body[contains(@class,'anonymous')]"
CREATE_ACCOUNT_HEADER = f"//header//a[@href='/register']"
CREATE_ACCOUNT_BODY = f"//nx-app//a[@href='/register']"

LOG_IN_BODY = f"//nx-app//a[@href='/login']"

#Forgot Password

RESET_PASSWORD_FORM = f"//form[@name='restorePasswordWithCode']"
RESTORE_PASSWORD_EMAIL_INPUT = f"//form[@name='restorePassword']//input[@type='email']"
RESET_PASSWORD_BUTTON = f"//form[@name='restorePassword']//button[@ng-click='checkForm()']"
RESET_PASSWORD_INPUT = f"//form[@name='restorePasswordWithCode']//input[@id='newPassword']"
SAVE_PASSWORD = f"//form[@name='restorePasswordWithCode']//button[@ng-click='checkForm()']"
RESET_EMAIL_SENT_MESSAGE = f"//div[@ng-if='restoringSuccess']/h1"
RESET_SUCCESS_MESSAGE = f"//h1[contains(text(), {RESET_SUCCESS_MESSAGE_TEXT})]"
RESET_SUCCESS_LOG_IN_LINK = f"//div[@ng-if='change.success || changeSuccess']//a[@href='/login']"
RESET_EYE_ICON_OPEN = f"{RESET_PASSWORD_FORM}{EYE_ICON_OPEN}"
RESET_EYE_ICON_CLOSED = f"{RESET_PASSWORD_FORM}{EYE_ICON_CLOSED}"

#Change Password

CHANGE_PASSWORD_FORM = f"//form[@name='passwordForm']"
CURRENT_PASSWORD_INPUT = f"//form[@name='passwordForm']//input[@ng-model='pass.password']"
NEW_PASSWORD_INPUT = f"//form[@name='passwordForm']//password-input[@ng-model='pass.newPassword']//input"
CHANGE_PASSWORD_BUTTON = f"//form[@name='passwordForm']//button[@ng-click='checkForm()']"
PASSWORD_IS_REQUIRED = f"//span[@ng-if='form[id].$error.required']"
CHANGE_PASS_EYE_ICON_OPEN = f"{CHANGE_PASSWORD_FORM}{EYE_ICON_OPEN}"
CHANGE_PASS_EYE_ICON_CLOSED = f"{CHANGE_PASSWORD_FORM}{EYE_ICON_CLOSED}"

#Register Form Elements

REGISTER_FORM = f"//form[@name= 'registerForm']"
REGISTER_FIRST_NAME_INPUT = f"//form[@name= 'registerForm']//input[@ng-model='account.firstName']"
REGISTER_LAST_NAME_INPUT = f"//form[@name= 'registerForm']//input[@ng-model='account.lastName']"
REGISTER_EMAIL_INPUT = f"//form[@name= 'registerForm']//input[@ng-model='account.email']"
REGISTER_EMAIL_INPUT_LOCKED = f"//form[@name= 'registerForm']//input['readOnly' and @ng-if='lockEmail']"
REGISTER_PASSWORD_INPUT = f"//form[@name= 'registerForm']//password-input[@ng-model='account.password']//input"

TERMS_AND_CONDITIONS_CHECKBOX_VISIBLE = f"//form[@name= 'registerForm']//input[@ng-model='account.accept']/following-sibling::span[@class='checkmark']"
TERMS_AND_CONDITIONS_CHECKBOX_REAL = f"//form[@name= 'registerForm']//input[@ng-model='account.accept']"

CREATE_ACCOUNT_BUTTON = f"//form[@name= registerForm]//button[contains(text(), {CREATE_ACCOUNT_BUTTON_TEXT})]"
TERMS_AND_CONDITIONS_LINK = f"//form[@name= 'registerForm']//a[@href='/content/eula']"
TERMS_AND_CONDITIONS_ERROR = f"//form[@name= registerForm]//span[@ng-if=registerForm.accept.$dirty && registerForm.accept.$error.required and contains(text(), {TERMS_AND_CONDITIONS_ERROR_TEXT})]"
PRIVACY_POLICY_LINK = f"//form[@name= registerForm]//a[@href={PRIVACY_POLICY_URL_FULL}]"
RESEND_ACTIVATION_LINK_BUTTON = f"//form[@name= loginForm]//a[contains(text(), {RESEND_ACTIVATION_LINK_BUTTON_TEXT})]"
REGISTER_EYE_ICON_OPEN = f"{REGISTER_FORM}{EYE_ICON_OPEN}"
REGISTER_EYE_ICON_CLOSED = f"{REGISTER_FORM}{EYE_ICON_CLOSED}"

INVITED_TO_SYSTEM_EMAIL_SUBJECT_UNREGISTERED = f"{{message.sharer_name}} invites you to %PRODUCT_NAME%"

#Register form errors

FIRST_NAME_IS_REQUIRED = f"//span[@ng-if=registerForm.firstName.$touched && registerForm.firstName.$error.required and contains(text(),{FIRST_NAME_IS_REQUIRED_TEXT})]"
LAST_NAME_IS_REQUIRED = f"//span[@ng-if=registerForm.lastName.$touched && registerForm.lastName.$error.required and contains(text(),{LAST_NAME_IS_REQUIRED_TEXT})]"
EMAIL_IS_REQUIRED = f"//span[@ng-if=registerForm.registerEmail.$touched && registerForm.registerEmail.$error.required and contains(text(),{EMAIL_IS_REQUIRED_TEXT})]"
EMAIL_ALREADY_REGISTERED = f"//span[@ng-if=registerForm.registerEmail.$error.alreadyExists and contains(text(),{EMAIL_ALREADY_REGISTERED_TEXT})]"
EMAIL_INVALID = f"//span[@ng-if=registerForm.registerEmail.$touched && registerForm.registerEmail.$error.email and contains(text(),{EMAIL_INVALID_TEXT})]"
PASSWORD_SPECIAL_CHARS = f"//span[contains(@ng-if,form[id].$error.pattern &&) and contains(@ng-if,!form[id].$error.minlength) and contains(text(),{PASSWORD_SPECIAL_CHARS_TEXT})]"
PASSWORD_TOO_SHORT = f"//span[contains(@ng-if,form[id].$error.minlength) and contains(text(),{PASSWORD_TOO_SHORT_TEXT})]"
PASSWORD_TOO_COMMON = f"//span[contains(@ng-if,form[id].$error.common &&) and contains(@ng-if,form[id].$error.required) and contains(text(),{PASSWORD_TOO_COMMON_TEXT})]"
PASSWORD_IS_WEAK = f"//span[contains(@ng-if,form[id].$error.weak &&) and contains(@ng-if,form[id].$error.common &&) and contains(@ng-if,!form[id].$error.pattern &&) and contains(@ng-if,!form[id].$error.required &&) and contains(@ng-if,!form[id].$error.minlength) and contains(text(),{PASSWORD_IS_WEAK_TEXT})]"

INVITED_TO_SYSTEM_EMAIL_SUBJECT_UNREGISTERED = f"{{message.sharer_name}} invites you to %PRODUCT_NAME%"

#targets the open nx witness button presented when logging in after activating with from=mobile or client

OPEN_NX_WITNESS_BUTTON_FROM_= = f"//button[text()={OPEN_NX_WITNESS_BUTTON_TEXT}]"


ACCOUNT_CREATION_SUCCESS = f"//h1[@ng-if='(register.success || registerSuccess) && !activated']"
ACTIVATION_SUCCESS = f"//h1[@ng-if=activate.success && !loading and contains(text(), {ACCOUNT_SUCCESSFULLY_ACTIVATED_TEXT})]"
SUCCESS_LOG_IN_BUTTON = f"//h1[@ng-if=activate.success && !loading and contains(text(), {ACCOUNT_SUCCESSFULLY_ACTIVATED_TEXT})]/following-sibling::h1/a[@href=/login]"
#In system settings

SYSTEM_NAME = f"//h1[@ng-if='gettingSystem.success']"
FIRST_USER_OWNER = f"//table[@ng-if=system.users.length]/tbody/tr/td[3]/span[contains(text(),{OWNER_TEXT})]"
RENAME_SYSTEM = f"//button[@ng-click='rename()']"
RENAME_CANCEL = f"//form[@name=renameForm]//button[text()={CANCEL_BUTTON_TEXT}]"
RENAME_X_BUTTON = f"//form[@name='renameForm']//button[@class='close']"
RENAME_SAVE = f"//form[@name=renameForm]//button[text()={SAVE_BUTTON_TEXT}]"

RENAME_INPUT = f"//form[@name='renameForm']//input[@id='systemName']"
RENAME_INPUT_WITH_ERROR = f"//form[@name='renameForm']//input[@id='systemName' and contains(@class,'ng-invalid')]"
SYSTEM_NAME_IS_REQUIRED = f"//form[@name=renameForm]//span[@class=input-error and contains(text(),{SYSTEM_NAME_IS_REQUIRED_TEXT})]"

OWNER_NAME = f"//h3[contains(@class,user-name) and text()={TEST_FIRST_NAME} {TEST_LAST_NAME}]"
OWNER_EMAIL = f"//a[@ng-href=mailto:{EMAIL_OWNER}]"
YOUR_PERMISSIONS = f"//ng-include[@src=$root.C.viewsDir + components/system-card.html]//p[contains(text(), {YOUR_PERMISSIONS_TEXT})]"

DISCONNECT_FROM_MY_ACCOUNT = f"//button[@ng-click='delete()']"
ADD_USER_BUTTON_SYSTEMS = f"//div[@process-loading='gettingSystem']//button[@ng-click='share()']"
ADD_USER_BUTTON_DISABLED = f"//div[@process-loading='gettingSystem']//button[@ng-click='share()' and @ng-disabled='!system.isAvailable']"
OPEN_IN_NX_BUTTON = f"//div[@process-loading='gettingSystem']//button[@ng-click='checkForm()']"
OPEN_IN_NX_BUTTON_DISABLED = f"//div[@process-loading='gettingSystem']//button[@ng-click='checkForm()' and @ng-disabled='buttonDisabled']"
DELETE_USER_MODAL = f"//div[@uib-modal-transclude]"
DELETE_USER_BUTTON = f"//button[contains(text(), {DELETE_USER_BUTTON_TEXT})]"
DELETE_USER_CANCEL_BUTTON = f"//ngb-modal-window//button[contains(text(), {CANCEL_BUTTON_TEXT})]"
SYSTEM_NAME_OFFLINE = f"//span[@ng-if='!system.isOnline']"
USERS_LIST = f"//div[@process-loading='gettingSystemUsers']"

SYSTEM_NO_ACCESS = f"//div[@ng-if=systemNoAccess]/h1[contains(text(), {SYSTEM_NO_ACCESS_TEXT})]"
AVAILABLE_SYSTEMS_LIST = f"//a[@href='/systems']"
SYSTEMS_SEARCH_INPUT = f"//input[@ng-model='search.value']"
SYSTEM_SEARCH_X_BUTTON = f"//a[@ng-click='search.value=''']"

#Disconnect from cloud portal

DISCONNECT_FORM = f"//form[@name='disconnectForm']"
DISCONNECT_FORM_CANCEL = f"//form[@name=disconnectForm]//button[text()={CANCEL_BUTTON_TEXT}]"
DISCONNECT_FORM_HEADER = f"//h1[{DISCONNECT_FORM_HEADER_TEXT}]"

#Disconnect from my account

DISCONNECT_MODAL_WARNING = f"//p[contains(text(), {DISCONNECT_MODAL_WARNING_TEXT})]"
# extra spaces here temporarily

DISCONNECT_MODAL_CANCEL = f"//button[text()='Cancel ']"
DISCONNECT_MODAL_DISCONNECT_BUTTON = f"//button[text()={DISCONNECT_BUTTON_TEXT} ]"

JUMBOTRON = f"//div[@class='jumbotron']"
PROMO_BLOCK = f"//div[contains(@class,'promo-block') and not(contains(@class, 'col-sm-4'))]"
ALREADY_ACTIVATED = f"//h1[@ng-if=!activate.success && !loading and contains(text(),{ALREADY_ACTIVATED_TEXT})]"

#Share Elements (Note: Share and Permissions are the same form so these are the same variables.  Making two just in case they do diverge at some point.)
f"Making two just in case they do diverge at some point.)"
ADD_USER_MODAL = f"//form[@name='shareForm']"
ADD_USER_EMAIL = f"//form[@name='shareForm']//input[@id='email']"
ADD_USER_PERMISSIONS_DROPDOWN = f"//form[@name='shareForm']//nx-permissions-select//button[@id='permissionsSelect']"
ADD_USER_BUTTON_MODAL = f"//form[@name=shareForm]//button[text()={ADD_USER_BUTTON_TEXT}]"
ADD_USER_CANCEL = f"//form[@name=shareForm]//button[text()={CANCEL_BUTTON_TEXT}]"
ADD_USER_CLOSE = f"//form[@name='shareForm']//button[@data-dismiss='modal']"
ADD_USER_PERMISSIONS_HINT = f"//form[@name='shareForm']//span[contains(@class,'help-block')]"

EDIT_PERMISSIONS_EMAIL = f"//form[@name='shareForm']//input[@ng-model='user.email']"
EDIT_PERMISSIONS_DROPDOWN = f"//form[@name='shareForm']//button[@id='permissionsSelect']"
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

ACCOUNT_EMAIL = f"//form[@name='accountForm']//input[@ng-model='account.email']"
ACCOUNT_FIRST_NAME = f"//form[@name='accountForm']//input[@ng-model='account.first_name']"
ACCOUNT_LAST_NAME = f"//form[@name='accountForm']//input[@ng-model='account.last_name']"
ACCOUNT_LANGUAGE_DROPDOWN = f"//form[@name='accountForm']//nx-language-select//button[@id='dropdownMenuButton']"
ACCOUNT_SAVE = f"//form[@name='accountForm']//button[@ng-click='checkForm()']"

#Downloads

DOWNLOADS_HEADER = f"//h1['Downloads']"
DOWNLOAD_WINDOWS_VMS_LINK = f"//div[text()='Windows x64 - Client only']/../.."
DOWNLOAD_UBUNTU_VMS_LINK = f"//div[text()='Ubuntu x64 - Client only']/../.."
DOWNLOAD_MAC_OS_VMS_LINK = f"//div[text()='Mac OS X - Client only']/../.."
ITUNES_STORE_DOWNLOAD_BUTTON = f"//a[@class='mobile-link iOS']"
PLAY_STORE_DOWNLOAD_BUTTON = f"//a[@class='mobile-link Android']"

WINDOWS_TAB = f"//a[@id='Windows']"
UBUNTU_TAB = f"//a[@id='Linux']"
MAC_OS_TAB = f"//a[@id='MacOS']"

#History

RELEASES_TAB = f"//span[@class='tab-heading' and text()='Releases']/.."
PATCHES_TAB = f"//span[@class='tab-heading' and text()='Patches']/.."
BETAS_TAB = f"//span[@class='tab-heading' and text()='Betas']/.."
RELEASE_NUMBER = f"//div[contains(@class,'active')]//h1"

#Known Limitations

REMOTE_CONNECTIVITY_TILE_LINK = f"//h2[contains(text(),{REMOTE_CONNECTIVITY})]/..//a[contains(@href,{SUPPORT_URL})]"
SUPPORT_TILE_LINK = f"//h2[contains(text(),{SUPPORT})]/..//a[@href={SUPPORT_URL}]"
#About

ABOUT_CLOUD_NAME = f"//span[contains(@class,product-name) and text()={PRODUCT_NAME}]"

#Footer

FOOTER_ABOUT_LINK = f"//footer//a[contains(text(),{ABOUT} {PRODUCT_NAME})]"
FOOTER_KNOWN_LIMITS_LINK = f"//footer//a[contains(text(),{KNOWN_LIMITATIONS})]"
FOOTER_SUPPORT_LINK = f"//footer//a[contains(text(),{SUPPORT})]"
FOOTER_TERMS_LINK = f"//footer//a[contains(text(),{TERMS})]"
FOOTER_PRIVACY_LINK = f"//footer//a[contains(text(),{PRIVACY})]"
FOOTER_COPYRIGHT_LINK = f"//footer//a[contains(text(),{COPYRIGHT_SYMBOL}) and contains(text(),{YEAR}) and contains(text(),{COMPANY})]"

#Misc

PAGE_NOT_FOUND = f"//h1[contains(text(), {PAGE_NOT_FOUND_TEXT})]"
TAKE_ME_HOME = f"//a[@href=/ and contains(text(), {TAKE_ME_HOME_TEXT})]"

WINDOWS_TAB = f"//a[@ng-click='select()']//span[text()='Windows']/../.."
UBUNTU_TAB = f"//a[@ng-click='select()']//span[text()='Ubuntu Linux']/../.."
MAC_OS_TAB = f"//a[@ng-click='select()']//span[text()='Mac OS']/../.."

RELEASE_NUMBER = f"//div[contains(@class,'active')]//div[@ng-repeat='release in activeBuilds']//h1/b"

#Password badges

PASSWORD_BADGE = f"//span[contains(@class,'badge')]"
PASSWORD_TOO_SHORT_BADGE = f"//span[contains(@class,badge) and contains(text(),{PASSWORD_TOO_SHORT_BADGE_TEXT})]"
PASSWORD_TOO_COMMON_BADGE = f"//span[contains(@class,badge) and contains(text(),{PASSWORD_TOO_COMMON_BADGE_TEXT})]"
PASSWORD_IS_WEAK_BADGE = f"//span[contains(@class,badge) and contains(text(),{PASSWORD_IS_WEAK_BADGE_TEXT})]"
PASSWORD_IS_FAIR_BADGE = f"//span[contains(@class,badge) and contains(text(),{PASSWORD_IS_FAIR_BADGE_TEXT})]"
PASSWORD_IS_GOOD_BADGE = f"//span[contains(@class,badge) and contains(text(),{PASSWORD_IS_GOOD_BADGE_TEXT})]"
PASSWORD_INCORRECT_BADGE = f"//span[contains(@class,badge) and contains(text(),{PASSWORD_INCORRECT_BADGE_TEXT})]"

#Already logged in modal

LOGGED_IN_CONTINUE_BUTTON = f"//ngb-modal-window//button[contains(text(),{CONTINUE_BUTTON_TEXT})]"
LOGGED_IN_LOG_OUT_BUTTON = f"//ngb-modal-window//button[contains(text(),{LOG_OUT_BUTTON_TEXT})]"

CONTINUE_BUTTON = f"//ngb-modal-window//button[contains(text(), {CONTINUE_BUTTON_TEXT})]"
CONTINUE_MODAL = f"//ngb-modal-window"

THREEHUNDREDCHARS = f"QWErtyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmyy"
TWOHUNDREDFIFTYFIVECHARS = f"QWErtyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopasdfghhkljzxcvbnmqwertyuiopas"

#Eye icons for password forms

EYE_ICON_OPEN = f"//span[@ng-if='!passwordVisible']"
EYE_ICON_CLOSED = f"//span[@ng-if='passwordVisible']"