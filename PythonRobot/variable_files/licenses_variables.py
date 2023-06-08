
LM_HOST = f"{LM_HOSTS}[stage]"
LM_OWNER = f"licautotests+owner@gmail.com"
LM_PASSWORD = f"qweasd123"
f"admin"f"{BASE_PASSWORD}"
f"{LM_OWNER}"f"{LM_PASSWORD}"
f"{LM_OWNER}"f"{BASE_PASSWORD}"

LM_USERS = [
    "cloudAdmin=licautotests+admin@gmail.com",
    "viewer=licautotests+viewer@gmail.com",
    "advancedViewer=licautotests+adviewer@gmail.com",
    "custom=licautotests+custom@gmail.com",
    "liveViewer=licautotests+liveviewer@gmail.com"
]

LM_HOSTS =[
    "prod=https://licensing.vmsproxy.com", 
    "stage=https://nxlicensed.hdw.mx",
    "test=https://nxlicensed.test.hdw.mx"
]
LIC_TYPES = [
    "digital=Professional",
    "analogencoder=Analog Encoder",
    "iomodule=IO Module",
    "starter=Starter",
    "videowall=Video Wall",
    "vmax=VMAX",
    "bridge=Bridge",
    "nvr=NVR"
]

TRIAL_LICENSE = f"0000-0000-0000-0005"
LICENSES_LINK = f"//a[@id='licenses']"

# System is offline

THIS_PAGE_CANNOT_BE_LOADED = f"//h2[@name=NO_SETTINGS and contains(text(), {THIS_PAGE_CANNOT_BE_LOADED_TEXT})]"
MAKE_SURE_SERVERS_ARE_ONLINE = f"//div[@name=NO_SETTINGS and contains(text(), {MAKE_SURE_SERVERS_ARE_ONLINE_TEXT})]"

# New License block

NEW_LICENSE_HEADER = f"//h4[contains(text(), {NEW_LICENSE_TEXT})]"
NEW_LICENSE_FORM = f"//form[@id='newLicenseForm']"
LICENSE_KEY_INPUT = f"{NEW_LICENSE_FORM}//label[contains(text(), {LICENSE_KEY_TEXT})]/following-sibling::div//input[@id=licenseKey]"
FORMATTED_KEY = f"{NEW_LICENSE_FORM}//span[@id=formattedKey]"
BIND_TO_SERVER_DROPDOWN = f"{NEW_LICENSE_FORM}//label[contains(text(), {BIND_TO_SERVER_TEXT})]/following-sibling::div//button[@id=bindToServer]"
SERVER_MUST_BE_AVAILABLE = f"{NEW_LICENSE_FORM}//div[contains(text(), {SERVER_MUST_BE_AVAILABLE_TEXT})]"
ACTIVATE_BUTTON = f"//button[contains(text(), 'Activate')]"

# Activate Trial block

ACTIVATE_TRIAL_FORM = f"//form[@id='trialLicenseForm']"
ACTIVATE_TRIAL_TEXT = f"{ACTIVATE_TRIAL_FORM}//div/div[contains(text(), {YOU_HAVE_UNUSED_TRIAL_LICENSE_TEXT})]/following-sibling::div[contains(text(), {ONCE_ACTIVATED_TEXT})]"
ACTIVATE_TRIAL_BUTTON = f"//button[contains(text(), 'Activate Trial License')]"

# License Summary block

LICENSES_SUMMARY_BLOCK = f"//nx-license-summary-component//div[@class='card']"
LICENSES_SUMMARY_HEADER = f"{LICENSES_SUMMARY_BLOCK}//h4[contains(text(), {LICENSES_SUMMARY_TEXT})]"
LICENSES_SUMMARY_THEAD = f"{LICENSES_SUMMARY_BLOCK}//table/thead/tr/th[contains(text(), {TYPE_TEXT})]/following-sibling::th[contains(text(), {CHANNELS_TEXT})]/following-sibling::th[contains(text(), {AVAILABLE_TEXT})]"
LICENSES_SUMMARY_TBODY = f"{LICENSES_SUMMARY_BLOCK}//table/tbody"
LICENSES_SUMMARY_RECORD = f"{LICENSES_SUMMARY_TBODY}/tr[contains(@class, inserted)]"

# License Detail block

LICENSE_DETAIL_BLOCK = f"//nx-license-detail-component/nx-block"
FIRST_LICENSE = f"{LICENSE_DETAIL_BLOCK}//header/h4[1]"
#${LICENSE TYPE}               ${LICENSE INFO}/p[contains(@title, "Type")]
#${LICENSE CHANNELS}           ${LICENSE INFO}/p[contains(@title, "Channels")]
#${LICENSE SERVER}             ${LICENSE INFO}/p[contains(@title, "Server")]
#${LICENSE HWID}               ${LICENSE INFO}/p[contains(@title, "Hardware ID")]
#${LICENSE STATUS}             ${LICENSE INFO}/p[contains(@title, "Status")]
#${LICENSE EXPIRES}            ${LICENSE INFO}/p[contains(@title, "Expires")]
#${LICENSE DEACT LEFT}         ${LICENSE INFO}/p[contains(@title, "Deactivation left")]
