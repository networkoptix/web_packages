*** Settings ***
Resource         ../smoke_check_resource.robot

Suite Setup      Startup
Test Teardown    Run Keyword if Test Failed    Fatal Error    Smoke Check Failed - User Management
Suite Teardown   Clean Up

*** Keywords ***
Startup
    Open Browser    ${ENV}    headlesschrome
    ${system id}=   Connect System to Cloud    ${local auth}    ${server users}    ${server port}    ${system users}    ${email users}    ${password}
    ${cloud system id}=   Get Cloud System Id    ${server users}:${server port}    ${local auth}
    Set Suite Variable    ${system id}
    Set Suite Variable    ${cloud system id}
    Set Suite Variable    @{cloud auth}    ${email users}    ${password}
    # Users list is loaded very slow(or never) without restarting the server and reloading the page. See CLOUD-4758
    Restart Server    ${server users}:${server port}    ${local auth}
    Sleep    45
    Reload Page
    Sleep    15

Clean Up
    Wait Until Keyword Succeeds    5x    5s    Disconnect    ${ENV}    ${email users}    ${password}    ${system id}
    Wait Until Keyword Succeeds    5x    5s    Restart Server    ${server users}:${server port}    ${local auth}
    Close Browser

*** Test Cases ***
Portal - Share to not registered user
    [Tags]    C30445    users

    Go To    ${ENV}/systems
    Log In    ${email users}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}    ${MERGE BUTTON SYSTEM}

    Log    Step 1: Share to not registered user(admin permissions)
    ${new user}=   Get Random Email    ${email base}
    Set Suite Variable    ${new user}
    Share To    ${new user}    Administrator
    Log Out

    Log    Step 2: Check email for the user
    ${link}=   Get the link from email    ${email base}    ${new user}    ${email password}    register

    Log    Step 3: Open Register Page
    Go To    ${link}
    Validate on Register Page
    Wait Until Element Is Visible    ${REGISTER EMAIL INPUT LOCKED}
    Run keyword and ignore error    Wait until Element Has Style    ${REGISTER EMAIL INPUT LOCKED}    readonly    ${EMPTY}

    Log    Step 4: Fill the registration form
    Input Text    ${REGISTER FIRST NAME INPUT}    SmokeCheck
    Input Text    ${REGISTER LAST NAME INPUT}    NewUser
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Run keyword and ignore error    Wait until element has style    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}/span    tick unchecked    ${EMPTY}
    Click Element     ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Run keyword and ignore error    Wait until element has style    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}/span    tick checked    ${EMPTY}
    Click Button    ${CREATE ACCOUNT BUTTON}

    Log   Validate the System page and verify the user information and rights are as expected
    Wait Until Elements Are Visible
    ...    ${ACCOUNT DROPDOWN}
    ...    ${RENAME SYSTEM}
    ...    ${USERS LIST LINK}
    ...    ${SERVERS LINK}
    ...    ${DISCONNECT FROM MY ACCOUNT}
    ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${ADMIN TEXT}')]
    ...    //h2[contains(@class,"system-name") and contains(text(), "${system users}")]
    ...    //span[contains(@class, "system-owner")]//span[contains(text(), "${email users}")]
    #TODO: add cameras and system settings
    Wait Until Element Is Not Visible    ${MERGE BUTTON SYSTEM}
    Log Out

    Log    Step 5: Check that user appears in client with correct permissions
    ${local users}=   Get Users    ${local auth}    ${server users}:${server port}
    FOR    ${obj}   IN    @{local users}
        Run Keyword If    "&{obj}[email]"=="${new user}"    Run Keywords
        ...    Should Be Equal As Strings    &{obj}[isCloud]     True
        ...    AND    Should Be Equal As Strings    &{obj}[isEnabled]     True
        ...    AND    Should Be Equal As Strings    &{obj}[isAdmin]       False
        ...    AND    Should Be Equal As Strings    &{obj}[permissions]   &{permissions}[cloudAdmin]
    END

