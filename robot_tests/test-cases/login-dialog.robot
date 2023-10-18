*** Settings ***
Resource          ../Resources/front-end-resources/login-dialog-resource.robot
Suite Setup       login-dialog-resource.Setup
Test Setup        Run Keywords    QA Video Recording Start     login-dialog-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop      Login Dialog Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags        Threaded

*** Test Cases ***

21. Log in more than 5 times
    [tags]    C42075
    Go To    ${url}/authorize?client_type=create
    ${email}    Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Register    ${TEST FIRST NAME}    ${TEST LAST NAME}    ${email}    ${BASE PASSWORD}
    Activate    ${email}
    Wait Until Element Is Visible    ${LOG IN BTN ACTIVATE ACCOUNT PAGE}
    Click Button    ${LOG IN BTN ACTIVATE ACCOUNT PAGE}
    Wait Until Elements are Visible
    ...    ${LOG IN MODAL}
    ...    ${LOG IN BUTTON}
    ...    ${PASSWORD INPUT}
    FOR  ${x}  IN RANGE  6
        Sleep    2
        Input Text    ${PASSWORD INPUT}    incorrect
        Wait Until Element is Visible    ${LOG IN BUTTON}
        Click Button    ${LOG IN BUTTON}
        Sleep    1
    END
    Wait Until Element is Visible    ${TOO MANY ATTEMPTS MESSAGE}
    Sleep    65
    Input Text    ${PASSWORD INPUT}    ${BASE PASSWORD}
    Wait Until Element is Visible    ${LOG IN BUTTON}
    Click Button    ${LOG IN BUTTON}
    Validate Log In    ${email}

22. User is logged out of browser after a password change in another browser
    [tags]    C41837
    Close All Browsers
    Open Browser and go to URL    ${url}
    Log In    ${login user}    ${password}   api=${False}
    Open Browser and go to URL    ${url}
    Get Browser Ids
    Switch Browser    1
    #Log In    ${email}    ${password}
    #Switch Browser    1
    Go To    ${url}/account/password
    Sleep    1
    Wait Until Elements are Visible
    ...    ${CURRENT PASSWORD INPUT}
    ...    ${NEW PASSWORD INPUT}
    Input Text    ${CURRENT PASSWORD INPUT}    ${password}
    Input Text    ${NEW PASSWORD INPUT}    ${ALT PASSWORD}
    Click Button    ${CHANGE PASSWORD BUTTON}
    Switch Browser    2
    # wait for server to disconnect user
    sleep    30

    Validate Log Out
    Sleep    1

    Log In    ${login user}    ${ALT PASSWORD}    validate=${False}     api=${False}
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}
    Sleep    2
    Go To    ${url}/account/password
    Sleep    1
    Wait Until Elements are Visible
    ...    ${CURRENT PASSWORD INPUT}
    ...    ${NEW PASSWORD INPUT}
    Input Text    ${CURRENT PASSWORD INPUT}    ${ALT PASSWORD}
    Input Text    ${NEW PASSWORD INPUT}    ${password}
    Click Button    ${CHANGE PASSWORD BUTTON}
