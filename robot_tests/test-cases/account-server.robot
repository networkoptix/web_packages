*** Settings ***
Resource          ../Resources/front-end-resources/account-resource.robot
Suite Setup       Account Server Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     account-resource.Restart
Test Teardown     Run Keywords    QA Video Recording Stop      Account Server Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Account Server Suite Teardown
Force Tags        account

*** Test Cases ***
1. Delete account button becomes enabled
    [Tags]    C69856        delete_account
    Go To    ${url}/account
    Log In    ${server 4}[cloudOwner]    ${password}    button=None   api=${False}
    Verify in Account Page
    Wait Until Element is Visible    ${DELETE ACCOUNT DISABLED BUTTON}
    Mouse Over    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Visible    ${CAN NOT DELETE ACCOUNT TOOLTIP}
    Detach Server From Cloud    https://${QA BURBANK IP}:${server 5}[port][0]    ${server 5}[localAuth]
    Reload page
    Wait Until Element is Visible    ${DELETE ACCOUNT DISABLED BUTTON}
    Mouse Over    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Visible    ${CAN NOT DELETE ACCOUNT TOOLTIP}
    Detach Server From Cloud    https://${QA BURBANK IP}:${server 4}[port][0]    ${server 4}[localAuth]
    Sleep    20
    Reload page
    Wait Until Element Is Visible    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Enabled    ${DELETE ACCOUNT BUTTON}

2. After account deletion user is deleted from all systems that were shared with this user
    [Tags]    C69862    delete_account
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Share    ${server 1}[cloudAuth]    ${server 1}[id]    ${ACCESS ROLES}[admin]    ${random email}      ${permissions}[cloudAdmin]
    Share    ${server 1}[cloudAuth]    ${server 2}[id]    ${ACCESS ROLES}[viewer]    ${random email}     ${permissions}[viewer]
    Share    ${server 1}[cloudAuth]    ${server 3}[id]    ${ACCESS ROLES}[custom]    ${random email}     ${permissions}[custom]
    Go To    ${url}/account
    Log In    ${random email}    ${password}    button=None    api=${False}
    Verify in Account Page
    Click Button    ${DELETE ACCOUNT BUTTON}
    Verify Delete User Dialog
    Input Text    ${DELETE ACCOUNT PASSWORD INPUT}    ${BASE PASSWORD}
    Click Button    ${DELETE ACCOUNT MODAL BUTTON}
    Validate Log Out
    Log In    ${random email}    ${password}   validate=${False}    exists=${False}   api=${False}
    Log In    ${server 1}[cloudOwner]    ${password}    button=None   api=${False}
    Go To   ${url}/systems/${server 1}[id]
    Go to Users List
    Wait Until Element Is Visible    ${USERS LIST}
    Wait Until Element Is Not Visible    ${USERS LIST}//nx-level-3-item//span[contains(text(),'${random email}')]/../../../a

    Go To   ${url}/systems/${server 2}[id]
    Go to Users List
    Wait Until Element Is Visible    ${USERS LIST}
    Wait Until Element Is Not Visible    ${USERS LIST}//nx-level-3-item//span[contains(text(),'${random email}')]/../../../a

    Go To   ${url}/systems/${server 3}[id]
    Go to Users List
    Wait Until Element Is Visible    ${USERS LIST}
    Wait Until Element Is Not Visible    ${USERS LIST}//nx-level-3-item//span[contains(text(),'${random email}')]/../../../a

3. Admin and Owner can access account settings by selecting themselves in users List
    [Tags]
    Go To    ${url}
    Log In    ${server 1}[cloudOwner]    ${password}
    Go To    ${url}/systems/${server 1}[id]
    Go To Users List
    Select User in Users List    ${server 1}[cloudOwner]
    Wait Until Element is Visible    ${ACCOUNT SETTINGS BUTTON SYSTEM}
    Click Button    ${ACCOUNT SETTINGS BUTTON SYSTEM}
    Verify in Account Page

4. Change first and last name shows in system
    [Tags]    C41573    C30655   CLOUD-10176
    Go To    ${url}/account
    Log In    ${server 1}[cloudUsers][liveViewer]    ${password}    button=None    api=${False}
    Verify in Account Page
    Input Text    ${ACCOUNT FIRST NAME}    nameChanged
    Input Text    ${ACCOUNT LAST NAME}    nameChanged
    Click Button    ${ACCOUNT SAVE}
    Check For Alert    ${YOUR ACCOUNT IS SUCCESSFULLY SAVED}
    Log Out   api=${False}
    Go To    ${url}/systems/${server 1}[id]
    Log In    ${server 1}[cloudOwner]    ${password}    button=None    api=${False}
    Go To Users List
    Select User in Users List   ${server 1}[cloudUsers][liveViewer]
    Wait Until Element Is Visible    //nx-system-user-component//nx-block//header//span[contains(text(),'nameChanged nameChanged')]
    Log Out    api=${False}
    Go To    ${url}/account
    Log In    ${server 1}[cloudUsers][liveViewer]    ${password}    button=None    api=${False}
    Verify in Account Page
    sleep    2
    Wait Until Textfield Contains    ${ACCOUNT FIRST NAME}    nameChanged
    Clear Element Text    ${ACCOUNT FIRST NAME}
    Input Text    ${ACCOUNT FIRST NAME}    ${TEST FIRST NAME}
    Wait Until Textfield Contains    ${ACCOUNT LAST NAME}    nameChanged

    # Check that the user's name has changed in system via API
    ${users}=   Get Users    ${AUTO SYS AUTH}    https://${QA BURBANK IP}:${server 1}[port][0] 
    FOR    ${user}    IN    @{users}
        Run Keyword If    '${user}[email]'=='${server 1}[cloudUsers][liveViewer]'    Run Keywords
        ...    Should Be Equal As Strings    ${user}[fullName]    nameChanged nameChanged
        ...    AND     Exit For Loop
    END
    Set Account Name    ${server 1}[cloudUsers][liveViewer]    ${password}    ${TEST FIRST NAME}    ${TEST LAST NAME}

5. User who owns a system cannot remove themselves
    [Tags]    C69855        delete_account
    Go To    ${url}/account
    Log In    ${server 1}[cloudOwner]    ${password}    button=None   api=${False}
    Verify in Account Page
    Wait Until Element is Visible    ${DELETE ACCOUNT DISABLED BUTTON}
    Mouse Over    ${DELETE ACCOUNT BUTTON}
    Wait Until Element Is Visible    ${CAN NOT DELETE ACCOUNT TOOLTIP}

6. Delete account button is enabled
    [Tags]    C69854        delete account
    Go To    ${url}/account
    Log In    ${server 1}[cloudUsers][cloudAdmin]    ${password}    button=None   api=${False}
    Verify in Account Page
    Wait Until Element is Enabled    ${DELETE ACCOUNT BUTTON}

    Log Out    api=${False}
    Sleep   2
    Go To    ${url}/account
    Log In    ${server 1}[cloudUsers][viewer]    ${password}    button=None    api=${False}
    Verify in Account Page
    Wait Until Element is Enabled    ${DELETE ACCOUNT BUTTON}

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