*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      Users Suite Setup
Test Teardown    Run Keyword if Test Failed    Common Restart Logout    ${ENV}
Suite Teardown   Users Suite Teardown

*** Keywords ***
Users Suite Setup
    Open browser and go to URL    ${ENV}    False    False
    ${system owner}=    Get Random Email    ${email base}
    Register And Activate Account    SmokeCheck    Users    ${system owner}    ${password}
    Set Suite Variable    ${system owner}    ${system owner}

    ${system users}=   Setup Remote System    ${ssh auth}    ciqa    system_users    ${ssh host ip}    ${system users port}
    ${cloud id}=   Connect System to Cloud    ${local auth}   https://${system users}[ip]:${system users}[port]    ${system users}[name]    ${system owner}    ${password}    ${ENV}
    Set To Dictionary    ${system users}    cloud id=${cloud id}
    Set Suite Variable    ${system users}    ${system users}
    Restart Server    https://${system users}[ip]:${system users}[port]    ${local auth}
    Sleep    60

Users Suite Teardown
    Acquire Lock    teardown_lock
    Open Connection    ${ssh host ip}
    SSHLibrary.Login    username=${ssh auth}[0]    password=${ssh auth}[1]
    Execute Command    docker rm -f ${system users}[cont]
    Close All Connections
    Release Lock    teardown_lock
    Close Browser

*** Test Cases ***
Portal - Share to not registered user
    [Tags]    C30445    C30648    users

    Go To    ${ENV}/systems
    Log In    ${system owner}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}    ${MERGE BUTTON SYSTEM}    timeout=60

    Log    Step 1: Share to not registered user(admin permissions)
    ${new portal user}=   Get Random Email    ${email base}
    Set Suite Variable    ${new portal user}    ${new portal user}
    Share To    ${new portal user}    Administrator
    Log Out

    Log    Step 2: Check email for the user
    ${code}=   Get Code From Email    ${ENV}    ${cloud auth}    ${new portal user}    system_invite

    Log    Step 3: Open Register Page
    Go To    ${ENV}/register/${code}
    Validate on Register Page
    Wait Until Element Is Visible    ${REGISTER EMAIL INPUT LOCKED}
    Run keyword and ignore error    Wait until Element Has Style    ${REGISTER EMAIL INPUT LOCKED}    readonly    ${EMPTY}

    Log    Step 4: Fill the registration form
    Slow    Input Text    ${REGISTER FIRST NAME INPUT}    SmokeCheck    timeout=0.1
    Slow    Input Text    ${REGISTER LAST NAME INPUT}    NewUser    timeout=0.1
    Slow    Input Text    ${REGISTER PASSWORD INPUT}    ${password}    timeout=0.1
    Slow    Click Element     ${TERMS AND CONDITIONS CHECKBOX VISIBLE}    timeout=0.1
    Slow    Click Button    ${CREATE ACCOUNT BUTTON}    timeout=0.1

    Log   Validate the System page and verify the user information and rights are as expected
    Wait Until Elements Are Visible
    ...    ${ACCOUNT DROPDOWN}
    ...    ${RENAME SYSTEM}
    ...    ${USERS LIST LINK}
    ...    ${SERVERS LINK}
    ...    ${DISCONNECT FROM MY ACCOUNT}
    ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${ADMIN TEXT}')]
    ...    //h2[contains(@class,"system-name") and contains(text(), "${system users}[name]")]
    ...    //span[contains(@class, "system-owner")]//span[contains(text(), "${system owner}")]
    Wait Until Element Is Not Visible    ${MERGE BUTTON SYSTEM}
    Log Out

    Log    Step 5: Check that user appears in client with correct permissions
    ${local users}=   Get Users    ${local auth}   https://${system users}[ip]:${system users}[port]
    FOR    ${obj}   IN    @{local users}
        Run Keyword If    "${obj}[email]"=="${new portal user}"    Run Keywords
        ...    Should Be Equal As Strings    ${obj}[isCloud]     True
        ...    AND    Should Be Equal As Strings    ${obj}[isEnabled]     True
        ...    AND    Should Be Equal As Strings    ${obj}[isAdmin]       False
        ...    AND    Should Be Equal As Strings    ${obj}[permissions]   ${permissions}[cloudAdmin]
    END

