*** Settings ***
Resource          ../resource.robot
Suite Setup       Setup
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Run Keywords    Close All Browsers    Remove Temporary Users
Force Tags        system

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
@{auth}        ${email}    ${password}
${url}         ${ENV}
${offline system url}     http://10.1.5.182:7077
${offline system name}    4.0_system_users_test_1
@{TMP USERS}

*** Keywords ***
Setup
    Open Browser and go to URL    ${url}
    Pop From Dictionary    ${role names}    custom    #due to bug 4960

Restart
    Common Restart Logout    ${url}

*** Test Cases ***
Cancel should cancel disconnection and disconnect should remove it when not owner
    [Tags]    C41884
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[viewer]    ${EMAIL NOT OWNER}

    Log In To Auto Tests System    ${EMAIL NOT OWNER}
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible    ${DISCONNECT MODAL WARNING}    ${DISCONNECT MODAL CANCEL}

    Click Button    ${DISCONNECT MODAL CANCEL}
    Wait Until Element Is Not Visible    ${DISCONNECT MODAL WARNING}
    Wait Until Page Does Not Contain Element    //div[@modal-render='true']

    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible    ${MODAL DIALOG}    ${DISCONNECT MODAL WARNING}    ${DISCONNECT MODAL DISCONNECT BUTTON}
    Click Button    ${DISCONNECT MODAL DISCONNECT BUTTON}
    ${SYSYEM DELETED FROM ACCOUNT}    Replace String    ${SYSYEM DELETED FROM ACCOUNT}    {{system_name}}    ${AUTO TESTS}
    Check For Alert    ${SYSYEM DELETED FROM ACCOUNT}
    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}
    Log Out

    Log In    ${EMAIL OWNER}    ${password}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${ADD USER BUTTON SYSTEMS}
    Run Keyword And Expect Error    *    Wait Until Element Is Visible    ${NOT OWNER IN SYSTEM}

    # Verify the user is removed from the list via API
    ${sys id}=   Get Cloud System Id      ${AUTO SYS IP}    ${AUTO SYS AUTH}
    ${users}=   Get Cloud System Users    ${auth}    ${sys id}
    ${is there}=   Set Variable    ${False}
    FOR    ${obj}    IN    @{users}
        ${is there}=   Set Variable If    '${obj}[accountEmail]'=='${EMAIL NOT OWNER}'    ${True}
    END
    Should Not Be True    ${is there}

    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[viewer]    ${EMAIL NOT OWNER}

Owner / user can unlink offline System from Cloud / Account
    [Tags]    C41897    C41898
    Log    Prepare offline system with owner and viewer
    ${owner email}=   Register and activate account with random email    firstName    lastName    ${password}
    ${user email}=   Register and activate account with random email    firstName    lastName    ${password}
    ${id}=   Create system and attach to cloud    http://10.1.5.182    7077    ${offline system name}    ${owner email}    ${password}
    @{auth}=   Create List    ${owner email}    ${password}
    Share    ${auth}    ${id}    ${ACCESS ROLES}[viewer]    ${user email}
    # Make the system offline
    Detach Server From System    ${offline system url}    ${auth}

    Log    C41898: Step 1
    Go To    ${url}/systems/${id}
    Log In    ${user email}    ${password}    button=None
    Disconnect from my account
    Log out

    Log    C41898: Step 2
    ${users}=   Get Cloud System Users    ${auth}    ${id}
    ${is there}=   Set Variable    ${False}
    FOR    ${obj}    IN    @{users}
        ${is there}=   Set Variable If    '${obj}[accountEmail]'=='${user email}'    ${True}
    END
    Should Not Be True    ${is there}

    Go To    ${url}/systems/${id}
    Log In    ${owner email}    ${password}    button=None
    Wait Until Element Is Visible    ${USERS LIST LINK}
    Run keyword and expect error    *    Select user in Users List    ${user email}

    Log    C41897: Step 1 - add user and disconnect system from cloud
    Share    ${auth}    ${id}    ${ACCESS ROLES}[viewer]    ${user email}
    Disconnect from cloud
    Log Out

    Log    C41897: Step 2 - make sure viewer has no systems
    ${systems}=   Get Account Systems    ${ENV}    ${user email}    ${password}
    Should Be Empty    ${systems}
    Log In   ${user email}    ${password}
    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}

Should display same user data as user provided during registration
    [Tags]    email    Threaded
    ${random email}=   Register and activate account with random email    ${COMBO TEXT}    ${COMBO TEXT}    ${password}
    Append To List    ${TMP USERS}    ${random email}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[admin]    ${random email}

#verify user name displayed correctly in users list
    Log in    ${random email}    ${password}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    ${User In List}=   Set Variable    //nx-system-settings-component//nx-menu//nx-level-3-item//span[text()='${random email}']/../../../a
    Wait Until Element Is Visible    ${User In List}
    Click Link    ${User In List}
    Wait Until Element Is Visible    //nx-system-user-component//nx-block//header/span[contains(text(),'${COMBO TEXT} ${COMBO TEXT}')]

Should display same user data as shown in user account
    [Tags]    email    C41573    C41842    Threaded
    ${random email}=   Register and activate account with random email    mark    hamill    ${password}
    Append To List    ${TMP USERS}    ${random email}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[viewer]    ${random email}
    Set Account Name    ${url}    ${random email}    ${password}    ${COMBO TEXT}    ${COMBO TEXT}

    Log in to Auto Tests System    ${EMAIL OWNER}
    Go to Users List
#click link containing user's email
    Select user in Users List    ${random email}
#verify name displayed
    Wait Until Element Is Visible    //nx-system-user-component//nx-block//header/span[contains(text(),'${COMBO TEXT} ${COMBO TEXT}')]

Share button - opens dialog
    [Tags]    C41888    Threaded
    Log in to Auto Tests System    ${email}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${ADD USER BUTTON SYSTEMS}
    Click Button    ${ADD USER BUTTON SYSTEMS}
    Wait Until Element is Visible    ${ADD USER MODAL}
    Click Button    ${ADD USER CLOSE}
    Wait Until Page Does Not Contain Element    ${ADD USER MODAL}

#Sharing link for anonymous - first ask login, then show share dialog
#    [Tags]    Threaded    Deprecated
#    Log in to Auto Tests System    ${email}
#    ${location}    Get Location
#    Log Out
#    Go To    ${location}/share
#    Log In    ${email}    ${password}    button=None
#    Wait Until Element is Visible    ${ADD USER MODAL}
#    Click Button    ${ADD USER CLOSE}
#    Wait Until Page Does Not Contain Element    ${ADD USER MODAL}
#