Portal - Delete user
    [Tags]    C30726    users

    Go To    ${ENV}/systems
    Log In    ${email users}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}

    Log    Step 1: Delete user and verify it's deleted from users list
    Remove User Permissions    ${new user}
    Go To    ${ENV}
    Log Out

    Log    Step 2: Log in as deleted user and verify the system is not there
    Log In    ${new user}    ${password}
    Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}
    Go To    ${ENV}
    Log Out

    Log    Step 3: Verify user is deleted from users list in client
    ${local users}=   Get Users    ${local auth}    ${server users}:${server port}
    ${is deleted}=   Set Variable    ${True}
    FOR    ${obj}   IN    @{local users}
        Run Keyword If    "&{obj}[email]"=="${new user}"    Set Variable    ${is deleted}    ${False}
    END
    Should be True    ${is deleted}

Portal - Share to registered user
    [Tags]    C30446    users    deb

    Log    Step 1: Share to existing user via API(viewer permissions)
    Share    ${cloud auth}    ${system id}    &{ACCESS ROLES}[viewer]    ${email existing user1}

    Log    Step 2: Check email for the user
    ${link}=   Get the link from email    ${email base}    ${email existing user1}    ${email password}    systems

    Log    Steps 3, 4: Follow the link from the email and log in
    Go To    ${link}
    Log In    ${email existing user1}    ${password}    validate=${False}    button=None

    Log    Step 5: Validate the System page and verify the user information and rights are as expected
    Wait Until Elements Are Visible
    ...    ${ACCOUNT DROPDOWN}
    ...    ${DISCONNECT FROM MY ACCOUNT}
    ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${VIEWER TEXT}')]
    ...    //h2[contains(@class,"system-name") and contains(text(), "${system users}")]
    ...    //span[contains(@class, "system-owner")]//span[contains(text(), "${email users}")]
    Wait Until Elements Are Not Visible
    ...    ${RENAME SYSTEM}
    ...    ${USERS LIST LINK}
    ...    ${SERVERS LINK}
    ...    ${MERGE BUTTON SYSTEM}

    Log    Step 6: Check that user appears in client with correct permissions
    ${local users}=   Get Users    ${local auth}    ${server users}:${server port}
    FOR    ${obj}   IN    @{local users}
        Run Keyword If    "&{obj}[email]"=="${email existing user1}"    Run Keywords
        ...    Should Be Equal As Strings    &{obj}[isCloud]     True
        ...    AND    Should Be Equal As Strings    &{obj}[isEnabled]     True
        ...    AND    Should Be Equal As Strings    &{obj}[isAdmin]       False
        ...    AND    Should Be Equal As Strings    &{obj}[permissions]   &{permissions}[viewer]
    END

