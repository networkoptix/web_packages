*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Offline Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     System Offline Restart
Test Teardown     Run Keywords    QA Video Recording Stop
Suite Teardown    Run Keyword and Ignore Error    System Offline Suite Teardown
Force Tags        system    system_offline


*** Test Cases ***
9. Offline system should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    [Tags]    C41572        
    ${random email}=   Register and activate account with random email    mark    hamill   ${BASE PASSWORD}
    Log Out
    Log In    ${random email}    ${base password}
    Go To    ${ENV}/systems/${system}[id]
    Wait Until Elements Are Visible    ${SYSTEM NO ACCESS}    ${TAKE ME HOME}
    Slow   Click Link    ${TAKE ME HOME}
    Wait Until Location Is    ${ENV}/systems

#See CLOUD-6592: offline system cannot be renamed
#Owner is able to rename offline system via Cloud
#    [Tags]    C41899    
#    ${new name}=   Get random system name
#    Change System Name    ${new name}
#    Log Out
#
#    # Make sure new name is saved
#    Log in to user and system    ${system}[cloudOwner]   ${system}[id]
#    ${current name}=   Get Text    //h2[@id="editable-title"]
#    ${system info}=   Get Cloud System Settings    ${cloud auth}    ${system}[clud id]
#    Should be equal as strings    ${system}[name]     ${new name}
#    Should be equal as strings    ${current name}     ${new name}
#
#    # Return to initial name
#    Rename System    ${auth}    ${system}[id]    ${system}[name]
#
#    # Make sure old name is saved
#    ${system info}=   Get Cloud System Settings    ${auth}    ${system}[id]
#    Should be equal as strings    ${system info}[name]     ${system}[name]

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