Check Cancel and 'X' buttons
    [Tags]    C41888    Threaded    CLOUD-3733
    Log in to Auto Tests System    ${email}

    Log    Check Cancel Button
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}/users
    Wait until element is visible    ${ADD USER BUTTON SYSTEMS}
    Click Button  ${ADD USER BUTTON SYSTEMS}
    Wait Until Elements are Visible    ${ADD USER MODAL}    ${ADD USER CANCEL}
    Click Button    ${ADD USER CANCEL}
    Wait Until Element is Not Visible    ${ADD USER MODAL}

    Log    Check 'X' Button
    Click Button  ${ADD USER BUTTON SYSTEMS}
    Wait Until Elements are Visible    ${ADD USER MODAL}    ${ADD USER CLOSE}
    Click Button    ${ADD USER CLOSE}
    Wait Until Element is Not Visible    ${ADD USER MODAL}

Sharing roles are ordered: more access is on top of the list with options
    [Tags]    Threaded
    Log in to Auto Tests System    ${email}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${ADD USER BUTTON SYSTEMS}
    Click Button    ${ADD USER BUTTON SYSTEMS}
    Wait Until Element is Visible    ${ADD USER PERMISSIONS DROPDOWN}
    Click Element    ${ADD USER PERMISSIONS DROPDOWN}
    Wait Until Element is Visible    ${ADD USER MODAL}//nx-permissions-select//li//span[text()='${ADMIN TEXT}']/../../following-sibling::li/a/span[text()="${ADV VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="${VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="${LIVE VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="Client Custom"]/../../following-sibling::li/a/span[text()="${CUSTOM TEXT}"]
    Click Button    ${ADD USER CLOSE}
    Wait Until Page Does Not Contain Element    ${ADD USER MODAL}

When user selects role - special hint appears
    [Tags]    C41901    Threaded
    Log in to Auto Tests System    ${email}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${ADD USER BUTTON SYSTEMS}
    Click Button    ${ADD USER BUTTON SYSTEMS}
    Wait Until Elements Are Visible    ${ADD USER PERMISSIONS DROPDOWN}    ${ADD USER PERMISSIONS HINT}
    Wait Until Element Contains    ${ADD USER PERMISSIONS DROPDOWN}    ${VIEWER TEXT}
    Wait Until Element Contains    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT VIEWER}
    FOR    ${type}    IN    @{USER TYPE LIST}
        Run Keyword Unless    "${type}"=="${OWNER TEXT}"    Check Special Hint    ${type}
    END
    Click Button    ${ADD USER CANCEL}

Admin cannot delete or edit self
    [Tags]    C41904    Threaded
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Select user in Users List    ${EMAIL ADMIN}
    Elements Should Not Be Visible    ${ACCESS LEVEL DROPDOWN}    ${REMOVE USER BUTTON}

Admin and owner cannot edit self and other users via share
    @{admins}=   Create List    ${EMAIL OWNER}    ${EMAIL ADMIN}
    @{all users}=   Create List    ${EMAIL OWNER}    ${EMAIL ADMIN}    ${EMAIL VIEWER}    ${EMAIL ADV VIEWER}    ${EMAIL CUSTOM}

    FOR    ${user}    IN    @{admins}
        Log    Step 1
        Log in to Auto Tests System    ${user}
        Select user in users list    ${user}
        Elements should not be visible    ${REMOVE USER BUTTON}    ${ACCESS LEVEL DROPDOWN}

        Log    Step 2
        Share To    ${EMAIL OWNER}    ${CUSTOM TEXT}    fail
        Click Button    ${ADD USER CANCEL}
        Share To    ${EMAIL ADMIN}    ${LIVE VIEWER TEXT}    fail
        Click Button    ${ADD USER CANCEL}
        Share To    ${EMAIL VIEWER}    ${ADV VIEWER TEXT}    fail
        Click Button    ${ADD USER CANCEL}
        Share To    ${EMAIL ADV VIEWER}    ${CUSTOM TEXT}    fail
        Click Button    ${ADD USER CANCEL}
        Share To    ${EMAIL CUSTOM}    ${VIEWER TEXT}    fail
        Click Button    ${ADD USER CANCEL}
        Log Out
    END

    Log    Step 3
    FOR    ${user}    IN    @{all users}
        ${role}=   Get Cloud User Role    ${auth}    ${user}    ${AUTO TESTS SYSTEM ID}
        Run Keyword If    '${user}'=='${EMAIL OWNER}'       Should be equal as strings    ${role}    owner
        Run Keyword If    '${user}'=='${EMAIL ADMIN}'       Should be equal as strings    ${role}    cloudAdmin
        Run Keyword If    '${user}'=='${EMAIL VIEWER}'      Should be equal as strings    ${role}    viewer
        Run Keyword If    '${user}'=='${EMAIL ADV VIEWER}'  Should be equal as strings    ${role}    advancedViewer
        Run Keyword If    '${user}'=='${EMAIL CUSTOM}'      Should be equal as strings    ${role}    custom
    END

Admin cannot delete or edit other admins or owner
    [Tags]    C41905
    ${random email}=   Register and activate account with random email    mark    harmill    ${password}
    Append To List    ${TMP USERS}    ${random email}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[admin]    ${random email}

    Log in to Auto Tests System    ${random email}
    Select user in Users List    ${EMAIL ADMIN}
    Elements Should Not Be Visible    ${ACCESS LEVEL DROPDOWN}    ${REMOVE USER BUTTON}
    Select user in Users List    ${EMAIL OWNER}
    Elements Should Not Be Visible    ${ACCESS LEVEL DROPDOWN}    ${REMOVE USER BUTTON}

Admin cannot invite another admin
    [Tags]    C41905    Threaded
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${ADD USER BUTTON SYSTEMS}
    Click Button    ${ADD USER BUTTON SYSTEMS}
    Wait Until Element is Visible    ${ADD USER PERMISSIONS DROPDOWN}
    Sleep    2
    Click Button    ${ADD USER PERMISSIONS DROPDOWN}
    Wait Until Element is Visible
    ...    ${ADD USER MODAL}//nx-permissions-select//li//span[text()='${VIEWER TEXT}']
    Element Should Not Be Visible
    ...    ${ADD USER MODAL}//nx-permissions-select//li//span[text()='${ADMIN TEXT}']
    Click Button    ${ADD USER PERMISSIONS DROPDOWN}
    Click Button    ${ADD USER CANCEL}

