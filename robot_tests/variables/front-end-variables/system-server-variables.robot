*** Variables ***
${SERVERS LINK}                     //nx-menu//a[@id="servers"]
${SERVER NAME}                      //header//h2
${IP}                               //header//p[contains(text(),"${IP TEXT}")]
${OS}                               //header//p[contains(text(),"${OS TEXT}")]
${VERSION}                          //header//p[contains(text(),"${VERSION TEXT}")]
${PORT INPUT}                       //div/span[contains(text(),"${PORT TEXT}")]/following-sibling::input[@type="number"]
${PORT TOO LOW ERROR}               //nx-apply//div[contains(@class,"warning-text") and contains(text(),"${PORT TOO LOW TEXT}")]
${PORT INPUT}                       //div/span[contains(text(),"${PORT TEXT}")]/following-sibling::input
${CHECK STATUS BUTTON}              //header//button/span[contains(text(),"${CHECK STATUS TEXT}")]/..
${SERVER DETAILED INFO BUTTON}      //div[contains(@class, "server-info")]//header//button/span[contains(text(),"${DETAILED INFO TEXT}")]/..
${RENAME SERVER BUTTON}             //nx-section//button/span[contains(text(),"${RENAME}")]/..
${RESTART SERVER BUTTON}            //nx-section//button/span[contains(text(),"${RESTART}")]/..
${RESTART SERVER FORM}              //form[@name="restartServerForm"]
${RESTART DIALOG CLOSE BUTTON}      ${RESTART SERVER FORM}//button[contains(@class,"close")]
${RESTART DIALOG CANCEL BUTTON}     ${RESTART SERVER FORM}//button[contains(text(),"${CANCEL BUTTON TEXT}")]
${RESTART DIALOG RESTART BUTTON}    ${RESTART SERVER FORM}//button[@type="submit"]
${RESTARTING BADGE}                 //header//span[contains(@class, "tag") and contains(text(),"${RESTARTING}")]
${RESET SERVER TO DEFAULTS}         //nx-section//button/span[contains(text(),"${RESET TO DEFAULTS TEXT}")]/..
${RENAME SERVER FORM}               //form[@name="renameServerForm"]
${RENAME SAVE BUTTON}               ${RENAME SERVER FORM}//button[contains(text(),"${SAVE BUTTON TEXT}")]
${RENAME CANCEL BUTTON}             ${RENAME SERVER FORM}//button[contains(text(),"${CANCEL BUTTON TEXT}")]
${RENAME CLOSE BUTTON}              ${RENAME SERVER FORM}//button[contains(@class,"close")]
${RENAME SERVER INPUT}              ${RENAME SERVER FORM}//input[@id="serverName"]
${RENAME ERROR TEXT}                ${RENAME SERVER INPUT}/following-sibling::p/span[contains(@class,"input-error")]

${ANALYTICS DROPDOWN}               //div[@class="server-settings"]/span[contains(text(), "${ANALYTICS STORAGE}")]/following-sibling::nx-select//button
${ANALYTICS WARNING}                //div[@class='server-settings']/div[contains(@class, 'error-label')]/p[contains(text(), "${ANALYTICS WARNING TEXT}")]
${CHANGE ANALYTICS MODAL}           //nx-modal-change-storage/form[@id="changeStorageForm"]
${CS MODAL CLOSE BUTTON}            ${CHANGE ANALYTICS MODAL}/div[@class="modal-header"]/button
${CS MODAL DELETE BUTTON}           ${CHANGE ANALYTICS MODAL}/div[contains(@class, "modal-footer")]/nx-process-button//button[contains(text(), "${DELETE BUTTON TEXT}")]
${CS MODAL KEEP BUTTON}             ${CHANGE ANALYTICS MODAL}/div[contains(@class, "modal-footer")]/nx-process-button//button[contains(text(), "${KEEP BUTTON TEXT}")]
${CS MODAL CANCEL BUTTON}           ${CHANGE ANALYTICS MODAL}/div[contains(@class, "modal-footer")]/nx-cancel-button//button

