*** Settings ***
Variables    getvars.py

*** Variables ***
${REGISTER FORM}                      //form[@id='registerForm']
${REGISTER FIRST NAME INPUT}          ${REGISTER FORM}//input[@id='firstName']
${REGISTER LAST NAME INPUT}           ${REGISTER FORM}//input[@id='lastName']
${REGISTER EMAIL INPUT}               ${REGISTER FORM}//input[@id='registerEmail']
${REGISTER EMAIL INPUT LOCKED}        ${REGISTER FORM}//input[@name='registerEmailLocked']
${REGISTER PASSWORD INPUT}            ${REGISTER FORM}//input[@id='registerPassword']

${TERMS AND CONDITIONS CHECKBOX VISIBLE}    ${REGISTER FORM}//label[@class="nx-checkbox"]
${TERMS AND CONDITIONS CHECKBOX REAL}       ${REGISTER FORM}//input[@id='accept']

${CREATE ACCOUNT BUTTON}              ${REGISTER FORM}//button[contains(text(),"${CREATE ACCOUNT BUTTON TEXT}")]
${TERMS AND CONDITIONS LINK}          ${REGISTER FORM}//a[@href='/content/eula']
${TERMS AND CONDITIONS ERROR}         ${REGISTER FORM}//span[@class='help-block input-error' and contains(text(),"${TERMS AND CONDITIONS ERROR TEXT}")]
${PRIVACY POLICY LINK}                ${REGISTER FORM}//a[@href='${PRIVACY POLICY URL HREF}']
${RESEND ACTIVATION LINK BUTTON}      //form[@name= 'loginForm']//a[contains(text(),"${RESEND ACTIVATION LINK BUTTON TEXT}")]
${REGISTER EYE ICON OPEN}             ${REGISTER FORM}${EYE ICON OPEN}
${REGISTER EYE ICON CLOSED}           ${REGISTER FORM}${EYE ICON CLOSED}

${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}} invites you to %PRODUCT_NAME%

${ACCOUNT CREATION SUCCESS}           //h2[@name="ACCOUNT_CREATED" and contains(text(),"${ACCOUNT CREATED TEXT}")]
${ACCOUNT CREATION SUCCESS ICON}      //div[@name="ACCOUNT_CREATED"]/svg-icon
${ACCOUNT CREATION CONFIRMATION}      ${ACCOUNT CREATION SUCCESS}/following-sibling::div[@name="ACCOUNT_CREATED"]