Edit permission works
    [Tags]    C41900    C30657
    ${random email}=   Get Random Email    ${BASE EMAIL}
    Log in to Auto Tests System    ${email}
    Share To    ${random email}    ${ADMIN TEXT}

    # Check that the user's role is added correctly in vms
    ${users}=   Get Users    ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR    ${user}    IN    @{users}
        Run Keyword If    '${user}[email]'=='${random email}'    Run Keywords
        ...    Should Be Equal As Strings    ${user}[permissions]    ${permissions}[cloudAdmin]
        ...    AND     Exit For Loop
    END

    Edit User Permissions In Systems    ${random email}    ${VIEWER TEXT}
    Check User Permissions    ${random email}    ${VIEWER TEXT}

    # Check that the user's role has changed in vms
    ${users}=   Get Users    ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR    ${user}    IN    @{users}
        Run Keyword If    '${user}[email]'=='${random email}'    Run Keywords
        ...    Should Be Equal As Strings    ${user}[permissions]    ${permissions}[viewer]
        ...    AND     Exit For Loop
    END

    Edit User Permissions In Systems    ${random email}    ${ADMIN TEXT}
    Check User Permissions    ${random email}    ${ADMIN TEXT}
    Remove User Permissions    ${random email}

Delete user works
    [Tags]    email    C41903
    ${random email}=   Register and activate account with random email    mark    harmill    ${password}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[admin]    ${random email}

    Log in to Auto Tests System    ${email}
    Select user in Users List    ${random email}
    Wait Until Element Is Visible    ${REMOVE USER BUTTON}
    Click Button    ${REMOVE USER BUTTON}
    Wait Until Element is Visible    ${REMOVE CANCEL BUTTON}
    Click Button    ${REMOVE CANCEL BUTTON}

    Remove User Permissions    ${random email}
    Go To    ${url}
    Log Out
    Log In    ${random email}    ${password}
    Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}

Share with registered user works and sends him notification
    [Tags]    email    C41888
    Set Account Language    ${ENV}    ${EMAIL NOPERM}    ${password}    ${LANGUAGE}
    Append to List    ${TMP USERS}    ${EMAIL NOPERM}
    Log in to Auto Tests System    ${email}
    Verify In System    Auto Tests
    Share To    ${EMAIL NOPERM}    ${ADMIN TEXT}

    ${role}=   Get Cloud User Role  ${auth}    ${EMAIL NOPERM}    ${AUTO TESTS SYSTEM ID}
    Should be equal as strings    ${role}    ${ACCESS ROLES}[admin]

    Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True
    ${INVITED TO SYSTEM EMAIL SUBJECT}    Replace String
    ...    ${INVITED TO SYSTEM EMAIL SUBJECT}
    ...    {{message.system_name}}
    ...    ${AUTO TESTS}
    ${emailID}    Wait For Email    recipient=${EMAIL NOPERM}    timeout=120
    Check Email Subject
    ...    ${emailID}
    ...    ${INVITED TO SYSTEM EMAIL SUBJECT}
    ...    ${BASE EMAIL}
    ...    ${BASE EMAIL PASSWORD}
    ...    ${BASE HOST}
    ...    ${BASE PORT}
    Delete Email    ${emailID}
    Close Mailbox

    ${role}=   Get Cloud User Role  ${auth}    ${EMAIL NOPERM}    ${AUTO TESTS SYSTEM ID}
    Should be equal as strings    ${role}    ${ACCESS ROLES}[admin]

Share with unregistered user - brings them to registration page with code with correct email locked
    [Tags]    email    C41889
    ${random email}=   Get Random Email    ${BASE EMAIL}
    Append To List    ${TMP USERS}    ${random email}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[admin]    ${random email}
    ${role}=   Get Cloud User Role  ${auth}    ${random email}    ${AUTO TESTS SYSTEM ID}
    Should be equal as strings    ${role}    ${ACCESS ROLES}[admin]

    ${code}=   Get Code From Email    ${url}    ${auth}    ${random email}    system_invite
    Go To    ${url}/register/${code}
    Wait Until Elements Are Visible
    ...    ${REGISTER FIRST NAME INPUT}
    ...    ${REGISTER LAST NAME INPUT}
    ...    ${REGISTER PASSWORD INPUT}
    ...    ${CREATE ACCOUNT BUTTON}

    ${populated email}=   Get Value    ${REGISTER EMAIL INPUT}
    Should be equal as strings    ${populated email}    ${random email}
    Input Text    ${REGISTER FIRST NAME INPUT}    ${TEST FIRST NAME}
    Input Text    ${REGISTER LAST NAME INPUT}    ${TEST LAST NAME}
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Click Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Click Button    ${CREATE ACCOUNT BUTTON}
    # New user gets logged in right away
    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}

Check share email for registered user
    [Tags]    C47297
    ${random email}=   Register and activate account with random email    firstname    lastname    ${password}
    Append To List    ${TMP USERS}    ${random email}
    Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True
    ${email}    Wait For Email    recipient=${random email}    timeout=120
    Check Email Subject
    ...    ${email}
    ...    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}
    ...    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}
    ...    ${BASE HOST}
    ...    ${BASE PORT}
    Delete email    ${email}

    Set Account Language    ${ENV}    ${random email}    ${password}    ${LANGUAGE}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    ${ACCESS ROLES}[admin]    ${random email}
    ${role}=   Get Cloud User Role  ${auth}    ${random email}    ${AUTO TESTS SYSTEM ID}
    Should be equal as strings    ${role}    ${ACCESS ROLES}[admin]

    ${INVITED TO SYSTEM EMAIL SUBJECT}    Replace String
    ...    ${INVITED TO SYSTEM EMAIL SUBJECT}
    ...    {{message.system_name}}
    ...    ${AUTO TESTS}
    ${email}    Wait For Email    recipient=${random email}    timeout=120
    ${email text}    Get Email Body    ${email}
    ${email text}    Decode Bytes To String    ${email text}    UTF-8    errors=ignore
    Check Email Subject
    ...    ${email}
    ...    ${INVITED TO SYSTEM EMAIL SUBJECT}
    ...    ${BASE EMAIL}    ${BASE EMAIL PASSWORD}
    ...    ${BASE HOST}
    ...    ${BASE PORT}
    Check Email Button    ${email text}    ${ENV}    ${THEME COLOR}
    ${links}    Get Links From Email    ${email}
    @{expected links}    Set Variable
    ...    ${SUPPORT URL}
    ...    ${WEBSITE URL}
    ...    ${ENV}
    ...    ${ENV}/systems/${AUTO_TESTS SYSTEM ID}
    ...    mailto:${EMAIL OWNER}
    FOR    ${link}  IN  @{links}
        check in list    ${expected links}    ${link}
    END
    Delete Email    ${email}
    Close Mailbox

