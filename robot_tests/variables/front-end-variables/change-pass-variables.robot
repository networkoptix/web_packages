*** Variables ***
${CHANGE PASSWORD LEFT MENU LINK}     //nx-menu//span[contains(text(), "${CHANGE PASSWORD LEFT MENU TEXT}")]
${CHANGE PASSWORD FORM}               //nx-account-password-component//form
${CURRENT PASSWORD INPUT}             ${CHANGE PASSWORD FORM}//input[@id='password']
${NEW PASSWORD INPUT}                 ${CHANGE PASSWORD FORM}//input[@id='newPassword']
${CHANGE PASSWORD BUTTON}             //nx-account-password-component//nx-apply//nx-process-button//button
${CANCEL PASSWORD CHANGES BUTTON}     //nx-account-password-component//nx-apply//button[contains(text(), "${CANCEL CHANGES BUTTON TEXT}")]
${PASSWORD IS REQUIRED}               //div[contains(@class,'input-error') and contains(text(),"${PASSWORD IS REQUIRED TEXT}")]
${CHANGE PASS EYE ICON OPEN}          ${CHANGE PASSWORD FORM}${EYE ICON OPEN}
${CHANGE PASS EYE ICON CLOSED}        ${CHANGE PASSWORD FORM}${EYE ICON CLOSED}
${CHANGE PASS NO CHANGES}             //div[contains(@class, "placeholder-text-no-changes")]