*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Reset DB and Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Users Suite Setup
    Open Browser and go to URL    ${url}
    ${random} =	   Generate Random String      length=5
    Set Suite Variable     ${random}    ${random}
    ${servers}=   Create Systems
    #${token}=    Get Server Token    auth    serverUrl
    ${auth}=   set variable    ${servers}[0][cloudOwner]    ${password}
    Set Suite Variable    ${servers}    ${servers}
    Save User Role    ${auth}    https://${QA BURBANK IP}:${servers}[0][port][0]    Client Custom    NoGlobalPermissions
    ${client custom}=    Register and activate account with random email    mark    hamil    ${BASE PASSWORD}

    IF    '''${mode}'''=='''cloud'''
        system-user-resource.Cloud Suite Setup
    ELSE
        system-user-resource.Web Admin Suite Setup
    END

Web Admin Suite Setup
    Open Browser and go to URL    https://${QA BURBANK IP}:${servers}[0][port][0]

Cloud Suite Setup
    Go To    ${url}
    Log in to user and system    ${servers}[0][cloudOwner]    ${servers}[0][id]
    Wait Until Element is Visible    ${SERVERS LINK}     65
    Sleep    1
    Click    Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=95
    #Dismiss New Feature Modal
    Log Out

#Users Test Setup
#    [Arguments]    ${server}=&{system}    ${user}=${user in charge}    ${verify}=${True}
#    Run Keyword If    '''${mode}'''=='''cloud'''    Cloud Test Setup    ${server}    ${user}    ${verify}
#    ...    ELSE    Web Admin Test Setup    ${server}    ${user}    ${verify}

Users Test Tear Down
    Run Keyword If Test Failed    Reset
    ${status}=    Run Keyword If    '''${mode}'''=='''cloud'''    Run Keyword And Return Status    validate log out
    ...     ELSE    Run Keyword And Return Status    validate log out web admin
    IF    ${status} == ${False}
        Log Out
    END

Users Teardown
    Run Keyword and Warn on Failure    Teardown Servers    ${servers}
    Cleanup Containers    ${random}
    Close All Browsers

Remove Temporary Users
    [Arguments]    ${sysID}=${AUTO TESTS SYSTEM ID}    ${sysIP}=${AUTO SYS IP}
    FOR    ${user}    IN     @{TMP USERS}
        ${user id}=   Get Cloud User Id By Email    ${auth}    ${user}    ${sysID}
        IF    '${user id}'!='None'
            Remove User    ${auth}    ${sysIP}    ${user id}
        END
    END
    # Open Browser and go to URL    ${url}
    # Log in to Auto Tests System    ${email}
    # Click Link    ${USERS LIST LINK}
    # Run Keyword And Continue On Failure     Delete All Local Users    //span[contains(text(),"ocal+")]
    # Close Browser


Edit User Permissions In Systems
    [arguments]    ${user email address}    ${permissions}
    Wait Until Element Is Not Visible    ${ADD USER MODAL}
    Select user in Users List    ${user email address}
    Wait Until Elements Are Visible    ${USER EMAIL}    ${ACCESS LEVEL DROPDOWN}
    Element Text Should Be    ${USER EMAIL}    ${user email address}
    Sleep    3
    Change User Permissions    ${permissions}
    Element Text Should Be    ${ACCESS LEVEL DROPDOWN}    ${permissions}
    Wait Until Element Is Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Sleep    3
    Wait Until Element Is Not Visible    ${ACCOUNT SAVE}



Change User Permissions
    [Arguments]    ${permissions}
    Wait Until Elements Are Visible    ${USER EMAIL}    ${ACCESS LEVEL DROPDOWN}
    Click Button    ${ACCESS LEVEL DROPDOWN}
    Sleep    1
    ${p}=   Set Variable    ${ACCESS LEVEL DROPDOWN}/..${DROPDOWN MENU LIST}/li[contains(@class,'dropdown-item-container')]/a[contains(@class, "dropdown-item")]/span[text()='${permissions}']/..
    Wait Until Element Is Visible    ${p}
    Sleep    1
    Click Link    ${p}
    Sleep    1