Users should be able to disconnect themselves from cloud
    [Tags]
    ${roles}=   Get Dictionary Values    ${ACCESS ROLES}
    FOR    ${role}    IN    @{roles}
        ${random email}=   Register and activate account with random email    firstname    lastname    ${password}
        Append To List    ${TMP USERS}    ${random email}
        Share     ${auth}    ${AUTO TESTS SYSTEM ID}    ${role}    ${random email}

        Log In    ${random email}    ${password}
        Wait until element is visible    ${SYSTEM NAME}
        Disconnect from my account
        Log out
    END

User with client custom settings has access to system
    [Tags]    Threaded
    Log in to Auto Tests System    ${EMAIL CLIENT CUSTOM}
    Location Should Be    ${url}/systems/${AUTO_TESTS SYSTEM ID}
    Verify In System    ${AUTO TESTS}

User can be invited with client custom permissions
    Log in to Auto Tests System    ${EMAIL OWNER}
    ${random email}=   Get Random Email    ${BASE EMAIL}
    Append To List    ${TMP USERS}    ${random email}
    Share To    ${random email}    Client Custom
    ${email}=   Wait For Email    recipient=${random email}    timeout=120
    Check User Permissions    ${random email}    Client Custom
    Delete Email    ${email}
    Close Mailbox

Disable enable User on Cloud Portal correctly affects the User on Cloud Portal
    [Tags]    C63390

    Log    Step 1
    Log in to Auto Tests System    ${email}
    Check User Permissions    ${EMAIL NOT OWNER}    ${VIEWER TEXT}

    Log    Step 2
    Set Checkbox Value   ${DISABLE USER SWITCH}    false
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${EMAIL NOT OWNER}    ${VIEWER TEXT}
    Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}

    Log    Step 3
    Log Out
    Go To    ${ENV}/systems
    Log In   ${EMAIL NOT OWNER}    ${BASE PASSWORD}    button=None
    Wait Until Location Is    ${ENV}/systems
    Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}

    Log    Step 4
    Log Out
    Log in to Auto Tests System    ${email}
    Check User Permissions    ${EMAIL NOT OWNER}    ${VIEWER TEXT}
    Set Checkbox Value   ${DISABLE USER SWITCH}    true
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${EMAIL NOT OWNER}    ${VIEWER TEXT}
    Page Should Not Contain Element   ${USER DISABLED MSG}

    Log    Step 5
    Log Out
    Log in to Auto Tests System    ${EMAIL NOT OWNER}
    Page Should Not Contain Element    ${YOU HAVE NO SYSTEMS}

Administrator can add, disable and enable Viewer
    [Tags]    C63391
    ${random email}=   Register and activate account with random email    mark    harmill    ${BASE PASSWORD}
    Log    Steps 1 & 2
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Share To    ${random email}   ${VIEWER TEXT}
    Select user in Users List    ${random email}

    Log    Step 3
    Log Out
    Go To     ${ENV}/systems
    Log In    ${random email}    ${BASE PASSWORD}    button=None
    Page Should Not Contain Element    ${YOU HAVE NO SYSTEMS}
    Wait Until Elements Are Visible    ${YOUR ACCESS LEVEL}    //span[contains(text(),'${VIEWER TEXT}')]

    Log     Step 4
    Log Out
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Check User Permissions    ${random email}    ${VIEWER TEXT}
    Set Checkbox Value   ${DISABLE USER SWITCH}    false
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${random email}    ${VIEWER TEXT}
    Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}

    Log    Step 5
    Log Out
    Go To    ${ENV}/systems
    Log In   ${random email}    ${BASE PASSWORD}    button=None
    Wait Until Location Is    ${ENV}/systems
    Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}

    Log    Step 6
    Log Out
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Check User Permissions    ${random email}    ${VIEWER TEXT}
    Set Checkbox Value   ${DISABLE USER SWITCH}    true
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${random email}    ${VIEWER TEXT}
    Page Should Not Contain Element   ${USER DISABLED MSG}

    Log    Step 7
    Log Out
    Go To     ${ENV}/systems
    Log In    ${random email}    ${BASE PASSWORD}    button=None
    Page Should Not Contain Element    ${YOU HAVE NO SYSTEMS}
    Wait Until Elements Are Visible    ${YOUR ACCESS LEVEL}    //span[contains(text(),'${VIEWER TEXT}')]

Cloud Owner Can Change Local User Login
    [Tags]    local_user    C76244
    @{local users} =    Local User Start   ${email}
    Verify In Local Users UI    ${local users}    ${email}
    @{new locals} =    Create List
    FOR    ${user}    IN    @{local users}
        Click Element    //span[text()="Local+${user}"]
        Wait Until Elements Are Visible
	    ...    ${LOCAL USER LOGIN}
	    ${new login} =    Change Login for Local User    ${user}    Local+${user}_changed
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        Wait Until Element is Visible    //span[text()="${new login}"]
	    Wait Until Textfield Contains    ${LOCAL USER LOGIN}    ${new login}
	    ${email} =    Convert To Lowercase    noptixautoqa+local_${user}@gmail.com
        &{new local} =    Create Dictionary    email=${email}    fullName=Local User     name=${new login}    permissions=${permissions}[${user}]
        Append To List    ${new locals}    ${new local}
    END
    Verify Changed Info Via API    ${new locals}

Cloud Owner Can Change Local User Full Name
    [Tags]    local_user    C76244
    @{local users} =    Local User Start   ${email}
    Verify In Local Users UI    ${local users}    ${email}
    @{new locals} =    Create List
    FOR    ${user}    IN    @{local users}
        Click Element    //span[text()="Local+${user}"]
        Wait Until Elements Are Visible
	    ...    ${LOCAL USER NAME}
	    ${new full name} =    Change Full Name for Local User     ${user}    Changed User
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        ${email} =    Convert To Lowercase    noptixautoqa+local_${user}@gmail.com
        ${name} =   Convert To Lowercase    local+${user}
        &{new local} =    Create Dictionary    email=${email}    fullName=${new full name}    name=${name}   permissions=${permissions}[${user}]
        Append To List    ${new locals}    ${new local}
    END
    Verify Changed Info Via API    ${new locals}

