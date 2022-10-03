*** Variables ***
${url}    ${ENV}
${password}    ${BASE PASSWORD}

${HM INFORMATION TAB LINK}               //header/nav//a[text()="${INFORMATION TEXT}"]

${HM SYSTEM OFFLINE}                     //h2[contains(text(), "${SYSTEM OFFLINE TEXT}")]
${HM SYSTEM CANNOT BE ACCESSED}          //div[contains(text(), "${SYSTEM CANNOT BE ACCESSED TEXT}")]

${HM NO ALERTS}                          //h2[contains(text(), "${NO ALERTS TEXT}")]
${HM SYSTEM DOING WELL}                  //div[contains(text(), "${SYSTEM DOING WELL TEXT}")]

${HM IMPORTED REPORT RIBBON}             //nx-ribbon//div[@class="message"]//div[contains(text(), "${VIEWING IMPORTED REPORT TEXT}")]
${HM FILE DROP INPUT}                    //input[contains(@class,"ngx-file-drop__file-input")]

${HM ALERTS PAGE LINK}                   //nx-menu//nx-level-1-item/a[@id="alerts"]
${HM SYSTEM PAGE LINK}                   //nx-menu//nx-level-1-item/a[@id="systems"]
${HM SERVERS PAGE LINK}                  //nx-menu//nx-level-1-item/a[@id="servers"]
${HM ALERTS PAGE LINK}                   //nx-menu//nx-level-1-item/a[@id="alerts"]
${HM CAMERAS PAGE LINK}                  //nx-menu//nx-level-1-item/a[@id="cameras"]
${HM STORAGES PAGE LINK}                  //nx-menu//nx-level-1-item/a[@id="storages"]
${HM INTERFACES PAGE LINK}       //nx-menu//nx-level-1-item/a[@id="networkInterfaces"]
${HM REFRESH REPORT}                     //div[contains(@class,"menuLinks")]/nx-health-update
${HM DOWNLOAD FULL REPORT}               //div[contains(@class,"menuLinks")]/div

${HM ERROR ICON}                         //*[@d="m8.7654 0.19789 0.13845 0.086751c0.17761 0.12482 0.32636 0.28537 0.43572 0.47141l6.4568 10.984c0.4228 0.71928 0.16574 1.6356-0.57416 2.0466-0.23315 0.12951-0.49703 0.19764-0.76555 0.19764h-12.914c-0.85219 0-1.543-0.67157-1.543-1.5 0-0.26104 0.070077-0.51756 0.2033-0.74421l6.4568-10.984c0.39793-0.67697 1.2563-0.93815 1.9727-0.62387l0.13253 0.06571z"]
${HM WARNING ICON}                       //*[@d="m12 16c0 0.55228-0.44772 1-1 1h-2c-0.55228 0-1-0.44772-1-1h4zm-8-1v-1h1v-5.5c0-3.0376 2.2386-5.5 5-5.5 2.7614 0 5 2.4624 5 5.5v5.5h1v1h-12z"]

${HM TABLE}                              //div[@id="nx-table"]
${HM SINGLE ENTITY}                      //nx-single-entity
${FIRST CARD HEADER}                     ${HM SINGLE ENTITY}//header

${HM DETAILS PANEL}                      //nx-info-block

${HM ALERTS TOTAL}                       ${HM TABLE}/div[contains(@class,"table-header")]
${HM CAMERA TABLE ERRORS}                ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Alert")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Camera"]
${HM CAMERA TABLE WARNINGS}              ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Warning")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Camera"]
${HM CAMERA CARD ERRORS}                 //div[@class="card"]/div[text()="Cameras"]/following-sibling::div//div[text()="Errors"]/following-sibling::nx-alert-counter//span
${HM CAMERA CARD WARNINGS}               //div[@class="card"]/div[text()="Cameras"]/following-sibling::div//div[text()="Warnings"]/following-sibling::nx-alert-counter//span
${HM SERVER TABLE OFFLINE}               ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Alert")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Server"]
${HM SERVER TABLE WARNINGS}              ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Warning")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Server"]
${HM SERVER CARD OFFLINE}                //div[@class="card"]/div[text()="Servers"]/following-sibling::div//div[text()="Offline"]/following-sibling::nx-alert-counter//span
${HM SERVER CARD WARNINGS}               //div[@class="card"]/div[text()="Servers"]/following-sibling::div//div[text()="Warnings"]/following-sibling::nx-alert-counter//span
${HM STORAGE TABLE ERRORS}               ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Alert")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Storage"]
${HM STORAGE TABLE WARNINGS}             ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Warning")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Storage"]
${HM STORAGE CARD ERRORS}                //div[@class="card"]/div[text()="Storage Locations"]/following-sibling::div//div[text()="Errors"]/following-sibling::nx-alert-counter//span
${HM STORAGE CARD WARNINGS}              //div[@class="card"]/div[text()="Storage Locations"]/following-sibling::div//div[text()="Warnings"]/following-sibling::nx-alert-counter//span
${HM NETWORK INTERFACE TABLE ERRORS}     ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Alert")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Interface"]
${HM NETWORK INTERFACE TABLE WARNINGS}   ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Warning")]/parent::*/parent::*/parent::td/following-sibling::td[@title="Interface"]
${HM NETWORK INTERFACE CARD ERRORS}      //div[@class="card"]/div[text()="Network Interfaces"]/following-sibling::div//div[text()="Errors"]/following-sibling::nx-alert-counter//span
${HM NETWORK INTERFACE CARD WARNINGS}    //div[@class="card"]/div[text()="Network Interfaces"]/following-sibling::div//div[text()="Warnings"]/following-sibling::nx-alert-counter//span
${HM NEXT PAGE LINK}                     //ngb-pagination//a[@aria-label="Next"]
${HM PREVIOUS PAGE LINK}                 //ngb-pagination//a[@aria-label="Previous"]
${HM PAGE NUMBER LINK}                   //ngb-pagination//a[text()=
${HM CURRENT PAGE NUMBER LINK}           //ngb-pagination//span[text()="(current)"]/parent::a
${HM FIRST TABLE PAGE ELEMENT}           //ngb-pagination//a[@aria-label="Previous" and @tabindex="-1"]
${HM LAST TABLE PAGE ELEMENT}            //ngb-pagination//a[@aria-label="Next" and @tabindex="-1"]
${HM ALERTS LINK ERRORS}                 ${HM ALERTS PAGE LINK}/div[2]/div[1]/nx-alert-counter/div/span
${HM ALERTS LINK WARNINGS}               ${HM ALERTS PAGE LINK}/div[2]/div[2]/nx-alert-counter/div/span

${HM STORAGE TABLE}                      //table//td[contains(@title, "HD Witness Media")]
${HM STORAGE DISK}                       ${HM STORAGE TABLE}/span[contains(text(), "/HD Witness Media")]