Portal - Delete user
    [Tags]    C30726    C30659    users

    Go To    ${ENV}/systems
    Log In    ${system owner}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}

    Log    Step 1: Delete user and verify it's deleted from users list
    Remove User Permissions    ${new portal user}
    Go To    ${ENV}
    Log Out

    Log    Step 2: Log in as deleted user and verify the system is not there
    Log In    ${new portal user}    ${password}
    Wait Until Element is Visible    //span[contains(text(), "${YOU HAVE NO SYSTEMS TEXT}")]
    Go To    ${ENV}
    Log Out

    Log    Step 3: Verify user is deleted from users list in client
    ${local users}=   Get Users    ${local auth}   https://${system users}[ip]:${system users}[port]
    ${is deleted}=   Set Variable    ${True}
    FOR    ${obj}   IN    @{local users}
        Run Keyword If    "${obj}[email]"=="${new portal user}"    Set Variable    ${is deleted}    ${False}
    END
    Should be True    ${is deleted}

Portal - Share to registered user
    [Tags]    C30446    C30648    users

    ${existing user}=    Get Random Email    ${email base}
    Register And Activate Account    SmokeCheck    ExistingUser1    ${existing user}    ${password}

    Log    Step 1: Share to existing user via API(viewer permissions)
    ${cloud auth}=   Create List    ${system owner}    ${password}
    Share    ${cloud auth}    ${system users}[cloud id]    ${ACCESS ROLES}[viewer]    ${existing user}

#    Log    Step 2: Check email for the user
#    ${code}=   Get Code From Email    ${ENV}    ${cloud auth}    ${existing user}    system_shared
#    Should not be empty    ${code}

    Log    Steps 2, 3, 4: Follow the link from the email and log in
    Go To    ${ENV}/systems/${system users}[cloud id]
    Log In    ${existing user}    ${password}    validate=${False}    button=None

    Log    Step 5: Validate the System page and verify the user information and rights are as expected
    Wait Until Elements Are Visible
    ...    ${ACCOUNT DROPDOWN}
    ...    ${DISCONNECT FROM MY ACCOUNT}
    ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${VIEWER TEXT}')]
    ...    //h2[contains(@class,"system-name") and contains(text(), "${system users}[name]")]
    ...    //span[contains(@class, "system-owner")]//span[contains(text(), "${system owner}")]
    Wait Until Elements Are Not Visible
    ...    ${RENAME SYSTEM}
    ...    ${USERS LIST LINK}
    ...    ${SERVERS LINK}
    ...    ${MERGE BUTTON SYSTEM}

    Log Out

    Log    Step 6: Check that user appears in client with correct permissions
    ${local users}=   Get Users    ${local auth}   https://${system users}[ip]:${system users}[port]
    FOR    ${obj}   IN    @{local users}
        Run Keyword If    "${obj}[email]"=="${existing user}"    Run Keywords
        ...    Should Be Equal As Strings    ${obj}[isCloud]     True
        ...    AND    Should Be Equal As Strings    ${obj}[isEnabled]     True
        ...    AND    Should Be Equal As Strings    ${obj}[isAdmin]       False
        ...    AND    Should Be Equal As Strings    ${obj}[permissions]   ${permissions}[viewer]
    END

