

URL = f"{ENV}"
NAME = f"Nx Automated QA"
MESSAGE = f"This is an automated test message."

#IPVD

IPVD_TITLE = f"//header//li[@class=active]/a[contains(text(),{IPVD_TITLE_TEXT})]"
IPVD_LANDING_PAGE_TEXT = f"//nx-ipvd//p"

#IPVD Filters

IPVD_FILTERS = f"//nx-ipvd//nx-search/div/div"
IPVD_FILTER_BUTTON = f"//nx-search//span[@class='filter-label']"
IPVD_FILTER_BUTTON_X_CLOSE = f"{IPVD_FILTER_BUTTON}/following-sibling::span[contains(@class, close-icon])]"
IPVD_FILTERS_BASIC = f"{IPVD_FILTERS}/div[1]/div"
IPVD_SEARCH_BAR = f"{IPVD_FILTERS_BASIC}/div[1]/input[@name=query]"
IPVD_CLEAR_TEXT_SEARCH_BUTTON = f"{IPVD_FILTERS}//button[contains(@class, search-clear)]"
IPVD_FILTERS_APPLIED_BUTTON = f"{IPVD_FILTERS_BASIC}/div[2]{IPVD_ADV_FEATURES_CLOSE_BUTTON}/.."
IPVD_ADV_SEARCH_BUTTON = f"{IPVD_FILTERS_BASIC}/div/span[contains(text(),{IPVD_ADV_SEARCH_BUTTON_TEXT})]/.."
IPVD_ARROW = f"//*[contains(@data-src,'/images/icons/text_buttons/arrow_expand.svg')]"

#IPVD Advanced Filters

IPVD_ADV_FILTERS = f"{IPVD_FILTERS}/div[2]/div"
IPVD_ADV_FILTERS_MIN_RES = f"{IPVD_ADV_FILTERS}//nx-select/../label[contains(text(),{IPVD_ADV_FILTER_MIN_RES})]/..//button[1]"
IPVD_ADV_FILTERS_MFRS = f"{IPVD_ADV_FILTERS}//nx-multi-select/../label[contains(text(),{IPVD_ADV_FILTER_MFRS})]/..//button[1]"
IPVD_ADV_FILTERS_TYPES = f"{IPVD_ADV_FILTERS}//nx-multi-select/../label[contains(text(),{IPVD_ADV_FILTER_TYPES})]/..//button[1]"
IPVD_ADV_FILTERS_ANALYTICS = f"{IPVD_ADV_FILTERS}//nx-multi-select/../label[contains(text(),{IPVD_ADV_FILTER_ANALYTICS})]/..//button[1]"
IPVD_ADV_FILTERS_DROPDOWN_MENU = f"{DROPDOWN_MENU}"
IPVD_ADV_FILTERS_DROPDOWN_MENU_ITEMS = f"{DROPDOWN_MENU_ITEMS}"
#IPVD Advanced Filters Features

IPVD_ADV_FEATURES = f"{IPVD_ADV_FILTERS}//div/label[text()=Features]/.."
IPVD_ADV_FEATURES_AUDIO = f"{IPVD_ADV_FEATURES}//nx-tag/a[contains(text(),{IPVD_ADV_FEATURE_AUDIO}) and not(contains(text(),{IPVD_ADV_FEATURE_2-WAY_AUDIO}))]/.."
IPVD_ADV_FEATURES_2-WAY_AUDIO = f"{IPVD_ADV_FEATURES}//nx-tag/a[contains(text(),{IPVD_ADV_FEATURE_2-WAY_AUDIO})]/.."
IPVD_ADV_FEATURES_PTZ = f"{IPVD_ADV_FEATURES}//nx-tag/a[contains(text(),{IPVD_ADV_FEATURE_PTZ}) and not(contains(text(),{IPVD_ADV_FEATURE_ADV_PTZ}))]/.."
IPVD_ADV_FEATURES_ADV_PTZ = f"{IPVD_ADV_FEATURES}//nx-tag/a[contains(text(),{IPVD_ADV_FEATURE_ADV_PTZ})]/.."
IPVD_ADV_FEATURES_FISHEYE = f"{IPVD_ADV_FEATURES}//nx-tag/a[contains(text(),{IPVD_ADV_FEATURE_FISHEYE})]/.."
IPVD_ADV_FEATURES_MOTION = f"{IPVD_ADV_FEATURES}//nx-tag/a[contains(text(),{IPVD_ADV_FEATURE_MOTION})]/.."
IPVD_ADV_FEATURES_I/O = f"{IPVD_ADV_FEATURES}//nx-tag/a[contains(text(),{IPVD_ADV_FEATURE_I/O})]/.."
IPVD_ADV_FEATURES_H.265 = f"{IPVD_ADV_FEATURES}//nx-tag/a[contains(text(),{IPVD_ADV_FEATURE_H.265})]/.."
IPVD_ADV_FEATURES_MULTI_SENSOR = f"{IPVD_ADV_FEATURES}//nx-tag/a[contains(text(),{IPVD_ADV_FEATURE_MULTI_SENSOR})]/.."
IPVD_ADV_FEATURES_CLOSE_BUTTON = f"//span[contains(@class,'close-button')]"
#IPVD Manufacturers

