
URL = f"{ENV}"
PASSWORD = f"{BASE_PASSWORD}"

HM_INFORMATION_TAB_LINK = f"//header//a[contains(text(),{INFORMATION_TEXT})]"

HM_SYSTEM_OFFLINE = f"//h2[contains(text(), {SYSTEM_OFFLINE_TEXT})]"
HM_SYSTEM_CANNOT_BE_ACCESSED = f"//div[contains(text(), {SYSTEM_CANNOT_BE_ACCESSED_TEXT})]"

HM_NO_ALERTS = f"//h2[contains(text(), {NO_ALERTS_TEXT})]"
HM_SYSTEM_DOING_WELL = f"//div[contains(text(), {SYSTEM_DOING_WELL_TEXT})]"

HM_IMPORTED_REPORT_RIBBON = f"//nx-ribbon//div[@class=message]//div[contains(text(), {VIEWING_IMPORTED_REPORT_TEXT})]"
HM_FILE_DROP_INPUT = f"//input[contains(@class,'ngx-file-drop__file-input')]"

HM_ALERTS_PAGE_LINK = f"//nx-menu//nx-level-1-item/a[@id='alerts']"
HM_SYSTEM_PAGE_LINK = f"//nx-menu//nx-level-1-item/a[@id='systems']"
HM_SERVERS_PAGE_LINK = f"//nx-menu//nx-level-1-item/a[@id='servers']"
HM_ALERTS_PAGE_LINK = f"//nx-menu//nx-level-1-item/a[@id='alerts']"
HM_CAMERAS_PAGE_LINK = f"//nx-menu//nx-level-1-item/a[@id='cameras']"
HM_STORAGES_PAGE_LINK = f"//nx-menu//nx-level-1-item/a[@id='storages']"
HM_INTERFACES_PAGE_LINK = f"//nx-menu//nx-level-1-item/a[@id='networkInterfaces']"
HM_REFRESH_REPORT = f"//div[contains(@class,'menuLinks')]/nx-health-update"
HM_DOWNLOAD_FULL_REPORT = f"//div[contains(@class,'menuLinks')]/div"

HM_ERROR_ICON = f"//*[@d='m8.7654 0.19789 0.13845 0.086751c0.17761 0.12482 0.32636 0.28537 0.43572 0.47141l6.4568 10.984c0.4228 0.71928 0.16574 1.6356-0.57416 2.0466-0.23315 0.12951-0.49703 0.19764-0.76555 0.19764h-12.914c-0.85219 0-1.543-0.67157-1.543-1.5 0-0.26104 0.070077-0.51756 0.2033-0.74421l6.4568-10.984c0.39793-0.67697 1.2563-0.93815 1.9727-0.62387l0.13253 0.06571z']"
HM_WARNING_ICON = f"//*[@d='m12 16c0 0.55228-0.44772 1-1 1h-2c-0.55228 0-1-0.44772-1-1h4zm-8-1v-1h1v-5.5c0-3.0376 2.2386-5.5 5-5.5 2.7614 0 5 2.4624 5 5.5v5.5h1v1h-12z']"

HM_TABLE = f"//div[@id='nx-table']"
HM_SINGLE_ENTITY = f"//nx-single-entity"
FIRST_CARD_HEADER = f"{HM_SINGLE_ENTITY}//header"

HM_DETAILS_PANEL = f"//nx-info-block"

