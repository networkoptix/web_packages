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