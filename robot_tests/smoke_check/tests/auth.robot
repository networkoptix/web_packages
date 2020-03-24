*** Settings ***
Resource         ../resources/vars.robot
Resource         ../../resource.robot
Resource         ../../APIresource.robot

Suite Setup      Open Browser    ${URL}    headlesschrome
Test Teardown    Run Keyword if Test Failed    Fatal Error    Smoke Check Failed - Authorization
Suite Teardown   Close Browser


*** Test Cases ***
Log In as Existing User
    [Tags]    T169283    auth
    Log In    ${email auth}    ${base password}    validate=${True}

Log Out
    [Tags]    T169276    auth
    Log Out

Create Account
    [Tags]    T169275    auth
    ${random email}=    Get Random Email    ${email base}
    Go To    ${url}/register
    Register    SmokeCheck    NewUser    ${random email}    ${base password}
    Validate Register Success
    CloudPortalAPI.Log In    ${ENV}    ${random email}    ${base password}