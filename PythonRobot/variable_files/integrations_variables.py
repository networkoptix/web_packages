
URL_INTEGRATIONS = f"{ENV}/integrations"
TITLE = f"{VMS_NAME} {INTEGRATIONS_TITLE_TEXT} - {PRODUCT_NAME}"
auth = [BASE_EMAIL, BASE_EMAIL_PASSWORD ]

#Integration Landing Page

INTEGRATIONS_COMPONENT = f"//nx-app//nx-integrations-component/div[@class='intergations']"
INTEGRATIONS_SEARCH = f"{INTEGRATIONS_COMPONENT}//nx-search[@name=filterModel]/div[@class=nx-search]"
INTEGRATIONS_SEARCH_INPUT = f"{INTEGRATIONS_SEARCH}//input[contains(@class, search-input) and contains(@placeholder, {SEARCH_PLACEHOLDER_TEXT})]"
INTEGRATIONS_SEARCH_CLOSE_BUTTON = f"{INTEGRATIONS_SEARCH}//button[contains(@class, search-clear)]"
INTEGRATIONS_SEARCH_ICON = f"{INTEGRATIONS_SEARCH}//span[contains(@class, icon-search)]"
INTEGRATIONS_SEARCH_FILTER = f"{INTEGRATIONS_SEARCH}//div[contains(@class, search-tags)]//nav[contains(@aria-label, table)]/ul[contains(@class, pagination)]"
INTEGRATIONS_SEARCH_FILTER_ITEM = f"{INTEGRATIONS_SEARCH_FILTER}/li"
INTEGRATIONS_CATALOG = f"{INTEGRATIONS_COMPONENT}//nx-integrations-list-component"
INTEGRATION_PREVIEW_BANNER = f"//nx-ribbon//div[@class=message and contains(text(),{INTEGRATION_BANNER_MESSAGE_TEXT})]/following-sibling::div[@class=action]/a[contains(text(),{INTEGRATION_BANNER_ACTION_TEXT})]"

#Integration Tile

INTEGRATION_TILE = f"{INTEGRATIONS_COMPONENT}//nx-integrations-list-component//nx-block/div[contains(@class, card)]/../../.."
INTEGRATION_TEST_INTEGRATION_LINK = f"{INTEGRATION_TILE}//a"
INTEGRATION_TILE_LOGO = f"//div[contains(@class, 'card--header-logo')]"
INTEGRATION_TILE_INFO = f"//div[contains(@class, 'card--header-info')]"
INTEGRATION_TILE_NAME = f"//div[contains(@class, 'card--body-name')]"
INTEGRATION_TILE_TEXT = f"//div[contains(@class, 'card--body-descr')]"
INTEGRATION_TILE_HEADER = f"//div[@class='card--header extended-header']"
#${INTEGRATION TILE BODY}              ${INTEGRATION TILE}//nx-section/child::div[@class="card--body"]
f"{INTEGRATION_TILE}//nx-section/child::div[@class=card--body]"
INTEGRATION_TILE_FOOTER = f"//div[@class='card--footer']"
f"{INTEGRATION_TILE_LOGO}"f"{INTEGRATION_TILE_NAME}"f"{INTEGRATION_TILE_TEXT}"f"{INTEGRATION_TILE_HEADER}"f"{INTEGRATION_TILE_FOOTER}"

#Integration Details Page

INTEGRATION_DETAILS_COMPONENT = f"//nx-app//integration-detail-component/div[contains(@class, 'integration-details')]"
INTEGRATION_CARD = f"{INTEGRATION_DETAILS_COMPONENT}//nx-block/div[@class=card]"
INTEGRATION_ALL_INTEGRATIONS = f"{INTEGRATION_DETAILS_COMPONENT}//button/span[contains(text(), {ALL_INTEGRATIONS_TEXT})]"
INTEGRATION_RIGHT_PANEL = f"{INTEGRATION_DETAILS_COMPONENT}//div[@class=right-menu]"
INTEGRATION_DOWNLOADS_SECTION = f"{INTEGRATION_RIGHT_PANEL}//nx-block/div[@class=card gray]/child::div/child::h4/child::header[contains(text(), {INTEGRATION_DOWNLOADS_TEXT})]"
INTEGRATION_REQUIREMENTS_SECTION = f"{INTEGRATION_RIGHT_PANEL}//nx-block/div[@class=card gray]/child::div/child::h4/child::header[contains(text(), {INTEGRATION_REQUIREMENTS_TEXT})]"
INTEGRATION_HOW_IT_WORKS_HEADER = f"{INTEGRATION_CARD}//header[contains(text(), {INTEGRATION_HOW_IT_WORKS_TEXT})]"
INTEGRATION_HOW_TO_SETUP_HEADER = f"{INTEGRATION_CARD}//header[contains(text(), {INTEGRATION_HOW_TO_SETUP_TEXT})]"

#Integration Details Left Panel

