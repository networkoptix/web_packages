*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      Auth Suite Setup
Test Teardown    Run Keyword if Test Failed    Common Restart Logout    ${ENV}
Suite Teardown   Close Browser

*** Keywords ***
Auth Suite Setup
    Open browser and go to URL    ${ENV}    False    False
    ${email}=   Get Random Email Robot    ${email base}
    Run Keyword If     'nxvms' not in $env    Run Keywords
       ...    Register And Activate Account    SmokeCheck    Auth    ${email}    ${password}    AND
       ...    Set Suite Variable    ${email auth}    ${email}

Auth Suite Teardown
    Close Browser
    ${deleted}=   Run keyword and return status    Delete Account    ${ENV}    ${random email}    ${password}

*** Test Cases ***
Log in and Log out as Existing User
    [Tags]    C30450    C30442    auth
    Log In    ${email auth}    ${password}
    Log Out

Create Account
    [Tags]    C30440    auth
    ${random email}=    Get Random Email Robot    ${email base}
    Set Suite Variable    ${random email}
    Log    Step 1: Fill and send Create account form
    Register    SmokeCheck    NewUser    ${random email}    ${password}
    Validate Register Success

    Log    Step 2: Check email with Activation link
    ${link}=   Run Keyword If    'nxvms' in $env    Get the link from email    ${email base}    ${random email}    ${email password}    activate
    ${code}=   Run Keyword If    'nxvms' not in $env    Get Code From Email    ${cloud auth}    ${random email}    activate_account

    Log    Step 3: Click on Activation link
    Run Keyword If    'nxvms' in $env    Go To    ${link}
       ...    ELSE    Go To    ${ENV}/activate/${code}
    Validate Activation Success

    Log    Step 4: Log in
    Click Button    ${ACTIVATION SUCCESS LOG IN BUTTON}
    Log In    ${random email}    ${password}    validate=${True}    button=None
