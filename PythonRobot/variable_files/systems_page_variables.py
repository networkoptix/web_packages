
SYSTEMS_HEADER = f"//h1/span[contains(text(), {SYSTEMS_TITLE_TEXT})]"
SYSTEMS_LIST = f"//nx-systems-list-component"
SYSTEMS_LIST_BUTTONS = f"{SYSTEMS_LIST}//div[contains(@class, system-button)]"
SYSTEMS_SEARCH_INPUT = f"{SYSTEMS_LIST}//div[contains(@class,search-block)]//input"
SYSTEM_SEARCH_X_BUTTON = f"{SYSTEMS_SEARCH_INPUT}//following-sibling::button[contains(@class,search-clear)]"
YOU_HAVE_NO_SYSTEMS = f"//span[contains(text(),{YOU_HAVE_NO_SYSTEMS_TEXT})]"