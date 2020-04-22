*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Run Keywords    Close All Browsers    Remove Temporary Users
Force Tags        system

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
@{auth}        ${email}    ${password}
${url}         ${ENV}
@{TMP USERS}

*** Keywords ***
Log in to Auto Tests System
    [Arguments]    ${email}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${email}    ${password}    button=None
    Run Keyword If    '${email}'=='${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Run Keyword If    '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    Run Keyword Unless    '${email}'=='${EMAIL OWNER}' or '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}

Check System Text
    [Arguments]    ${user}
    Log Out
    Log in to Auto Tests System    ${user}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    Wait Until Elements Are Visible    ${current owner name}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}
    Run Keyword Unless    "${user}"=="${EMAIL ADMIN}"    Wait Until Element Is Not Visible    ${YOUR ACCESS LEVEL}/span[contains(text(),'${ADMIN TEXT}')]

Reset DB and Open New Browser On Failure
    Close Browser
    Reset System Names
    Add user to cloud system if not there    ${AUTO_TESTS SYSTEM ID}    ${VIEWER TEXT}    ${EMAIL NOTOWNER}
    Open Browser and go to URL    ${url}

Remove Temporary Users
    FOR    ${user}    IN     @{TMP USERS}
        ${user id}=   Get Cloud User Id By Email    ${auth}    ${user}    ${AUTO TESTS SYSTEM ID}
        Run Keyword Unless    '${user id}'=='None'    Remove User    ${auth}    ${AUTO TESTS DEV2 IP}:${AUTO TESTS DEV2 PORT}    ${user id}
    END

Restart
    Common Restart Logout    ${url}

Check Special Hint
    [Arguments]    ${type}
    Wait Until Element is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    Set Suite Variable    ${dropdown type}    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${type}']
    Run Keyword If    "${LANGUAGE}"=="nl_NL"    Set Suite Variable    ${dropdown type}    ${SHARE MODAL}//nx-permissions-select//li//span[text()="${type}"]
    Wait Until Element is Visible    ${dropdown type}
    Sleep    1
    Click Link    ${dropdown type}/..
    ${type}    Convert To Uppercase    ${type}
    Run Keyword If    "${type}"=="${ADMIN TEXT}"          Wait Until Element Contains
    ...    ${SHARE PERMISSIONS HINT}    ${SHARE PERMISSIONS HINT ADMINISTRATOR}
    ...    ELSE IF    "${type}"=="${ADV VIEWER TEXT}"     Wait Until Element Contains
    ...    ${SHARE PERMISSIONS HINT}    ${SHARE PERMISSIONS HINT ADVANCED VIEWER}
    ...    ELSE IF    "${type}"=="${VIEWER TEXT}"         Wait Until Element Contains
    ...    ${SHARE PERMISSIONS HINT}    ${SHARE PERMISSIONS HINT VIEWER}
    ...    ELSE IF    "${type}"=="${LIVE VIEWER TEXT}"    Wait Until Element Contains
    ...    ${SHARE PERMISSIONS HINT}    ${SHARE PERMISSIONS HINT LIVE VIEWER}
    ...    ELSE IF    "${type}"=="${CUSTOM TEXT}"         Wait Until Element Contains
    ...    ${SHARE PERMISSIONS HINT}    ${SHARE PERMISSIONS HINT CUSTOM}

Create Local Users via API
    [Arguments]    ${auth}    ${server}
    @{local users} =    Create List    cloudAdmin    viewer    liveViewer    advancedViewer    custom
    FOR    ${user}    IN    @{local users}
        Save User    ${auth}    ${server}    Local+${user}    &{permissions}[${user}]    noptixautoqa+local_${user}@gmail.com    Local User    ${BASE PASSWORD}    is cloud=${False}
    END               
    [return]    @{local users}