Check Special Hint
    [Arguments]    ${type}
    Wait Until Element is Visible    ${ADD USER PERMISSIONS DROPDOWN}
    Click Button    ${ADD USER PERMISSIONS DROPDOWN}
    Set Suite Variable    ${dropdown type}    ${ADD USER MODAL}//nx-permissions-select//li//span[text()='${type}']
    Run Keyword If    "${LANGUAGE}"=="nl_NL"    Set Suite Variable    ${dropdown type}    ${ADD USER MODAL}//nx-permissions-select//li//span[text()="${type}"]
    Wait Until Element is Visible    ${dropdown type}
    Sleep    1
    Click Link    ${dropdown type}/..
    # Commented this out because it caused a proble but can't remember why it was here
    # ${type}    Convert To Uppercase    ${type}
    IF    "${type}"=="${ADMIN TEXT}"
        Wait Until Element Contains    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT ADMINISTRATOR}
    ELSE IF    "${type}"=="${ADV VIEWER TEXT}"
        Wait Until Element Contains    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT ADVANCED VIEWER}
    ELSE IF    "${type}"=="${VIEWER TEXT}"
        Wait Until Element Contains    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT VIEWER}
    ELSE IF    "${type}"=="${LIVE VIEWER TEXT}"
        Wait Until Element Contains    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT LIVE VIEWER}
    ELSE IF    "${type}"=="${CUSTOM TEXT}"
        Wait Until Element Contains    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT CUSTOM}
    ELSE IF    "${type}"=="Client Custom"
        Wait Until Element Contains    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT CLIENT CUSTOM}
    ELSE
        Fail    msg=User type did not match any expected types
    END

Rename Local User
    [Arguments]    ${name}
    Click Element    ${EDITABLE TITLE}
   #Delete all text    ${EDITABLE TITLE}
   #Input Text    ${EDITABLE TITLE}    ${name}
    Input Content Editable Text    ${EDITABLE TITLE}    ${name}
    Sleep    2
    Click Element    //label[@for="permissionsSelect"]

Verify In Local Users UI
    [Arguments]    ${new local users}    ${email}
    FOR    ${user}    IN    @{new local users}
        Sleep  2
        Wait Until Elements Are Visible
        ...    //span/nx-search-highlight[text()="Local+${user}"]
        ...    //span/nx-search-highlight[text()="Local+${user}"]//parent::span//preceding-sibling::${LOCAL USER ICON}
        Element Should Contain    //span/nx-search-highlight[text()="Local+${user}"]//parent::span/following-sibling::span/nx-search-highlight   ${role names}[${user}]
        Run Keyword If    '${mode}'=='cloud'    Element Should Not Be Visible     //span/nx-search-highlight[text()="${email}"]//parent::span//preceding-sibling::${LOCAL USER ICON}
        Click Element    //span/nx-search-highlight[text()="Local+${user}"]
