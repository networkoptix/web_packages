*** Keywords ***
Restart
    Close Browser
    Open Restore Password Dialog With Link

Open Restore Password Dialog With Link
    Open Browser and go to URL    ${url}
    ${user}=   Register and activate account with random email    mark    hamil    ${password}
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

Check New Password Badge
    [arguments]    ${new pw}
    Run Keyword Unless    '''${new pw}'''=='''${EMPTY}'''    Wait Until Element Is Visible    ${PASSWORD BADGE}
    Run Keyword If    '''${new pw}''' in ${weak passwords}         Element Should Be Visible    ${PASSWORD IS WEAK BADGE}
    ...    ELSE IF    '''${new pw}''' in ${incorrect passwords}    Element Should Be Visible    ${PASSWORD INCORRECT BADGE}
    ...    ELSE IF    '''${new pw}''' in ${fair passwords}         Element Should Be Visible    ${PASSWORD IS FAIR BADGE}
    ...    ELSE IF    '''${new pw}''' in ${good passwords}         Element Should Be Visible    ${PASSWORD IS GOOD BADGE}

Check New Password Outline
    [Arguments]   ${new pw}
    Wait Until Element Is Visible    ${FORM WITH ERROR}
    Run Keyword If    '''${new pw}'''=='''${EMPTY}''' or '''${new pw}'''=='''${SPACE}'''    Element Should Be Visible    ${PASSWORD IS REQUIRED}
    ...    ELSE IF    '''${new pw}'''=='''${7char password}'''    Element Should Be Visible    ${PASSWORD TOO SHORT}
    ...    ELSE IF    '''${new pw}''' in ${incorrect passwords}    Element Should Be Visible    ${PASSWORD SPECIAL CHARS}
    ...    ELSE IF    '''${new pw}'''=='''${common password}'''    Element Should Be Visible    ${PASSWORD TOO COMMON}
    ...    ELSE IF    '''${new pw}''' in ${weak passwords}    Element Should Be Visible    ${PASSWORD IS WEAK}