Cloud Owner Can Change Local User Email
    [Tags]    local_user    C76244
    @{local users} =    Local User Start   ${email}
    Verify In Local Users UI    ${local users}    ${email}
    @{new locals} =    Create List
    FOR    ${user}    IN    @{local users}
        Click Element    //span[text()="Local+${user}"]
        Wait Until Elements Are Visible
	    ...    ${LOCAL USER EMAIL}
        ${new local user email} =     Change Email for Local User    ${user}    ${EMAIL VIEWER}
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        ${name} =   Convert To Lowercase    local+${user}
        &{new local} =    Create Dictionary    email=${new local user email}   fullName=Local User    name=${name}   permissions=${permissions}[${user}]
        Append To List    ${new locals}    ${new local}
    END
    Verify Changed Info Via API    ${new locals}

Cloud Owner Can Change Local User Permissions
    [Tags]    local_user    C76243
    Log    Same test as testrail "Cloud owner can change local user's access level (positive)."
    @{local users} =    Local User Start   ${email}
    Verify In Local Users UI    ${local users}    ${email}
    @{new locals} =    Create List
    FOR    ${user}    IN    @{local users}
        Click Element    //span[text()="Local+${user}"]
        Wait Until Elements Are Visible
	    ...    ${LOCAL USER LOGIN}
        ${new permission} =    Change Permission Level for Local User     ${user}    ${email}
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        ${user} =    Convert To Lowercase    ${user}
        Wait Until Element is Visible    //span[text()="local+${user}"]/following-sibling::span[text()="${new permission}"]
	    ${reverse permission} =    Get Key from Value    ${role names}    ${new permission}
        ${email} =    Convert To Lowercase    noptixautoqa+local_${user}@gmail.com
        ${name} =   Convert To Lowercase    local+${user}
        &{new local} =    Create Dictionary    email=${email}    fullName=Local User    name=${name}  permissions=${permissions}[${reverse permission}]
        Append To List    ${new locals}    ${new local}
    END
    Verify Changed Info Via API    ${new locals}

Cloud Owner Can Change Local User Password
    [Tags]    local_user    C76246
    Log    Same test as testrail "Cloud owner can change local user password (positive)"
    @{local users} =    Local User Start   ${email}
    Verify In Local Users UI    ${local users}    ${email}
    FOR    ${user}    IN    @{local users}
        Log    Change password for ${user}
        Click Element    //span[text()="Local+${user}"]
        Wait Until Elements Are Visible
	    ...    ${LOCAL USER LOGIN}
        Click Button    ${LOCAL USER CHANGE PASSWORD BUTTON}
        Input Text    //input[@id="newPassword"]    ${ALT PASSWORD}
        Click Button    ${LOCAL USER CHANGE PASSWORD SAVE}
        Wait Until Element is Not Visible    //input[@id="newPassword"]
        Sleep    5
        ${user} =    Convert To Lowercase    ${user}
        @{old auth} =    Create List    local+${user}     ${BASE PASSWORD}
        Run Keyword and Expect Error    *    Get Cameras    ${old auth}    ${AUTO SYS IP}
        @{new auth} =    Create List    local+${user}     ${ALT PASSWORD}
        ${response} =    Get Cameras    ${new auth}    ${AUTO SYS IP}
    END

Cloud owner can change local users' information
    [Tags]    local_user    C76239    C76244
    @{local users} =    Local User Start   ${email}
    ${new locals} =    Modify Local Users via Cloud UI    ${local users}
    Verify Changed Info Via API    ${new locals}

Cloud owner can enable/disable local user (positive)
    [Tags]    C76245    local_user    
    @{local users} =    Local User Start   ${email}
    Wait Until Element is Visible    //span[contains(text(),"Local+")]
    Click Element    //span[contains(text(),"Local+")]
    Set Checkbox Value   ${DISABLE USER SWITCH}    false
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}
    ${name} =    Get Text    //h2[@class="user-email"]
    @{users} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR     ${user}    IN    @{users}
        ${state} =    Set Variable If    '${user}[name]' == '${name}'    ${user}[isEnabled]
        Exit For Loop If    ${state} == ${False}
    END
    Should Be True   ${state} == ${False}
    Set Checkbox Value   ${DISABLE USER SWITCH}    true
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Page Should Not Contain Element   ${USER DISABLED MSG}
    ${name} =    Get Text    //h2[@class="user-email"]
    @{users} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR     ${user}    IN    @{users}
        ${state} =    Set Variable If    '${user}[name]' == '${name}'    ${user}[isEnabled]
        Exit For Loop If    ${state} == ${True}
    END
    Should Be True    ${state} == ${True}

Cloud administrator cannot change local administrator's or owner's information
    [Tags]    local_user    C76240
    @{local users} =    Local User Start   ${EMAIL ADMIN}
    Log    Step 1
    Verify In Local Users UI    ${local users}    ${EMAIL ADMIN}
    FOR    ${user}    IN    @{local users}
        Click Element    //span[text()="Local+${user}"]
        Wait Until Elements Are Visible
	    ...    ${LOCAL USER NAME}
	    ${user role} =    Get Text    //span[text()="Local+${user}"]/following-sibling::span
	    ${contains} =    Run Keyword And Return Status    Should Contain    ${user role}    ${ADMIN TEXT}
	    Run Keyword If    ${contains} == ${False}    Modify All Local User Info    ${user}    ${EMAIL ADMIN}
        ...    ELSE    Run Keyword and Expect Error    *    Modify All Local User Info    ${user}    ${EMAIL ADMIN}
        Run Keyword If    ${contains} == ${False}    Wait Until Elements Are Visible    ${DISABLE USER SWITCH}    ${LOCAL USER DELETE BUTTON}
        ...    ELSE    Elements Should Not Be Visible      ${DISABLE USER SWITCH}     ${LOCAL USER DELETE BUTTON}
    END
    Run Keyword and Expect Error    *    Delete All Local Users    //span[contains(text(),"ocal+")]
    Log    Step 2
    Wait Until Element is Visible    //span[text()="admin"]
    Click Element    //span[text()="admin"]
    Run Keyword and Expect Error    *    Modify All Local User Info    admin    ${EMAIL ADMIN}}
    Elements Should Not Be Visible      ${DISABLE USER SWITCH}     ${LOCAL USER DELETE BUTTON}

