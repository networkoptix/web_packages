*** Settings ***
Library    ../../NoptixLibrary/__init__.py
Library    ../../NoptixLibrary/__init__.py
*** Keywords ***
Open Restore Password Dialog With Link
    Open Browser and go to URL    ${url}
    ${user}=   Get Random Email    ${BASE EMAIL}    extra=sendemail
    Register And Activate Account    restore    pass    ${user}    ${BASE PASSWORD}
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${user}    timeout=120    status=UNSEEN
    Check Email Subject    ${email}    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
    delete email    ${email}
    Log In    ${user}    ${password}
    Log Out
    Go To    ${url}/restore_password
    Wait Until Elements Are Visible    ${RESTORE PASSWORD EMAIL INPUT}    ${RESET PASSWORD BUTTON}
    Input Text    ${RESTORE PASSWORD EMAIL INPUT}    ${user}
    Click Button    ${RESET PASSWORD BUTTON}
    ${link}    Get Email Link    ${user}    restore_password    timeout=300
    Go To    ${link}
    Wait Until Elements Are Visible    ${RESET PASSWORD INPUT}    ${SAVE PASSWORD}