INTEGRATION_TITLE = f"{INTEGRATION_DETAILS_COMPONENT}//div[contains(@class, title)]"
INTEGRATION_VERSION = f"{INTEGRATION_DETAILS_COMPONENT}//div[contains(@class, version)]"
INTEGRATION_HOW_IT_WORKS_LINK = f"{INTEGRATION_DETAILS_COMPONENT}//nx-menu//a/child::div/child::span[text()={INTEGRATION_HOW_IT_WORKS_TEXT}]"
INTEGRATION_HOW_IT_WORKS_VIDEO = f"{INTEGRATION_DETAILS_COMPONENT}//nx-external-video"
INTEGRATION_HOW_IT_WORKS_CAROUSEL = f"{INTEGRATION_DETAILS_COMPONENT}//nx-carousel//div[contains(@class, carousel)]"
INTEGRATION_HOW_TO_SETUP_LINK = f"{INTEGRATION_DETAILS_COMPONENT}//nx-menu//a[@id=how-to-setup]/child::div/child::span[contains(text(), {INTEGRATION_HOW_TO_SETUP_TEXT})]"
INTEGRATION_HOW_TO_SETUP_VIDEO = f"{INTEGRATION_HOW_IT_WORKS_VIDEO}"
INTEGRATION_HOW_TO_SETUP_CAROUSEL = f"{INTEGRATION_HOW_IT_WORKS_CAROUSEL}"
INTEGRATION_CAROUSEL_RIGHT_BUTTON = f"{INTEGRATION_DETAILS_COMPONENT}//nx-carousel//span[@role=button]/div[contains(@class, right)]"
INTEGRATION_CAROUSEL_LEFT_BUTTON = f"{INTEGRATION_DETAILS_COMPONENT}"
INTEGRATION_CAROUSEL_PREVIEW = f"{INTEGRATION_DETAILS_COMPONENT}//nx-carousel//div[contains(@class, btn-group carousel-preview)]"
INTEGRATION_CAROUSEL_SCREENSHOT_NAME = f"{INTEGRATION_DETAILS_COMPONENT}//div[contains(@class, carousel-item-caption)]"
INTEGRATION_TAGS_SECTION = f"{INTEGRATION_DETAILS_COMPONENT}//div/child::div/child::label[contains(text(), {INTEGRATION_TAGS_TEXT})]"
INTEGRATION_GET_IN_TOUCH_LABEL = f"{INTEGRATION_DETAILS_COMPONENT}//label[contains(text(), {INTEGRATION_CONTACT_TEXT})]"
INTEGRATION_GET_IN_TOUCH_BUTTON = f"{INTEGRATION_DETAILS_COMPONENT}//button[contains(@class, btn btn-primary)]"
INTEGRATION_DEVELOPER_LABEL = f"{INTEGRATION_DETAILS_COMPONENT}//label[contains(text(), {INTEGRATION_DEVELOPER_TEXT})]"
INTEGRATION_DEVELOPER_COMPANY_LINK = f"{INTEGRATION_DETAILS_COMPONENT}//label[text()={INTEGRATION_DEVELOPER_TEXT}]/../following-sibling::div/a"
INTEGRATION_DEVELOPER_TERMS_OF_USE_LINK = f"{INTEGRATION_DETAILS_COMPONENT}//a[contains(text(), {INTEGRATION_TERMS_OF_USE_TEXT})]"
INTEGRATION_SUPPORT_LABEL = f"{INTEGRATION_DETAILS_COMPONENT}//label[contains(text(), {INTEGRATION_SUPPORT_TEXT})]"
INTEGRATION_SUPPORT_LINK = f"{INTEGRATION_DETAILS_COMPONENT}//a[contains(text(), {INTEGRATION_SUPPORT_URL_TEXT})]"
INTEGRATION_SUPPORT_EMAIL = f"{INTEGRATION_DETAILS_COMPONENT}//a[contains(text(), {INTEGRATION_SUPPORT_EMAIL_TEXT})]"

#Get in Touch Modal

