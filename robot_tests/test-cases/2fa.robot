*** Settings ***
Resource          ../resource.robot
Resource    ../Resources/front-end-resources/2fa-resource.robot
Suite Setup       Setup
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Open New Browser On Failure
Suite Teardown    Close All Browsers
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

Restart
    Go To    ${url}
    Common Restart Logout    ${url}


*** Test Cases ***
1. Enable and perform login with 2fa
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA SWITCH ENABLED}
    Log Out
    Log In    ${login user}    ${password}    2fa=${True}
    Turn off 2fa Functionality

2. 2fa login with random backup code
    Log In    ${login user}    ${password}
    ${random one time backup code}=    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA SWITCH ENABLED}
    Log Out
    Login with one time backup code    ${login user}    ${password}    random one time backup code=${random one time backup code}
    Log Out
    Attempt login with used backup code    ${login user}    ${password}    random one time backup code=${random one time backup code}
    Go To    ${ENV}
    Log In    ${login user}    ${password}    2fa=${True}
    Turn off 2fa Functionality

3. Enable and perform login with 2fa using QR
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality    2fa link method=with qr scan
    Wait Until Element Is Visible    ${2FA SWITCH ENABLED}
    Log Out
    Log In    ${login user}    ${password}    2fa=${True}
    Turn off 2fa Functionality

#4. 2fa login with api call
#    Log In    ${login user}    ${password}
#    Turn on 2fa Functionality
#    Wait Until Element Is Visible    ${2FA SWITCH ENABLED}
#    Log Out
#    Login With Code    username=${login user}    password=${password}    verification_code=${2FA KEY VALUE}
#    Go To    https://cloud-test.hdw.mx/systems
#    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}
#    Wait Until Element Contains    ${ACCOUNT DROPDOWN}    ${login user}