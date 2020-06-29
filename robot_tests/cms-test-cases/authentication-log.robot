** Settings ***
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


*** Test Cases ***
Open log
    [Tags]    C56677    C56679
    Go to    ${url}/admin
    Log In    ${email}    ${password}    button=None    cms=${True}    validate=${False}
    Wait Until Elements Are Visible    //ul[@id="navigation-menu"]    //div[@id="dashboard"]
    Wait Until Element is Visible    ${AUTHENTICATION LOG LINK}
    Click Link    ${AUTHENTICATION LOG LINK}
