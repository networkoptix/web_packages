*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      Auth Suite Setup
Test Teardown    Run Keyword if Test Failed    Common Restart Logout    ${ENV}
Suite Teardown   Close Browser

*** Keywords ***
Auth Suite Setup
    Open browser and go to URL    ${ENV}    False    False
    ${email auth}=   Get Random Email    ${email base}
    Register And Activate Account    SmokeCheck    Auth    ${email auth}    ${password}
    Set Suite Variable    ${email auth}    ${email auth}

*** Test Cases ***
Log in and Log out as Existing User
    [Tags]    T169283    T169276    auth
    Log In    ${email auth}    ${password}
    Log Out

Create Account
    [Tags]    T169275    auth
    ${random email}=    Get Random Email    ${email base}

    Log    Step 1: Fill and send Create account form
    Register    SmokeCheck    NewUser    ${random email}    ${password}
    Validate Register Success

    Log    Step 2: Check email with Activation link
    ${code}=   Get Code From Email    ${ENV}    ${cloud auth}    ${random email}    activate_account

    Log    Step 3: Click on Activation link
    Go To    ${ENV}/activate/${code}
    Validate Activation Success

    Log    Step 4: Log in
    Click Button    ${ACTIVATION SUCCESS LOG IN BUTTON}
    Log In    ${random email}    ${password}    validate=${True}    button=None
