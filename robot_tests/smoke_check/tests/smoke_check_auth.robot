*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      Open Browser    ${ENV}    headlesschrome
Test Teardown    Run Keyword if Test Failed    Fatal Error    Smoke Check Failed - Authorization
Suite Teardown   Close Browser

*** Test Cases ***
Log In as Existing User
    [Tags]    T169283    auth

    Log In    ${email auth}    ${password}

Log Out
    [Tags]    T169276    auth

    Log Out

Create Account
    [Tags]    T169275    auth

    ${random email}=    Get Random Email    ${email base}

    Log    Step 1: Fill and send Create account form
    Register    SmokeCheck    NewUser    ${random email}    ${password}
    Validate Register Success

    Log    Step 2: Check email with Activation link
    ${link}=   Get the link from email    ${email base}    ${random email}    ${email password}    activate

    Log    Step 3: Click on Activation link
    Go To    ${link}
    Validate Activation Success

    Log    Step 4: Log in
    Click Button    ${ACTIVATION SUCCESS LOG IN BUTTON}
    Log In    ${random email}    ${password}    validate=${True}    button=None
