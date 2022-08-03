*** Variables ***
@{TEST SYSTEMS}
${MERGE BUTTON SYSTEM}                //button[span[text()="${MERGE SYSTEM BUTTON TEXT}"]]
${MERGE BUTTON SYSTEM DISABLED}       //button[@disabled and span[text()="${MERGE SYSTEM BUTTON TEXT}"]]
${MERGE DIALOG}                       //nx-modal-merge-content
${MERGE FORM}                         ${MERGE DIALOG}//form[@name="mergeForm"]
${MERGE SYSTEM DROPDOWN}              ${MERGE DIALOG}//button[@id="system"]
${MERGE X BUTTON}                     ${MERGE DIALOG}//button[contains(@class,"close")]
${MERGE GO BACK BUTTON}               ${MERGE DIALOG}//button[contains(@class, "svg-icon")]
${MERGE NEXT BUTTON}                  ${MERGE DIALOG}//button[contains(@class,"btn btn-primary") and contains(text(),"${NEXT TEXT}")]
${OTHER SYSTEM}                       Other System...
${MERGE SYSTEMS HEADER}               ${MERGE DIALOG}//h1/span[contains(text(), "${MERGE SYSTEMS TEXT}")]
${CURRENTLY MERGING CARD}             //div[contains(@class,"card-body")]
${CURRENTLY MERGING DOTS}             ${CURRENTLY MERGING CARD}//div[contains(@class, "circleG circleG_")]
${MERGE NOT OWNER MESSAGE 2}          ${MERGE DIALOG}//p[@class='help-block-no-height'][2]
${MERGE FAILED DIALOG HEADER}         //nx-modal-generic-content//h1/span[contains(text(),"${SYSTEM MERGE FAILED TEXT}")]
${MERGE FAILED OK BUTTON}             ${MERGE DIALOG}//button[contains(text(),"${OK TEXT}")]
${MERGE FAILED X BUTTON}              //nx-modal-generic-content//button[contains(@class,"close")]
${MERGE FAILED ERROR TEXT}            //nx-modal-generic-content//div[contains(@class, "modal-body")]/p
${MERGE CURRENT SYSTEM WITH}          ${MERGE DIALOG}//p[contains(text(),"${MERGE CURRENT SYSTEM WITH TEXT}")]
${MERGE ENTER THE ADDRESS}            ${MERGE DIALOG}//p[contains(text(),"${MERGE ENTER THE ADDRESS TEXT}")]
${MERGE ONLY AS OWNER}                ${MERGE DIALOG}//p[contains(text(),"${YOU CAN ONLY MERGE AS OWNER TEXT}")]
${MERGE CHECKING HINT}                ${MERGE DIALOG}//p[contains(text(),"${CHECKING TEXT}")]
${MERGE PASSWORD REQUIRED}            ${MERGE DIALOG}//label[contains(@class, "error-label") and contains(text(),"${PASSWORD IS REQUIRED TEXT}")]
${MERGE PASSWORD INCORRECT}           ${MERGE DIALOG}//label[contains(@class, "error-label") and contains(text(),"${WRONG PASSWORD}")]
${MERGE ENTER SERVER ADDRESS}         ${MERGE DIALOG}//label[contains(text(),"${MERGE ENTER SERVER ADDRESS TEXT}")]

${MERGE CHECK MERGE FORM}             ${MERGE DIALOG}//form[@name="checkMergeForm"]
${MERGE SYSTEM DROPDOWN ARROW}        ${MERGE CHECK MERGE FORM}//div[@class="arrow-flip"]//*[@id="arrow_expand"]/../..
${MERGE SYSTEMS MENU}                 ${MERGE CHECK MERGE FORM}//ul[@class="dropdown-menu--list"]
${MERGE FORM SERVER URL LABEL}        ${MERGE CHECK MERGE FORM}//label[@for="serverUrl" and contains(text(), "${MERGE SERVER URL TEXT}")]
${MERGE FORM SERVER URL INPUT}        ${MERGE CHECK MERGE FORM}//input[@id="serverUrl"]
#${SYSTEM HAS AN OLDER SOFTWARE VERSION}    ${MERGE CHECK MERGE FORM}//p[contains(@class, "error") and contains(text(), "${SYSTEM HAS AN OLDER SOFTWARE VERSION TEXT}")]
#${SYSTEM HAS A NEWER SOFTWARE VERSION}     ${MERGE CHECK MERGE FORM}//p[contains(@class, "error") and contains(text(), "${SYSTEM HAS A NEWER SOFTWARE VERSION TEXT}")]
#${SERVER HAS AN OLDER SOFTWARE VERSION}    ${MERGE CHECK MERGE FORM}//p[contains(@class, "error") and contains(text(), "${SERVER HAS AN OLDER SOFTWARE VERSION TEXT}")]
${SYSTEMS HAVE MISMATCHING VERSIONS}          ${MERGE CHECK MERGE FORM}//p[contains(text(), "${SYSTEMS HAVE MISMATCHING VERSIONS TEXT}")]
${SERVER HAS INCOMPATIBLE VERSION}            ${MERGE CHECK MERGE FORM}//p[contains(text(), "${SERVER HAS INCOMPATIBLE VERSION TEXT}")]
${SERVER APPEARS TO BE LISTING ITSELF}        ${MERGE CHECK MERGE FORM}//p[contains(text(), "${SERVER APPEARS TO BE LISTING ITSELF TEXT}")]
${REMOVE OFFLINE AND INCOMPATIBLE SERVERS}    ${MERGE CHECK MERGE FORM}//p[contains(text(), "${REMOVE OFFLINE AND INCOMPATIBLE SERVERS TEXT}")]
${MERGE SERVER NOT FOUND}                     ${MERGE DIALOG}//h1/span[contains(text(), "${FAILED TO FIND SYSTEM TO MERGE}")]
${MERGE SERVER NOT FOUND BODY}                ${MERGE DIALOG}//p[contains(text(), "${FAILED TO FIND MERGE BODY}")]
${MERGE INVALID URL}                          ${MERGE CHECK MERGE FORM}//label[@for="serverUrl" and contains(text(), "${MERGE INVALID URL TEXT}")]

