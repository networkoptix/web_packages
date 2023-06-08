
EMAIL = f"{EMAIL_OWNER}"
PASSWORD = f"{BASE_PASSWORD}"
cloud_auth = [EMAIL_OWNER, BASE_PASSWORD]
URL = f"{ENV}"
IMPOSSIBLE_SEARCH = f"velociraptor"
NOTHING_FOUND = f"Nothing found"
SIMPLE_CRITERIA = f"s"
AND_CRITERIA = f"s a"
OR_CRITERIA = f"s|a"

#Systems - left menu

LEFT_MENU = f"//nx-menu"
LEFT_MENU_BUTTONS = f"{LEFT_MENU}//div[contains(@class, nx-menu-section)]//nx-menu-button"
LEFT_MENU_OVERLAY = f"{LEFT_MENU}/div[contains(@class,nx-menu)]/div[contains(@class,nx-menu-overlay)]"
LEFT_MENU_NO_RESULT = f"{LEFT_MENU}/div[contains(@class,nx-menu)]/div[contains(@class,nx-menu-placeholder)]"
LEFT_MENU_SEARCH_INPUT = f"{LEFT_MENU}/nx-search//input"
LEFT_MENU_SEARCH_CLEAR = f"{LEFT_MENU}/nx-search//button[contains(@class,search-clear)]"
LEFT_MENU_MATCHES_CONTENT = f"{LEFT_MENU}//div[contains(@class, nx-menu-section)]//div[contains(@class, level-3-items)]//div[contains(@class, menu-level-3-content)]"
LEFT_MENU_SEARCH_MATCHES = f"{LEFT_MENU}//div[contains(@class, nx-menu-section)]//span[@class=highlighted]"

LEFT_MENU_LEVEL1_ADMIN = f"{LEFT_MENU}//nx-level-1-item/a[@id=admin]"
LEFT_MENU_LEVEL1_ICON = f"{LEFT_MENU_LEVEL1_ADMIN}//svg-icon"
LEFT_MENU_LEVEL3_GENERAL = f"{LEFT_MENU_LEVEL1_ADMIN}/../..//nx-level-3-item/a[@id=general]"
LEFT_MENU_LEVEL3_LIC = f"//*[@id='licenses']//span[contains(text(),'Licen')]"
LEFT_MENU_LEVEL3_STORAGE = f"{LEFT_MENU_LEVEL1_ADMIN}/../..//nx-level-3-item/a[@id=cloudStorage]"

LEFT_MENU_LEVEL1_USERS = f"{LEFT_MENU}//nx-level-1-item/a[@id=users]"
LEFT_MENU_LEVEL3_USER1 = f"{LEFT_MENU_LEVEL1_USERS}/../..//div[1]/nx-level-3-item/a"
LEFT_MENU_LEVEL3_USER1_EXT = f"{LEFT_MENU_LEVEL3_USER1}//span[contains(@class, menu-level-3-additional)]"
LEFT_MENU_LEVEL3_USER2 = f"{LEFT_MENU_LEVEL1_USERS}/../..//div[2]/nx-level-3-item/a"
LEFT_MENU_LEVEL3_USER2_EXT = f"{LEFT_MENU_LEVEL3_USER2}//span[contains(@class, menu-level-3-additional)]"

LEFT_MENU_LEVEL1_SERVERS = f"{LEFT_MENU}//nx-level-1-item/a[@id=servers]"