# commented out because of CLOUD-6854
        ${status} =    Run Keyword and Return Status    Wait Until Element Is Visible   ${EDITABLE TITLE}    5
        ${status2} =    Run Keyword and Return Status    Wait Until Element Is Visible   ${LOCAL USER LOGIN}    5
        Run Keyword If    '${status}' == '${FALSE}' and '${status2}' == ${FALSE}    Fail    Username not present.
        Wait Until Elements Are Visible
	    ...    ${LOCAL USER NAME}
	    ...    ${LOCAL USER EMAIL}
        IF    '${email}' != '${servers}[0][cloudUsers][cloudAdmin]' and '${role names}[${user}]' != '${ADMIN TEXT}'
            Wait Until Elements Are Visible
            ...    ${DISABLE USER SWITCH}/..
	        ...    ${LOCAL USER DELETE BUTTON}
	        ...    ${LOCAL USER CHANGE PASSWORD BUTTON}
        END
        IF    '${status}' == '${TRUE}'
            Wait Until Element Contains    ${EDITABLE TITLE}    Local+${user}
        ELSE
            Wait Until Element Contains    ${LOCAL USER LOGIN}    Local+${user}
        END
        Capture Page Screenshot
        Capture Element Screenshot    ${LOCAL USER NAME}
	    Wait Until Textfield Contains    ${LOCAL USER NAME}    Local User
	    Wait Until Textfield Contains    ${LOCAL USER EMAIL}    noptixautoqa+local_${user}@gmail.com
        Wait Until Element Is Enabled    ${LOCAL USER NAME}
        log    ${email}
        log    ${user}
        # log    ${users['cloudAdmin']}
        IF    '${email}' == '${servers}[0][cloudOwner]'
            Element Text Should Be    //*[@id="componentId"]/span    ${role names}[${user}]
        ELSE IF    '${email}' == '${servers}[0][cloudUsers][cloudAdmin]' and '${user}' != 'cloudAdmin'
            Element Text Should Be    //*[@id="componentId"]/span    ${role names}[${user}]
        ELSE IF    '${email}' == '${servers}[0][localUsers][cloudAdmin][login]' and '${user}' != 'cloudAdmin'
	        Element Text Should Be    //*[@id="componentId"]/span    ${role names}[${user}]
        ELSE IF    '${email}' == 'admin'
	        Element Text Should Be    //*[@id="componentId"]/span    ${role names}[${user}]
		ELSE
            Elements Should Not Be Visible    //*[@id="componentId"]    ${LOCAL USER CHANGE PASSWORD BUTTON}    ${LOCAL USER DELETE BUTTON}    ${DISABLE USER SWITCH}/..
        END
    END

Modify Local Users via Cloud UI
    [Arguments]    ${local users}    ${email}
    @{new locals} =    Create List
    Verify In Local Users UI    ${local users}    ${email}
    &{local users limited}=    Create Dictionary    &{local users}
    Pop From Dictionary    ${local users limited}    cloudAdmin
    FOR    ${user}    IN    @{local users limited}
# commented out because of CLOUD-6854
        #Click Element    //span/nx-search-highlight[text()="Local+${user}"]
        #Wait Until Element Contains    ${EDITABLE TITLE}    Local+${user}
        #${new login} =    Change Login for Local User    Local+${user}_changed
        ${new full name} =    Change Full Name for Local User     Changed User
        ${new permission} =    Change Permission Level for Local User    ${user}    ${email}
        ${email}=       Get Random Email Robot    ${BASE EMAIL}
        ${new local user email} =     Change Email for Local User    ${email}
	    #Log To Console    You should be able to save now. ${user}
        #Sleep    100
	    Log    Save All Changes
	    Wait Until Element is Visible    ${ACCOUNT SAVE}    60
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
# commented out because of CLOUD-6854
        #Wait Until Element is Visible    //span[text()="${new login}"]
	    #Wait Until Element Contains    ${EDITABLE TITLE}    ${new login}
	    Wait Until Textfield Contains    ${LOCAL USER NAME}    ${new full name}
	    Wait Until Textfield Contains    ${LOCAL USER EMAIL}    ${new local user email}
        #Wait Until Element is Visible    //span/nx-search-highlight[text()="Local+${user}"]/following-sibling::span[text()="${new permission}"]
        Log    Change password for ${user}
        Click Button    ${LOCAL USER CHANGE PASSWORD BUTTON}
        Wait Until Elements Are Visible    //input[@id="newPassword"]    ${LOCAL USER CHANGE PASSWORD SAVE}
        Input Text    //input[@id="newPassword"]    ${ALT PASSWORD}
        Click Button    ${LOCAL USER CHANGE PASSWORD SAVE}
        Wait Until Element is Not Visible    //input[@id="newPassword"]
        ${reverse permission} =    Get Key from Value    ${role names}    ${new permission}
        &{new local} =    Create Dictionary    email=${new local user email}    fullName=${new full name}    permissions=${permissions}[${reverse permission}]
        Append To List    ${new locals}    ${new local}
        #Append To List    @{old locals}    &{old local}
    END
    [Return]    ${new locals}

Change Login for Local User
    [Arguments]    ${new login}
    Sleep    5
    Rename Local User    ${new login}
	[Return]   ${new login}