Client - Share to not registered user
    [Tags]    C30445    C30651    users

    ${new cloud user}=    Get Random Email    ${base email}
    Set Suite Variable    ${new cloud user}
    Log In    ${system owner}    ${password}
    Log    Step 1: Share system with not existing user(admin permissions)
    ${new user data}=   Save User
    ...    ${local auth}
    ...    https://${system users}[ip]:${system users}[port]
    ...    new_cloud_user
    ...    ${permissions}[cloudAdmin]
    ...    ${new cloud user}
    ...    SmokeCheck NewCloudUser
    ...    ${password}
    ...    is cloud=${True}
    Set Suite Variable    ${new user data}

    Log    Step 2: Check email for the user
    ${code}=   Get Code From Email    ${ENV}    ${cloud auth}    ${new cloud user}    system_invite

    Log    Step 3: Open Register Page
    Go To    ${ENV}/register/${code}
    Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${LOGGED IN NEW ACCOUNT BUTTON}
    Click Button    ${LOGGED IN NEW ACCOUNT BUTTON}
    Validate on Register Page
    Wait Until Element Is Visible    ${REGISTER EMAIL INPUT LOCKED}
    Wait until Element Has Style    ${REGISTER EMAIL INPUT LOCKED}    readonly    ${EMPTY}

    Log    Step 4: Fill the registration form
    Slow    Input Text    ${REGISTER FIRST NAME INPUT}    SmokeCheck    timeout=0.1
    Slow    Input Text    ${REGISTER LAST NAME INPUT}    NewCloudUser    timeout=0.1
    Slow    Input Text    ${REGISTER PASSWORD INPUT}    ${password}    timeout=0.1
    Run keyword and ignore error    Wait until element has style    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}/span    tick unchecked    ${EMPTY}
    Slow    Click Element     ${TERMS AND CONDITIONS CHECKBOX VISIBLE}    timeout=0.1
    Run keyword and ignore error    Wait until element has style    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}/span    tick checked    ${EMPTY}
    Slow    Click Button    ${CREATE ACCOUNT BUTTON}    timeout=0.1

    Log   Step 5: Validate the System page and verify the user information and rights are as expected
    Wait Until Elements Are Visible
    ...    ${ACCOUNT DROPDOWN}
    ...    ${RENAME SYSTEM}
    ...    ${USERS LIST LINK}
    ...    ${SERVERS LINK}
    ...    ${DISCONNECT FROM MY ACCOUNT}
    ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${ADMIN TEXT}')]
    ...    //h2[contains(@class,"system-name") and contains(text(), "${system users}[name]")]
    ...    //span[contains(@class, "system-owner")]//span[contains(text(), "${system owner}")]
    Wait Until Element Is Not Visible    ${MERGE BUTTON SYSTEM}
    Log Out

    Log    Step 6: Verify the user appeared in owner's users list
    Go To    ${ENV}/systems
    Log In    ${system owner}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}
    Select user in Users List    ${new cloud user}

    Log Out

Client - Delete cloud user
    [Tags]    C30447    C30660    users
    Log    Step 1: Delete user
    Remove User    ${local auth}    https://${system users}[ip]:${system users}[port]    ${new user data}[id]
    Restart Server    https://${system users}[ip]:${system users}[port]    ${local auth}

    Log    Verify user is deleted from cloud
    ${cloud users}=   Get Cloud System Users    ${cloud auth}    ${system users}[cloud id]
    FOR    ${obj}    IN    @{cloud users}
        Dictionary Should Not Contain Value    ${obj}    ${new cloud user}
    END

    Log   Verify user is not in the users list
    Go To    ${ENV}/systems/${system users}[cloud id]
    Log In    ${system owner}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Elements Should Not Be Visible    ${USERS LIST}//span[@class="user" and text()='${new cloud user}']
    Log Out

Client - Share to registered user
    [Tags]    C30446    C30651    users
    ${random email}=    Get Random Email    ${email base}
    Register And Activate Account    SmokeCheck    RegisteredCloudUser    ${random email}    ${password}

    Log    Step 1: Share to existing user(viewer permissions)
    Save User
    ...    ${local auth}
    ...    https://${system users}[ip]:${system users}[port]
    ...    registered_cloud_user
    ...    ${permissions}[viewer]
    ...    ${random email}
    ...    SmokeCheck RegisteredCloudUser
    ...    ${password}
    ...    is cloud=${True}
    Restart Server    https://${system users}[ip]:${system users}[port]    ${local auth}
    Sleep    30

    Go To    ${ENV}
    Log In    ${system owner}    ${password}    validate=False
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}
    Select user in users list    ${random email}
    Log Out

    ${user systems}=   Get Account Systems    ${ENV}    ${random email}    ${password}
    Should Contain    ${user systems}    ${system users}[cloud id]
