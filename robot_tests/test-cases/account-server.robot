*** Settings ***
Resource          ../Resources/front-end-resources/account-resource.robot
Suite Setup       Account Server Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     account-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop      Account Server Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Account Server Suite Teardown
Force Tags        account

*** Test Cases ***
7. User who owns a system cannot remove themselves
    [Tags]    C69855        delete_account
    Go To    ${url}/account
    Log In    ${server 1}[cloudOwner]    ${password}    button=None   api=${False}
    Verify in Account Page
    Wait Until Element is Visible    ${DELETE ACCOUNT DISABLED BUTTON}
    Mouse Over    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Visible    ${CAN NOT DELETE ACCOUNT TOOLTIP}

8. Deletion attempt when Delete Account button is disabled (via API)
    [Tags]    C76389        delete_account
    Delete Account    ${server 1}[cloudOwner]    ${password}
    Log In    ${server 1}[cloudOwner]    ${password}