Change Full Name for Local User
    [Arguments]    ${new full name}
    Sleep    5
    Input Text    ${LOCAL USER NAME}     ${new full name}
    Sleep    .5
    [Return]    ${new full name}

Change Permission Level for Local User
    [Arguments]    ${user}    ${email}
    @{permissions set} =    Get Dictionary Values    ${role names}
    ${admin} =    Run Keyword And Return Status    Should Be Equal As Strings    ${email}     ${EMAIL ADMIN}
    Remove Values From List    ${permissions set}    ${ADMIN TEXT}

    FOR    ${x}    IN RANGE    5
        ${random int} =	    Evaluate	random.randint(0, 2)	modules=random
        ${new permission} =     Get From List    ${permissions set}    ${random int}
        Exit For Loop If  '${new permission}' != '${role names['${user}']}'
    END
    # ${new permission} =    Set Variable If     '${role names}[${user}]' == 'Viewer'    Live Viewer
    # ...     '${role names}[${user}]' != 'Viewer'    Viewer
    Wait Until Element is Visible     ${ACCESS LEVEL DROPDOWN}
    Click Button    ${ACCESS LEVEL DROPDOWN}
    Wait Until Element is Visible    //*[@id="permissionsSelect"]//a/span[text()="${new permission}"]
    Click Element    //*[@id="permissionsSelect"]//a/span[text()="${new permission}"]
    Sleep    .1
    [Return]    ${new permission}

Change Email for Local User
    [Arguments]    ${new email}
    Input Text    ${LOCAL USER EMAIL}      ${new email}
    ${new email} =    Convert To Lowercase    ${new email}
    [Return]    ${new email}

Modify All Local User Info
    [Arguments]    ${user}    ${email}
    #${new login} =    Change Login for Local User    Local+${user}_changed
	${new full name} =    Change Full Name for Local User     Changed User
	${new permission} =    Change Permission Level for Local User    ${user}    ${email}
	${new local user email} =     Change Email for Local User    ${EMAIL VIEWER}
	Wait Until Elements Are Visible    ${ACCOUNT SAVE}
	Click Button    ${ACCOUNT SAVE}
	Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
	#Wait Until Element is Visible    //span[text()="${new login}"]
    # commented out because of CLOUD-6854
	#Wait Until Element Contains    ${EDITABLE TITLE}    ${new login}
	Wait Until Textfield Contains    ${LOCAL USER NAME}    ${new full name}
	Wait Until Textfield Contains    ${LOCAL USER EMAIL}    ${new local user email}
	#Wait Until Element is Visible    //span[text()="${new login}"]/following-sibling::span[text()="${new permission}"]
	${reverse permission} =    Get Key from Value    ${role names}    ${new permission}
	&{new local} =    Create Dictionary    email=${new local user email}    fullName=${new full name}    permissions=${permissions}[${reverse permission}]
    [Return]    ${new local}

Reset Local Users
    [Arguments]     ${auth}    ${token}   ${server}    ${local user}=ocal+    ${password}=${BASE PASSWORD}
    @{locals} =    Create List
    @{local users} =    Get Dictionary Keys    ${role names}
    @{users} =    Get Users     ${auth}    ${server}
    FOR    ${node}    IN    @{users}
        ${name state} =    Run Keyword And Return Status    Should Contain    ${node}[name]    ${local user}
        ${isCloud key} =    Run Keyword and Return Status   Dictionary Should Contain Key    ${node}    isCloud
        ${type key} =    Run Keyword and Return Status   Dictionary Should Contain Key    ${node}    type
        IF      ${isCloud key}
            ${local state} =    Set Variable If    ${node}[isCloud] == ${False}    ${True}    ${False}
        ELSE IF    ${type key}
            ${local state} =    Set Variable If    '${node}[type]' == 'cloud'    ${False}    ${True}
        ELSE
            ${local state} =    Set Variable    ${True}
        END
        Run Keyword If    ${local state} and ${name state}    Append To List    ${locals}    ${node}
    END
    ${count} =    Get Length    ${locals}
    ${status} =    Run Keyword And Return Status    Should Be Equal as Numbers    ${count}    5
    IF    ${status}==${true}
        Reset Local Users API    ${locals}    ${token}    ${server}
    ELSE
        Create New Local Users    ${count}    ${auth}    ${server}   ${token}  ${local users}    ${locals}     ${password}
    END
    [Return]    ${local users}

