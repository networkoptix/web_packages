
URL = f"{ENV}"
VALID_EMAIL = f"noptixqa+valid@gmail.com"
PASSWORD = f"{BASE_PASSWORD}"
SYMBOL_PASSWORD = f"pass!@#$%^&*()_-+=;:''`~,./\|?[]{}"
SPACE_PASSWORD = f"qwea sd 123"
#${email}                             ${EMAIL VIEWER}
f"{EMAIL_VIEWER}"
URL = f"{ENV}"


# change-pass web elements

CHANGE_PASSWORD_LEFT_MENU_LINK = f"//nx-menu//span[contains(text(), {CHANGE_PASSWORD_LEFT_MENU_TEXT})]"
CHANGE_PASSWORD_FORM = f"//nx-account-password-component//form"
CURRENT_PASSWORD_INPUT = f"{CHANGE_PASSWORD_FORM}//input[@id=password]"
NEW_PASSWORD_INPUT = f"{CHANGE_PASSWORD_FORM}//input[@id=newPassword]"
CHANGE_PASSWORD_BUTTON = f"//nx-account-password-component//nx-apply//nx-process-button//button"
CANCEL_PASSWORD_CHANGES_BUTTON = f"//nx-account-password-component//nx-apply//button[contains(text(), {CANCEL_CHANGES_BUTTON_TEXT})]"
PASSWORD_IS_REQUIRED = f"//div[contains(@class,input-error) and contains(text(),{REQUIRED_TEXT})]"
CHANGE_PASS_EYE_ICON_OPEN = f"{CHANGE_PASSWORD_FORM}{EYE_ICON_OPEN}"
CHANGE_PASS_EYE_ICON_CLOSED = f"{CHANGE_PASSWORD_FORM}{EYE_ICON_CLOSED}"
CHANGE_PASS_NO_CHANGES = f"//div[contains(@class, 'placeholder-text-no-changes')]"
PASSWORD_HEADLINE = f"//nx-account-password-component//nx-block//h4[contains(text(), {PASSWORD_TEXT})]"



CURRENT_PASSWORD_IS_REQUIRED = f"//span[contains(@class, input-error) and contains(text(),{CURRENT_PASSWORD_IS_REQUIRED_TEXT})]"