Delete All Local Users
    [Arguments]    ${locator}
    Wait Until Element is Visible    ${locator}  
    ${local users} =    Get Element Count     ${locator}  
    #Click Element    ${locator}[1]
    FOR    ${node}   IN RANGE   ${local users}
        Wait Until Element is Visible    ${locator}
        Click Element    ${locator} 
        Wait Until Element is Visible    ${LOCAL USER DELETE BUTTON}
        Click Button    ${LOCAL USER DELETE BUTTON}
        Wait Until Element is Visible     ${LOCAL USER DELETE CONFIRM BUTTON} 
        Click Button    ${LOCAL USER DELETE CONFIRM BUTTON}
        Wait Until Element is Not Visible    ${LOCAL USER DELETE CONFIRM BUTTON}
        Reload Page
    END
    Wait Until Element is Visible    //span[text()="admin"]
    Page Should Not Contain Element     ${locator}
    
Verify Changed Info Via API
    [Arguments]    ${new locals}    ${locals}
    @{users} =    Get Users     ${AUTO SYS AUTH}    ${AUTO SYS IP}
    FOR    ${node}    IN    @{users}
        ${name state} =    Run Keyword And Return Status    Should Contain    &{node}[name]    ocal+
        Run Keyword If    &{node}[isCloud] == ${False} and ${name state} == ${True}    Append To List    ${locals}    ${node}             
    END
    FOR    ${x}    IN    @{locals}
        Keep in Dictionary    ${x}    name    fullName    permissions    email
    END
    FOR    ${user}    IN    @{locals} 
        Should Contain    ${new locals}    ${user}     
        #${n} =    Evaluate    ${n}+1
    END   

*** Test Cases ***
Cancel should cancel disconnection and disconnect should remove it when not owner
    [Tags]    C41884
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    &{ACCESS ROLES}[viewer]    ${EMAIL NOT OWNER}

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
    Wait Until Element Is Visible    ${SHARE BUTTON SYSTEMS}
    Run Keyword And Expect Error    *    Wait Until Element Is Visible    ${NOT OWNER IN SYSTEM}

    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    &{ACCESS ROLES}[viewer]    ${EMAIL NOT OWNER}

Should display same user data as user provided during registration
    [Tags]    email    Threaded
    ${random email}=   Register and activate account with random email    ${COMBO TEXT}    ${COMBO TEXT}    ${password}
    Append To List    ${TMP USERS}    ${random email}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    &{ACCESS ROLES}[admin]    ${random email}

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
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    &{ACCESS ROLES}[viewer]    ${random email}
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
    Wait Until Element is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Element is Visible    ${SHARE MODAL}
    Click Button    ${SHARE CLOSE}
    Wait Until Page Does Not Contain Element    ${SHARE MODAL}

#Sharing link for anonymous - first ask login, then show share dialog
#    [Tags]    Threaded    Deprecated
#    Log in to Auto Tests System    ${email}
#    ${location}    Get Location
#    Log Out
#    Go To    ${location}/share
#    Log In    ${email}    ${password}    button=None
#    Wait Until Element is Visible    ${SHARE MODAL}
#    Click Button    ${SHARE CLOSE}
#    Wait Until Page Does Not Contain Element    ${SHARE MODAL}
#

Check Cancel and 'X' buttons
    [Tags]    C41888    Threaded    CLOUD-3733
    Log in to Auto Tests System    ${email}

    Log    Check Cancel Button
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}/users
    Wait until element is visible    ${SHARE BUTTON SYSTEMS}
    Click Button  ${SHARE BUTTON SYSTEMS}
    Wait Until Elements are Visible    ${SHARE MODAL}    ${SHARE CANCEL}
    Click Button    ${SHARE CANCEL}
    Wait Until Element is Not Visible    ${SHARE MODAL}

    Log    Check 'X' Button
    Click Button  ${SHARE BUTTON SYSTEMS}
    Wait Until Elements are Visible    ${SHARE MODAL}    ${SHARE CLOSE}
    Click Button    ${SHARE CLOSE}
    Wait Until Element is Not Visible    ${SHARE MODAL}