Local User Removed on Server is Removed From UI
    [Tags]    local_user
    @{local users} =    Local User Start   ${email}
    Verify In Local Users UI    ${local users}    ${email}
    @{users} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    ${user to delete} =    Set Variable    Local+viewer
    FOR    ${user}    IN    @{users}
        ${user id} =    Set Variable If    '${user}[name]' == '${user to delete}'    ${user}[id]
        Run Keyword If    '${user id}' != 'None'    Exit For Loop
    END
    Remove User    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${user id}
    Reload Page
    Wait Until Element is Visible    ${ADD USER BUTTON SYSTEMS}
    Page Should Not Contain    //span[text()="${user to delete}"]
    
Verify Local Users Deleted On Server
    [Tags]    local_user    C76242
    Log    This case performs the same test known in testrail as "Cloud owner can delete any local user (positive)."
    @{local users} =    Local User Start   ${email}
    Verify In Local Users UI    ${local users}    ${email}
    Delete All Local Users    //span[contains(text(),"ocal+")]
    @{users} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    ${deleted user} =    Set Variable    Local
    FOR    ${user}    IN    @{users}
        Run Keyword If   '${deleted user}' in '${user}[name]'   Fail    A local user "${user}[name]" was found on server
    END
    
Adding New Local User Appears on Cloud Portal
    [Tags]    C76237    local_user
    Log    Preconditions
    @{locals} =    Create List 
    @{users} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR    ${node}    IN    @{users}
        ${name state} =    Run Keyword And Return Status    Should Contain    ${node}[name]    ocal+
        Run Keyword If    ${node}[isCloud] == ${False} and ${name state} == ${True}    Append To List    ${locals}    ${node}             
    END
    Delete All Local Users via API    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${locals}
    Log    Step 1
    @{local users} =    Local User Start   ${email}
    Verify In Local Users UI    ${local users}    ${email}
    
Cloud owner cannot change local owner's information
    [Tags]    C76238    local_user
    Log    Step 1
    Log in to Auto Tests System    ${email}
    Go To Users List
    Log    Step 2
    Wait Until Element is Visible    //span[text()="admin"]
    Click Element    //span[text()="admin"]
    Run Keyword and Expect Error    *    Modify All Local User Info    admin    ${email}
    Elements Should Not Be Visible      ${DISABLE USER SWITCH}     ${LOCAL USER DELETE BUTTON}

Unsaved changes are not sent to the server
    [Tags]    C76241    local_user
    Log    Preconditions
    @{local users} =    Local User Start   ${email}
    @{locals} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    Verify In Local Users UI    ${local users}    ${email}
    
    Log    Step 1
    Click Element    //span[text()="Local+advancedViewer"]
    
    Log    Step 2
    Wait Until Element is Visible     ${ACCESS LEVEL DROPDOWN}
    Click Button    ${ACCESS LEVEL DROPDOWN}
    Wait Until Element is Visible    //*[@id="permissionsSelect"]//a/span[text()="Viewer"] 
    Click Element    //*[@id="permissionsSelect"]//a/span[text()="Viewer"]
    Sleep    .1
    Set Checkbox Value   ${DISABLE USER SWITCH}    false
    Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}
    Input Text    ${LOCAL USER LOGIN}    C76241
    Input Text    ${LOCAL USER NAME}    C76241
    Input Text    ${LOCAL USER EMAIL}    C76241
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL} 
    
    Log    Step 3
    @{check info} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    Lists Should Be Equal     ${check info}    ${locals}  
    
    Log    Step 4
    Click Button    ${ACCOUNT CANCEL}
    Sleep    .1
    Elements Should Not Be Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    Element Text Should Be    //*[@id="permissionsSelect"]/span    ${role names}[advancedViewer]
    Page Should Not Contain Element   ${USER DISABLED MSG}
    Wait Until Textfield Contains    ${LOCAL USER LOGIN}    Local+advancedViewer
    Wait Until Textfield Contains    ${LOCAL USER NAME}    Local User
	Wait Until Textfield Contains    ${LOCAL USER EMAIL}    noptixautoqa+local_advancedViewer@gmail.com
	
	Log    Step 5
	@{check info} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    Lists Should Be Equal     ${check info}    ${locals}
    
Local User Login Field Cannot Be Left Blank
    [Tags]    C76248    local_user
    @{local users} =    Local User Start   ${email}
    @{locals} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
            
    Log    Step 1
    Verify In Local Users UI    ${local users}    ${email}
    Click Element    //span[text()="Local+advancedViewer"]
    
    Log    Step 2
    Wait Until Element is Visible     ${LOCAL USER LOGIN}    
    Input Text    ${LOCAL USER LOGIN}    ${EMPTY}
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    Click Button     ${ACCOUNT SAVE} 
    Page Should Contain    ${LOGIN IS REQUIRED TEXT}
    Page Should Contain Element   ${ACCOUNT SAVE} 
    Page Should Contain Element   ${ACCOUNT CANCEL}
    Element Style Should Be    ${LOCAL USER LOGIN}    border-color    ${ERROR COLOR} 
    
    Log    Step 3
    @{check info} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    Lists Should Be Equal     ${check info}    ${locals}

    Log    Step 4
    Click Button     ${ACCOUNT CANCEL} 
    Wait Until Textfield Contains    ${LOCAL USER LOGIN}    Local+advancedViewer
    
    Log    Step 5
    @{check info} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    Lists Should Be Equal     ${check info}    ${locals} 
    
Local User name field can be left blank
    [Tags]    C76249    local_user
    @{local users} =    Local User Start   ${email}
    
    Log    Step 1
    Verify In Local Users UI    ${local users}    ${email}
    Click Element    //span[text()="Local+advancedViewer"]
    
    Log    Step 2
    Input Text    ${LOCAL USER NAME}    ${EMPTY}
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    
    Log    Step 3
    @{check info} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR    ${user}    IN    @{check info}
        ${full name} =    Set Variable If    'local+advancedviewer' in '${user}[name]'    ${user}[fullName]
        Run Keyword Unless    '${full name}' == 'None'    Exit For Loop
    END 
    Should Be Equal    ${full name}    ${EMPTY}   
     
