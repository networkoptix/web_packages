*** Variables ***
${password}                         ${BASE PASSWORD}
${url}                              ${ENV}
@{server auth}                      admin    ${password}

${SERVERS LINK}                     //nx-menu//a[@id="servers"]
${SERVER NAME}                      //header//nx-text-editable
${IP}                               //header//p[contains(text(),"${IP TEXT}")]
${OS}                               //header//p[contains(text(),"${OS TEXT}")]
${VERSION}                          //header//p[contains(text(),"${VERSION TEXT}")]
${PORT INPUT}                       //div/span[contains(text(),"${PORT TEXT}")]/..//input[@type="number"]
${SERVER PORT IS REQUIRED ERROR}    //div/span[contains(@class,"input-error") and contains(text(),"${SERVER PORT IS REQUIRED TEXT}")]
${PORT TOO LOW ERROR}               //nx-apply//div[contains(@class,"warning-text") and contains(text(),"${PORT TOO LOW TEXT}")]
${PORT INPUT}                       //div/span[contains(text(),"${PORT TEXT}")]/following-sibling::input
${CHECK STATUS BUTTON}              //nx-alert-block//button/span[contains(text(),"${CHECK STATUS TEXT}")]/..
${SERVER DETAILED INFO BUTTON}      //div[contains(@class, "server-info")]//header//button/span[contains(text(),"${DETAILED INFO TEXT}")]/..
${SERVER 1 LIST MENU NAME}          //nx-level-3-item//a//span[contains(text(),"server 1")]
${SERVER OFFLINE ALERT}             //nx-alert-block//span[contains(text(),'${SERVER OFFLINE TEXT}')]
${RENAME SERVER BUTTON}             //nx-section//button/span[contains(text(),"${RENAME}")]/..
${RESTART SERVER BUTTON}            //nx-section//button/span[contains(text(),"${RESTART}")]/..
${RESTART SERVER FORM}              //nx-modal-restart-server-content
${RESTART DIALOG CLOSE BUTTON}      ${RESTART SERVER FORM}//button[contains(@class,"close")]
${RESTART DIALOG CANCEL BUTTON}     ${RESTART SERVER FORM}//button[contains(text(),"${CANCEL BUTTON TEXT}")]
${RESTART DIALOG RESTART BUTTON}    ${RESTART SERVER FORM}//button[@type="submit"]
${RESTARTING BANNER}                //nx-alert-block//span[contains(text(),"${RESTARTING}")]
${RESET SERVER TO DEFAULTS}         //nx-section//button/span[contains(text(),"${RESET TO DEFAULTS TEXT}")]/..
${RENAME SERVER FORM}               //form[@name="renameServerForm"]
${RENAME SAVE BUTTON}               ${RENAME SERVER FORM}//button[contains(text(),"${SAVE BUTTON TEXT}")]
${RENAME CANCEL BUTTON}             ${RENAME SERVER FORM}//button[contains(text(),"${CANCEL BUTTON TEXT}")]
${RENAME CLOSE BUTTON}              ${RENAME SERVER FORM}//button[contains(@class,"close")]
${RENAME SERVER INPUT}              ${RENAME SERVER FORM}//input[@id="serverName"]
${RENAME ERROR TEXT}                ${RENAME SERVER INPUT}/following-sibling::p/span[contains(@class,"input-error")]

