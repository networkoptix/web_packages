*** Variables ***
${RESET PASSWORD FORM}                //form[@name='restorePasswordWithCode']
${RESET PASSWORD OK BUTTON}           ${RESET PASSWORD FORM}//button[contains(@class,'btn btn-primary')]
${RESTORE PASSWORD EMAIL INPUT}       //form[@name='restorePassword']//nx-email-input/input
${RESET PASSWORD BUTTON}              //form[@name='restorePassword']//button[contains(@class,'btn btn-primary')]
${RESET PASSWORD INPUT}               ${RESET PASSWORD FORM}//input[@id='newPassword']
${SAVE PASSWORD}                      ${RESET PASSWORD FORM}//button[contains(@class,'btn btn-primary')]
${RESET EMAIL SENT MESSAGE}           //h1/span[contains(text(),'${RESET EMAIL SENT MESSAGE TEXT}')]
${RESET SUCCESS MESSAGE}              //h1[contains(text(),"${RESET SUCCESS MESSAGE TEXT}")]
${RESET SUCCESS LOG IN LINK}          //div[contains(@class,'process-success')]//a[contains(@class,'btn btn-primary')]
${RESET EYE ICON OPEN}                ${RESET PASSWORD FORM}${EYE ICON OPEN}
${RESET EYE ICON CLOSED}              ${RESET PASSWORD FORM}${EYE ICON CLOSED}