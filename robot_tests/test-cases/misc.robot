*** Settings ***
Resource          ../resource.robot
Test Setup        Run Keywords    QA Video Recording Start
Test Teardown     Run Keywords    QA Video Recording Stop      Close Browser
Force Tags        Threaded


*** Test Cases ***
3. The logo takes you to the systems page when logged in
    [Tags]    C41540
    Open Browser And Go To URL    ${url}/authorize/register
    ${user}    Register And Activate Account With Random Email    mark    hamill    ${BASE PASSWORD}
    Log In    ${user}    ${BASE PASSWORD}
    Go To    ${ENV}/account
    Wait Until Element Is Visible    ${HEADER ICON LINK}
    Click Link    ${HEADER ICON LINK}
    Wait Until Location Is    ${url}/systems

4. Language can be changed on landing page
    [Tags]    C41549
    Open Browser and go to URL    ${url}
    Set Language Anonymous    de_DE
    Wait Until Element is Visible    //header//a/span[contains(text(),"Account erstellen")]