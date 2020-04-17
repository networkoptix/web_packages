*** Variables ***
${SERVERS LINK}                   //nx-menu//a[@id="servers"]
${PORT INPUT}                     //div/span[contains(text(),"${PORT TEXT}")]/following-sibling::input
${CHECK STATUS BUTTON}            //header//button/span[contains(text(),"${CHECK STATUS TEXT}")]
${FULL INFO BUTTON}               //header//button/span[contains(text(),"${FULL INFO TEXT}")]/..
${RENAME SERVER BUTTON}           //nx-section//button/span[contains(text(),"${RENAME}")]/..
${RESTART SESRVER BUTTON}         //nx-section//button/span[contains(text(),"${RESTART}")]/..
${RESET SERVER TO DEFAULTS}       //nx-section//button/span[contains(text(),"${RESET TO DEFAULTS TEXT}")]/..
${RENAME SERVER FORM}              //form[@name="renameServerForm"]
${RENAME SAVE BUTTON}             ${RENAME SERVER FORM}//button[contains(text(),"${SAVE BUTTON TEXT}")]
${RENAME CANCEL BUTTON}           ${RENAME SERVER FORM}//button[contains(text(),"${CANCEL BUTTON TEXT}")]
${RENAME CLOSE BUTTON}            ${RENAME SERVER FORM}//button[contains(@class,"close")]
${$RENAME SERVER INPUT}           ${RENAME SERVER FORM}//input[@id="serverName"]
${RENAME ERROR TEXT}              ${$RENAME SERVER INPUT}/following-sibling::p/span[contains(@class,"input-error")]