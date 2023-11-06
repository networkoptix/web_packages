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

9. Can't transfer to user that's not in system
    [Tags]  C105098
    Input Text    ${OWNERSHIP TRANSFER INPUT}    ${server 2}[cloudOwner]
    Wait Until Element Is Visible   ${OWNERSHIP TRANSFER FORM}//*[contains(text(), "${USER NOT FOUND TEXT}")]
    Element Should Be Disabled    ${OWNERSHIP TRANSFER SEND REQUEST}

12. No transfer ownership option for 4.2 systems
    [Documentation]   To run with 4.2 server use:  robot -v IMAGE:4.2_test
    [Tags]   C106349
    [Setup]     Run Keywords    QA Video Recording Start       Skip If Irrelevant
    [Teardown]    QA Video Recording Stop
    Skip If Image Is    5.0   5.1   5.2    msg=Test case designed for 4.2 and below
    Log in to user and system    ${server 1['cloudOwner']}    ${server ['id']}
    Wait Until Element Is Visible    ${SYSTEM OWNER}//span[contains(text(), "${server 1}[cloudOwner]")]
    Element Should Not Be Visible    ${CHANGE OWNERSHIP LINK}
