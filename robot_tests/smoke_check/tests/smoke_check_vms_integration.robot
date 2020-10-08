*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      Regular Open Browser
Test Teardown    Run Keyword if Test Failed    Fatal Error    Smoke Check Failed - User Management
Suite Teardown   Run Keyword and Ignore Error    Clean Up

*** Keywords ***
Clean Up
    ${systems}=   Get Account Systems    ${ENV}    ${email vms}    ${password}
    ${connected}=   Run Keyword and Return Status    Should Contain    ${systems}    ${system id}
    Run Keyword If    ${connected}==${True}    Run Keywords
    ...    Disconnect    ${ENV}    ${email vms}    ${password}    ${system id}
    ...    AND    Wait Until Keyword Succeeds    5x    5s    Restore Factory Defaults    ${server vms}:${server vms port}    ${auth}
    ...    AND    Wait Until Keyword Succeeds    5x    5s    Setup Local System    ${server vms}:${server vms port}    ${password}     ${server vms name}
    Close Browser

*** Test Cases ***
Connect System To Cloud - Client
    [Tags]    C30443    C30647    vms

    Log    Step 1: Connect System to cloud in VMS
    ${system id}=   Connect System to Cloud    ${local auth}    ${server vms}:${server vms port}    ${system vms}    ${email vms}    ${password}
    Set Suite Variable    ${system id}

    Log    Step 2: Check system appeared on portal
    Go To    ${ENV}/systems
    Log In    ${email vms}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}

    Log    Step 3: Restart the server and reload the page to force the system page elements loading faster(can be omitted)
    Restart Server    ${server vms}:${server vms port}    ${local auth}
    Sleep    30
    Reload Page
    Sleep    10

    Log    Step 4: Verify Sytem Page is loaded after 60 seconds
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}    ${SERVERS LINK}    ${MERGE BUTTON SYSTEM}

Log in to VMS as cloud owner
    [Tags]    C30825    vms
    # Perform an API call to system with cloud credentials
    ${auth}=    Create List    ${email vms}    ${password}
    Get Users    ${auth}    ${server vms}:${server vms port}

Check System State On Cloud Portal
    [Tags]    C30826    vms

    Log    Step 1: Make System offline
    Restart Server    ${server vms}:${server vms port}    ${local auth}

    Log    Step 2: Check System Status
    Wait Until Elements Are Visible    ${SYSTEM NAME OFFLINE}    timeout=30
    Element Should Be Disabled    ${MERGE BUTTON SYSTEM}

    Log    Steps 3, 4: Check System Status after it's back online
    Reload Page
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}    ${SERVERS LINK}    ${MERGE BUTTON SYSTEM}    timeout=60

Disconnect System From Cloud - Portal
    [Tags]    C69845    C30653    vms

    Log    Step 1: Click on Disconnect from Nx button
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT PASSWORD INPUT}     ${DISCONNECT FORM DISCONNECT BUTTON}    ${DISCONNECT FORM CANCEL BUTTON}

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
    Run Keyword and Ignore Error    Wait Until Element Is Visible    ${SYSTEM IS SUCCESSFULLY DISCONNECTED}

    Log    Step 5: Verify System is not connected to cloud
    Restart Server    ${server vms}:${server vms port}    ${local auth}
    Sleep    10
    ${cloud system id}=   Get Cloud System Id    ${server vms}:${server vms port}    ${local auth}
    Should Be Equal As Strings    ${cloud system id}    ${EMPTY}

Disconnect System From Cloud - Client
    [Tags]    C30444    C30654    vms
    ${system id}=   Connect System to Cloud    ${local auth}    ${server vms}:${server vms port}    ${system vms}    ${email vms}    ${password}
    Set Suite Variable    ${system id}
    Reload Page
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}

    Log    Step 1: Disconnect system from cloud in client and verify it is disconnected successfully
    Detach Server From Cloud    ${server vms}:${server vms port}    ${local auth}
    ${cloud system id}=   Get Cloud System Id    ${server vms}:${server vms port}    ${local auth}
    Should Be Equal As Strings    ${cloud system id}    ${EMPTY}

    Log    Step 2: Verify system is disconnected from cloud
    @{user systems}=   Get Account Systems    ${ENV}    ${email vms}    ${password}
    Should Not Contain    ${user systems}    ${cloud system id}

    Reload Page
    Wait Until Elements Are Not Visible  ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}    ${SERVERS LINK}    ${MERGE BUTTON SYSTEM}
    Run Keyword and Ignore Error    Wait Until Location Is    ${ENV}/systems
    Run Keyword and Ignore Error    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}
    Log Out