${ANALYTICS DROPDOWN}               //button[@id="system"]
${ANALYTICS WARNING}                //p[contains(text(), "${ANALYTICS WARNING TEXT}")]
${CHANGE ANALYTICS MODAL}           //nx-modal-change-storage/form[@id="changeStorageForm"]
${CS MODAL CLOSE BUTTON}            ${CHANGE ANALYTICS MODAL}/div[@class="modal-header"]/button
${CS MODAL DELETE BUTTON}           ${CHANGE ANALYTICS MODAL}/div[contains(@class, "modal-footer")]/nx-process-button//button[contains(text(), "${DELETE BUTTON TEXT}")]
${CS MODAL KEEP BUTTON}             ${CHANGE ANALYTICS MODAL}/div[contains(@class, "modal-footer")]/nx-process-button//button[contains(text(), "${KEEP BUTTON TEXT}")]
${CS MODAL CANCEL BUTTON}           ${CHANGE ANALYTICS MODAL}/div[contains(@class, "modal-footer")]/nx-cancel-button//button
${CS MODAL PARAGRAPH}               ${CHANGE ANALYTICS MODAL}//p[contains(text(),"${ANALYTICS DATA MOVE TEXT}")]
${CS MODAL CONTACT}                 ${CHANGE ANALYTICS MODAL}//p[contains(text(),"${ANALYTICS DATA MOVE CONTACT TEXT}")]
${CS MODAL SUPPORT LINK}            ${CHANGE ANALYTICS MODAL}//a

