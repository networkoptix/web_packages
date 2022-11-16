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
    [Tags]
    Initiate Ownership Transfer    ${server 1}   viewer
    Log Out
    Receive Ownership Transfer Request     ${server 1}   viewer
    Reject Ownership Transfer Request   ${server 1}

5. Accept owner transfer request
    [Documentation]  Accepts and verifies changes to ownership, old owner removed from system
    [Tags]
    Initiate Ownership Transfer    ${server 1}   viewer
    Log Out
    Receive Ownership Transfer Request     ${server 1}   viewer
    Accept Ownership Transfer Request   ${server 1}   viewer








