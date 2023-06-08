
CHANGE_OWNERSHIP_LINK = f"//a[@id='change-ownership']"
OWNERSHIP_TRANSFER_FORM = f"//form[@name='transferOwnershipForm']"
OWNERSHIP_TRANSFER_INPUT = f"{OWNERSHIP_TRANSFER_FORM}//span[@id=search-input]"
OWNERSHIP_TRANSFER_DROPDOWN = f"{OWNERSHIP_TRANSFER_FORM}//button[@data-toggle=dropdown]"
OWNERSHIP_TRANSFER_WARNING = f"{OWNERSHIP_TRANSFER_FORM}//div[contains(text(),{WARNING_CAPS})]/..//span[contains(text(),{OT_WARNING_TEXT})]"
OWNERSHIP_TRANSFER_SEND_REQUEST = f"{OWNERSHIP_TRANSFER_FORM}//button[@type=submit]"
OWNERSHIP_TRANSFER_CANCEL = f"{OWNERSHIP_TRANSFER_FORM}//button[@type=reset]"
OWNERSHIP_TRANSFER_CLOSE = f"{OWNERSHIP_TRANSFER_FORM}//button[@aria-label=Close]"
OWNERSHIP_TRANSFER_SENT = f"{OWNERSHIP_TRANSFER_FORM}//p[@id=request-sent and contains(text(), {REQUEST_SENT_TEXT})]/..//p[contains(text(), {REQUEST_SENT_EXPLANATION_TEXT})]"
OWNERSHIP_TRANSFER_OK = f"{OWNERSHIP_TRANSFER_FORM}//button[contains(text(), {OK_TEXT})]"
OWNERSHIP_TRANSFER_IN_PROGRESS = f"//span[contains(text(), {TRANSFERRING_OWNERSHIP_TO_TEXT})]"
OWNERSHIP_TRANSFER_IN_PROGRESS_CANCEL = f"//a[@id='cancel-transfers']"
OWNERSHIP_TRANSFER_WANTS_TO = f"//span[contains(text(), {WANTS_TO_TRANSFER_TEXT})]"
OWNERSHIP_TRANSFER_ACCEPT = f"//button[contains(text(), {ACCEPT_TEXT})]"
OWNERSHIP_TRANSFER_REJECT = f"//button[contains(text(), {REJECT_TEXT})]"
ACCESS_LEVEL = f"//span[@id='accessLevelText']/../span[@class='name']"
SYSTEM_OWNER = f"//span[contains(@class, 'system-owner')]"

ACCESS_LEVELS = {
    'cloudAdmin': 'Administrator',
    'advancedViewer': 'Advanced Viewer',
    'viewer': 'Viewer',
    'liveViewer': 'Live viewer',
    'custom': 'Custom'
}

