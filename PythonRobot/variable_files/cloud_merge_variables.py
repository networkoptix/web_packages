
TEST_SYSTEMS = []
MERGE_BUTTON_SYSTEM = f"//button[span[text()={MERGE_SYSTEM_BUTTON_TEXT}]]"
MERGE_BUTTON_SYSTEM_DISABLED = f"//button[@disabled and span[text()={MERGE_SYSTEM_BUTTON_TEXT}]]"
MERGE_DIALOG = f"//nx-modal-merge-content"
MERGE_FORM = f"{MERGE_DIALOG}//form[@name=mergeForm]"
MERGE_SYSTEM_DROPDOWN = f"{MERGE_DIALOG}//button[@id=system]"
MERGE_X_BUTTON = f"{MERGE_DIALOG}//button[contains(@class,close)]"
MERGE_GO_BACK_BUTTON = f"{MERGE_DIALOG}//button[contains(@class, svg-icon)]"
MERGE_NEXT_BUTTON = f"{MERGE_DIALOG}//button[contains(@class,btn btn-primary) and contains(text(),{NEXT_TEXT})]"
OTHER_SYSTEM = f"Other System..."
MERGE_SYSTEMS_HEADER = f"{MERGE_DIALOG}//h1/span[contains(text(), {MERGE_SYSTEMS_TEXT})]"
CURRENTLY_MERGING_CARD = f"//div[contains(@class,'card-body')]"
CURRENTLY_MERGING_DOTS = f"{CURRENTLY_MERGING_CARD}//div[contains(@class, circleG circleG_)]"
MERGE_NOT_OWNER_MESSAGE_2 = f"{MERGE_DIALOG}//p[@class=help-block-no-height][2]"
MERGE_FAILED_DIALOG_HEADER = f"//nx-modal-generic-content//h1/span[contains(text(),{SYSTEM_MERGE_FAILED_TEXT})]"
MERGE_FAILED_OK_BUTTON = f"{MERGE_DIALOG}//button[contains(text(),{OK_TEXT})]"
MERGE_FAILED_X_BUTTON = f"//nx-modal-generic-content//button[contains(@class,'close')]"
MERGE_FAILED_ERROR_TEXT = f"//nx-modal-generic-content//div[contains(@class, 'modal-body')]/p"
MERGE_CURRENT_SYSTEM_WITH = f"{MERGE_DIALOG}//p[contains(text(),{MERGE_CURRENT_SYSTEM_WITH_TEXT})]"
MERGE_ENTER_THE_ADDRESS = f"{MERGE_DIALOG}//p[contains(text(),{MERGE_ENTER_THE_ADDRESS_TEXT})]"
MERGE_ONLY_AS_OWNER = f"{MERGE_DIALOG}//p[contains(text(),{YOU_CAN_ONLY_MERGE_AS_OWNER_TEXT})]"
MERGE_CHECKING_HINT = f"{MERGE_DIALOG}//p[contains(text(),{CHECKING_TEXT})]"
MERGE_PASSWORD_REQUIRED = f"{MERGE_DIALOG}//label[contains(@class, error-label) and contains(text(),{PASSWORD_IS_REQUIRED_TEXT})]"
MERGE_PASSWORD_INCORRECT = f"{MERGE_DIALOG}//label[contains(@class, error-label) and contains(text(),{WRONG_PASSWORD})]"
MERGE_ENTER_SERVER_ADDRESS = f"{MERGE_DIALOG}//label[contains(text(),{MERGE_ENTER_SERVER_ADDRESS_TEXT})]"