IPVD_MANUFACTURERS_PANE = f"//nx-ipvd//nx-vendor-list/nx-block[@id='vendors-block']"
IPVD_MANUFACTURERS_PANE_ITEM = f"{IPVD_MANUFACTURERS_PANE}//*[contains(@class,float-left mr-1 mb-1)]"
IPVD_AND_MORE = f"{IPVD_MANUFACTURERS_PANE}//div[@class=manufacture-info]"
#IPVD Devices

IPVD_DEVICES_PANE = f"//nx-ipvd//nx-vendor-list/nx-block[@id='cameras-block']"
IPVD_DEVS_FILTER_EXTRA_HIGH_RES_CAMERAS = f"{IPVD_DEVICES_PANE}//nx-tag/a[contains(text(),{IPVD_DEV_FILTER_EXTRA_HIGH_RES_CAMERAS})]/.."
IPVD_DEVS_FILTER_CAMERAS_WITH_ADV_PTZ = f"{IPVD_DEVICES_PANE}//nx-tag/a[contains(text(),{IPVD_DEV_FILTER_CAMERAS_WITH_ADV_PTZ})]/.."
IPVD_DEVS_FILTER_PTZ_CAMERAS = f"{IPVD_DEVICES_PANE}//nx-tag/a[contains(text(),{IPVD_DEV_FILTER_PTZ_CAMERAS})]/.."
IPVD_DEVS_FILTER_CAMERAS_WITH_AUDIO = f"{IPVD_DEVICES_PANE}//nx-tag/a[contains(text(),{IPVD_DEV_FILTER_CAMERAS_WITH_AUDIO})]/.."
IPVD_DEVS_FILTER_H.265_CAMERAS = f"{IPVD_DEVICES_PANE}//nx-tag/a[contains(text(),{IPVD_DEV_FILTER_H.265_CAMERAS})]/.."
IPVD_DEVS_FILTER_ENCODERS = f"{IPVD_DEVICES_PANE}//nx-tag/a[contains(text(),{IPVD_DEV_FILTER_ENCODERS})]/.."
IPVD_DEVS_FILTER_2-WAY_AUDIO_DEVICES = f"{IPVD_DEVICES_PANE}//nx-tag/a[contains(text(),{IPVD_DEV_FILTER_2-WAY_AUDIO_DEVICES})]/.."
IPVD_DEVS_FILTER_MULTI-SENSOR_CAMERAS = f"{IPVD_DEVICES_PANE}//nx-tag/a[contains(text(),{IPVD_DEV_FILTER_MULTI-SENSOR_CAMERAS})]/.."
IPVD_DEVS_FILTER_FISHEYE_CAMERAS = f"{IPVD_DEVICES_PANE}//nx-tag/a[contains(text(),{IPVD_DEV_FILTER_FISHEYE_CAMERAS})]/.."
IPVD_DEVS_FILTER_I/O_MODULES = f"{IPVD_DEVICES_PANE}//nx-tag/a[contains(text(),{IPVD_DEV_FILTER_I/O_MODULES})]/.."
#IPVD Details

IPVD_DEVICE_DETAILS = f"//nx-ipvd//nx-cam-view"
IPVD_DEVICE_MAKE = f"{IPVD_DEVICE_DETAILS}//h4[@class=camera-vendor-model]//span[1]"
IPVD_DEVICE_MODEL = f"{IPVD_DEVICE_DETAILS}//h4[@class=camera-vendor-model]//span[2]"
IPVD_CLOSE_DETAILS_BUTTON = f"//nx-ipvd//header//button[contains(@class, 'detailsClose')]"
IPVD_DEVICE_GOOGLE_LINK = f"{IPVD_DEVICE_DETAILS}//div[contains(@class, camview-link)]/a[contains(text(), {IPVD_SEARCH_IN_GOOGLE_TEXT})]"
IPVD_DEVICE_INFO = f"{IPVD_DEVICE_DETAILS}//div[contains(@class,active-camera-info)]"
IPVD_DEVICE_INFO_PARAMETER = f"{IPVD_DEVICE_INFO}/div"
IPVD_DEVICE_RESOLUTION = f"{IPVD_DEVICE_INFO}//nx-bool-icon[contains(@param, maxResolution)]/.."
IPVD_DEVICE_FIRMWARE_INFO = f"{IPVD_DEVICE_DETAILS}//nx-section//div[contains(@class, firmware-info)]"
IPVD_DEVICE_FIRMWARE_VERSION = f"{IPVD_DEVICE_FIRMWARE_INFO}//h4[contains(text(), {IPVD_FIRMWARE_VERSION_TEXT})]"
IPVD_DEVICE_FIRMWARE_VERSION_POPULARITY = f"{IPVD_DEVICE_FIRMWARE_INFO}//h4[contains(text(), {IPVD_FIRMWARE_VERSION_POULARITY_TEXT})]"
IPVD_DEVICE_FIRMWARE_VERSIONS = f"{IPVD_DEVICE_FIRMWARE_INFO}/div"
IPVD_DEVICE_SHOW_ALL_LINK = f"{IPVD_DEVICE_FIRMWARE_INFO}//a[contains(text(), {IPVD_DEVICE_SHOW_ALL_TEXT})]"
IPVD_DEVICE_COLLAPSE_LINK = f"{IPVD_DEVICE_FIRMWARE_INFO}//a[contains(text(), {IPVD_DEVICE_COLLAPSE_TEXT})]"
IPVD_DEVICE_LAST_UPDATED_INFO = f"{IPVD_DEVICE_DETAILS}//span[contains(text(), {IPVD_LAST_UPDATED_TEXT})]"