Local User email field can be left blank
    [Tags]    C76250    local_user
    @{local users} =    Local User Start   ${email}
    
    Log    Step 1
    Verify In Local Users UI    ${local users}    ${email}
    Click Element    //span[text()="Local+advancedViewer"]
    
    Log    Step 2
    Input Text    ${LOCAL USER EMAIL}    ${EMPTY}
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${ACCOUNT CANCEL}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    
    Log    Step 3
    @{check info} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR    ${user}    IN    @{check info}
        ${email field} =    Set Variable If    'local+advancedviewer' in '${user}[name]'    ${user}[email]
        Run Keyword Unless    '${email field}' == 'None'    Exit For Loop
    END 
    Should Be Equal    ${email field}    ${EMPTY}
    
User list is available for owner and administrator
    [Tags]    C76233    local_user
    @{local users} =    Local User Start   ${EMAIL OWNER}
    Log    Step 1
    Verify In Local Users UI    ${local users}    ${EMAIL OWNER}
    Log Out
    Log    Step 2
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Go To Users List
    Verify In Local Users UI    ${local users}    ${EMAIL ADMIN}
    
User list is not available for advanced viewer & lower
    [Tags]    C76462
    Log    Step 1
    Log in to Auto Tests System    ${EMAIL CUSTOM}
    Element Should Not Be visible    ${USERS LIST LINK}
    Log Out
    Log    Step 2
    Log in to Auto Tests System    ${EMAIL ADV VIEWER}
    Element Should Not Be visible    ${USERS LIST LINK} 
    
Cloud Administrator Can Delete Local User(positive)
    [Tags]    C76524    local_user
    @{local users} =    Local User Start   ${EMAIL ADMIN}
    Log    Step 1
    Verify In Local Users UI    ${local users}    ${EMAIL ADMIN}
    Click Element    //span[text()="Local+advancedViewer"]
    Log    Step 2
    Click Button    ${LOCAL USER DELETE BUTTON}
    Wait Until Elements Are Visible    ${LOCAL USER DELETE CONFIRM BUTTON}    ${LOCAL USER DELETE CANCEL BUTTON}
    Log    Step 3
    Click Button    ${LOCAL USER DELETE CONFIRM BUTTON}
    Wait Until Element Is Not Visible    ${LOCAL USER DELETE CANCEL BUTTON}
    Wait Until Element Is Not Visible    //span[text()="Local+advancedViewer"]
    Log    Step 4
    @{users} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    ${deleted user} =    Set Variable    Local+advancedViewer
    FOR    ${user}    IN    @{users}
        Run Keyword If   '${deleted user}' in '${user}[name]'   Fail    "${user}[name]" was found on server
    END
    
Cloud administrator can change local user's login permissions, name and email (positive)
    [Tags]    C76526    C76525    local_user
    @{new locals} =    Create List
    @{local users} =    Local User Start   ${EMAIL ADMIN}
    Log    Step 1
    Verify In Local Users UI    ${local users}    ${EMAIL ADMIN}
    Click Element    //span[text()="Local+advancedViewer"]
    Log    Step 2 and 3
    ${new local} =    Modify All Local User Info    advancedViewer    ${EMAIL ADMIN}
    Append To List    ${new locals}    ${new local}
    Log    Step 4
    Verify Changed Info Via API    ${new locals}    local user=ocal+advancedviewer    
    
Cloud administrator can enable/disable any viewer local user (positive)
    [Tags]    C76527    local_user
    @{local users} =    Local User Start   ${EMAIL ADMIN}
    Log    Step 1
    Verify In Local Users UI    ${local users}    ${EMAIL ADMIN}
    Click Element    //span[text()="Local+advancedViewer"]
    Log    Step 2   
    Set Checkbox Value   ${DISABLE USER SWITCH}    false
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Log    Step 3
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}
    Log    Step 4
    ${name} =    Get Text    //h2[@class="user-email"]
    @{users} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR     ${user}    IN    @{users}
        ${state} =    Set Variable If    '${user}[name]' == '${name}'    ${user}[isEnabled]
        Exit For Loop If    ${state} == ${False}
    END
    Should Be True   ${state} == ${False}
    Log    Step 5
    Set Checkbox Value   ${DISABLE USER SWITCH}    true
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Page Should Not Contain Element   ${USER DISABLED MSG}
    Log    Step 6
    ${name} =    Get Text    //h2[@class="user-email"]
    @{users} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR     ${user}    IN    @{users}
        ${state} =    Set Variable If    '${user}[name]' == '${name}'    ${user}[isEnabled]
        Exit For Loop If    ${state} == ${True}
    END
    Should Be True    ${state} == ${True}
    
Cloud administrator can change local user password (positive)
    [Tags]    C76530    local_user
    @{local users} =    Local User Start   ${EMAIL ADMIN}
    Verify In Local Users UI    ${local users}    ${EMAIL ADMIN}

    Log    Step 1
    Click Element    //span[text()="Local+advancedViewer"]
    Wait Until Elements Are Visible
    ...    ${LOCAL USER LOGIN}
    
    Log    Step 2
    Click Button    ${LOCAL USER CHANGE PASSWORD BUTTON}
    Wait Until Elements Are Visible    ${LOCAL USER CHANGE PASSWORD SAVE}
    
    Log    Step 3
    Input Text    //input[@id="newPassword"]    ${ALT PASSWORD}
    Click Button    ${LOCAL USER CHANGE PASSWORD SAVE}
    Wait Until Element is Not Visible    //input[@id="newPassword"]
    Sleep    5
    
    Log    Step 4
    @{old auth} =    Create List    local+advancedviewer     ${BASE PASSWORD}
    Run Keyword and Expect Error    *    Get Cameras    ${old auth}    ${AUTO SYS IP}
    
    Log    Step 5
    @{new auth} =    Create List    local+advancedviewer     ${ALT PASSWORD}
    ${response} =    Get Cameras    ${new auth}    ${AUTO SYS IP}
    