MERGE_CHECK_MERGE_FORM = f"{MERGE_DIALOG}//form[@name=checkMergeForm]"
MERGE_SYSTEM_DROPDOWN_ARROW = f"{MERGE_CHECK_MERGE_FORM}//div[@class=arrow-flip]//*[@id=arrow_expand]/../.."
MERGE_SYSTEMS_MENU = f"{MERGE_CHECK_MERGE_FORM}//ul[@class=dropdown-menu--list]"
MERGE_FORM_SERVER_URL_LABEL = f"{MERGE_CHECK_MERGE_FORM}//label[@for=serverUrl and contains(text(), {MERGE_SERVER_URL_TEXT})]"
MERGE_FORM_SERVER_URL_INPUT = f"{MERGE_CHECK_MERGE_FORM}//input[@id=serverUrl]"
#${SYSTEM HAS AN OLDER SOFTWARE VERSION}    ${MERGE CHECK MERGE FORM}//p[contains(@class, "error") and contains(text(), "${SYSTEM HAS AN OLDER SOFTWARE VERSION TEXT}")]
f"{MERGE_CHECK_MERGE_FORM}//p[contains(@class, error) and contains(text(), {SYSTEM_HAS_AN_OLDER_SOFTWARE_VERSION_TEXT})]"
#${SYSTEM HAS A NEWER SOFTWARE VERSION}     ${MERGE CHECK MERGE FORM}//p[contains(@class, "error") and contains(text(), "${SYSTEM HAS A NEWER SOFTWARE VERSION TEXT}")]
f"{MERGE_CHECK_MERGE_FORM}//p[contains(@class, error) and contains(text(), {SYSTEM_HAS_A_NEWER_SOFTWARE_VERSION_TEXT})]"
#${SERVER HAS AN OLDER SOFTWARE VERSION}    ${MERGE CHECK MERGE FORM}//p[contains(@class, "error") and contains(text(), "${SERVER HAS AN OLDER SOFTWARE VERSION TEXT}")]
f"{MERGE_CHECK_MERGE_FORM}//p[contains(@class, error) and contains(text(), {SERVER_HAS_AN_OLDER_SOFTWARE_VERSION_TEXT})]"
SYSTEMS_HAVE_MISMATCHING_VERSIONS = f"{MERGE_CHECK_MERGE_FORM}//p[contains(text(), {SYSTEMS_HAVE_MISMATCHING_VERSIONS_TEXT})]"
SERVER_HAS_INCOMPATIBLE_VERSION = f"{MERGE_CHECK_MERGE_FORM}//p[contains(text(), {SERVER_HAS_INCOMPATIBLE_VERSION_TEXT})]"
SERVER_APPEARS_TO_BE_LISTING_ITSELF = f"{MERGE_CHECK_MERGE_FORM}//p[contains(text(), {SERVER_APPEARS_TO_BE_LISTING_ITSELF_TEXT})]"
REMOVE_OFFLINE_AND_INCOMPATIBLE_SERVERS = f"{MERGE_CHECK_MERGE_FORM}//p[contains(text(), {REMOVE_OFFLINE_AND_INCOMPATIBLE_SERVERS_TEXT})]"
MERGE_SERVER_NOT_FOUND = f"{MERGE_DIALOG}//h1/span[contains(text(), {FAILED_TO_FIND_SYSTEM_TO_MERGE})]"
MERGE_SERVER_NOT_FOUND_BODY = f"{MERGE_DIALOG}//p[contains(text(), {FAILED_TO_FIND_MERGE_BODY})]"
MERGE_INVALID_URL = f"{MERGE_CHECK_MERGE_FORM}//label[@for=serverUrl and contains(text(), {MERGE_INVALID_URL_TEXT})]"

MERGE_ADMIN_FORM = f"{MERGE_DIALOG}//form[@name=adminPasswordForm]"
MERGE_ADMIN_FORM_LOGIN_LABEL = f"{MERGE_ADMIN_FORM}//label[@for=adminLogin and contains(text(), {LOGIN_TEXT})]"
MERGE_ADMIN_FORM_LOGIN_INPUT = f"{MERGE_ADMIN_FORM}//input[@name=adminLogin]"
MERGE_ADMIN_FORM_PASSWORD_LABEL = f"{MERGE_ADMIN_FORM}//label[@for=adminPassword and contains(text(), {PASSWORD_TEXT})]"
MERGE_ADMIN_FORM_PASSWORD_INPUT = f"{MERGE_ADMIN_FORM}//input[@id=adminPassword]"