${MERGE ADMIN FORM}                   ${MERGE DIALOG}//form[@name="adminPasswordForm"]
${MERGE ADMIN FORM LOGIN LABEL}       ${MERGE ADMIN FORM}//label[@for="adminLogin" and contains(text(), "${LOGIN TEXT}")]
${MERGE ADMIN FORM LOGIN INPUT}       ${MERGE ADMIN FORM}//input[@name="adminLogin"]
${MERGE ADMIN FORM PASSWORD LABEL}    ${MERGE ADMIN FORM}//label[@for="adminPassword" and contains(text(), "${PASSWORD TEXT}")]
${MERGE ADMIN FORM PASSWORD INPUT}    ${MERGE ADMIN FORM}//input[@id="adminPassword"]

${MERGE CHOOSE PRIMARY FORM}          ${MERGE DIALOG}//form[@name="choosePrimaryForm"]
${MERGE RADIO FIRST SYSTEM}           ${MERGE CHOOSE PRIMARY FORM}//nx-radio[@name="firstSystem"]
${MERGE RADIO SECOND SYSTEM}          ${MERGE CHOOSE PRIMARY FORM}//nx-radio[@name="secondSystem"]
${MERGE TAKE SYSTEM NAME}             ${MERGE CHOOSE PRIMARY FORM}//p[contains(text(), "${TAKE SYSTEM NAME AND SETTINGS TEXT}")]

${CONFIRM MERGE FORM}                 ${MERGE DIALOG}//form[@name="confirmMergeForm"]
${CONFIRM MERGE TEXT}                 ${CONFIRM MERGE FORM}/div/p
#${MERGE YOU ARE ABOUT TO MERGE}       ${CONFIRM MERGE FORM}//p[contains(text(), "${YOU ARE ABOUT TO MERGE TEXT}") and contains(text(), "${SETTINGS WILL BE TAKEN TEXT}")]
#${MERGE SETTINGS WILL BE TAKEN}       ${CONFIRM MERGE FORM}//p[contains(text(), "${YOU ARE ABOUT TO MERGE TEXT}") and contains(text(), "${SETTINGS WILL BE TAKEN TEXT}")]
${MERGE ENTER YOUR PASSWORD}          ${CONFIRM MERGE FORM}//label[contains(text(),"${ENTER PASSWORD TO CONTINUE TEXT}")]
${MERGE PASSWORD INPUT}               ${CONFIRM MERGE FORM}//input[@name="cloudOwnerPassword"]
${MERGE SYSTEMS BUTTON}               ${CONFIRM MERGE FORM}//button[@type="submit" and text()="${MERGE SYSTEMS TEXT}"]
${SYSTEM IS BEING MERGED}             //div[contains(text(), "${SYSTEM IS BEING MERGED TEXT}")]

${MERGE GENERAL ERROR FORM}           //form[@name="serverUrlErrorsForm"]
${MERGE TRY AGAIN BUTTON}             ${MERGE GENERAL ERROR FORM}//button[contains(text(), "${TRY AGAIN TEXT}")]
${MERGE SERVER APPEARS TO BE LISTING ITSELF}        ${MERGE GENERAL ERROR FORM}//p[contains(text(), "${SERVER APPEARS TO BE LISTING ITSELF TEXT}")]
${MERGE REMOVE OFFLINE AND INCOMPATIBLE SERVERS}    ${MERGE GENERAL ERROR FORM}//p[contains(text(), "${REMOVE OFFLINE AND INCOMPATIBLE SERVERS TEXT}")]
${MERGE SYSTEMS HAVE DIFFERENT OWNERS}              ${MERGE GENERAL ERROR FORM}//p[contains(text(), "${SYSTEMS HAVE DIFFERENT OWNERS TEXT}")]

${MERGE FAILED DIALOG}

${MERGE LONELY SYSTEM FORM}