Client - Share to not existing cloud user
    [Tags]    C30445    users    deb

    ${new user}=    Get Random Email    ${email base}
    Set Suite Variable    ${new user}
    Log    Step 1: Share system with not existing user(admin permissions)
    &{new user data}=   Save User
    ...    ${local auth}
    ...    ${server users}:${server port}
    ...    new_cloud_user
    ...    &{permissions}[cloudAdmin]
    ...    ${new user}
    ...    SmokeCheck NewClientCloudUser
    ...    ${password}
    ...    is cloud=${True}
    Set Suite Variable    ${new user data}

    Log    Step 2: Check email for the user
    ${link}=   Get the link from email    ${email base}    ${new user}    ${email password}    register

    Log    Step 3: Open Register Page
    Go To    ${link}
    Wait Until Elements Are Visible    ${LOGGED IN STAY LOGGED IN BUTTON}    ${LOGGED IN NEW ACCOUNT BUTTON}
    Click Button    ${LOGGED IN NEW ACCOUNT BUTTON}
    Validate on Register Page
    Wait Until Element Is Visible    ${REGISTER EMAIL INPUT LOCKED}
    Wait until Element Has Style    ${REGISTER EMAIL INPUT LOCKED}    readonly    ${EMPTY}

    Log    Step 4: Fill the registration form
    Input Text    ${REGISTER FIRST NAME INPUT}    SmokeCheck
    Input Text    ${REGISTER LAST NAME INPUT}    NewClientCloudUser
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Wait until element has style    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}/span    tick unchecked    ${EMPTY}
    Click Element     ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Wait until element has style    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}/span    tick checked    ${EMPTY}
    Click Button    ${CREATE ACCOUNT BUTTON}

    Log   Step 5: Validate the System page and verify the user information and rights are as expected
    # To make users list available
    Restart Server    ${server users}:${server port}    ${local auth}
    Sleep    30
    Reload Page
    Sleep    10
    Wait Until Elements Are Visible
    ...    ${ACCOUNT DROPDOWN}
    ...    ${RENAME SYSTEM}
    ...    ${USERS LIST LINK}
    ...    ${SERVERS LINK}
    ...    ${DISCONNECT FROM MY ACCOUNT}
    ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${ADMIN TEXT}')]
    ...    //h2[contains(@class,"system-name") and contains(text(), "${system users}")]
    ...    //span[contains(@class, "system-owner")]//span[contains(text(), "${email users}")]
    Wait Until Element Is Not Visible    ${MERGE BUTTON SYSTEM}
    Log Out

    Log    Step 6: Verify the user appeared in owner's users list
    Go To    ${ENV}/systems
    Log In    ${email users}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}
    Select user in Users List    ${new user}

Client - Delete cloud user
    [Tags]    C30447    C30727    users
    Log    Step 1: Delete user
    Remove User    ${local auth}    ${server users}:${server port}    &{new user data}[id]
    Restart Server    ${server users}:${server port}    ${local auth}
    Sleep    30
    Reload Page
    Sleep    10

    Log    Verify user is deleted from cloud
    ${cloud users}=   Get Cloud System Users    ${cloud auth}    ${cloud system id}
    FOR    ${obj}    IN    @{cloud users}
        Dictionary Should Not Contain Value    ${obj}    ${new user}
    END

    Log   Verify user is not in the users list
    Go To    ${ENV}/systems
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Elements Should Not Be Visible    ${USERS LIST}//span[@class="user" and text()='${new user}']
    Log Out

Client - Share to existing cloud user
    [Tags]    C30446    users

    Log    Step 1: Share to existing user(viewer permissions)
    &{existing user data}=   Save User
    ...    ${local auth}
    ...    ${server users}:${server port}
    ...    new_cloud_user
    ...    &{permissions}[viewer]
    ...    ${email existing user2}
    ...    SmokeCheck ExistingClientCloudUser
    ...    ${password}
    ...    is cloud=${True}

    Log    Step 2: Check email for the user
    ${link}=   Get the link from email    ${email base}    ${email existing user2}    ${email password}    systems

    Log    Steps 3, 4: Follow the link from the email and log in
    Go To    ${link}
    Log In    ${email existing user2}    ${password}    validate=${False}    button=None

    Log    Step 5: Validate the System page and verify the user information and rights are as expected
    Wait Until Elements Are Visible
    ...    ${ACCOUNT DROPDOWN}
    ...    ${DISCONNECT FROM MY ACCOUNT}
    ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${VIEWER TEXT}')]
    ...    //h2[contains(@class,"system-name") and contains(text(), "${system users}")]
    ...    //span[contains(@class, "system-owner")]//span[contains(text(), "${email users}")]
    Wait Until Elements Are Not Visible
    ...    ${RENAME SYSTEM}
    ...    ${USERS LIST LINK}
    ...    ${SERVERS LINK}
    ...    ${MERGE BUTTON SYSTEM}
    Log Out

    Log    Step 6: Verify the user appeared in owner's users list
    Go To    ${ENV}/systems
    Log In    ${email users}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}
    Select user in Users List    ${email existing user2}
    Log Out


#Client - Add Local User

#Client - Delete Local User

#Portal - Delete Local User





