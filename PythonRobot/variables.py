

ALERT = f"//div[contains(@class,'toast')]//span[contains(@class,'toast-content')]"
ALERT_CLOSE = f"//div[contains(@class,'toast')]/button[contains(@class,'close') and @data-dismiss='alert']"

BROWSER = f"Chrome"

LANGUAGE_DROPDOWN = f"//header//nx-header-language-select//button[@data-testid='dropdownMenuButton']"
# TODO: get proper language
LANGUAGE = "en_US"
LANGUAGE_TO_SELECT = f"//header//nx-header-language-select//span[@lang={LANGUAGE}]/.."
DOWNLOAD_LINK = f"//footer//a[@href='/download']"
ACCOUNT_DOES_NOT_EXIST_TEXT = "Account does not exist."
YOU_CAN_CREATE_ACCOUNT_TEXT = "You can create an account with this email address or try to enter a different one."
ACCOUNT_CREATION_EMAIL_SUCCESS = "//nx-authorize-component//nx-authorize-activate-account-component//main//h3"
MODAL_DIALOG = f"//nx-modal-generic-content"
LOGGED_IN_CLOSE_BUTTON = f"{MODAL_DIALOG}//button//span[@class=close-icon]/../.."


ENV="https://cloud-test.hdw.mx/"


#Log In Elements
#TODO: fix button text translations
LOG_IN_MODAL = f"//nx-authorize-component/div[@class='authorize-main main-w']"
LOG_IN_NEXT_BUTTON = f"//nx-authorize-component//nx-process-button[@data-testid='btnLogin']"
EMAIL_INPUT = f"//nx-authorize-component//input[@id='authorizeEmail']"
PASSWORD_INPUT = f"//nx-authorize-component//input[@id='authorizePassword' and @name='password' and @type='password']"
LOG_IN_BUTTON = f"//nx-authorize-component//nx-process-button[@data-testid='btnLogin']"

# TODO: Add LOG_OUT_BUTTON_TEXT back to the text() call
LOG_OUT_BUTTON = f"//header//li[contains(@class, 'dropdown-item-container')]//a/span[contains(text(),'Log Out')]/.."

YOU_CAN_CREATE_AN_ACCOUNT = f"//nx-authorize-component//p[contains(text(),{YOU_CAN_CREATE_ACCOUNT_TEXT})]"
ACCOUNT_DOES_NOT_EXIST = f"//nx-authorize-component//p[contains(text(),'{ACCOUNT_DOES_NOT_EXIST_TEXT}')]"

#TODO: this needs to be proper translated value
LOG_IN_BUTTON_TEXT = "Log In"
LOG_IN_NAV_BAR = f"//header//a[contains(text(),'{LOG_IN_BUTTON_TEXT}')]/.."

HEADER_ICON_LINK = f"//nx-header/header//div[@class='app-header-left']//a[contains(@class, 'navbar-brand')]"
LOGO_ICON = f"{HEADER_ICON_LINK}/img"

ERROR_COLOR = "rgb(240, 44, 44)"

ALERT = """//div[contains(@class,'toast')]//span[contains(@class,'toast-content')]"""
ALERT_CLOSE = """//div[contains(@class,'toast')]/button[contains(@class,'close') and @data-dismiss='alert']"""

CHANGE_PASSWORD_BUTTON_DROPDOWN = f"//header//li//a[@href = '/account/password']"