Create New Local Users
    [Arguments]    ${count}    ${auth}    ${server}    ${token}   ${local users}    ${locals}    ${password}
    IF    ${count}==0
        Create Local Users via API    ${token}    ${server}    ${local users}    ${password}
    ELSE
        Delete All Local Users via API    ${token}    ${server}    ${locals}
        Create Local Users via API    ${token}    ${server}    ${local users}    ${password}
    END

Delete All Local Users via API
    [Arguments]    ${token}    ${server}    ${locals}
    FOR    ${user}    IN    @{locals}
        Remove User    ${token}    ${server}    ${user}[id]
    END

Reset Local Users API
    [Arguments]    ${locals}    ${token}    ${server}
    FOR    ${user}    IN    @{locals}
        ${name} =    Remove String    ${user}[name]    _changed
        ${variable} =    Get Substring    ${name}    6
        ${variable} =    Set Variable If    '${variable}' == 'cloudadmin'    cloudAdmin
        ...    '${variable}' == 'liveviewer'    liveViewer
        ...    '${variable}' == 'advancedviewer'    advancedViewer
        ...    ${variable}
        Save User    ${token}    ${server}    Local+${variable}    ${permissions}[${variable}]    noptixautoqa+local_${variable}@gmail.com    Local User    ${BASE PASSWORD}    userId=${user}[id]    isCloud=${False}   patch=${True}
    END

Check Special Hints
    FOR    ${type}    IN    @{USER TYPE LIST}
        IF    "${type}"!="${OWNER TEXT}"
            Check Special Hint    ${type}
        END
    END

Get Custom Permissions
    [Arguments]    ${custom roles}    ${role name}
    FOR    ${role}    IN    @{custom roles}
        Return From Keyword If    '''${role["name"]}'''=='''${role name}'''    ${role}
    END

Change All Local Users Login
    &{local users limited}=    Create Dictionary    &{servers}[0][localUsers]
    Pop From Dictionary    ${local users limited}    cloudAdmin
    FOR    ${user}    IN    @{local users limited}
        Click Element    //span/nx-search-highlight[text()="Local+${user}"]
# commented out because of CLOUD-6854
        #Wait Until Element Contains    ${EDITABLE TITLE}    Local+${user}
	    ${new login}=    Change Login for Local User    Local+${user}_changed
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        Wait Until Element is Visible    //span[text()="${new login}"]
# commented out because of CLOUD-6854
	    #Wait Until Element Contains    ${EDITABLE TITLE}    ${new login}
	    ${email}=    Convert To Lowercase    noptixautoqa+local_${user}@gmail.com
        &{new local}=    Create Dictionary    email=${email}    fullName=Local User     name=${new login}    permissions=${permissions}[${user}]
        Append To List    @{new locals}    ${new local}
    END

Change All Local Users Full Name
    &{local users limited}=    Create Dictionary    &{servers}[0][localUsers]
    Pop From Dictionary    ${local users limited}    cloudAdmin
    FOR    ${user}    IN    @{local users limited}
        Click Element    //span/nx-search-highlight[text()="Local+${user}"]
        Wait Until Elements Are Visible    ${LOCAL USER NAME}
	    ${new full name} =    Change Full Name for Local User     Changed User
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        ${email} =    Convert To Lowercase    noptixautoqa+local_${user}@gmail.com
        ${name} =   Convert To Lowercase    local+${user}
        &{new local} =    Create Dictionary    email=${email}    fullName=${new full name}    name=${name}   permissions=${permissions}[${user}]
        Append To List    ${new locals}    ${new local}
    END