${STORAGE LOCATIONS BLOCK}          //nx-block/div[contains(@class, "storage-info")]
${STORAGE INFO BUTTON}              ${STORAGE LOCATIONS BLOCK}//header//button/span[contains(text(), "${DETAILED INFO TEXT}")]/..
${STORAGE LOCATIONS TABLE}          ${STORAGE LOCATIONS BLOCK}//nx-section//form[@name="storageSettings"]
${STORAGE RESERVED MODE}            ${STORAGE LOCATIONS TABLE}//tbody/tr/td[2]/div[contains(@class, "disabled-label")]/span[contains(text(), "${RESERVED}")]
${STORAGE INACCESSIBLE MODE}        ${STORAGE LOCATIONS TABLE}//tbody/tr/td[2]/div[contains(@class, "disabled-label")]/span[contains(text(), "${INACCESSIBLE}")]
${STORAGE CHANGING MODE}            ${STORAGE LOCATIONS TABLE}//tbody/tr/td[2]/div[contains(@class, "disabled-label")]/span[contains(text(), "${CHANGING}")]
${STORAGE DROPDOWN}                 ${STORAGE LOCATIONS TABLE}//tbody/tr/td[2]//nx-select
${STORAGE MAIN MODE}                ${STORAGE DROPDOWN}//span[contains(text(), "${MAIN}")]
${STORAGE BACKUP MODE}              ${STORAGE DROPDOWN}//span[contains(text(), "${BACKUP}")]
${STORAGE NOT IN USE MODE}          ${STORAGE DROPDOWN}//span[contains(text(), "${NOT IN USE}")]
${STORAGE MAIN MENU ITEM}           ${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li//span[contains(text(), "${MAIN}")]/parent::a
${STORAGE BACKUP MENU ITEM}         ${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li//span[contains(text(), "${BACKUP}")]/parent::a
${STORAGE NOT IN USE MENU ITEM}     ${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li//span[contains(text(), "${NOT IN USE}")]/parent::a
${STORAGE SYSTEM TOOLTIP}           //ngb-tooltip-window//div[contains(text(), "${RESERVED SYSTEM TOOLTIP}")]
${STORAGE NONSYSTEM TOOLTIP}        //ngb-tooltip-window//div[contains(text(), "${RESERVED NONSYSTEM TOOLTIP}")]
${STORAGE LOCATIONS FIRST ROW}      ${STORAGE LOCATIONS TABLE}//tbody//tr[2]
${STORAGE LOCATIONS FIRST SPACE}    ${STORAGE LOCATIONS FIRST ROW}/td[3]/nx-storage-size-component/div[@class="container"]

${STORAGE ADD BUTTON}               ${STORAGE LOCATIONS BLOCK}//nx-section//button[contains(text(), "${ADD EXTERNAL STORAGE}")]
${ADD STORAGE MODAL}                //nx-modal-add-storage/form[@id="addStorageForm"]
${AS MODAL CLOSE BUTTON}            ${ADD STORAGE MODAL}/div[@class="modal-header"]/button
${AS MODAL URL INPUT}               ${ADD STORAGE MODAL}/div[contains(@class, "modal-body")]//input[@id="addUrl"]
${AS MODAL URL INPUT ERROR}         ${ADD STORAGE MODAL}/div[contains(@class, "modal-body")]//input[@id="addUrl" and contains(@class, "ng-invalid")]
${AS MODAL URL REQUIRED}            ${AS MODAL URL INPUT}/parent::div/following-sibling::div/span[contains(text(), "${URL REQUIRED TEXT}")]
${AS MODAL URL INVALID}             ${AS MODAL URL INPUT}/parent::div/following-sibling::div/span[contains(text(), "${INVALID URL TEXT}")]
${AS MODAL URL NOT INVALID}         ${ADD STORAGE MODAL}/div[contains(@class, "modal-body")]//input[@id="addUrl" and not(contains(@class, "ng-invalid"))]
${AS MODAL LOGIN INPUT}             ${ADD STORAGE MODAL}/div[contains(@class, "modal-body")]//input[@id="addLogin"]
${AS MODAL LOGIN INPUT ERROR}       ${ADD STORAGE MODAL}/div[contains(@class, "modal-body")]//input[@id="addLogin" and contains(@class, "ng-invalid")]
${AS MODAL LOGIN REQUIRED}          ${AS MODAL LOGIN INPUT}/parent::div/following-sibling::div/span[contains(text(), "${LOGIN IS REQUIRED TEXT}")]
${AS MODAL PASSWORD INPUT}          ${ADD STORAGE MODAL}/div[contains(@class, "modal-body")]//input[@id="addPassword"]
${AS MODAL PASSWORD INPUT ERROR}    ${ADD STORAGE MODAL}/div[contains(@class, "modal-body")]//input[@id="addPassword" and contains(@class, "ng-invalid")]
${AS MODAL PASSWORD REQUIRED}       ${AS MODAL PASSWORD INPUT}/parent::div/following-sibling::div/span[contains(text(), "${PASSWORD IS REQUIRED TEXT}")]
${AS MODAL PASSWORD INVALID}        ${AS MODAL PASSWORD INPUT}/parent::div/following-sibling::div/span[contains(text(), "${LOGIN OR PASSWORD INCORRECT TEXT}")]
${AS MODAL SUBMIT BUTTON}           ${ADD STORAGE MODAL}/div[contains(@class, "modal-footer")]/nx-process-button//button
${AS MODAL CANCEL BUTTON}           ${ADD STORAGE MODAL}/div[contains(@class, "modal-footer")]/nx-cancel-button//button
${AS FAILED TO ADD TOAST}           //app-toasts//ngb-toast/div[@class="toast-body"]/span[contains(text(), "${FAILED TO ADD STORAGE TEXT}")]

${STORAGE REINDEXING BLOCK}         //nx-block//div[contains(@class, "reindex-container")]
${STORAGE REINDEX MAIN BUTTON}      ${STORAGE REINDEXING BLOCK}//button[contains(text(), "${REINDEX MAIN STORAGE TEXT}")]
${STORAGE REINDEX BACKUP BUTTON}    ${STORAGE REINDEXING BLOCK}//button[contains(text(), "${REINDEX BACKUP STORAGE TEXT}")]
${STORAGE REINDEX TOOLTIP}          ${STORAGE REINDEXING BLOCK}//div[contains(@class, "tooltip-inner")]/p[contains(text(), "${REINDEX TOOLTIP FIRST}")]
${STORAGE REINDEXING MAIN}          ${STORAGE REINDEXING BLOCK}//section[@id="reindex-main"]//div[contains(text(), "${REINDEXING MAIN}")]
${REINDEXING MAIN PERCENT}          ${STORAGE REINDEXING MAIN}/following-sibling::span
${REINDEXING MAIN CANCEL BUTTON}    ${STORAGE REINDEXING BLOCK}//section[@id="reindex-main"]/button[contains(text(), "${CANCEL BUTTON TEXT}")]
${STORAGE REINDEXING BACKUP}        ${STORAGE REINDEXING BLOCK}//section[@id="reindex-backup"]//div[contains(text(), "${REINDEXING BACKUP}")]
${REINDEXING BACKUP PERCENT}        ${STORAGE REINDEXING BACKUP}/following-sibling::span
${REINDEXING MAIN CANCEL BUTTON}    ${STORAGE REINDEXING BLOCK}//section[@id="reindex-backup"]/button[contains(text(), "${CANCEL BUTTON TEXT}")]

${CLOUD STORAGE INFO BLOCK}         //nx-cloud-storage/nx-block//h2[contains(text(), "${CLOUD STORAGE TITLE}")]/..

${SERVER NOT ACCESIBLE IMAGE}       //div[contains(@class,"placeholder-icon") and @name="NO_SETTINGS"]
${OFFLINE BADGE}                    //header//h2/following-sibling::span[contains(text(),"${AUTOTESTS OFFLINE TEXT}")]
${CHECKING BADGE}                   //nx-server-component//h4//span[contains(text(),"${CHECKING TEXT}")]

# ADVANCED
# Storage Locations Block
${STORAGE LOCATIONS TITLE}          //h4[text()="${STORAGE LOCATIONS TEXT}"]
${RESERVED SPACE INPUT}             //input[@id="reservedSpace0"]   
${RESERVED SPACE DROPDOWN}          //select[@id="reservedSpaceUnit0"]
${RESERVED DROPDOWN SELECTED}       ${RESERVED SPACE DROPDOWN}//option[@selected]
${RESERVED DROPDOWN OPTION GB}      ${RESERVED SPACE DROPDOWN}//option[@value='GB']
${RESERVED DROPDOWN OPTION TB}      ${RESERVED SPACE DROPDOWN}//option[@value='TB']
${STORAGE ENABLE SWITCH}            //div[@id='isUsedForWriting0']
@{STORAGE LOCATIONS BLOCK}
...    ${STORAGE LOCATIONS TITLE}
...    ${RESERVED SPACE INPUT}
...    ${RESERVED SPACE DROPDOWN}
...    ${STORAGE ENABLE SWITCH}
${STORAGE ENABLE SWITCH STYLE}     ${STORAGE ENABLE SWITCH}//span[@class='slider round']
${STORAGE SWITCH ENABLED COLOR}    rgba(58, 145, 30, 1)
${STORAGE SWITCH DISABLED COLOR}   rgba(185, 199, 206, 1) 
${STORAGE FREE SPACE VALUE}        //td[@title='/recordings/HD Witness Media']//following-sibling::td[2]

# Log settings block
${LOG SETTINGS TITLE}               //h4[text()="${LOG SETTINGS TEXT}"]
${EC2_TRAN LOG LEVEL DROPDOWN}      //button[@id="EC2_TRAN"]
${HTTP LOG LEVEL DROPDOWN}          //button[@id="HTTP"]
${HWID LOG LEVEL DROPDOWN}          //button[@id="HWID"]
${MAIN LOG LEVEL DROPDOWN}          //button[@id="MAIN"]
${PERMISSIONS LOG LEVEL DROPDOWN}   //button[@id="PERMISSIONS"]
@{LOG SETTINGS BLOCK}
...    ${LOG SETTINGS TITLE}
...    ${EC2_TRAN LOG LEVEL DROPDOWN} 
...    ${HTTP LOG LEVEL DROPDOWN}
...    ${HWID LOG LEVEL DROPDOWN}
...    ${MAIN LOG LEVEL DROPDOWN}
...    ${PERMISSIONS LOG LEVEL DROPDOWN}
@{LOGLEVEL IDS}
...    ${EC2_TRAN LOG LEVEL DROPDOWN} 
...    ${HTTP LOG LEVEL DROPDOWN}
...    ${HWID LOG LEVEL DROPDOWN}
...    ${MAIN LOG LEVEL DROPDOWN}
...    ${PERMISSIONS LOG LEVEL DROPDOWN}    
@{LOGLEVEL OPTIONS}
...    ${NONE TEXT}
...    ${ERROR TEXT}
...    ${WARNING TEXT}
...    ${INFO TEXT}
...    ${DEBUG TEXT}
...    ${VERBOSE TEXT}

${STORAGE SAVE BUTTON}             ${STORAGE LOCATIONS TITLE}//ancestor::div[@class='card--header']//following-sibling::nx-section[@class='ng-star-inserted']//button[text()='${SAVE BUTTON TEXT}']
${STORAGE CANCEL BUTTON}           ${STORAGE LOCATIONS TITLE}//ancestor::div[@class='card--header']//following-sibling::nx-section[@class='ng-star-inserted']//button[text()='${CANCEL BUTTON TEXT}']
${LOG SAVE BUTTON}                 ${LOG SETTINGS TITLE}//ancestor::div[@class='card']//button[text()='${SAVE BUTTON TEXT}']

