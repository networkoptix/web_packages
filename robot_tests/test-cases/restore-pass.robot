*** Settings ***
Resource          ../Resources/front-end-resources/restore-pass-resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Run Keywords    QA Video Recording Start     Restart Restore Pass
Test Teardown     Run Keywords    QA Video Recording Stop      Restore Pass Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Close All Browsers
Force Tags

*** Test Cases ***
8. Non-activated user cannot get to password entry page to restore password
    [Tags]    email    C41871
    ${email}    Get Random Email    ${BASE EMAIL}    sendemail=${True}
    Go To    ${url}/register
    Register    mark    hamill    ${email}    ${password}
    Go To    ${url}/authorize
    Wait Until Elements Are Visible    ${LOG IN MODAL}    ${LOG IN NEXT BUTTON}    ${EMAIL INPUT}
    Sleep    1
    Wait Until Keyword Succeeds    10    0.5    Input Text    ${EMAIL INPUT}    ${email}
    Sleep    1
    Click Button    ${LOG IN NEXT BUTTON}
    Wait Until Element Has Style    ${EMAIL INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Wait Until Element Has Style    ${EMAIL INPUT}    border-color    ${ERROR COLOR}
    Wait Until Element Is Visible    ${REGISTER NOT ACTIVATED}