Change All Local Users Email
    &{local users limited}=    Create Dictionary    &{servers}[0][localUsers]
    Pop From Dictionary    ${local users limited}    cloudAdmin
    FOR    ${user}    IN    @{local users limited}
        Click Element    //span/nx-search-highlight[text()="Local+${user}"]
        Wait Until Element Is Visible    ${LOCAL USER EMAIL}
        ${new local user email} =     Change Email for Local User    ${EMAIL VIEWER}
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        ${name} =   Convert To Lowercase    local+${user}
        &{new local} =    Create Dictionary    email=${new local user email}   fullName=Local User    name=${name}   permissions=${permissions}[${user}]
        Append To List    ${new locals}    ${new local}
    END

Change All Local User Permissions
    &{local users limited}=    Create Dictionary    &{servers}[0][localUsers]
    Pop From Dictionary    ${local users limited}    cloudAdmin
    FOR    ${user}    IN    @{local users limited}
        Click Element    //span/nx-search-highlight[text()="Local+${user}"]
# commented out because of CLOUD-6854
        #Wait Until Element Contains    ${EDITABLE TITLE}    Local+${user}
        ${new permission} =    Change Permission Level for Local User    ${user}    ${servers}[0][cloudOwner]
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        Wait Until Element is Visible    //span/nx-search-highlight[text()="Local+${user}"]/following-sibling::span/span[text()="${new permission}"]
	    ${reverse permission} =    Get Key from Value    ${role names}    ${new permission}
        ${email} =    Convert To Lowercase    noptixautoqa+local_${user}@gmail.com
        ${name} =   Convert To Lowercase    Local+${user}
        &{new local} =    Create Dictionary    email=${email}    fullName=Local User    name=${name}  permissions=${permissions}[${reverse permission}]
        Append To List    ${new locals}    ${new local}
    END

Change All Local User Password
    &{local users limited}=    Create Dictionary    &{servers}[0][localUsers]
    Pop From Dictionary    ${local users limited}    cloudAdmin
    FOR    ${user}    IN    @{local users limited}
        Log    Change password for ${user}
        Click Element    //span/nx-search-highlight[text()="Local+${user}"]
# commented out because of CLOUD-6854
        #Wait Until Element Contains    ${EDITABLE TITLE}    Local+${user}
        Click Button    ${LOCAL USER CHANGE PASSWORD BUTTON}
        Wait Until Elements Are Visible   //input[@id="newPassword"]
        Input Text    //input[@id="newPassword"]    ${ALT PASSWORD}    ${LOCAL USER CHANGE PASSWORD SAVE}
        Click Button    ${LOCAL USER CHANGE PASSWORD SAVE}
        Wait Until Element is Not Visible    //input[@id="newPassword"]
        Sleep    5
        ${user} =    Convert To Lowercase    ${user}
        @{old auth} =    Create List    local+${user}     ${BASE PASSWORD}
        Run Keyword and Expect Error    *    Get Cameras    ${old auth}    https://${QA BURBANK IP}:${servers}[0][port][0]
        @{new auth} =    Create List    local+${user}     ${ALT PASSWORD}
        ${response} =    Get Cameras    ${new auth}    https://${QA BURBANK IP}:${servers}[0][port][0]
    END

Change All Local User Info
    &{local users limited}=    Create Dictionary    &{servers}[0][localUsers]
    Pop From Dictionary    ${local users limited}    cloudAdmin
    FOR    ${user}    IN    @{local users limited}
        Go to Users List
        Click Element    //span/nx-search-highlight[text()="Local+${user}"]
        Wait Until Element Is Visible    ${LOCAL USER NAME}
	    ${user role} =    Get Text    //span[contains(text(),"Local+${user}")]/following-sibling::span
	    ${contains} =    Run Keyword And Return Status    Should Contain    ${user role}    ${ADMIN TEXT}
	    Run Keyword If    ${contains} == ${False}    Modify All Local User Info    ${user}    ${servers}[0][cloudUsers][cloudAdmin]
        ...    ELSE    Run Keyword and Expect Error    *    Modify All Local User Info    ${user}    ${servers}[0][cloudUsers][cloudAdmin]
        Run Keyword If    ${contains} == ${False}    Wait Until Elements Are Visible    ${DISABLE USER SWITCH}/..    ${LOCAL USER DELETE BUTTON}
        ...    ELSE    Elements Should Not Be Visible      ${DISABLE USER SWITCH}/..     ${LOCAL USER DELETE BUTTON}
    END