INTEGRATION_GET_IN_TOUCH_FORM = f"//ngb-modal-window//div[@class='modal-content']//form[@name='messageForm']"
INTEGRATION_GET_IN_TOUCH_HEADER = f"{INTEGRATION_GET_IN_TOUCH_FORM}//div[contains(@class, header)]"
INTEGRATION_GET_IN_TOUCH_TITLE = f"{INTEGRATION_GET_IN_TOUCH_HEADER}//h1[contains(@class, title)]"
INTEGRATION_GET_IN_TOUCH_CLOSE_BUTTON = f"{INTEGRATION_GET_IN_TOUCH_HEADER}//button[contains(@class, close)]"
INTEGRATION_GET_IN_TOUCH_CLOSE_BUTTON_ICON = f"{INTEGRATION_GET_IN_TOUCH_HEADER}//div[contains(@class, close-content)]/span[contains(@class, close-icon)]"
INTEGRATION_GET_IN_TOUCH_BODY = f"{INTEGRATION_GET_IN_TOUCH_FORM}//div[contains(@class, body)]/form[@name=feedbackForm]"
INTEGRATION_GET_IN_TOUCH_FOOTER = f"{INTEGRATION_GET_IN_TOUCH_FORM}//div[contains(@class, footer)]"
INTEGRATION_GET_IN_TOUCH_TO_EMAIL_LABEL = f"{INTEGRATION_GET_IN_TOUCH_BODY}//label[@for=to_email]"
INTEGRATION_GET_IN_TOUCH_TO_EMAIL_CONTENT = f"{INTEGRATION_GET_IN_TOUCH_BODY}//div[@id=to_email]"
INTEGRATION_GET_IN_TOUCH_NAME_LABEL = f"{INTEGRATION_GET_IN_TOUCH_BODY}//label[@for=user_name]"
INTEGRATION_GET_IN_TOUCH_NAME_INPUT = f"{INTEGRATION_GET_IN_TOUCH_BODY}//input[@id=user_name]"
INTEGRATION_GET_IN_TOUCH_EMAIL_LABEL = f"{INTEGRATION_GET_IN_TOUCH_BODY}//label[@for=user_email]"
INTEGRATION_GET_IN_TOUCH_EMAIL_INPUT = f"{INTEGRATION_GET_IN_TOUCH_BODY}//input[@id=user_email]"
INTEGRATION_GET_IN_TOUCH_SUBJECT_LABEL = f"{INTEGRATION_GET_IN_TOUCH_BODY}//label[@for=subject]"
INTEGRATION_GET_IN_TOUCH_DROPDOWN_BUTTON = f"{INTEGRATION_GET_IN_TOUCH_BODY}//button[@id=subject]"
INTEGRATION_GET_IN_TOUCH_DROPDOWN_ICON = f"{INTEGRATION_GET_IN_TOUCH_DROPDOWN_BUTTON}//svg-icon[contains(@data-src,/images/icons/text_buttons/arrow_expand.svg)]"
INTEGRATION_GET_IN_TOUCH_DROPDOWN_LIST = f"{INTEGRATION_GET_IN_TOUCH_BODY}//div[@class=dropdown-menu]"
INTEGRATION_GET_IN_TOUCH_MESSAGE_LABEL = f"{INTEGRATION_GET_IN_TOUCH_BODY}//label[@for=message]"
INTEGRATION_GET_IN_TOUCH_MESSAGE_INPUT = f"{INTEGRATION_GET_IN_TOUCH_BODY}//textarea[@id=message]"
INTEGRATION_GET_IN_TOUCH_PRIVACY_LINKS = f"{INTEGRATION_GET_IN_TOUCH_BODY}//div[contains(@class, form-group)]//a[text()={PRIVACY_POLICY_LINK_TEXT}]"
INTEGRATION_GET_IN_TOUCH_SEND_BUTTON = f"{INTEGRATION_GET_IN_TOUCH_FOOTER}//nx-process-button/div/button"
INTEGRATION_GET_IN_TOUCH_CANCEL_BUTTON = f"{INTEGRATION_GET_IN_TOUCH_FOOTER}//button[contains(@type, button)]"
INTEGRATION_GET_IN_TOUCH_LEGAL = f"{INTEGRATION_GET_IN_TOUCH_FORM}//form[@name=feedbackForm]/div[6]"


all_fields = [ INTEGRATION_ALL_INTEGRATIONS,
             # INTEGRATION_VERSION,
              INTEGRATION_HOW_IT_WORKS_LINK,
                INTEGRATION_HOW_TO_SETUP_LINK,
                INTEGRATION_TAGS_SECTION,
                INTEGRATION_GET_IN_TOUCH_LABEL,
                INTEGRATION_GET_IN_TOUCH_BUTTON,
                INTEGRATION_DEVELOPER_LABEL,
                INTEGRATION_DEVELOPER_COMPANY_LINK,
                INTEGRATION_SUPPORT_LABEL,
                #INTEGRATION_SUPPORT_LINK,
                #INTEGRATION_SUPPORT_EMAIL,
                INTEGRATION_HOW_IT_WORKS_VIDEO,
                INTEGRATION_HOW_IT_WORKS_CAROUSEL,
                INTEGRATION_CAROUSEL_RIGHT_BUTTON,
                INTEGRATION_CAROUSEL_LEFT_BUTTON,
                INTEGRATION_CAROUSEL_PREVIEW,
                INTEGRATION_DOWNLOADS_SECTION,
                INTEGRATION_REQUIREMENTS_SECTION,
                INTEGRATION_HOW_IT_WORKS_HEADER,]

required_fields = [ INTEGRATION_ALL_INTEGRATIONS,
                # INTEGRATION_VERSION,
                    INTEGRATION_HOW_IT_WORKS_LINK,
                    INTEGRATION_HOW_TO_SETUP_LINK,
                    INTEGRATION_TAGS_SECTION,
                    INTEGRATION_GET_IN_TOUCH_LABEL,
                    INTEGRATION_GET_IN_TOUCH_BUTTON,
                    INTEGRATION_DEVELOPER_LABEL,
                    INTEGRATION_DEVELOPER_COMPANY_LINK,
                    INTEGRATION_SUPPORT_LABEL,
                    #INTEGRATION_SUPPORT_EMAIL,
                    INTEGRATION_HOW_IT_WORKS_HEADER,]

