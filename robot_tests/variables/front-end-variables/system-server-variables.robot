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
${SERVER DETAILED INFO BUTTON}      //header//button/span[contains(text(),"${DETAILED INFO TEXT}")]/..
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

${SERVER NOT ACCESIBLE IMAGE}       //div[contains(@class,"placeholder-icon") and @name="NO_SETTINGS"]
${OFFLINE BADGE}                    //header//h2/following-sibling::span[contains(text(),"${AUTOTESTS OFFLINE TEXT}")]
${CHECKING BADGE}                   //header//h2/following-sibling::span[contains(text(),"${AUTOTESTS OFFLINE TEXT}")]

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
...    None
...    Error
...    Warning
...    Info
...    Debug
...    Verbose

${STORAGE SAVE BUTTON}             ${STORAGE LOCATIONS TITLE}//ancestor::div[@class='card--header']//following-sibling::nx-section[@class='ng-star-inserted']//button[text()='${SAVE BUTTON TEXT}']
${STORAGE CANCEL BUTTON}           ${STORAGE LOCATIONS TITLE}//ancestor::div[@class='card--header']//following-sibling::nx-section[@class='ng-star-inserted']//button[text()='${CANCEL BUTTON TEXT}']
${LOG SAVE BUTTON}                 ${LOG SETTINGS TITLE}//ancestor::div[@class='card']//button[text()='${SAVE BUTTON TEXT}']