Changes made in thick client appear on cloud portal
    [Tags]    C76251    local_user
    @{local users} =    Local User Start   ${email}
    @{users} =    Get Users     ${auth}    ${AUTO SYS IP}
    FOR    ${node}    IN    @{users}
        ${name state} =    Run Keyword And Return Status    Should Contain    ${node}[name]    Local+advancedViewer   
        ${id} =     Set Variable if    ${node}[isCloud] == ${False} and ${name state} == ${True}    ${node}[id]
        Exit For Loop If    '${id}' != 'None'             
    END
    Log    Step 1 - 3
    Verify In Local Users UI    ${local users}    ${email}
    Click Element    //span[text()="Local+advancedViewer"]
    Log    Step 4
    Save User    
    ...    ${auth}    
    ...    ${AUTO SYS IP}    
    ...    Local+advancedViewer   
    ...    ${permissions}[advancedViewer]    
    ...    noptixautoqa+local_advancedViewer@gmail.com    
    ...    Api Changed    
    ...    ${BASE PASSWORD}    
    ...    user id=${id}    
    ...    is cloud=${False}    
    Wait Until Textfield Contains    ${LOCAL USER NAME}    Api Changed    timeout=45
    Log    Step 5
    Save User    
    ...    ${auth}    
    ...    ${AUTO SYS IP}    
    ...    Local+advancedViewer   
    ...    ${permissions}[advancedViewer]    
    ...    noptixautoqa+local_apichanged@gmail.com    
    ...    Api Changed    
    ...    ${BASE PASSWORD}    
    ...    user id=${id}    
    ...    is cloud=${False}    
    Wait Until Textfield Contains    ${LOCAL USER EMAIL}    noptixautoqa+local_apichanged@gmail.com    timeout=45
    Log    Step 6
    Save User    
    ...    ${auth}    
    ...    ${AUTO SYS IP}    
    ...    Local+advancedViewer   
    ...    ${permissions}[viewer]    
    ...    noptixautoqa+local_apichanged@gmail.com    
    ...    Api Changed    
    ...    ${BASE PASSWORD}    
    ...    user id=${id}    
    ...    is cloud=${False}    
    Wait Until Element is Visible    //span[text()="Local+advancedViewer"]/following-sibling::span[text()="Viewer"]    timeout=45
    Log    Step 7
    Save User    
    ...    ${auth}    
    ...    ${AUTO SYS IP}    
    ...    Local+advancedViewer   
    ...    ${permissions}[viewer]    
    ...    noptixautoqa+local_apichanged@gmail.com    
    ...    Api Changed    
    ...    ${BASE PASSWORD}    
    ...    user id=${id}    
    ...    is cloud=${False}    
    ...    is enabled=${False}
    Wait Until Element is Visible    ${USER DISABLED MSG}    timeout=45
    Log    Step 8
    Save User    
    ...    ${auth}    
    ...    ${AUTO SYS IP}    
    ...    Local+advancedViewer   
    ...    ${permissions}[viewer]    
    ...    noptixautoqa+local_apichanged@gmail.com    
    ...    Api Changed    
    ...    ${BASE PASSWORD}    
    ...    user id=${id}    
    ...    is cloud=${False}
    Wait Until Element is Not Visible    ${USER DISABLED MSG}    timeout=45
    Log    Step 9
    Remove User    ${auth}    ${AUTO SYS IP}    ${id}
    Wait Until Element is Not Visible    //span[text()="Local+advancedViewer"]    timeout=45
    
    Log    Step 10
    Save User    
    ...    ${auth}    
    ...    ${AUTO SYS IP}    
    ...    Local+newApiUser   
    ...    ${permissions}[advancedViewer]    
    ...    noptixautoqa+local_advancedViewer@gmail.com    
    ...    New Api   
    ...    ${BASE PASSWORD}    
    ...    is cloud=${False}      
    Wait Until Elements Are Visible    
    ...    //span[text()="Local+newApiUser"]    
    ...    //span[text()="Local+newApiUser"]//preceding-sibling::${LOCAL USER ICON}
    ...    timeout=45   
    Element Should Contain    //span[text()="Local+newApiUser"]/following-sibling::span    ${role names}[advancedViewer]
    Element Should Not Be Visible     //span[text()="${email}"]//preceding-sibling::${LOCAL USER ICON}
    Click Element    //span[text()="Local+newApiUser"]
    Wait Until Elements Are Visible
    ...    ${LOCAL USER LOGIN}
    ...    ${LOCAL USER NAME}
    ...    ${LOCAL USER EMAIL}    
    ...    ${DISABLE USER SWITCH}
    ...    ${LOCAL USER DELETE BUTTON}
    ...    ${LOCAL USER CHANGE PASSWORD BUTTON}
    Wait Until Textfield Contains    ${LOCAL USER LOGIN}    Local+newApiUser
    Wait Until Textfield Contains    ${LOCAL USER NAME}    New Api
    Wait Until Textfield Contains    ${LOCAL USER EMAIL}    noptixautoqa+local_advancedViewer@gmail.com
    Element Text Should Be    //*[@id="permissionsSelect"]/span    &{role names}[advancedViewer]    
    
    Log    Clean up
    @{users} =    Get Users     ${auth}    ${AUTO SYS IP}
    FOR    ${node}    IN    @{users}
        ${name state} =    Run Keyword And Return Status    Should Contain    ${node}[name]    Local+newApiUser   
        ${id} =     Set Variable if    ${node}[isCloud] == ${False} and ${name state} == ${True}    ${node}[id]
        Exit For Loop If    '${id}' != 'None'             
    END
    Remove User    ${auth}    ${AUTO SYS IP}    ${id}
    
Local user list is not available for offline system
    [Tags]    C76234    local_user    System-offline
    Log    Preconditions
    @{local users} =   Reset Local Users    ${AUTO SYS AUTH}    ${AUTO SYS IP}
    Open Connection    10.1.5.126
    SSHLibrary.Login    docker-server-factory    qweasd 123    
    ${results}    Execute Command    docker container stop autotests
    Log    Step 1
    Log in to Auto Tests System    ${email} 
    Go To Users List
    FOR    ${user}    IN    @{local users}
        Element Should Not Be Visible    //span[text()="Local+${user}"]
    END    
    Log    Step 2   
    ${results}    Execute Command    docker container start autotests
    FOR    ${user}    IN    @{local users}
        Wait Until Element Is Visible   //span[text()="Local+${user}"]    65
    END   
    Log    Step 3
    ${results}    Execute Command    docker container stop autotests
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}    31
    Reload Page   
    FOR    ${user}    IN    @{local users}
        Wait Until Element Is Not Visible   //span[text()="Local+${user}"]
    END   
    Log    Clean up
    ${results}    Execute Command    docker container start autotests