Sharing roles are ordered: more access is on top of the list with options
    [Tags]    Threaded
    Log in to Auto Tests System    ${email}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Element is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Click Element    ${SHARE PERMISSIONS DROPDOWN}
    Wait Until Element is Visible    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${ADMIN TEXT}']/../../following-sibling::li/a/span[text()="${ADV VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="${VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="${LIVE VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="Client Custom"]/../../following-sibling::li/a/span[text()="${CUSTOM TEXT}"]
    Click Button    ${SHARE CLOSE}
    Wait Until Page Does Not Contain Element    ${SHARE MODAL}

When user selects role - special hint appears
    [Tags]    C41901    Threaded
    Log in to Auto Tests System    ${email}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    FOR    ${type}    IN    @{USER TYPE LIST}
        Run Keyword Unless    "${type}"=="${OWNER TEXT}"    Check Special Hint    ${type}
    END
    Click Button    ${SHARE CANCEL}

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
        Click Button    ${SHARE CANCEL}
        Share To    ${EMAIL ADMIN}    ${LIVE VIEWER TEXT}    fail
        Click Button    ${SHARE CANCEL}
        Share To    ${EMAIL VIEWER}    ${ADV VIEWER TEXT}    fail
        Click Button    ${SHARE CANCEL}
        Share To    ${EMAIL ADV VIEWER}    ${CUSTOM TEXT}    fail
        Click Button    ${SHARE CANCEL}
        Share To    ${EMAIL CUSTOM}    ${VIEWER TEXT}    fail
        Click Button    ${SHARE CANCEL}
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
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    &{ACCESS ROLES}[admin]    ${random email}

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
    Wait Until Element is Enabled    ${SHARE BUTTON SYSTEMS}
    Click Button    ${SHARE BUTTON SYSTEMS}
    Wait Until Element is Visible    ${SHARE PERMISSIONS DROPDOWN}
    Sleep    2
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    Wait Until Element is Visible
    ...    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${VIEWER TEXT}']
    Element Should Not Be Visible
    ...    ${SHARE MODAL}//nx-permissions-select//li//span[text()='${ADMIN TEXT}']
    Click Button    ${SHARE PERMISSIONS DROPDOWN}
    Click Button    ${SHARE CANCEL}

Edit permission works
    [Tags]    C41900
    ${random email}=   Get Random Email    ${BASE EMAIL}
    Log in to Auto Tests System    ${email}
    Share To    ${random email}    ${ADMIN TEXT}
    Edit User Permissions In Systems    ${random email}    ${CUSTOM TEXT}
    Check User Permissions    ${random email}    ${CUSTOM TEXT}
    Edit User Permissions In Systems    ${random email}    ${ADMIN TEXT}
    Check User Permissions    ${random email}    ${ADMIN TEXT}
    Remove User Permissions    ${random email}

Delete user works
    [Tags]    email    C41903
    ${random email}=   Register and activate account with random email    mark    harmill    ${password}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    &{ACCESS ROLES}[admin]    ${random email}

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
    Should be equal as strings    ${role}    &{ACCESS ROLES}[admin]

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
    Should be equal as strings    ${role}    &{ACCESS ROLES}[admin]

Share with unregistered user - brings them to registration page with code with correct email locked
    [Tags]    email    C41889
    ${random email}=   Get Random Email    ${BASE EMAIL}
    Append To List    ${TMP USERS}    ${random email}
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    &{ACCESS ROLES}[admin]    ${random email}
    ${role}=   Get Cloud User Role  ${auth}    ${random email}    ${AUTO TESTS SYSTEM ID}
    Should be equal as strings    ${role}    &{ACCESS ROLES}[admin]

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
    Share    ${auth}    ${AUTO TESTS SYSTEM ID}    &{ACCESS ROLES}[admin]    ${random email}
    ${role}=   Get Cloud User Role  ${auth}    ${random email}    ${AUTO TESTS SYSTEM ID}
    Should be equal as strings    ${role}    &{ACCESS ROLES}[admin]

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
    