${STORAGE LOCATIONS BLOCK}          //nx-block/div[contains(@class, "storage-info")]
${STORAGE LOCATIONS PLACEHOLDER}    ${STORAGE LOCATIONS BLOCK}//div[contains(@class, "placeholder-preloader")]
${STORAGE NOT ABLE TO LOAD}         //span[contains(text(), "${NOT ABLE TO LOAD STORAGE TEXT}")]
${STORAGE INFO BUTTON}              ${STORAGE LOCATIONS BLOCK}//header//button/span[contains(text(), "${DETAILED INFO TEXT}")]/..
${STORAGE LOCATIONS TABLE}          ${STORAGE LOCATIONS BLOCK}//nx-section//form[@name="storageSettings"]
${STORAGE RESERVED MODE}            //span[contains(text(), "${RESERVED}")]
${STORAGE INACCESSIBLE MODE}        ${STORAGE LOCATIONS TABLE}//div[contains(@class, "disabled-label")]/span[contains(text(), "${INACCESSIBLE}")]
${STORAGE CHANGING MODE}            ${STORAGE LOCATIONS TABLE}//div[contains(@class, "disabled-label")]/span[contains(text(), "${CHANGING}")]
${STORAGE DROPDOWN}                 ${STORAGE LOCATIONS TABLE}//tbody/tr/td[2]//nx-select
${STORAGE MAIN MODE}                //span[contains(text(), "${MAIN}")]
${STORAGE BACKUP MODE}              //span[contains(text(), "${BACKUP}")]
${STORAGE NOT IN USE MODE}          //span[contains(text(), "${NOT IN USE}")]
${STORAGE BACKUP MODE DISABLED}     //span[contains(text(), "${BACKUP}") and @class="disabled"]
${STORAGE NOT IN USE MODE DISABLED}   //span[contains(text(), "${NOT IN USE}") and @class="disabled"]
${STORAGE MODE LINE}                //span[contains(text(), "${BACKUP}")]/ancestor::li/following-sibling::li/hr
${STORAGE MAIN MENU ITEM}           ${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li//span[contains(text(), "${MAIN}")]/parent::a
${STORAGE BACKUP MENU ITEM}         ${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li//span[contains(text(), "${BACKUP}")]/parent::a
${STORAGE NOT IN USE MENU ITEM}     ${STORAGE MAIN MODE}/parent::button/following-sibling::div/ul/li//span[contains(text(), "${NOT IN USE}")]/parent::a
${STORAGE SYSTEM TOOLTIP}           //ngb-tooltip-window//div[contains(text(), "${RESERVED SYSTEM TOOLTIP}")]
${STORAGE NONSYSTEM TOOLTIP}        //ngb-tooltip-window//div[contains(text(), "${RESERVED NONSYSTEM TOOLTIP}")]
${STORAGE LOCATIONS FIRST ROW}      ${STORAGE LOCATIONS TABLE}//tbody//tr[2]
${STORAGE LOCATIONS FIRST SPACE}    ${STORAGE LOCATIONS FIRST ROW}/td[3]/nx-storage-size-component/div[@class="container"]
${STORAGE POPOVER}                  //nx-popover
${STORAGE ITEM}                     //span[contains(text(),"HD Witness Media") and @class="ellipsis"]
${STORAGE DISK 0}                   //span[contains(text(), "disk0") and @class="ellipsis"] 
${STORAGE DISK 1}                   //span[contains(text(), "disk1") and @class="ellipsis"]
${STORAGE DISK 2}                   //span[contains(text(), "disk2") and @class="ellipsis"]
${STORAGE DISK 3}                   //span[contains(text(), "disk3") and @class="ellipsis"]
${STORAGE DISK 4}                   //span[contains(text(), "disk4") and @class="ellipsis"]
${STORAGE DISK INVALID}             //span[contains(text(), "invalid") and @class="ellipsis"]
${STORAGE DISK NETWORK}             //span[contains(text(), "networkdisk") and @class="ellipsis"]
${STORAGE DISABLED INACCESSIBLE}    ${STORAGE DISK INVALID}/parent::td[@class="disabled-label"]/following-sibling::td/div[contains(text(), "${INACCESSIBLE}")]
${STORAGE DISABLED NOT IN USE}      ${STORAGE DISK 2}/parent::td[@class="disabled-label"]/following-sibling::td${STORAGE NOT IN USE MODE}
${STORAGE DISABLED RESERVED}        ${STORAGE DISK 3}/parent::td[@class="disabled-label"]/following-sibling::td${STORAGE RESERVED MODE}
${STORAGE ENABLED MAIN}             ${STORAGE DISK 0}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE MAIN MODE}
${STORAGE ENABLED BACKUP}           ${STORAGE DISK 1}/parent::td[not(@class="disabled-label")]/following-sibling::td${STORAGE BACKUP MODE}
${STORAGE DISABLED RESERVED ICON}   ${STORAGE DISK 3}/parent::td[@class="disabled-label"]//*[name()="svg-icon" and contains(@data-src,"/images/icons/text_buttons/storage_local.svg")]
${STORAGE DISABLED NOT IN USE ICON}   ${STORAGE DISK 2}/parent::td[@class="disabled-label"]//*[name()="svg-icon" and contains(@data-src,"/images/icons/text_buttons/storage_local.svg")]
${STORAGE DISABLED INACCESSIBLE ICON}   ${STORAGE DISK INVALID}/parent::td[@class="disabled-label"]//*[name()="svg-icon" and contains(@data-src,"/images/icons/text_buttons/storage_local.svg")]
${STORAGE ENABLED MAIN ICON}        ${STORAGE DISK 0}/parent::td[not(@class="disabled-label")]//*[name()="svg-icon" and contains(@data-src,"/images/icons/text_buttons/storage_local.svg")]
${STORAGE DISABLED RESERVED ADDRESS}   ${STORAGE DISK 3}
${STORAGE DISABLED NOT IN USE ADDRESS}   ${STORAGE DISK 2}
${STORAGE DISABLED INACCESSIBLE ADDRESS}   ${STORAGE DISK INVALID} 
${STORAGE ENABLED MAIN ADDRESS}     ${STORAGE DISK 0}
${STORAGE RESERVED TOOLTIP ICON}    ${STORAGE DISABLED RESERVED}/following-sibling::*[name()="svg-icon" and contains(@data-src,"/images/icons/text_buttons/info.svg")]
${STORAGE RESERVED TOOLTIP}         //div[contains(@class, "tooltip-body") and contains(text(), "${RESERVED NONSYSTEM TOOLTIP}")]
${STORAGE INACCESSIBLE SIZE}        ${STORAGE DISABLED INACCESSIBLE}/parent::td/following-sibling::td
${RESERVED SPACE}                   ${STORAGE POPOVER}//td[contains(text(),"Reserved")]/following-sibling::td
${RESERVED SPACE ADVANCED}          //input[@id="reservedSpace0-numeric"]
&{MEDIA ATTRIBUTES DICT}            allowAutoRedundancy=${FALSE}    backupBitrate=-12500000     backupDaysOfTheWeek=254    backupDuration=-1    backupStart=0    backupType=${EMPTY}    maxCameras=0    metadataStorageId={00000000-0000-0000-0000-000000000000}    serverId=${EMPTY}    serverName=${EMPTY}
${ARCHIVE BACKUP CHECK BOX}         //nx-switch/div[@id="archive-backup-switch-wrapper"]
${ARCHIVE BACKUP SWITCH SLIDER}     //span[@class="slider round"]
${ARCHIVE BACKUP SWITCH ENABLED}    //input[@id="archive-backup-switch" and @class="selected"]
${ARCHIVE BACKUP STREAMS MSG}       //p[contains(text(), "${ARCHIVE BACKUP STREAMS MSG TEXT}")]
${ARCHIVE BACKUP CLIENT MSG}        //p[contains(text(), "${ARCHIVE BACKUP CLIENT MSG TEXT}")]
${ARCHIVE BACKUP SET CLIENT MSG}    //p[contains(text(), "${ARCHIVE BACKUP SET CLIENT MSG TEXT}")]
${ARCHIVE BACKUP RESET MSG}         //p[contains(text(), "${ARCHIVE BACKUP RESET MSG TEXT}")]
${BACKUP RESET BUTTON}              //button[contains(text(),"${RESET BACKUP BUTTON TEXT}")]
${RESET BACKUP MODAL}               //nx-modal-reset-backup
${RESET BACKUP MODAL TITLE}         ${RESET BACKUP MODAL}//h1 
${RESET BACKUP RESET BUTTON}        ${RESET BACKUP MODAL}//button[@type="submit"]
${RESET BACKUP CLOSE BUTTON}        ${RESET BACKUP MODAL}//button[@aria-label="Close"]
${RESET BACKUP CANCEL BUTTON}       ${RESET BACKUP MODAL}//button[contains(text(), "${CANCEL BUTTON TEXT}")]
${RECORDING STOP WARNING}           //*[contains(text(), "${RECORDING STOP WARNING TEXT}")]
${STORAGE LOCAL ICON}               *[name()="svg-icon" and contains(@data-src,"/images/icons/text_buttons/storage_local.svg")]
${STORAGE LOADING ICON}             //*[name()="svg-icon" and contains(@data-src,"/images/icons/text_buttons/loading.svg")]
${STORAGE DELETION ALERT ICON}      //*[name()="svg-icon" and contains(@data-src,"/images/icons/error.svg")]
${STORAGE DELETION ALERT TOOLTIP}   //div[contains(@class, "tooltip-body") and contains(text(), "${STORAGE DELETION ALERT TOOLTIP TEXT}")]
${STORAGE SMB ICON}                 *[name()="svg-icon" and contains(@data-src,"/images/icons/text_buttons/storage_smb.svg")]
${STORAGE SMB TOOLTIP}              //div[contains(@class, "tooltip-body") and contains(text(), "${SMB TOOLTIP TEXT}")]
${STORAGE DELETE ICON}              //*[name()="svg-icon" and contains(@data-src,"/images/icons/standard/delete.svg")]
${STORAGE DELETE BUTTON}            ${STORAGE DELETE ICON}/parent::button
${SMB STORAGE DELETE BUTTON}        ${STORAGE DISK NETWORK}/parent::td/following-sibling::td${STORAGE DELETE BUTTON}
${INACCESSIBLE STORAGE DELETE BUTTON}    ${STORAGE DISK INVALID}/parent::td/following-sibling::td${STORAGE DELETE BUTTON}
${STORAGE SCROLLBAR}                //form[@name="storageSettings"]
${STORAGE ADDRESS COLUMN}           ${STORAGE SCROLLBAR}//th[contains(text(),"${STORAGE LOCATIONS ADDRESS TEXT}")]
${STORAGE MODE COLUMN}              ${STORAGE SCROLLBAR}//th[contains(text(),"${STORAGE LOCATIONS MODE TEXT}")]
${STORAGE SPACE COLUMN}             ${STORAGE SCROLLBAR}//th[contains(text(),"${STORAGE LOCATIONS SPACE TEXT}")]
${STORAGE SIZE CHART}               //td[@class="size-chart"]

${DELETE STORAGE MODAL}             //div[contains(@class, "modal-body")]
${DELETE STORAGE CLOSE BUTTON}      //button[@aria-label="Close"]
${DELETE STORAGE CANCEL BUTTON}     //div[contains(@class, "modal-footer")]//button/span/parent::button
${DELETE STORAGE DELETE BUTTON}     //button[contains(text(), "${DELETE BUTTON TEXT}")]

${STORAGE ADD BUTTON}               ${STORAGE LOCATIONS BLOCK}//nx-section//button[contains(text(), "${ADD EXTERNAL STORAGE}")]
${ADD STORAGE MODAL}                //nx-modal-add-storage/form[@id="addStorageForm"]
${ADD EXTERNAL STORAGE HEADER}      //h1[@class="modal-title" and contains(text(),"${ADD EXTERNAL STORAGE}")]
${AS MODAL CLOSE BUTTON}            ${ADD STORAGE MODAL}/div[@class="modal-header"]/button
${AS MODAL URL INPUT}               ${ADD STORAGE MODAL}/div[contains(@class, "modal-body")]//input[@id="addUrl"]
${AS MODAL URL INPUT ERROR}         ${ADD STORAGE MODAL}/div[contains(@class, "modal-body")]//input[@id="addUrl" and contains(@class, "ng-invalid")]
${AS MODAL URL REQUIRED}            ${AS MODAL URL INPUT}/parent::div/following-sibling::div/span[contains(text(), "${URL REQUIRED TEXT}")]
${AS MODAL URL INVALID}             ${AS MODAL URL INPUT}/parent::div/following-sibling::div/span[contains(text(), "${INVALID URL TEXT}")]
${AS MODAL URL ALREADY ADDED}       ${AS MODAL URL INPUT}/parent::div/following-sibling::div/span[contains(text(), "${STORAGE PATH ALREADY ADDED TEXT}")]
${AS MODAL URL NOT FOUND}           ${AS MODAL URL INPUT}/parent::div/following-sibling::div/span[contains(text(), "${NO STORAGE FOUND TEXT}")]
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
${AS FAILED TO ADD TOAST}           //app-toasts//nx-toast/div[contains(@class, "alert")]/span[contains(text(), "${FAILED TO ADD STORAGE TEXT}")]
${AS MODAL STORAGE ADDED BY ANOTHER SERVER}    ${ADD STORAGE MODAL}//*[contains(text(), "${STORAGE PATH ALREADY ADDED TEXT}")]
${AS MODAL STORAGE USED BY ANOTHER SERVER}    ${ADD STORAGE MODAL}//*[contains(text(), "${STORAGE PATH ALREADY USED TEXT}")]
${AS MODAL NOT RECOMMENEDED}        ${ADD STORAGE MODAL}//*[contains(text(), "${NOT RECOMMENDED DIFFERENT SERVERS TEXT}")]
${AS MODAL ADD ANYWAY}              ${ADD STORAGE MODAL}//*[contains(text(), "${ADD THIS STORAGE ANYWAY TEXT}")]
${AS MODAL BACK BUTTON}             ${ADD STORAGE MODAL}/div[contains(@class, "modal-footer")]//button[contains(text(), "${BACK TEXT}")]

${STORAGE REINDEXING BLOCK}         //nx-block//div[contains(@class, "reindex-container")]
${STORAGE REINDEX ARCHIVE HEADER}   //h4[contains(text(), "${REINDEX ARCHIVE TEXT}")]
${STORAGE REINDEX ARCHIVE MSG}      //p[contains(text(), "${REINDEX ARCHIVE MSG TEXT}")]
${STORAGE REINDEX MAIN BUTTON}      ${STORAGE REINDEXING BLOCK}//button[contains(text(), "${REINDEX MAIN STORAGE TEXT}")]
${STORAGE REINDEX BACKUP BUTTON}    ${STORAGE REINDEXING BLOCK}//button[contains(text(), "${REINDEX BACKUP STORAGE TEXT}")]
${STORAGE REINDEX TOOLTIP FIRST}    //div[contains(@class, "tooltip-body")]/p[contains(text(), "${REINDEX TOOLTIP FIRST}")]
${STORAGE REINDEX TOOLTIP SECOND}   //div[contains(@class, "tooltip-body")]//p[contains(text(), "${REINDEX TOOLTIP SECOND}")]
${STORAGE REINDEXING MAIN}          ${STORAGE REINDEXING BLOCK}//section[@id="reindex-main"]//div[contains(text(), "${REINDEXING MAIN}")]
${REINDEXING MAIN PERCENT}          ${STORAGE REINDEXING MAIN}/following-sibling::span
${REINDEXING MAIN CANCEL BUTTON}    ${STORAGE REINDEXING BLOCK}//section[@id="reindex-main"]/button[contains(text(), "${CANCEL BUTTON TEXT}")]
${STORAGE REINDEXING BACKUP}        ${STORAGE REINDEXING BLOCK}//section[@id="reindex-backup"]//div[contains(text(), "${REINDEXING BACKUP}")]
${REINDEXING BACKUP PERCENT}        ${STORAGE REINDEXING BACKUP}/following-sibling::span
${REINDEXING MAIN CANCEL BUTTON}    ${STORAGE REINDEXING BLOCK}//section[@id="reindex-backup"]/button[contains(text(), "${CANCEL BUTTON TEXT}")]

${CLOUD STORAGE INFO BLOCK}         //nx-cloud-storage/nx-block//h2[contains(text(), "${CLOUD STORAGE TITLE}")]/..

${SERVER NOT ACCESIBLE IMAGE}       //div[contains(@class,"placeholder-icon") and @name="NO_SETTINGS"]
${OFFLINE BANNER}                    //nx-alert-block//span[contains(text(),"${SERVER OFFLINE TEXT}")]
${CHECKING BANNER}                   //nx-alert-block//span[contains(text(),"${CHECKING TEXT}")]
${OUTDATED BANNER}                   //div[@class="warning-margin"]/div[contains(text(), "${STORAGES OUTDATED WARNING TEXT}")]
${RELOAD ICON}                       //*[name()="svg-icon" and contains(@data-src,"/images/icons/text_buttons/reload.svg")]

# ADVANCED
# Storage Locations Block
${STORAGE LOCATIONS TITLE}          //div[@class="card mt-3"]//h4[text()="${STORAGE LOCATIONS TEXT}"]
${RESERVED SPACE INPUT}             //input[@id="reservedSpace0-numeric"]
${RESERVED SPACE DROPDOWN}          //select[@id="reservedSpaceUnit0"]
${RESERVED DROPDOWN SELECTED}       ${RESERVED SPACE DROPDOWN}//option[@selected]
${RESERVED DROPDOWN OPTION GB}      ${RESERVED SPACE DROPDOWN}//option[@value='GB']
${RESERVED DROPDOWN OPTION TB}      ${RESERVED SPACE DROPDOWN}//option[@value='TB']
${STORAGE ENABLE SWITCH}            //div[@id='isUsedForWriting0-switch-wrapper']
@{STORAGE LOCATIONS BLOCK ITEMS}
...    ${STORAGE LOCATIONS TITLE}
...    ${RESERVED SPACE INPUT}
...    ${RESERVED SPACE DROPDOWN}
...    ${STORAGE ENABLE SWITCH}
${STORAGE ENABLE SWITCH STYLE}       ${STORAGE ENABLE SWITCH}//span[@class='slider round']
${STORAGE SWITCH ENABLED COLOR}      rgba(58, 145, 30, 1)
${STORAGE SWITCH DISABLED COLOR}     rgba(185, 199, 206, 1)
${SERVER ADVANCED DISABLED COLOR}    rgba(195, 207, 213, 1)
${STORAGE FREE SPACE VALUE}          //td[@title='/recordings/HD Witness Media']//following-sibling::td[2]

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

${ADVANCED SAVE MODAL CLOSE BUTTON}    //nx-modal-generic-content//button[text()="${CLOSE TEXT}"]