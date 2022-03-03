*** Keywords ***
Restart
    Common Restart Logout    ${url}

Open New Browser and Reset DB On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Clear Register Fields
    Wait Until Elements Are Visible    ${REGISTER FIRST NAME INPUT}    ${REGISTER LAST NAME INPUT}    ${REGISTER PASSWORD INPUT}    ${CREATE ACCOUNT BUTTON}
    Clear Element Text    ${REGISTER PASSWORD INPUT}
    Clear Element Text    ${REGISTER LAST NAME INPUT}
    Clear Element Text    ${REGISTER FIRST NAME INPUT}
    Clear Element Text    ${REGISTER EMAIL INPUT}