Local User Test
    @{local users} =    Create Local Users via API    ${AUTO SYS AUTH}    ${AUTO SYS IP}
    @{new locals} =    Create List  
    @{locals} =    Create List        
    Log in to Auto Tests System    ${email}
    Click Link    ${USERS LIST LINK}
    
    Log    MODIFY LOCAL USERS VIA UI  
    FOR    ${user}    IN    @{local users}
        Wait Until Element is Visible    //span[text()="Local+${user}"]
        Element Should Contain    //span[text()="Local+${user}"]/following-sibling::span    &{role names}[${user}] 
        Click Element    //span[text()="Local+${user}"]
        Wait Until Elements Are Visible
	    ...    ${LOCAL USER LOGIN}
	    ...    ${LOCAL USER NAME}
	    ...    ${LOCAL USER EMAIL}
	    Wait Until Textfield Contains    ${LOCAL USER LOGIN}    Local+${user}
	    Wait Until Textfield Contains    ${LOCAL USER NAME}    Local User
	    Wait Until Textfield Contains    ${LOCAL USER EMAIL}    noptixautoqa+local_${user}@gmail.com
	    Element Text Should Be    //*[@id="permissionsSelect"]/span    &{role names}[${user}]
  
	    Log     Change the login for ${user}
	    ${new login} =    Set Variable   Local+${user}_changed
	    Input Text    ${LOCAL USER LOGIN}     ${new login}
	    #Click Button    //button[text()="Save"]
	    ${new login} =    Convert To Lowercase    ${new login}
	    
    
        Log     Change the name for ${user}
	    ${new full name} =    Set Variable   Changed User
	    Input Text    ${LOCAL USER NAME}     ${new full name}
	    #Click Button    //button[text()="Save"]
	   

	    Log     Change permission level for ${user}
	    ${new permission} =    Set Variable If     '&{role names}[${user}]' == 'Viewer'    Live Viewer
	    ...     '&{role names}[${user}]' != 'Viewer'    Viewer 
	    Wait Until Element is Visible     ${ACCESS LEVEL DROPDOWN}
	    Click Button    ${ACCESS LEVEL DROPDOWN}
	    Wait Until Element is Visible    //*[@id="permissionsSelect"]//a/span[text()="${new permission}"] 
	    Click Element    //*[@id="permissionsSelect"]//a/span[text()="${new permission}"]
	    Sleep    .1
	   # Wait Until Element is Visible     //button[text()="Save"]
	    #Click Button    //button[text()="Save"]
	    
	    
	    Log    Change email for ${user}
	    ${new local user email} =    Set Variable    ${EMAIL VIEWER}
	    Input Text    ${LOCAL USER EMAIL}      ${new local user email}
	    ${new local user email} =    Convert To Lowercase    ${new local user email} 
	    
	    Log    Save All Changes
	    Click Button    //button[text()="Save"]
        Wait Until Element is Visible    //span[text()="${new login}"]
	    Wait Until Textfield Contains    ${LOCAL USER LOGIN}    ${new login}
	    Wait Until Textfield Contains    ${LOCAL USER NAME}    ${new full name}
        Wait Until Element is Visible    //span[text()="${new login}"]/following-sibling::span[text()="${new permission}"]
        
        Log    Change password for ${user}
        Click Button    ${LOCAL USER CHANGE PASSWORD BUTTON} 
        Input Text    //input[@id="newPassword"]    ${ALT PASSWORD}
        Click Button    //form[@name="changePasswordForm"]//button[text()="Save"]
        Wait Until Element is Not Visible    //input[@id="newPassword"]
        
        ${reverse permission}=    Set Variable    &{reverse role names}[${new permission}]
        &{new local} =    Create Dictionary    email=${new local user email}    fullName=${new full name}     name=${new login}    permissions=&{permissions}[${reverse permission}]    
        #Set To Dictionary    &{new local}    
        #Set To Dictionary    &{old local}    name=Local+${user}    fullName=Local User    permissions=&{role names}[${user}]      email=noptixautoqa+local_${user}@gmail.com
        
        Append To List    ${new locals}    ${new local}
        #Append To List    @{old locals}    &{old local} 
    END    
    Verify Changed Info Via API    ${new locals}    ${locals}  
    Delete All Local Users    //span[contains(text(),"local+")]
	        
    
       
    