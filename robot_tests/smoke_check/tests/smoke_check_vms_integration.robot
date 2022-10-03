*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      VMS Suite Setup
Test Teardown    Run Keyword if Test Failed    Common Restart Logout    ${ENV}
Suite Teardown   VMS Suite Teardown

*** Keywords ***
VMS Suite Setup
    Open browser and go to URL    ${ENV}    False    False
    ${email}=    Get Random Email Robot    ${email base}
    Run Keyword If     'nxvms' not in $env    Run Keywords
       ...    Register And Activate Account    SmokeCheck    VMS    ${email}    ${password}    AND
       ...    Set Suite Variable    ${email vms}    ${email}

    ${system vms}=   Setup Remote System    ${ssh auth}    ciqa    system_vms    ${ssh host ip}    ${system vms port}
    ${cloud id}=   Connect System to Cloud    ${local auth}   https://${system vms}[ip]:${system vms}[port]    ${system vms}[name]    ${email vms}    ${password}    ${ENV}
    Set To Dictionary    ${system vms}    cloud id=${cloud id}
    Set Suite Variable    ${system vms}    ${system vms}
    Restart Server    https://${system vms}[ip]:${system vms}[port]    ${local auth}
    Sleep    60

VMS Suite Teardown
    Acquire Lock    teardown_lock
    Open Connection    ${ssh host ip}
    SSHLibrary.Login    username=${ssh auth}[0]    password=${ssh auth}[1]
    Execute Command    docker rm -f ${system vms}[cont]
    Close All Connections
    Release Lock    teardown_lock
    Close Browser

*** Test Cases ***
Connect System To Cloud - Client
    [Tags]    C30443    C30647    vms

    Go To    ${ENV}/systems
    Log In    ${email vms}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible
    ...    ${DISCONNECT FROM NX}
    ...    ${RENAME SYSTEM}
    ...    ${MERGE BUTTON SYSTEM}
    ...    ${SYSTEM GENERAL LINK}
    ...    ${CAMERAS LINK}
    ...    ${USERS LIST LINK}
    ...    ${SERVERS LINK}
    ...    //span[contains(@class, "system-owner")]//span[contains(text(), "${YOU TEXT}")]
    ...    //form[@id="systemSettingsForm"]
    ...    //form[@id="securitySettingsForm"]
    Log Out

API call to server with cloud credentials
    [Tags]    vms
    ${auth}=    Create List    ${email vms}    ${password}
    Get Users    ${auth}    https://${system vms}[ip]:${system vms}[port]

Check System State On Cloud Portal
    [Tags]    C30826    vms

    Go To    ${ENV}/systems/${system vms}[cloud id]
    Log In    ${email vms}    ${password}    validate=${False}    button=None

    Log    Step 1: Make System offline
    Restart Server    https://${system vms}[ip]:${system vms}[port]    ${local auth}

    Log    Step 2: Check System Status
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}    timeout=20

    Log    Steps 3, 4: Check System Status after it's back online
    Reload Page
    Wait Until Element Is Not Visible    ${SYSTEM OFFLINE}    timeout=60
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${USERS LIST LINK}    ${SERVERS LINK}    ${MERGE BUTTON SYSTEM}    timeout=60
    Log Out

Disconnect System From Cloud - Portal
    [Tags]    C69845    C30653    vms

    Go To    ${ENV}/systems/${system vms}[cloud id]
    Log In    ${email vms}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}    ${SERVERS LINK}    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    Step 1: Click on Disconnect from Nx button
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible
    ...    ${DISCONNECT PASSWORD INPUT}
    ...    ${DISCONNECT FORM DISCONNECT BUTTON}
    ...    ${DISCONNECT FORM CANCEL BUTTON}
    ...    ${DISCONNECT FORM CLOSE BUTTON}
    ...    ${DISCONNECT FORM ALL USERS WILL BE DELETED}

    Log    Step 2: Click on Disconnect button
    Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    Wait Until Element Is Visible    ${DISCONNECT FORM PASSWORD IS REQUIRED}

    Log    Step 3: Click on Cancel button
    Click Element    ${DISCONNECT FORM CANCEL BUTTON}
    Wait until Element Is Not Visible    ${DISCONNECT FORM}
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}

    Log    Step 4: Disconnect System
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT PASSWORD INPUT}     ${DISCONNECT FORM DISCONNECT BUTTON}
    Input Text    ${DISCONNECT PASSWORD INPUT}    ${password}
    Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FROM NX}
    Run keyword and continue on failure    Check For Alert    ${SYSTEM IS SUCCESSFULLY DISCONNECTED}
    Run keyword and continue on failure    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}

    Log    Step 5: Verify System is not connected to cloud
    Restart Server    https://${system vms}[ip]:${system vms}[port]    ${local auth}
    Sleep    10
    ${cloud system id}=   Get Cloud System Id    https://${system vms}[ip]:${system vms}[port]    ${local auth}
    Should Be Equal As Strings    ${cloud system id}    ${EMPTY}
    Log Out

Disconnect System From Cloud - Client
    [Tags]    C30444    C30654    vms

    ${system id}=   Connect System to Cloud    ${local auth}    https://${system vms}[ip]:${system vms}[port]    ${system vms}[name]    ${email vms}   ${password}
    Go To    ${ENV}/systems/${system id}
    Log In    ${email vms}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}

    Log    Step 1: Disconnect system from cloud in client and verify it is disconnected successfully
    Detach Server From Cloud    https://${system vms}[ip]:${system vms}[port]    ${local auth}
    ${cloud system id}=   Get Cloud System Id    https://${system vms}[ip]:${system vms}[port]    ${local auth}
    Should Be Equal As Strings    ${cloud system id}    ${EMPTY}

    Log    Step 2: Verify system is disconnected from cloud
    ${user systems}=   Get Account Systems    ${email vms}    ${password}
    Should Not Contain    ${user systems}    ${system id}

    Go To    ${ENV}/systems/
    Wait Until Elements Are Not Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}    ${SERVERS LINK}    ${MERGE BUTTON SYSTEM}
    Run keyword and continue on failure    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}
    Log Out