MERGE_CHOOSE_PRIMARY_FORM = f"{MERGE_DIALOG}//form[@name=choosePrimaryForm]"
MERGE_RADIO_FIRST_SYSTEM = f"{MERGE_CHOOSE_PRIMARY_FORM}//nx-radio[@name=firstSystem]"
MERGE_RADIO_SECOND_SYSTEM = f"{MERGE_CHOOSE_PRIMARY_FORM}//nx-radio[@name=secondSystem]"
MERGE_TAKE_SYSTEM_NAME = f"{MERGE_CHOOSE_PRIMARY_FORM}//p[contains(text(), {TAKE_SYSTEM_NAME_AND_SETTINGS_TEXT})]"

CONFIRM_MERGE_FORM = f"{MERGE_DIALOG}//form[@name=confirmMergeForm]"
CONFIRM_MERGE_TEXT = f"{CONFIRM_MERGE_FORM}/div/p"
#${MERGE YOU ARE ABOUT TO MERGE}       ${CONFIRM MERGE FORM}//p[contains(text(), "${YOU ARE ABOUT TO MERGE TEXT}") and contains(text(), "${SETTINGS WILL BE TAKEN TEXT}")]
#f"{CONFIRM_MERGE_FORM}//p[contains(text(), {YOU_ARE_ABOUT_TO_MERGE_TEXT}) and contains(text(), {SETTINGS_WILL_BE_TAKEN_TEXT})]"
#${MERGE SETTINGS WILL BE TAKEN}       ${CONFIRM MERGE FORM}//p[contains(text(), "${YOU ARE ABOUT TO MERGE TEXT}") and contains(text(), "${SETTINGS WILL BE TAKEN TEXT}")]
#f"{CONFIRM_MERGE_FORM}//p[contains(text(), {YOU_ARE_ABOUT_TO_MERGE_TEXT}) and contains(text(), {SETTINGS_WILL_BE_TAKEN_TEXT})]"
MERGE_ENTER_YOUR_PASSWORD = f"{CONFIRM_MERGE_FORM}//label[contains(text(),{ENTER_PASSWORD_TO_CONTINUE_TEXT})]"
MERGE_PASSWORD_INPUT = f"{CONFIRM_MERGE_FORM}//input[@name=cloudOwnerPassword]"
MERGE_SYSTEMS_BUTTON = f"{CONFIRM_MERGE_FORM}//button[@type=submit and text()={MERGE_SYSTEMS_TEXT}]"
SYSTEM_IS_BEING_MERGED = f"//div[contains(text(), {SYSTEM_IS_BEING_MERGED_TEXT})]"

MERGE_GENERAL_ERROR_FORM = f"//form[@name='serverUrlErrorsForm']"
MERGE_TRY_AGAIN_BUTTON = f"{MERGE_GENERAL_ERROR_FORM}//button[contains(text(), {TRY_AGAIN_TEXT})]"
MERGE_SERVER_APPEARS_TO_BE_LISTING_ITSELF = f"{MERGE_GENERAL_ERROR_FORM}//p[contains(text(), {SERVER_APPEARS_TO_BE_LISTING_ITSELF_TEXT})]"
MERGE_REMOVE_OFFLINE_AND_INCOMPATIBLE_SERVERS = f"{MERGE_GENERAL_ERROR_FORM}//p[contains(text(), {REMOVE_OFFLINE_AND_INCOMPATIBLE_SERVERS_TEXT})]"
MERGE_SYSTEMS_HAVE_DIFFERENT_OWNERS = f"{MERGE_GENERAL_ERROR_FORM}//p[contains(text(), {SYSTEMS_HAVE_DIFFERENT_OWNERS_TEXT})]"

#MERGE_FAILED_DIALOG = 

#MERGE_LONELY_SYSTEM_FORM = 

