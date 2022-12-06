*** Settings ***
Resource          ../Resources/front-end-resources/system-owner-transfer-resource.robot
Suite Setup       Owner Transfer Suite Setup
Test Setup        Run Keywords    QA Video Recording Start      Skip If Irrelevant     Skip if Cascading    OT Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop       OT Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Owner Transfer Teardown
Force Tags        system   owner_transfer   cloud

*** Variables ***
${cascade}      PASS

*** Test Cases ***
1. Validate ownership transfer modal
    [Setup]     Run Keywords    QA Video Recording Start       Skip If Irrelevant     Skip if Cascading
    Log in to user and system    ${server 1['owner']}    ${server 1['cloud id']}
    Wait Until Element Is Visible    ${CHANGE OWNERSHIP LINK}
    Click Link      ${CHANGE OWNERSHIP LINK}
    Validate Ownership Transfer Modal   ${server 1}

2. Cancel change ownership in modal
    [Tags]  C105087
    Click Button    ${OWNERSHIP TRANSFER CANCEL}
    Wait Until Element Is Not Visible    ${OWNERSHIP TRANSFER FORM}
    Wait Until Element Is Visible    ${CHANGE OWNERSHIP LINK}
    Click Link      ${CHANGE OWNERSHIP LINK}
    Validate Ownership Transfer Modal   ${server 1}

3. Cancel owner transfer in progress
    [Documentation]  Cancels and verifies no changes to ownership
    [Tags]   C105092
    Initiate Ownership Transfer    ${server 1}   viewer
    Cancel Ownership Transfer Request    ${server 1}   viewer

4. Reject owner transfer request
    [Documentation]  Rejects and verifies no changes to ownership
    [Tags]  C105091   C106289
    Initiate Ownership Transfer    ${server 1}   viewer
    Log Out
    Receive Ownership Transfer Request     ${server 1}   viewer
    Reject Ownership Transfer Request   ${server 1}

5. Accept owner transfer request
    [Documentation]  Accepts and verifies changes to ownership, old owner removed from system
    [Tags]  C105093   C106290
    Initiate Ownership Transfer    ${server 1}   viewer
    Log Out
    Receive Ownership Transfer Request     ${server 1}   viewer
    Accept Ownership Transfer Request   ${server 1}   viewer

6. Change ownership option only available for owner
    [Tags]   C105083
    [Setup]     Run Keywords    QA Video Recording Start       Skip If Irrelevant     Skip if Cascading
    [Teardown]    No Operation
    ${users} =   Get Cloud System Users    ${server 1}[cloud auth]    ${server 1}[cloud id]
    FOR  ${user}  IN   @{users}
        IF    '${user}[accountEmail]' == '${server 1}[owner]'
            Log in to user and system    ${server 1['owner']}    ${server 1['cloud id']}
            Wait Until Element Is Visible    ${CHANGE OWNERSHIP LINK}
            Log Out
        ELSE
            Log in to user and system    ${user}[accountEmail]    ${server 1['cloud id']}
            Wait Until Element Is Visible    ${SYSTEM OWNER}//span[contains(text(), "${server 1}[owner]")]
            Element Should Not Be Visible    ${CHANGE OWNERSHIP LINK}
            Log Out
        END
    END

7. No transfer ownership option for systems with no users
    [Tags]   C105083
    [Setup]     Run Keywords    QA Video Recording Start       Skip If Irrelevant
    Log in to user and system    ${server 2['owner']}    ${server 2['cloud id']}
    Wait Until Element Is Visible    ${SYSTEM OWNER}//span[contains(text(), "${YOU TEXT}")]
    Element Should Not Be Visible    ${CHANGE OWNERSHIP LINK}

8. Can't transfer ownership to disabled user
    [Tags]   C105096
    [Setup]   Run Keywords    QA Video Recording Start      Skip If Irrelevant     Skip if Cascading    Disable User OT   OT Test Setup
    [Teardown]   Run Keywords    QA Video Recording Stop    Enable User OT    OT Test Teardown
    Wait Until Element Is Visible   ${OWNERSHIP TRANSFER FORM}//ul//li/a//nx-search-highlight[contains(text(), "${server 1}[cloud users][liveViewer]")]    timeout=1
    Click Element    ${OWNERSHIP TRANSFER FORM}//ul//li/a//nx-search-highlight[contains(text(), "${server 1}[cloud users][liveViewer]")]
    Wait Until Element Is Visible   ${OWNERSHIP TRANSFER FORM}//*[contains(text(), "${USER DISABLED TEXT}")]
    Element Should Be Disabled    ${OWNERSHIP TRANSFER SEND REQUEST}

9. Can't transfer to user that's not in system
    [Tags]  C105098
    Input Text    ${OWNERSHIP TRANSFER INPUT}    ${server 2}[owner]
    Wait Until Element Is Visible   ${OWNERSHIP TRANSFER FORM}//*[contains(text(), "${USER NOT FOUND TEXT}")]
    Element Should Be Disabled    ${OWNERSHIP TRANSFER SEND REQUEST}

10. Cancel change by closing modal
    [Tags]  C105087
    Click Button    ${OWNERSHIP TRANSFER CLOSE}
    Wait Until Element Is Not Visible    ${OWNERSHIP TRANSFER FORM}
    Wait Until Element Is Visible    ${CHANGE OWNERSHIP LINK}
    Click Link      ${CHANGE OWNERSHIP LINK}
    Validate Ownership Transfer Modal   ${server 1}

11. Successful transfer for an offline system
    [Tags]  C105085
    [Setup]   Run Keywords    QA Video Recording Start      Skip If Irrelevant     Skip if Cascading    Take Server Offline   OT Test Setup
    [Teardown]    Run Keywords    QA Video Recording Stop    OT Test Teardown    Bring Server Online
    Wait Until Elements Are Visible    ${SYSTEM NAME OFFLINE}
    Initiate Ownership Transfer    ${server 1}   cloudAdmin
    Log Out
    Receive Ownership Transfer Request     ${server 1}   cloudAdmin
    Wait Until Elements Are Visible    ${SYSTEM NAME OFFLINE}
    Accept Ownership Transfer Request   ${server 1}   cloudAdmin  checkEmail=${False}
    Wait Until Elements Are Visible    ${SYSTEM NAME OFFLINE}

12. No transfer ownership option for 4.2 systems
    [Documentation]   To run with 4.2 server use:  robot -v IMAGE:4.2_test
    [Tags]   C106349
    [Setup]     Run Keywords    QA Video Recording Start       Skip If Irrelevant
    Skip If Image Is    5.0   5.1   5.2    msg=Test case designed for 4.2 and below
    Log in to user and system    ${server 1['owner']}    ${server ['cloud id']}
    Wait Until Element Is Visible    ${SYSTEM OWNER}//span[contains(text(), "${server 1}[owner]")]
    Element Should Not Be Visible    ${CHANGE OWNERSHIP LINK}
