
URL = f"{ENV}"
EXISTING_EMAIL = f"{EMAIL_VIEWER}"
VALID_EMAIL = f"noptixqa+valid@gmail.com"
PASSWORD = f"{BASE_PASSWORD}"
URL = f"{ENV}"
auth = [EMAIL_OWNER, BASE_PASSWORD]

REGISTER_FORM = f"//nx-authorize-create-account-component"
REGISTER_FIRST_NAME_INPUT = f"{REGISTER_FORM}//form//input[@id=firstName]"
REGISTER_LAST_NAME_INPUT = f"{REGISTER_FORM}//form//input[@id=lastName]"
REGISTER_EMAIL_INPUT = f"{REGISTER_FORM}//form//nx-email-input/input[@id=email]"
REGISTER_EMAIL_INPUT_LOCKED = f"{REGISTER_FORM}//form//input[@name=registerEmailLocked]"
REGISTER_PASSWORD_INPUT = f"{REGISTER_FORM}//form//nx-password-input//input[@id=createAccountPassword]"
REGISTER_LOG_IN_BUTTON = f"{REGISTER_FORM}//button[@id=btnActivateLogin]"
REGISTER_BACK_BUTTON = f"{REGISTER_FORM}//button/span[text()={BACK_TEXT}]/.."
REGISTER_NOT_ACTIVATED = f"//nx-authorize-component//form[@name=emailForm]//p[contains(text(),{ACCOUNT_NOT_ACTIVATED})]"

TERMS_AND_CONDITIONS_CHECKBOX_VISIBLE = f"{REGISTER_FORM}//nx-checkbox[@name=termsAndConditions]"
TERMS_AND_CONDITIONS_CHECKBOX_REAL = f"{TERMS_AND_CONDITIONS_CHECKBOX_VISIBLE}//input[@id=termsAndConditions]"

CREATE_ACCOUNT_BUTTON = f"{REGISTER_FORM}//button[contains(text(),{CREATE_ACCOUNT_BUTTON_TEXT})]"
TERMS_AND_CONDITIONS_LINK = f"{REGISTER_FORM}//a[@href=/content/eula]"
TERMS_AND_CONDITIONS_ERROR = f"{REGISTER_FORM}//nx-checkbox/../following-sibling::p[contains(@class,error-label) and contains(text(),{REQUIRED_TEXT})]"
PRIVACY_POLICY_LINK = f"{REGISTER_FORM}//a[@href={PRIVACY_POLICY_URL_HREF}]"
RESEND_ACTIVATION_LINK_BUTTON = f"//nx-authorize-email-component//p[contains(@class,fake-link) and contains(text(),{RESEND_ACTIVATION_LINK_BUTTON_TEXT})]"
REGISTER_EYE_ICON_OPEN = f"{REGISTER_FORM}{EYE_ICON_OPEN}"
REGISTER_EYE_ICON_CLOSED = f"{REGISTER_FORM}{EYE_ICON_CLOSED}"

INVITED_TO_SYSTEM_EMAIL_SUBJECT_UNREGISTERED = f"{{message.sharer_name}} invites you to %PRODUCT_NAME%"

ACCOUNT_CREATION_SUCCESS = f"//nx-authorize-activate-account-component"
ACCOUNT_CREATION_SUCCESS_ICON = f"//div[@name='ACCOUNT_CREATED']/svg-icon"
ACCOUNT_CREATION_CONFIRMATION = f"{ACCOUNT_CREATION_SUCCESS}/following-sibling::div[@name=ACCOUNT_CREATED]"