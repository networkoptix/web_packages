*** Variables ***
${url}    ${ENV}
${password}     ${BASE PASSWORD}
${existing email}       ${EMAIL VIEWER}
${RESTORE PASS EMAIL IS REQUIRED}     //p[contains(@class,'error-label') and contains(text(),"${ENTER EMAIL TEXT}")]
${EMAIL INVALID}                      //p[contains(@class,'error-label') and contains(text(),"${EMAIL INVALID TEXT}")]
${EMAIL IS REQUIRED HEBREW}           //p[contains(@class,'error-label') and contains(text(),"${EMAIL IS REQUIRED TEXT}")]
${EMAIL INVALID HEBREW}               //p[contains(@class,'error-label') and contains(text(),"${EMAIL INVALID TEXT}")]
${FORM WITH ERROR}                    //form[@name='restorePasswordWithCode']//nx-password-input[contains(@class,'ng-invalid')]//input

${RESET PASSWORD FORM}                //form[@name="resetForm" or @name="resetPasswordForm"]
${RESET PASSWORD OK BUTTON}           ${RESET PASSWORD FORM}//button[contains(@class,"btn btn-primary")]
${RESTORE PASSWORD EMAIL INPUT}       //nx-authorize-reset-request-component//input[@type="email" and @id="resetPasswordEmail"]
${RESET PASSWORD BUTTON}              //button[contains(@class,"btn btn-primary") and contains(text(), "${RESET PASSWORD BUTTON TEXT}")]
${RESET NEXT BUTTON}                  //button[contains(@class,"btn btn-primary") and contains(text(), "${NEXT TEXT}")]
${RESET PASSWORD INPUT}               ${RESET PASSWORD FORM}//input[@id="resetPassword"]
${FORGOT PASSWORD BUTTON}             //button//span[contains(text(),"${FORGOT PASSWORD TEXT}")]
${SAVE PASSWORD}                      ${RESET PASSWORD FORM}/following-sibling::footer//button[contains(@class,'btn btn-primary')]
${RESET EMAIL SENT MESSAGE}           //nx-authorize-reset-request-component//p[contains(text(),"${RESET EMAIL SENT MESSAGE TEXT}")]
${RESET EMAIL SENT MESSAGE HEBREW}    //h1/span[contains(text(),'${RESET EMAIL SENT MESSAGE TEXT}')]
${RESET SUCCESS MESSAGE}              //h3[contains(text(),"${RESET SUCCESS MESSAGE TEXT}")]
${RESET SUCCESS INSTRUCTION}          //p[contains(text(),"${RESET SUCCESS INSTRUCTION TEXT}")]
${RESET SUCCESS LOG IN LINK}          //div[contains(@class,'process-success')]//a[contains(@class,'btn btn-primary')]
${RESET EYE ICON OPEN}                ${RESET PASSWORD FORM}${EYE ICON OPEN}
${RESET EYE ICON CLOSED}              ${RESET PASSWORD FORM}${EYE ICON CLOSED}
${RESET PASSWORD EMAIL SENT}          ${RESET PASSWORD FORM}/div[contains(@class, "email-sent")]
${RESET LOGIN BUTTON}                 ${RESET PASSWORD FORM}/following-sibling::footer//button[contains(text(), "${LOG IN BUTTON TEXT}")]