Get Local User Id By Name
    [Arguments]    ${auth}    ${server url}    ${name}
    @{users} =    Get Users     ${auth}    ${server url}
    ${user to delete} =    Set Variable    ${name}
    FOR    ${user}    IN    @{users}
        ${user id} =    Set Variable If    '${user}[name]' == '${user to delete}'    ${user}[id]
        Run Keyword If    '${user id}' != 'None'    Exit For Loop
    END
    [Return]    ${user id}

User Should Not Exist
    [Arguments]    ${deleted user}
    @{users} =    Get Users     ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
    FOR    ${user}    IN    @{users}
        Run Keyword If   '${deleted user}' in '${user}[name]'   Fail    A local user "${user}[name]" was found on server
    END

Get Local Users
    [Arguments]
    ${locals}=   Create List
    @{users} =    Get Users     ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
    FOR    ${node}    IN    @{users}
        ${name state} =    Run Keyword And Return Status    Should Contain    ${node}[name]    ocal+
        ${isCloud key} =    Run Keyword and Return Status   Dictionary Should Contain Key    ${node}    isCloud
        ${type key} =    Run Keyword and Return Status   Dictionary Should Contain Key    ${node}    type
        IF      ${isCloud key}
            ${local state} =    Set Variable If    ${node}[isCloud] == ${False}    ${True}    ${False}
        ELSE IF    ${type key}
            ${local state} =    Set Variable If    '${node}[type]' == 'cloud'    ${False}    ${True}
        ELSE
            ${local state} =    Set Variable    ${True}
        END
        Run Keyword If    ${local state} and ${name state}    Append To List    ${locals}    ${node}
    END
    [Return]    ${locals}

Check User Full Name is None
    [Arguments]    ${name}    ${check info}
    FOR    ${user}    IN    @{check info}
        ${full name} =    Set Variable If    '${name}' in '${user}[name]'    ${user}[fullName]
        IF    '${full name}' != 'None'
            Exit For Loop
        END
    END
    Should Be Equal    ${full name}    ${None}


Check User Email is None
    [Arguments]    ${name}    ${check info}
    FOR    ${user}    IN    @{check info}
        ${email field} =    Set Variable If    'name' in '${user}[name]'    ${user}[email]
        IF    '${email field}' != 'None'
            Exit For Loop
        END
    END
    Should Be Equal    ${email field}    ${None}

Verify User is Deleted on Server
    [Arguments]    ${deleted user}    ${users}
        FOR    ${user}    IN    @{users}
            Run Keyword If   '${deleted user}' in '${user}[name]'   Fail    "${user}[name]" was found on server
        END

Check If User Is Enabled/Disabled
    [Arguments]    ${current users}    ${name}
    FOR     ${user}    IN    @{current users}
        ${state} =    Set Variable If    '${user}[name]' == '${name}'    ${user}[isEnabled]
        Exit For Loop If    '${state}'=='${True}' or '${state}'=='${False}'
    END
    [Return]    ${state}

Reset
    Close All Browsers
    IF    '''${mode}'''=='''cloud'''
        Open Browser and go to URL    ${url}
    ELSE
        Open Browser and go to URL    https://${QA BURBANK IP}:${servers}[0][port]
    END

Share System With New User And Grab Email Link
    Log in to user and system    ${servers}[0][cloudOwner]    ${servers}[0][id]
    ${random email} =   Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Append To List    ${TMP USERS}    ${random email}
    Go To Users List    
    Share To    ${random email}    ${ADMIN TEXT}
    Sleep    10
    Log Out
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True    
    ${email} =    Wait For Email    recipient=${random email}    timeout=120
    ${invite link}=   Get Nx Links From Email    ${email}    system_invite     
    Set Test Variable     ${random email}    ${random email}
    Set Test Variable     ${invite link}    ${invite link}
    Delete Email    ${email}   
    Close Mailbox
    