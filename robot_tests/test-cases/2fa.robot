*** Settings ***
Resource          ../Resources/front-end-resources/2fa-resource.robot
Suite Setup       2fa-resource.Setup
Test Setup        Run Keywords    QA Video Recording Start   2fa-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop    2fa Test Teardown
Suite Teardown    Run Keyword and Ignore Error    2fa Suite Teardown
Force Tags

*** Test Cases ***
1. Enable and perform login with 2fa
    [tags]    smoke    ci    C107768    C107769
    Log In    ${login user}    ${password}   api=${False}
    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA ENABLED BADGE}
    Log Out
    Log In    ${login user}    ${password}    2fa=${True}   api=${False}

2. 2fa login with random backup code
    [Tags]    smoke    ci    C107770
    Log In    ${login user}    ${password}   api=${False}
    ${random one time backup code}=    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA ENABLED BADGE}
    Log Out
    Login with one time backup code    ${login user}    ${password}    random one time backup code=${random one time backup code}
    Log Out
    Attempt login with used backup code    ${login user}    ${password}    random one time backup code=${random one time backup code}
    Go To    ${ENV}
    Log In    ${login user}    ${password}    2fa=${True}    api=${False}

5. Successful disabling 2FA for user with enabled 2FA for the whole account
    [Tags]    smoke    ci    C107771
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality
    Wait Until Element Is Visible    ${2FA VERIFICATION CHECKBOX}
    Checkbox Should Be Selected    ${2FA VERIFICATION CHECKBOX ID}
    Turn off 2fa Functionality
    Element Should Be Visible    ${2FA DISABLED BADGE}

6.1 2fa is required when accessing only system with 2fa required
    [Tags]    smoke    ci    C110067
    Log In    ${login user}    ${password}
    Turn on 2fa Functionality
    sleep    5
    Go to    ${ENV}/systems/${servers}[0][id]
    Verify In System    ${servers}[0][name]
    Check or uncheck mandatory 2fa for system
    #Wait Until Element Is Visible    ${SAVE BUTTON}
    #Click Element    ${SAVE BUTTON}
    Wait Until Element Is Visible    //input[@id="verificationCode"]
    ${totp}=    Get 2fa Verification Code    ${2fa key value}
    Input Text    //input[@id="verificationCode"]    ${totp}
    Click Element    //button[text()='Enable']
    Log Out
    Log In    ${login user}    ${password}    2fa=${True}

6.2 2fa is not required when accessing systems page with more than one system
    [Tags]    smoke    ci    C110067
    @{auth}    Set Variable    ${login user}    ${password}
    ${id}=     API Connect To Cloud    ${auth}    https://${QA BURBANK IP}:${servers}[1][port][0]    ${ENV}    name=${servers}[1][name]
    sleep   90
    Log In    ${login user}    ${password}
    sleep    2
    Go to    ${ENV}/systems/${id}
    Verify In System    ${servers}[1][name]
    Turn on 2fa Functionality    system_name=${servers}[1][name]
    Check or uncheck 2fa ask for verification checkbox
    Log Out
    Log In    ${login user}    ${password}
    sleep    2
    Go to    ${ENV}/systems/${id}
    Verify In System    ${servers}[1][name]