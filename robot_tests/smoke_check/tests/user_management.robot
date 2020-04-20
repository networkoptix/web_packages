*** Settings ***
Resource         ../resources.robot

Suite Setup      Startup
Test Teardown    Run Keyword if Test Failed    Fatal Error    Smoke Check Failed - User Management
Suite Teardown   Clean Up

*** Keywords ***
Startup
    Open Browser    ${ENV}    headlesschrome
    ${system id}=   Connect System to Cloud    ${local auth}    ${server users}    ${server port}    ${system users}    ${email users}    ${password}
    Set Suite Variable    ${system id}
    Set Suite Variable    @{cloud auth}    ${email users}    ${password}
    # Users list is loaded very slow(or never) without restarting the server and reloading the page. See  CLOUD-4758
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

    Log    Step 1: share to not registered user
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

Portal - Delete user
    [Tags]    C30726    users

    Go To    ${ENV}/systems
    Log In    ${email users}    ${password}    validate=${False}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${USERS LIST LINK}

    Log    Step 1: Delete user
    Remove User Permissions    ${new user}
    Go To    ${ENV}
    Log Out

    Log    Step 2: Log in as deleted user
    Log In    ${new user}    ${password}
    Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}
    Go To    ${ENV}
    Log Out

    Log    Step 3: Verify user is deleted from users list in client

    Log    Step 4: Verify the system is not in the user's system list

Portal - Share to registered user
    [Tags]    C30446    users

    Log    Step 1: share to existing user via API(viewer permissions)
    Share    ${cloud auth}    ${system id}    &{ACCESS ROLES}[viewer]    ${email existing user}

    Log    Step 2: Check email for the user
    ${link}=   Get the link from email    ${email base}    ${email existing user}    ${email password}    systems

    Log    Steps 3, 4: Follow the link from the email and log in
    Go To    ${link}
    Log In    ${email existing user}    ${password}    validate=${False}    button=None

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

    Log    Step 6: Check that user appears in client

#Client - Share with non-existing cloud user
#    [Tags]    C30445    users

#    ${new user email}=    Get Random Email    ${email base}
#    &{user data}=   Create Dictionary
#    ...    name=newuser
#    ...    permissions=GlobalViewArchivePermission|GlobalAccessAllMediaPermission
#    ...    email=${new user email}
#    ...    isEnabled=${True}
#    ...    isCloud=${True}
#    ...    fullName=SmokeCheck NewUser
#    ...    password=${base password}
#    Sleep    5s
#
#    Log    C30447: Share System
#    &{new user data}=   Save User to System    ${server url}    ${auth}    ${user data}
#    Sleep    10s
#    ${is on portal}=   Is in user list on portal    ${URL}    ${auth}    ${cloud system id}    ${new user email}
#    Should Be True    ${is on portal}
#
#
#Client - Delete cloud user
#    [Tags]    C30447    C30727    users
#    Remove User From System    ${auth}    ${server url}    &{new user data}[id]
#    Sleep    10s
#    ${is in system}=   User Is In System    ${server url}    ${auth}    ${new user email}
#    Should Not Be True    ${is in system}
#    ${is on portal}=   Is in user list on portal    ${URL}    ${auth}    ${cloud system id}    ${new user email}
#    Should Not Be True    ${is on portal}

#Client - Share to existing cloud user

#Client - Add Local User

#Client - Delete Local User

#Portal - Delete Local User





