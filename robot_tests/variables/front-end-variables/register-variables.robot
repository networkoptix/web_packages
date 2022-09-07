*** Variables ***
${url}    ${ENV}
${existing email}       ${EMAIL VIEWER}
${valid email}          noptixqa+valid@gmail.com
${password}    ${BASE PASSWORD}
${url}         ${ENV}
@{auth}        ${EMAIL OWNER}    ${BASE PASSWORD}

${REGISTER FORM}                      //nx-authorize-create-account-component
${REGISTER FIRST NAME INPUT}          ${REGISTER FORM}//form//input[@id='firstName']
${REGISTER LAST NAME INPUT}           ${REGISTER FORM}//form//input[@id='lastName']
${REGISTER EMAIL INPUT}               ${REGISTER FORM}//form//nx-email-input/input[@id='email']
${REGISTER EMAIL INPUT LOCKED}        ${REGISTER FORM}//form//input[@name='registerEmailLocked']
${REGISTER PASSWORD INPUT}            ${REGISTER FORM}//form//nx-password-input//input[@id='createAccountPassword']
${REGISTER LOG IN BUTTON}             ${REGISTER FORM}//button/span[text()="${LOG IN BUTTON TEXT}"]/..
${REGISTER BACK BUTTON}               ${REGISTER FORM}//button/span[text()="${BACK TEXT}"]/..
${REGISTER NOT ACTIVATED}             //nx-authorize-component//form[@name="emailForm"]//p[text()="${ACCOUNT NOT ACTIVATED}"]

${TERMS AND CONDITIONS CHECKBOX VISIBLE}    ${REGISTER FORM}//nx-checkbox[@name="termsAndConditions"]
${TERMS AND CONDITIONS CHECKBOX REAL}       ${TERMS AND CONDITIONS CHECKBOX VISIBLE}//input[@id='termsAndConditions']

${CREATE ACCOUNT BUTTON}              ${REGISTER FORM}//button[contains(text(),"${CREATE ACCOUNT BUTTON TEXT}")]
${TERMS AND CONDITIONS LINK}          ${REGISTER FORM}//a[@href='/content/eula']
${TERMS AND CONDITIONS ERROR}         ${REGISTER FORM}//nx-checkbox/../following-sibling::p[contains(@class,'error-label') and contains(text(),"${REQUIRED TEXT}")]
${PRIVACY POLICY LINK}                ${REGISTER FORM}//a[@href='${PRIVACY POLICY URL HREF}']
${RESEND ACTIVATION LINK BUTTON}      //nx-authorize-email-component//p[contains(@class,"fake-link") and contains(text(),"${RESEND ACTIVATION LINK BUTTON TEXT}")]
${REGISTER EYE ICON OPEN}             ${REGISTER FORM}${EYE ICON OPEN}
${REGISTER EYE ICON CLOSED}           ${REGISTER FORM}${EYE ICON CLOSED}

${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}} invites you to %PRODUCT_NAME%

${ACCOUNT CREATION SUCCESS}           //nx-authorize-activate-account-component
${ACCOUNT CREATION SUCCESS ICON}      //div[@name="ACCOUNT_CREATED"]/svg-icon
${ACCOUNT CREATION CONFIRMATION}      ${ACCOUNT CREATION SUCCESS}/following-sibling::div[@name="ACCOUNT_CREATED"]