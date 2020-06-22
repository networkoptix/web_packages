*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
#Test Setup        Server Settings Test Setup    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
Test Teardown     cms log out
Suite Teardown    Close All Browsers
#Force Tags        system

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
@{auth}        ${email}    ${password}
${url}         ${ENV}

*** Keywords ***
cms log out
    Click link    //a[@href="/admin/logout/"]

*** Test Cases ***
Going to /admin as anonymous prompts to log in
    [Tags]    C56677    C56679
    Go to    ${url}/admin
    Log In    ${email}    ${password}    button=None    cms=${True}    validate=${False}
    Wait Until Elements Are Visible    //ul[@id="navigation-menu"]    //div[@id="dashboard"]

Going to /admin and logging in as a user who is not staff redirects to landing page
    [Tags]    C56678
    Go to    ${url}/admin
    Log In    ${EMAIL VIEWER}    ${password}    button=None    cms=${False}    validate=${True}
    [Teardown]    log out

Clicking administration in account dropdown takes you to admin
    [Tags]    C56680
    Log In    ${email}    ${password}
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Wait Until Page Contains Element    ${LOG OUT BUTTON}
    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}
    Sleep    .05    #Ubuntu was clicking too soon
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    //a[@href="/admin/"]
    Click Link    //a[@href="/admin/"]
    ${tabs}=   Get Window Handles
    Select Window    ${tabs}[1]
    Wait Until Elements Are Visible    //ul[@id="navigation-menu"]    //div[@id="dashboard"]

Non-staff user does not see administration link
    [Tags]    C56681
    Log In    ${EMAIL VIEWER}    ${password}
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Wait Until Page Contains Element    ${LOG OUT BUTTON}
    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}
    Sleep    .05    #Ubuntu was clicking too soon
    Click Button    ${ACCOUNT DROPDOWN}
    Wait Until Element is Visible    ${LOG OUT BUTTON}
    Element Should Not Be Visible    //a[@href="/admin/"]
    Click Button    ${ACCOUNT DROPDOWN}
    [Teardown]    log out
