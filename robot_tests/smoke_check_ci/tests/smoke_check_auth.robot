*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      Auth Suite Setup
Test Teardown    Run Keyword if Test Failed    Common Restart Logout    ${ENV}
Suite Teardown   Close Browser

*** Keywords ***
Auth Suite Setup
    Base Suite Setup
    ${email auth}=   Register and activate account with random email    SmokeCheck    Auth    ${base password}
    Set Suite Variable    ${email auth}
    Go To    ${ENV}

Auth Suite Teardown
    Close Browser
    ${deleted}=   Run keyword and return status    Delete Account    ${email auth}    ${password}

*** Test Cases ***
Log in and Log out as Existing User
    [Tags]    C30450    C30442    auth
    Log In    ${email auth}    ${password}
    Log Out

