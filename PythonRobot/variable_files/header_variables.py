

HEADER_TMP_USERS = []
# Variables for checking system count in drop menu

WIDTHS = [ 320, 480, 640, 800]
COLUMNS_SHOWN = [1, 2, 3, 4]
MAX_SYSTEMS_SHOWN = [5, 8, 12, 16]


# Variables for checking correct items hidden on resize
ANONYMOUS_COMMON = [ACCOUNT_DROPDOWN]
ANONYMOUS_LARGE = [SMALL ACCOUNT DROPDOWN, SMALL_ACCOUNT_DROPDOWN, SMALL_CREATE_ACCOUNT_BUTTON, HEADER_TAB_DROPDOWN]
ANONYMOUS_MEDIUM = [LARGE_ACCOUNT_DROPDOWN, LARGE_LOGIN_BUTTON, LARGE_CREATE_ACCOUNT_BUTTON, HEADER_TAB_BUTTONS]
ANONYMOUS_SMALL = [LOGO_ICON]
ANONYMOUS_TINY = [LOGO_ICON, HEADER_TAB_BUTTONS] # HEADER_TAB_DROPDOWN]
HIDE_ANONYMOUS = [ANONYMOUS_LARGE, ANONYMOUS_MEDIUM, ANONYMOUS_SMALL, ANONYMOUS_TINY]

LOGGED_IN_COMMON = [SMALL_LOGIN_BUTTON, SMALL_CREATE_ACCOUNT_BUTTON, LARGE_LOGIN_BUTTON, 
                    LARGE_CREATE_ACCOUNT_BUTTON, LARGE_LOGIN_BUTTON, LANGUAGE_DROPDOWN]

LOGGED_IN_LARGE = [SMALL_ACCOUNT_DROPDOWN]
LOGGED_IN_MEDIUM = [LARGE_ACCOUNT_DROPDOWN]
LOGGED_IN_SMALL = [LARGE_ACCOUNT_DROPDOWN]
LOGGED_IN_TINY = [LARGE_ACCOUNT_DROPDOWN, HEADER_TAB_DROPDOWN, HEADER_TAB_BUTTONS]
HIDE_LOGGED_IN = [LOGGED_IN_LARGE,LOGGED_IN_MEDIUM, LOGGED_IN_SMALL, LOGGED_IN_TINY]

BREAKPOINTS = [1920,992,786,300]

# Header

HEADER_MAIN_BUTTON_TEXT = f"{SYSTEMS_DROPDOWN}/span"
HEADER_TAB_LINK = f"//header//nx-header-tabs/li/a"
HEADER_ACTIVE_TAB_LINK = f"//header//nx-header-tabs//li[contains(@class, 'active')]/a"
VIEW_TAB = f"{HEADER_TAB_LINK}\[contains(text(), {VIEW})]"
SETTINGS_TAB = f"{HEADER_TAB_LINK}\[contains(text(), {SETTINGS_TEXT})]"
INFORMATION_TAB = f"{HEADER_TAB_LINK}\[contains(text(), {INFORMATION_TEXT})]"

# Dropdown menu

SYSTEMS_DROPDOWN_MENU = f"//nx-drop-menu/div[@aria-labelledby='systemsDropdown']"
DROPDOWN_SYSTEMS_GRID = f"{SYSTEMS_DROPDOWN_MENU}//ul/li[contains(@class, systems-grid)]"
DROPDOWN_SYSTEMS_TILE = f"{DROPDOWN_SYSTEMS_GRID}/nx-system-tile"
DROPDOWN_NAVIGATION_GRID = f"{SYSTEMS_DROPDOWN_MENU}//ul/li[contains(@class, navigation-grid)]"
DROPDOWN_NAVIGATION_TILE = f"{DROPDOWN_NAVIGATION_GRID}/nx-navigation-tile"
NAVIGATION_LINK = f"{DROPDOWN_NAVIGATION_TILE}//li[contains(@class, nav-link)]"
EXTRA_SYSTEM_TILE = f"{DROPDOWN_SYSTEMS_GRID}/nx-additional-systems-tile/div"

# For developers menu items
platform_overview = {'title':PLATFORM_OVERVIEW_TEXT,'url': ENV + "/docs/developers"}
knowlegebase = {'title':KNOWLEDGEBASE_TEXT, 'url': ENV + "/docs/developers/knowledgebase" }
FOR_DEVELOPERS_LINK = f"{DROPDOWN_NAVIGATION_TILE}//div[@class=section-title]/h5[contains(text(), {FOR_DEVELOPERS_TEXT})]"

# Services menu items
downlaods = {'title': DOWNLOADS_TEXT, 'url': ""}
ipvd = {"title": IPVD_TITLE_TEXT, "url"= ENV + "/ipvd"}
health_viewer = {"title":  HEALTH_VIEWER_TEXT, "url":ENV + "/health-report/viewer"}
integrations = {"title":INTEGRATIONS_TITLE_TEXT, "url": ENV + "/integrations"}
services_pages = [downloads , ipvd, health_viewer, integrations]

# External links

EXTERNAL_LINKS_TITLE = f"{DROPDOWN_NAVIGATION_TILE}//div[@class=section-title]/h5[contains(text(), {EXTERNAL_LINKS_TEXT})]"
EXTERNAL_LINK = f"{EXTERNAL_LINKS_TITLE}/../following-sibling::ul//a"

FOR_DEVS_EXTERNAL_LINKS = {
    DEVELOPER_TOOLS_TEXT : 'https://support.networkoptix.com/hc/en-us/sections/360007229354-Developer-Tools',
    API_DOCUMENTATION_TEXT:  'https://support.networkoptix.com/hc/en-us/articles/219573367-Nx-Server-HTTP-REST-API', 
    DEVELOPER_SUPPORT_TEXT: 'https://support.networkoptix.com/hc/en-us/community/topics/115000552988-Developer-Forum'
} 

EXTERNAL_LINKS = {
    HARDWARE_CALCULATOR: 'http://networkoptix.com/calculator/',
    SUPPORT: SUPPORT_URL + "/",
    PRIVACY_POLICY: PRIVACY_POLICY_URL_FULL
}
