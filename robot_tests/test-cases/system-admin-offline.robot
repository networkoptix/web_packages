*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Offline Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     System Offline Restart
Test Teardown     Run Keywords    QA Video Recording Stop
Suite Teardown    Run Keyword and Ignore Error    System Offline Suite Teardown
Force Tags        system    system_offline


*** Test Cases ***

14. System changes state to offline if all its Servers goes offline
    [Tags]    C41894    C30826
    Log Out

    Log    Step 1
    Log in to user and system    ${extra system}[cloudOwner]   ${extra system}[id]
    ${current owner name}=    Replace String    ${OWNER NAME}    %OWNER_NAME%    ${YOU TEXT}
    Wait Until Element Is Visible    ${current owner name}

    Log    Step 2
    Stop container    ${extra system}[container]
    Reload Page
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}

    Log    Step 3
    Start container   ${extra system}[container]
    Reload Page
    Wait Until Element Is Not Visible    ${SYSTEM NAME OFFLINE}