HM_ALERTS_TOTAL = f"{HM_TABLE}/div[contains(@class,table-header)]"
HM_CAMERA_TABLE_ERRORS = f"{HM_TABLE}//*[name() = svg]/*[name() = title and contains(text(), Alert)]/parent::*/parent::*/parent::td/following-sibling::td[@title=Camera]"
HM_CAMERA_TABLE_WARNINGS = f"{HM_TABLE}//*[name() = svg]/*[name() = title and contains(text(), Warning)]/parent::*/parent::*/parent::td/following-sibling::td[@title=Camera]"
HM_CAMERA_CARD_ERRORS = f"//div[@class='card']/div[text()='Cameras']/following-sibling::div//div[text()='Errors']/following-sibling::nx-alert-counter//span"
HM_CAMERA_CARD_WARNINGS = f"//div[@class='card']/div[text()='Cameras']/following-sibling::div//div[text()='Warnings']/following-sibling::nx-alert-counter//span"
HM_SERVER_TABLE_OFFLINE = f"{HM_TABLE}//*[name() = svg]/*[name() = title and contains(text(), Alert)]/parent::*/parent::*/parent::td/following-sibling::td[@title=Server]"
HM_SERVER_TABLE_WARNINGS = f"{HM_TABLE}//*[name() = svg]/*[name() = title and contains(text(), Warning)]/parent::*/parent::*/parent::td/following-sibling::td[@title=Server]"
HM_SERVER_CARD_OFFLINE = f"//div[@class='card']/div[text()='Servers']/following-sibling::div//div[text()='Offline']/following-sibling::nx-alert-counter//span"
HM_SERVER_CARD_WARNINGS = f"//div[@class='card']/div[text()='Servers']/following-sibling::div//div[text()='Warnings']/following-sibling::nx-alert-counter//span"
HM_STORAGE_TABLE_ERRORS = f"{HM_TABLE}//*[name() = svg]/*[name() = title and contains(text(), Alert)]/parent::*/parent::*/parent::td/following-sibling::td[@title=Storage]"
HM_STORAGE_TABLE_WARNINGS = f"{HM_TABLE}//*[name() = svg]/*[name() = title and contains(text(), Warning)]/parent::*/parent::*/parent::td/following-sibling::td[@title=Storage]"
HM_STORAGE_CARD_ERRORS = f"//div[@class='card']/div[text()='Storage Locations']/following-sibling::div//div[text()='Errors']/following-sibling::nx-alert-counter//span"
HM_STORAGE_CARD_WARNINGS = f"//div[@class='card']/div[text()='Storage Locations']/following-sibling::div//div[text()='Warnings']/following-sibling::nx-alert-counter//span"
HM_NETWORK_INTERFACE_TABLE_ERRORS = f"{HM_TABLE}//*[name() = svg]/*[name() = title and contains(text(), Alert)]/parent::*/parent::*/parent::td/following-sibling::td[@title=Interface]"
HM_NETWORK_INTERFACE_TABLE_WARNINGS = f"{HM_TABLE}//*[name() = svg]/*[name() = title and contains(text(), Warning)]/parent::*/parent::*/parent::td/following-sibling::td[@title=Interface]"
HM_NETWORK_INTERFACE_CARD_ERRORS = f"//div[@class='card']/div[text()='Network Interfaces']/following-sibling::div//div[text()='Errors']/following-sibling::nx-alert-counter//span"
HM_NETWORK_INTERFACE_CARD_WARNINGS = f"//div[@class='card']/div[text()='Network Interfaces']/following-sibling::div//div[text()='Warnings']/following-sibling::nx-alert-counter//span"
HM_NEXT_PAGE_LINK = f"//nx-paginator//a[@id='paginator-next']"
HM_PREVIOUS_PAGE_LINK = f"//nx-paginator//a[@id='paginator-prev']"
#${HM PAGE NUMBER LINK}                   //nx-paginator//a[text()=
f"//nx-paginator//a[text()="
HM_CURRENT_PAGE_NUMBER_LINK = f"//nx-paginator//span[text()='(current)']/parent::a"
HM_FIRST_TABLE_PAGE_ELEMENT = f"//nx-paginator//a[@id='paginator-tile-first']"
HM_LAST_TABLE_PAGE_ELEMENT = f"//nx-paginator//a[@id='paginator-tile-last']"
HM_LAST_TABLE_PAGE_ELEMENT_ACTIVE = f"//nx-paginator//a[@id='paginator-tile-last' and contains(@class, 'active-page')]"
HM_ALERTS_LINK_ERRORS = f"{HM_ALERTS_PAGE_LINK}/div[2]/div[1]/nx-alert-counter/div/span"
HM_ALERTS_LINK_WARNINGS = f"{HM_ALERTS_PAGE_LINK}/div[2]/div[2]/nx-alert-counter/div/span"

HM_STORAGE_TABLE = f"//table//td[contains(@title, 'HD Witness Media')]"
HM_STORAGE_DISK = f"{HM_STORAGE_TABLE}/span[contains(text(), /HD Witness Media)]"