#IPVD Table

IPVD_TABLE = f"//nx-ipvd//table"
IPVD_TABLE_HEADING_MANUFACTURER = f"{IPVD_TABLE}/thead//div[text()={IPVD_ADV_FILTER_MFR}]"
IPVD_TABLE_HEADING_LABEL_SORT_ARROW = f"/../div[2]"
IPVD_TABLE_ROWS = f"{IPVD_TABLE}/tbody/tr[not(@class=table-row-spacer)]"
IPVD_TABLE_FIRST_ITEM = f"{IPVD_TABLE}/tbody/tr[not(@class=table-row-spacer)][1]"
IPVD_TABLE_LAST_ITEM = f"{IPVD_TABLE}/tbody/tr[not(@class=table-row-spacer)][last()]"
#IPVD Pagination

IPVD_PAGINATION = f"//ipvd//nx-paginator"
IPVD_PREVIOUS_PAGE_BUTTON = f"{IPVD_PAGINATION}/a[@id=paginator-prev]"
IPVD_FIRST_PAGE_BUTTON = f"{IPVD_PAGINATION}/a[@id=paginator-tile-first]"
IPVD_LAST_PAGE_BUTTON = f"{IPVD_PAGINATION}/a[@id=paginator-tile-last]"
IPVD_NEXT_PAGE_BUTTON = f"{IPVD_PAGINATION}/a[@id=paginator-next]"
#IPVD Export

IPVD_EXPORT_TO_CSV_LINK = f"//ipvd//div[@class=export-button]/a[contains(text(), {IPVD_EXPORT_TO_CSV_TEXT})]"
#IPVD Feedback

IPVD_SUBMIT_A_REQUEST_LINK = f"{IPVD_LANDING_PAGE_TEXT}//span[@id=request]"
IPVD_SUBMIT_A_REQUEST = f"//nx-ipvd//span[contains(text(),{IPVD_SUBMIT_A_REQUEST_TEXT})]"
IPVD_SEND_DEVICE_FEEDBACK = f"//nx-ipvd//a[contains(text(),{IPVD_SEND_DEVICE_FEEDBACK_TEXT})]"
IPVD_FEEDBACK = f"//nx-modal-message-content//form[@name='messageForm']"
IPVD_FEEDBACK_TITLE = f"{IPVD_FEEDBACK}//h1"
IPVD_FEEDBACK_FORM = f"{IPVD_FEEDBACK}//form[@name=feedbackForm]"
IPVD_FEEDBACK_YOUR_NAME = f"{IPVD_FEEDBACK_FORM}//input[@id=user_name]"
IPVD_FEEDBACK_EMAIL = f"{IPVD_FEEDBACK_FORM}//input[@id=user_email]"
IPVD_FEEDBACK_MESSAGE = f"{IPVD_FEEDBACK_FORM}//textarea[@id=message]"
IPVD_FEEDBACK_PRIVACY_POLICY = f"{IPVD_FEEDBACK_FORM}//a[text()={PRIVACY_POLICY_LINK_TEXT}]"
IPVD_FEEDBACK_SEND_BUTTON = f"{IPVD_FEEDBACK}//button[text()={SEND_BUTTON_TEXT}]"
IPVD_FEEDBACK_CANCEL_BUTTON = f"{IPVD_FEEDBACK}//button[contains(text(),{CANCEL_BUTTON_TEXT})]"
IPVD_FEEDBACK_CLOSE_BUTTON = f"{IPVD_FEEDBACK}//button[contains(@class,close)]"

NOTHING_FOUND_PLACEHOLDER = f"//div[contains(@class,text-placeholder) and contains(text(),{NOTHING_FOUND})]"