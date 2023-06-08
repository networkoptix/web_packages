
#account web elements

ACCOUNT_DROPDOWN = "//header//div[@data-testid='accountSettingsDropdown']/preceding-sibling::button"
ACCOUNT_SETTINGS_BUTTON = "//header//li//a[@href = '/account']"
LOG_IN_CLOSE_BUTTON = "//button[@data-dismiss='modal']"
ACCOUNT_SETTINGS_BUTTON_SYSTEM = "//button[@id='accountSettingsButton']"
ACCOUNT_EMAIL = "//a[@id='settings']"
ACCOUNT_FIRST_NAME = "//form[@name='accountForm']//input[@id='firstName']"
ACCOUNT_LAST_NAME = "//form[@name='accountForm']//input[@id='lastName']"
ACCOUNT_LANGUAGE_DROPDOWN = "//nx-language-select//button[@id='dropdownMenuButton']"
ACCOUNT_SAVE = "//nx-process-button[@data-testid='saveSettingsBtn']//button"
ACCOUNT_CANCEL = "//nx-cancel-button[@data-testid='cancelSettingsBtn']//button"
TEST_FIRST_NAME = "mark"
TEST_LAST_NAME = "hamill"
DELETE_ACCOUNT_BUTTON = "//nx-account-settings-component//nx-block//button[@id='accountSettingsDeleteButton']"
ACCOUNT_SAVE = "//nx-process-button[@data-testid='saveSettingsBtn']//button"

YOUR_ACCOUNT_IS_SUCCESSFULLY_SAVED = "Your account is successfully saved"
TEST_FIRST_NAME = "Johannes"
TEST_LAST_NAME = "Brahms"

BACKDROP = "//ngb-modal-backdrop"
ANONYMOUS_BODY = """//body[contains(@class,'anonymous')]//h1[@data-testid="welcomeCaption" or @id="welcomeCaption"]"""