*** Variables ***
${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}    //nx-checkbox[@name="autoDiscoveryEnabled"]
${ENABLE AUTO DISCOVERY CHECKBOX REAL}     //*[@id="autoDiscoveryEnabled"]
${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}      //nx-checkbox[@name="statisticsAllowed"]
${SEND ANONYMOUS USAGE CHECKBOX REAL}      //*[@id="statisticsAllowed"]
${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}     //nx-checkbox[@name="cameraSettingsOptimization"]
${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}     //*[@id="cameraSettingsOptimization"]

${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}        //nx-checkbox[@name='auditTrailEnabled']
${ENABLE AUDIT TRAIL CHECKBOX REAL}        //*[@id='auditTrailEnabled']
${ALLOW ONLY SECURE CHECKBOX VISIBLE}         //nx-checkbox[@name='trafficEncryptionForced']
${ALLOW ONLY SECURE CHECKBOX REAL}         //*[@id='trafficEncryptionForced']
${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}     //nx-checkbox[@name='videoTrafficEncryptionForced']
${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}     //*[@id='videoTrafficEncryptionForced']
${LIMIT SESSION DURATION CHECKBOX VISIBLE}    //nx-checkbox[@name='sessionLimitMinutes']
${LIMIT SESSION DURATION CHECKBOX REAL}    //*[@id='sessionLimitMinutes']
${TIME NUMBER INPUT}                       //*[@type='number']
${TIME DURATION INTERVAL BUTTON}           //*[@id="genericSelect"]
${TIME DURATION INTERVAL TEXT}            ${TIME DURATION INTERVAL BUTTON}/span
${TIME DURATION NEW SELECTION}            //*[@aria-labelledby='genericSelect']//a[contains(@class,"dropdown-item inset")]
${TIME DURATION SELECTION HOURS}           //*[@aria-labelledby='genericSelect']//a/span[text()="${HOURS TEXT}"]
${TIME DURATION SELECTION MINUTES}         //*[@aria-labelledby='genericSelect']//a/span[text()="${MINUTES TEXT}"]

${AVAILABLE SYSTEMS LIST}             //a[@href='/systems']

${SYSTEM ADMINISTRATION LINK}         //a[@id='admin']
${SYSTEM GENERAL LINK}                //a[@id="general"]
${SYSTEM STORAGE LINK}                //a[@id='cloudStorage']
${MENU LEVEL 3 LINK}                  //a[contains(@class, "menu-level-3")]

${USER EMAIL}                         ${SYSTEM USER DETAILS}//header//h2[contains(@class,'user-email')]
${USER NAME}                          ${USER EMAIL}/following-sibling::span[contains(@class,'user-name')]
${OWNER LABEL}                        ${SYSTEM USER DETAILS}//header//h2/following-sibling::span[contains(@class,'system-owner')]/span[contains(text(),'${OWNER TEXT}')]
${OWNER NAME}                         ${OWNER LABEL}//following-sibling::span//span[contains(text(),'%OWNER_NAME%')]
${OWNER EMAIL}                        ${OWNER LABEL}/following-sibling::span//span[contains(text(),"${EMAIL OWNER}")]

${RENAME INPUT}                       //form[@name='renameForm']//input[@id='systemName']
${RENAME INPUT WITH ERROR}            //form[@name='renameForm']//input[@id='systemName' and contains(@class,'ng-invalid')]
${SYSTEM NAME IS REQUIRED}            //form[@name='renameForm']//span[@class='input-error' and contains(text(),"${SYSTEM NAME IS REQUIRED TEXT}")]

${RENAME CANCEL}                      //form[@name='renameForm']//button[text()='${CANCEL BUTTON TEXT}']
${RENAME X BUTTON}                    //form[@name='renameForm']//button[contains(@class,'close')]
${RENAME SAVE}                        //form[@name='renameForm']//button[text()='${SAVE BUTTON TEXT}']

${ENCRYPTING VIDEO WARNING}           //div[text()='${ENCRYPTING VIDEO WARNING TEXT}'] 

#Disconnect from cloud portal
${DISCONNECT FORM}                      //form[@name='disconnectForm']
${DISCONNECT FORM HEADER}               ${DISCONNECT FORM}//h1["${DISCONNECT FORM HEADER TEXT}"]
${DISCONNECT FORM CLOSE BUTTON}         ${DISCONNECT FORM}//button[contains(@class, "close")]
${DISCONNECT FORM ALL USERS WILL BE DELETED}    ${DISCONNECT FORM}//p[contains(text(), "${DISCONNECT FORM ALL USERS WILL BE DELETED TEXT}")]
${DISCONNECT FORM SYSTEM WILL BE ACCESSIBLE}    ${DISCONNECT FORM}//p[contains(text(), "${DISCONNECT FORM SYSTEM WILL BE ACCESSIBLE TEXT}")]
${DISCONNECT FORM ENTER PASSWORD TO CONTINUE}   ${DISCONNECT FORM}//p[contains(text(), "${DISCONNECT FORM ENTER PASSWORD TO CONTINUE TEXT}")]
${DISCONNECT PASSWORD INPUT}             ${DISCONNECT FORM}//input[@id="password"]
${DISCONNECT FORM DISCONNECT BUTTON}     ${DISCONNECT FORM}//nx-process-button/div[contains(@class, "process-button")]//button[contains(text(),"${DISCONNECT BUTTON TEXT}")]/..
${DISCONNECT FORM CANCEL BUTTON}         ${DISCONNECT FORM}//button[text()='${CANCEL BUTTON TEXT}']
${DISCONNECT FORM WRONG PASSWORD}        ${DISCONNECT FORM}//div[contains(@class, "error") and contains(text(), "${WRONG PASSWORD}")]
${DISCONNECT FORM PASSWORD IS REQUIRED}  ${DISCONNECT FORM}//div[contains(@class, "error") and contains(text(), "${PASSWORD IS REQUIRED TEXT}")]
${SYSTEM IS SUCCESSFULLY DISCONNECTED}   ${SUCCESSFULLY DISCONNECTED}