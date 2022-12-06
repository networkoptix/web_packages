*** Variables ***
${CHANGE OWNERSHIP LINK}                    //a[@id="change-ownership"]
${OWNERSHIP TRANSFER FORM}                  //form[@name="transferOwnershipForm"]
${OWNERSHIP TRANSFER INPUT}                 ${OWNERSHIP TRANSFER FORM}//span[@id="search-input"]
${OWNERSHIP TRANSFER DROPDOWN}              ${OWNERSHIP TRANSFER FORM}//button[@data-toggle="dropdown"]
${OWNERSHIP TRANSFER WARNING}               ${OWNERSHIP TRANSFER FORM}//div[contains(text(),"${WARNING CAPS}")]/..//span[contains(text(),"${OT WARNING TEXT}")]
${OWNERSHIP TRANSFER SEND REQUEST}          ${OWNERSHIP TRANSFER FORM}//button[@type="submit"]
${OWNERSHIP TRANSFER CANCEL}                ${OWNERSHIP TRANSFER FORM}//button[@type="reset"]
${OWNERSHIP TRANSFER CLOSE}                 ${OWNERSHIP TRANSFER FORM}//button[@aria-label="Close"]
${OWNERSHIP TRANSFER SENT}                  ${OWNERSHIP TRANSFER FORM}//p[@id="request-sent" and contains(text(), "${REQUEST SENT TEXT}")]/..//p[contains(text(), "${REQUEST SENT EXPLANATION TEXT}")]
${OWNERSHIP TRANSFER OK}                    ${OWNERSHIP TRANSFER FORM}//button[contains(text(), "${OK TEXT}")]
${OWNERSHIP TRANSFER IN PROGRESS}           //span[contains(text(), "${TRANSFERRING OWNERSHIP TO TEXT}")]
${OWNERSHIP TRANSFER IN PROGRESS CANCEL}    //a[@id="cancel-transfers"]
${OWNERSHIP TRANSFER WANTS TO}              //span[contains(text(), "${WANTS TO TRANSFER TEXT}")]
${OWNERSHIP TRANSFER ACCEPT}                //button[contains(text(), "${ACCEPT TEXT}")]
${OWNERSHIP TRANSFER REJECT}                //button[contains(text(), "${REJECT TEXT}")]
${ACCESS LEVEL}                             //span[@id="accessLevelText"]/../span[@class="name"]
${SYSTEM OWNER}                             //span[contains(@class, "system-owner")]
&{ACCESS LEVELS}
...     cloudAdmin=Administrator
...     advancedViewer=Advanced Viewer
...     viewer=Viewer
...     liveViewer=Live viewer
...     custom=Custom


