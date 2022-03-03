*** Settings ***
Resource          ../resource.robot
Suite Setup       2fa-resource.Setup
Test Setup        2fa-resource.Restart
Test Teardown     2fa Test Teardown
Suite Teardown    Run Keyword and Ignore Error    2fa Suite Teardown
Force Tags        Threaded



*** Test Cases ***
1. Enable and perform login with 2fa
    [tags]    C93778
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA SWITCH ENABLED}
    Log Out
    Log In    ${login user}    ${password}    2fa=${True}

2. 2fa login with random backup code
    [Tags]    C94848
    Log In    ${login user}    ${password}
    ${random one time backup code}=    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA SWITCH ENABLED}
    Log Out
    Login with one time backup code    ${login user}    ${password}    random one time backup code=${random one time backup code}
    Log Out
    Attempt login with used backup code    ${login user}    ${password}    random one time backup code=${random one time backup code}
    Go To    ${ENV}
    Log In    ${login user}    ${password}    2fa=${True}

3. Enable and perform login with 2fa using QR
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality    2fa link method=with qr scan
    Wait Until Element Is Visible    ${2FA SWITCH ENABLED}
    Log Out
    Log In    ${login user}    ${password}    2fa=${True}

4. Log in by existing user
    [Tags]    C94717
    Log In    ${login user}    ${password}
    Turn off 2fa Functionality
    Log Out
    Log In    ${login user}    ${password}
    Wait Until Element Is Visible    ${CLOUD BLOCK}

5. Successful disabling 2FA for user with enabled 2FA for specific systems
    [Tags]    C93784
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality
    Check or uncheck 2fa ask for verification checkbox
    Turn off 2fa Functionality
    Wait Until Element Is Visible    ${2FA SWITCH}
    Element Should Be Visible    ${2FA SWITCH DISABLED}

6. Successful disabling 2FA for user with enabled 2FA for the whole account
    [Tags]    C93782
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA VERIFICATION CHECKBOX}
    Checkbox Should Be Selected    ${2FA VERIFICATION CHECKBOX ID}
    Turn off 2fa Functionality
    Element Should Be Visible    ${2FA SWITCH DISABLED}

7. Successfully changing 2FA mode for user to "specific systems"
    [Tags]    C93780
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA VERIFICATION CHECKBOX}
    Checkbox Should Be Selected    ${2FA VERIFICATION CHECKBOX ID}
    Page Should Not Contain    ${2FA SECURITY PAGE SAVE BTN}
    Page Should Not Contain    ${2FA SECURITY PAGE CANCEL BTN}
    Check or uncheck 2fa ask for verification checkbox
    Checkbox Should Not Be Selected    ${2FA VERIFICATION CHECKBOX ID}
    Page Should Not Contain    ${2FA SETTINGS MODAL APPLY BTN}
    Page Should Not Contain    ${2FA SETTINGS MODAL CANCEL BTN}


8. Successfully changing 2FA mode for user to the whole account
    [Tags]    C93781
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA VERIFICATION CHECKBOX}
    Check or uncheck 2fa ask for verification checkbox
    Checkbox Should Not Be Selected    ${2FA VERIFICATION CHECKBOX ID}
    Wait Until Element Is Not Visible    ${2FA SECURITY PAGE SAVE BTN}
    Check or uncheck 2fa ask for verification checkbox
    Checkbox Should Be Selected    ${2FA VERIFICATION CHECKBOX ID}
    Page Should Not Contain    ${2FA SECURITY PAGE SAVE BTN}
    Page Should Not Contain    ${2FA SECURITY PAGE CANCEL BTN}
    Sleep    1
    
9. Unsuccessful cloud authorization with 2FA using expired code from app
    [Tags]    C94715
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA SWITCH ENABLED}
    Log Out
    Wait Until Element Is Visible    ${LOG IN NAV BAR}
    Sleep    1
    Click Element    ${LOG IN NAV BAR}
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${login user}
    Wait Until Element Is Visible    ${LOG IN NEXT BUTTON}
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element Is Visible    ${PASSWORD INPUT}
    Wait Until Keyword Succeeds    10    0.5   Input Text     ${PASSWORD INPUT}    ${password}
    Wait Until Element Is Visible    ${LOG IN BUTTON}
    Click Button    ${LOG IN BUTTON}
    Generate totp wait for a minute and try to login    ${login user}
    Go To    ${ENV}

10. 2fa api call login with totp token
    ${2fa key value}=    Toggle 2fa On API    ${login user}    ${password}
    Set Global Variable    ${2FA KEY VALUE}    ${2fa key value}
    ${totp}=    Get 2fa Verification Code    ${2FA KEY VALUE}
    Api Log In    email=${login user}    password=${password}    verification_code=${totp}

11. 2fa api call login with backout code
    ${2fa key value}=    Toggle 2fa On API    ${login user}    ${password}
    Set Global Variable    ${2FA KEY VALUE}    ${2fa key value}
    ${totp}=    Get 2fa Verification Code    ${2FA KEY VALUE}
    Generate 2fa Backup Codes API    email=${login user}    password=${password}    verification_code=${totp}
    ${totp}=    Get 2fa Verification Code    ${2FA KEY VALUE}
    ${backup code}=    Get 2fa Backup Codes API    email=${login user}    password=${password}    verification_code=${totp}
    Api Log In    email=${login user}    password=${password}    backup_code=${backup code}