*** Settings ***
Resource          ../resource.robot
Resource    ../Resources/front-end-resources/2fa-resource.robot
Suite Setup       Setup
Test Setup        Restart
Test Teardown     Turn off 2fa Functionality    ${login user}    ${password}
Suite Teardown    2fa Suite Teardown
Force Tags        Threaded

*** Variables ***
${email}    ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
${url}         ${ENV}

*** Keywords ***
Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Setup
    Open Browser and go to URL    ${url}
    ${user}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Set Suite Variable    ${login user}    ${user}
    ${rand}=   Generate Random String
    ${system}=   Create Base System    system-admin-${rand}    image=${IMAGE}    owner=${login user}    add users=${False}
    Set Suite Variable    ${server url}    https://${QABURBANK IP}:${system}[port]
    Set Suite Variable    ${system}    ${system}
    ${local system}=   Run Keyword If   '''${mode}'''=='''webadmin'''    Create Base System    system_admin_local_${rand}    image=${IMAGE}
    Set Suite Variable    ${system}
    Set Suite Variable    ${local system}
    Sleep    6

Restart
    Go To    ${url}
    Common Restart Logout    ${url}

2fa Suite Teardown
    Close All Browsers
    Delete Base System    ${system}

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
    
9. Unsuccessful cloud authorization with 2FA using expired code from app
    [Tags]    C94715
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA SWITCH ENABLED}
    Log Out
    Wait Until Element Is Visible    ${LOG IN NAV BAR}
    Sleep    .5
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

#10. 2fa login with api call
#    Log In    ${login user}    ${password}
#    Turn on 2fa Functionality
#    Wait Until Element Is Visible    ${2FA SWITCH ENABLED}
#    Log Out
#    Login With Code    username=${login user}    password=${password}    verification_code=${2FA KEY VALUE}
#    Go To    https://cloud-test.hdw.mx/systems
#    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}
#    Wait Until Element Contains    ${ACCOUNT DROPDOWN}    ${login user}