*** Variables ***
${url}                                ${ENV}
${valid email}                        noptixqa+valid@gmail.com
${password}                           ${BASE PASSWORD}
${symbol password}                    pass!@#$%^&*()_-+=;:'"`~,./\|?[]{}
${space password}                     qwea sd 123
#${email}                             ${EMAIL VIEWER}
${url}                                ${ENV}


# change-pass web elements
${CHANGE PASSWORD LEFT MENU LINK}     //nx-menu//span[contains(text(), "${CHANGE PASSWORD LEFT MENU TEXT}")]
${CHANGE PASSWORD FORM}               //nx-account-password-component//form
${CURRENT PASSWORD INPUT}             ${CHANGE PASSWORD FORM}//input[@id='password']
${NEW PASSWORD INPUT}                 ${CHANGE PASSWORD FORM}//input[@id='newPassword']
${CHANGE PASSWORD BUTTON}             //nx-account-password-component//nx-apply//nx-process-button//button
${CANCEL PASSWORD CHANGES BUTTON}     //nx-account-password-component//nx-apply//button[contains(text(), "${CANCEL CHANGES BUTTON TEXT}")]
${PASSWORD IS REQUIRED}               //div[contains(@class,'input-error') and contains(text(),"${REQUIRED TEXT}")]
${CHANGE PASS EYE ICON OPEN}          ${CHANGE PASSWORD FORM}${EYE ICON OPEN}
${CHANGE PASS EYE ICON CLOSED}        ${CHANGE PASSWORD FORM}${EYE ICON CLOSED}
${CHANGE PASS NO CHANGES}             //div[contains(@class, "placeholder-text-no-changes")]
${PASSWORD HEADLINE}                  //nx-account-password-component//nx-block//h4[contains(text(), "${PASSWORD TEXT}")]



${CURRENT PASSWORD IS REQUIRED}       //span[contains(@class, 'input-error') and contains(text(),"${CURRENT PASSWORD IS REQUIRED TEXT}")]