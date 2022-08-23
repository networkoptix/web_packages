*** Settings ***
Resource          ../Resources/front-end-resources/system-user-resource.robot
#Resource    ../special-cases/qa-user-creation.robot
Suite Setup       Users Suite Setup
Test Setup        Run Keywords    QA Video Recording Start       Skip If Irrelevant
Test Teardown     Run Keywords    QA Video Recording Stop        Users Test Tear Down
Suite Teardown    Run Keyword and Ignore Error    users Teardown
Force Tags        system    Threaded

*** Test Cases ***
1. Cancel should cancel disconnection and disconnect should remove it when not owner
    [Tags]    C41884    cloud
    ${random user}=    Register and activate account with random email    mark    hamil    ${password}
    Share    ${server 1['cloud auth']}    ${server 1['cloud id']}    ${ACCESS ROLES}[viewer]    ${random user}      ${permissions}[viewer]
    Log in to user and system    ${random user}    ${server 1['cloud id']}
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible    ${DISCONNECT MODAL WARNING}    ${DISCONNECT MODAL CANCEL}

    Click Button    ${DISCONNECT MODAL CANCEL}
    Wait Until Element Is Not Visible    ${DISCONNECT MODAL WARNING}
    Wait Until Page Does Not Contain Element    //div[@modal-render='true']
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible    ${MODAL DIALOG}    ${DISCONNECT MODAL WARNING}    ${DISCONNECT MODAL DISCONNECT BUTTON}
    Sleep    1
    Click Button    ${DISCONNECT MODAL DISCONNECT BUTTON}
    ${SYSTEM DELETED FROM ACCOUNT}    Replace String    ${SYSTEM DELETED FROM ACCOUNT}    {{system_name}}    ${server 1['name']}
    Check For Alert     ${SYSTEM DELETED FROM ACCOUNT}
    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}
    Log Out

    Log In    ${server 1['owner']}    ${password}
    Go To    ${url}/systems/${server 1['cloud id']}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${ADD USER BUTTON SYSTEMS}
    Run Keyword And Expect Error    *    Wait Until Element Is Visible    ${NOT OWNER IN SYSTEM}

    # Verify the user is removed from the list via API
    ${users}=   Get Cloud System Users    ${server 1['cloud auth']}    ${server 1['cloud id']}
    ${is there}=   Set Variable    ${False}
    FOR    ${obj}    IN    @{users}
        ${is there}=   Set Variable If    '${obj}[accountEmail]'=='${EMAIL NOT OWNER}'    ${True}
    END
    Should Not Be True    ${is there}

2. Owner / Admin can unlink offline System from Cloud / Account
    [Tags]    C41897    C41898    cloud
    Log    Prepare offline system with owner and viewer
    #${owner email}=   Register and activate account with random email    firstName    lastName    ${password}
    ${user 1}=   Register and activate account with random email    firstName    lastName    ${password}
    ${user 2}=   Register and activate account with random email    firstName    lastName    ${password}
    Save User    ${server 2['local auth']}    https://${QA BURBANK IP}:${server 2['port']}    ${user 1}    ${ACCESS ROLES}[viewer]    ${user 1}    Mark Hamil    ${password}    
    Save User    ${server 2['local auth']}    https://${QA BURBANK IP}:${server 2['port']}    ${user 2}    ${ACCESS ROLES}[viewer]    ${user 2}    Mark Hamil2    ${password}    
    #Share    ${auth}    ${server 2['sysId']}    ${ACCESS ROLES}[viewer]    ${user email}
    #Share    ${auth}    ${server 2['sysId']}    ${ACCESS ROLES}[viewer]    ${user 2 email}
    # Make the system offline
    #Sleep    30
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop ${server 2['name']}
    Close Connection

    Log    C41898: Step 1
    Go To    ${url}/systems/${server 2['cloud id']}
    IF    '''${mode}'''=='''cloud'''    
        Log In    ${user 1}    ${password}    button=None
    ELSE    
        Log In Web Admin    admin    ${password}
    END
    Reload Page
    Wait Until Element Is Visible    ${SYSTEM OFFLINE}    65
    Disconnect from my account    ${server 2['name']}
    Log out

    Log    C41898: Step 2
    ${users}=   Get Cloud System Users    ${server 2['cloud auth']}    ${server 2['cloud id']}
    ${is there}=   Set Variable    ${False}
    FOR    ${obj}    IN    @{users}
        ${is there}=   Set Variable If    '${obj}[accountEmail]'=='${user 1}'    ${True}
    END
    Should Not Be True    ${is there}

    Log In    ${server 1['owner']}    ${password}
    Go To    ${url}/systems/${server 2['cloud id']}
    Wait Until Element Is Visible    ${SYSTEM OFFLINE}
    Wait Until Element Is Visible    ${USERS LIST LINK}
    Run keyword and expect error    *    Select user in Users List    ${user 1}

    Log    C41897: Step 1 - add user and disconnect system from cloud
    Disconnect from cloud
    Log Out

    Log    C41897: Step 2 - make sure viewer has no systems
    ${systems}=   Get Account Systems    ${user 2}    ${password}
    Should Be Empty    ${systems}
    Log In   ${user 2}    ${password}
    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}

    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container start ${server 2['name']}
    # ${results}    Execute Command    docker container port ${server 2['name']}
    # ${port info}=   Split String    ${results}    :
    Close Connection
    # Set To Dictionary    ${system 2}    port=${port info[1]}
    Sleep   3
    ${sysId2}=   Connect System to Cloud    ${server 2['local auth']}    https://${QA BURBANK IP}:${server 2['port']}    usertest2    ${server 1['owner']}    ${BASE PASSWORD}
    Set To Dictionary    ${server 2}    cloud id=${sysId2}


3. Should display same user data as user provided during registration
    [Tags]    email    cloud
    ${random email}=   Register and activate account with random email    ${COMBO TEXT}    ${COMBO TEXT}    ${password}
    Append To List    ${TMP USERS}    ${random email}
    Share    ${server 2['cloud auth']}    ${server 2['cloud id']}    ${ACCESS ROLES}[admin]    ${random email}     ${permissions}[cloudAdmin]

    #verify user name displayed correctly in users list
    Log in    ${random email}    ${password}
    Wait Until Element Is Visible    ${USERS LIST LINK}    65
    Click Link    ${USERS LIST LINK}
    ${User In List}=   Set Variable    //nx-system-settings-component//nx-menu//nx-level-3-item//span[text()='${random email}']/../../../a
    Wait Until Element Is Visible    ${User In List}
    Click Link    ${User In List}
    Wait Until Element Is Visible    //nx-system-user-component//nx-block//header//span[contains(text(),'${COMBO TEXT} ${COMBO TEXT}')]

4. Should display same user data as shown in user account
    [Tags]    C41884    cloud
    ${random user}    Register and activate account with random email    mark    hamil    ${password}
    Share    ${server 1['cloud auth']}    ${server 1['cloud id']}    ${ACCESS ROLES}[viewer]    ${random user}      ${permissions}[viewer]
    Log in to user and system    ${random user}    ${server 1['cloud id']}
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible    ${DISCONNECT MODAL WARNING}    ${DISCONNECT MODAL CANCEL}

    Click Button    ${DISCONNECT MODAL CANCEL}
    Wait Until Element Is Not Visible    ${DISCONNECT MODAL WARNING}
    Wait Until Page Does Not Contain Element    //div[@modal-render='true']
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Sleep    1
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible    ${MODAL DIALOG}    ${DISCONNECT MODAL WARNING}    ${DISCONNECT MODAL DISCONNECT BUTTON}
    Sleep    1
    Click Button    ${DISCONNECT MODAL DISCONNECT BUTTON}
    ${SYSTEM DELETED FROM ACCOUNT}    Replace String    ${SYSTEM DELETED FROM ACCOUNT}    {{system_name}}    ${server 1['name']}
    Check For Alert     ${SYSTEM DELETED FROM ACCOUNT}
    Wait Until Element Is Visible    ${YOU HAVE NO SYSTEMS}
    Log Out

    Log In    ${server 1['owner']}    ${password}
    Go To    ${url}/systems/${server 1['cloud id']}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${ADD USER BUTTON SYSTEMS}
    Run Keyword And Expect Error    *    Wait Until Element Is Visible    ${NOT OWNER IN SYSTEM}

    # Verify the user is removed from the list via API
    ${users}=   Get Cloud System Users    ${server 1['cloud auth']}    ${server 1['cloud id']}
    ${is there}=   Set Variable    ${False}
    FOR    ${obj}    IN    @{users}
        ${is there}=   Set Variable If    '${obj}[accountEmail]'=='${EMAIL NOT OWNER}'    ${True}
    END
    Should Not Be True    ${is there}

5. Share button - opens dialog
    [Tags]    C41888    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    admin    ${server 1['owner']}
    FOR    ${user}  IN  @{list}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Wait Until Elements Are Visible    ${USERS LIST LINK}
        Click Link    ${USERS LIST LINK}
        Wait Until Element is Enabled    ${ADD USER BUTTON SYSTEMS}
        Sleep    1
        Wait Until Keyword Succeeds    10    0.5    Click Button    ${ADD USER BUTTON SYSTEMS}
        Wait Until Element is Visible    ${ADD USER MODAL}
        Click Button    ${ADD USER CLOSE}
        Wait Until Page Does Not Contain Element    ${ADD USER MODAL}
        Exit For Loop If    '''${user}'''=='''admin'''
        Log Out
    END

6. Check Cancel and 'X' buttons
    [Tags]    C78228    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    ${random user}=   Get Random Email Robot    ${BASE EMAIL}
    Log    Check Cancel Button
    FOR    ${user}  IN  @{list}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Wait until element is visible    ${ADD USER BUTTON SYSTEMS}
        Click Button  ${ADD USER BUTTON SYSTEMS}
        Wait Until Elements are Visible    ${ADD USER MODAL}    ${ADD USER CANCEL}
        Input Text    ${ADD USER EMAIL}    ${user}
        Click Button    ${ADD USER CANCEL}
        Wait Until Element is Not Visible    ${ADD USER MODAL}
        Element Should Not Be Visible    ${USERS LIST}//span[contains(text(),"${random user}")]
    
        Log    Check 'X' Button
        Click Button  ${ADD USER BUTTON SYSTEMS}
        Wait Until Elements are Visible    ${ADD USER MODAL}    ${ADD USER CLOSE}
        Input Text    ${ADD USER EMAIL}    ${user}
        Click Button    ${ADD USER CLOSE}
        Wait Until Element is Not Visible    ${ADD USER MODAL}
        Element Should Not Be Visible    ${USERS LIST}//span[contains(text(),"${random user}")]
        Exit For Loop If    '''${user}'''=='''admin'''
        Log Out
    END

7. Sharing roles are ordered: more access is on top of the list with options
    [Tags]    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    FOR    ${user}  IN  @{list}  
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Wait Until Element is Enabled    ${ADD USER BUTTON SYSTEMS}
        Click Button    ${ADD USER BUTTON SYSTEMS}
        Wait Until Element is Visible    ${ADD USER PERMISSIONS DROPDOWN}
        Click Element    ${ADD USER PERMISSIONS DROPDOWN}
        Wait Until Element is Visible    ${ADD USER MODAL}//nx-permissions-select//li//span[text()='${ADMIN TEXT}']/../../following-sibling::li/a/span[text()="${ADV VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="${VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="${LIVE VIEWER TEXT}"]/../../following-sibling::li/a/span[text()="Client Custom"]/../../following-sibling::li/a/span[text()="${CUSTOM TEXT}"]
        Click Button    ${ADD USER CLOSE}
        Wait Until Page Does Not Contain Element    ${ADD USER MODAL}
        Exit For Loop If    '''${user}'''=='''admin'''
        Log Out
    END

8. When user selects role - special hint appears
    [Tags]    C41901    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    FOR    ${user}  IN  @{list}  
        Log In    ${user}    ${password} 
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Wait Until Elements Are Visible    ${USERS LIST LINK}
        Click Link    ${USERS LIST LINK}
        Wait Until Element is Enabled    ${ADD USER BUTTON SYSTEMS}
        Click Button    ${ADD USER BUTTON SYSTEMS}
        Wait Until Elements Are Visible    ${ADD USER PERMISSIONS DROPDOWN}    ${ADD USER PERMISSIONS HINT}
        Wait Until Element Contains    ${ADD USER PERMISSIONS DROPDOWN}    ${VIEWER TEXT}
        Wait Until Element Contains    ${ADD USER PERMISSIONS HINT}    ${ADD USER PERMISSIONS HINT VIEWER}
        Check Special Hints   
    
        Click Button    ${ADD USER CANCEL}
        Exit For Loop If    '''${user}'''=='''admin'''
        Log Out
    END

9. Cloud Admin/administrator cannot delete or edit self
    [Tags]    C41904    webadmin    cloud
    log    ${server 1['local users']}
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['cloud users']}[cloudAdmin]
    ...    ELSE    Create List    ${server 1['cloud users']}[cloudAdmin]    ${server 1['local users']}[cloudAdmin]
    FOR    ${user}  IN  @{list}  
        Log In    ${user}    ${password} 
        Go to Users List
        Select user in Users List    ${user}
        Elements Should Not Be Visible    ${ACCESS LEVEL DROPDOWN}    ${REMOVE USER BUTTON}
        Exit For Loop If    '''${user}'''=='''localcloudAdmin'''
        Log Out
    END

10. Admin and owner cannot edit self and other users via share
    [Tags]    webadmin    cloud    C41904
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}    ${server 1['cloud users']}[cloudAdmin]
    ...    ELSE    Create List    admin    ${server 1['local users']}[cloudAdmin]
    FOR    ${user}    IN    @{list}
        Log    Step 1
        Log in    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Select user in users list    ${user}
        Wait Until Element Is Not Visible    ${REMOVE USER BUTTON}
        Wait Until Element Is Not Visible    ${ACCESS LEVEL DROPDOWN}

        Log    Step 2
        #Cloud users
        Share To    ${server 1['owner']}                             ${CUSTOM TEXT}         fail    system=${server 1['name']}
        Share To    ${server 1['cloud users']}[cloudAdmin]           ${LIVE VIEWER TEXT}    fail    system=${server 1['name']}
        Share To    ${server 1['cloud users']}[viewer]               ${ADV VIEWER TEXT}     fail    system=${server 1['name']}
        Share To    ${server 1['cloud users']}[advancedViewer]       ${CUSTOM TEXT}         fail    system=${server 1['name']}
        Share To    ${server 1['cloud users']}[liveViewer]           ${CUSTOM TEXT}         fail    system=${server 1['name']}
        Share To    ${server 1['cloud users']}[custom]               ${VIEWER TEXT}         fail    system=${server 1['name']}
        
        #Local users
        #Share To    admin    ${CUSTOM TEXT}          fail    system=${server 1['name']}
        #Click Button    ${ADD USER CANCEL}
        #Share To    ${server 1}[local users][cloudAdmin][login]    ${LIVE VIEWER TEXT}     fail    system=${server 1['name']}
        #Click Button    ${ADD USER CANCEL}
        #Share To    ${local users['viewer']}    ${ADV VIEWER TEXT}     fail    system=${server 1['name']}
        #Click Button    ${ADD USER CANCEL}
        #Share To    ${local users['advancedViewer']}    ${CUSTOM TEXT}     fail    system=${server 1['name']}
        #Click Button    ${ADD USER CANCEL}
        #Share To    ${local users['liveViewer']}    ${CUSTOM TEXT}    fail    system=${server 1['name']}
        #Click Button    ${ADD USER CANCEL}
        #Share To    ${local users['custom']}    ${VIEWER TEXT}    fail    system=${server 1['name']}
        #Click Button    ${ADD USER CANCEL}
        Log Out
    END

    Log    Step 3
    FOR    ${user}    IN    @{list}
        ${role}=   Get Cloud User Role    ${server 1['cloud auth']}    ${user}    ${server 1['cloud id']}
        Run Keyword If    '${user}'=='${server 1['owner']}'          Should be equal as strings    ${role}    owner
        Run Keyword If    '${user}'=='${server 1['cloud users']}[cloudAdmin]'          Should be equal as strings    ${role}    cloudAdmin
        Run Keyword If    '${user}'=='${server 1['cloud users']}[viewer]'         Should be equal as strings    ${role}    viewer
        Run Keyword If    '${user}'=='${server 1['cloud users']}[advancedViewer]'     Should be equal as strings    ${role}    advancedViewer
        Run Keyword If    '${user}'=='${server 1['cloud users']}[liveViewer]'    Should be equal as strings    ${role}    liveViewer
        Run Keyword If    '${user}'=='${server 1['cloud users']}[custom]'         Should be equal as strings    ${role}    custom
    END

11. Admin cannot delete or edit other admins or owner
    [Tags]    C41905    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['cloud users']}[cloudAdmin]
    ...    ELSE    Create List    ${server 1['cloud users']}[cloudAdmin]    ${server 1}[local users][cloudAdmin][login]
    FOR    ${user}    IN    @{list}
        ${random email}=   Register and activate account with random email    mark    harmill    ${password}
        Append To List    ${TMP USERS}    ${random email}
        Share    ${server 1['cloud auth']}    ${server 1['cloud id']}    ${ACCESS ROLES}[admin]    ${random email}      ${permissions}[cloudAdmin]
        Log in    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Select user in Users List    ${server 1['cloud users']}[cloudAdmin]
        Wait Until Element Is Not Visible    ${ACCESS LEVEL DROPDOWN}
        Wait Until Element Is Not Visible    ${REMOVE USER BUTTON}
        Select user in Users List    ${server 1['owner']}
        Wait Until Element Is Not Visible    ${ACCESS LEVEL DROPDOWN}
        Wait Until Element Is Not Visible    ${REMOVE USER BUTTON}
        Select user in Users List    Local+cloudAdmin
        Wait Until Element Is Not Visible    ${ACCESS LEVEL DROPDOWN}
        Wait Until Element Is Not Visible    ${REMOVE USER BUTTON}
        Exit For Loop If    '''${user}'''=='''localcloudAdmin'''
        Log Out
    END

12. Administrator cannot invite another administrator
    [Tags]    C41905    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['cloud users']}[cloudAdmin]
    ...    ELSE    Create List     ${server 1['cloud users']}[cloudAdmin]    ${server 1['local users']}[cloudAdmin][login]
    FOR    ${user}    IN    @{list}
        Log in    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
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
        Exit For Loop If    '''${user}'''=='''localcloudAdmin'''
        Log Out
    END

13. Change role for Cloud User
    [Tags]    C41900    webadmin    cloud
    ${tmp user}=   Register and activate account with random email    Tmp    Viewer    ${base password}
    Share    ${server 1}[cloud auth]    ${server 1}[cloud id]    ${ACCESS ROLES}[viewer]    ${tmp user}     ${permissions}[viewer]
    Log in to system    ${server 1}    ${server 1}[owner]
    Verify In System    ${server 1}[name]

    Log    Step 1
    Go to Users List
    ${user in left menu}=   Set Variable    //span[contains(text(), "${tmp user}")]/following-sibling::span/span[contains(text(), "Viewer")]/ancestor::nx-level-3-item
    Wait until element is visible    ${user in left menu}
    Click Element    ${user in left menu}
    Wait until elements are visible
        ...    ${USER EMAIL}
        ...    ${ACCESS LEVEL DROPDOWN}
        ...    ${NO UNSAVED CHANGES}
        ...    ${REMOVE USER BUTTON}
    ${name shown}=   Get Text    ${USER NAME}
    ${email shown}=   Get Text    ${USER EMAIL}
    ${role shown}=   Get Text    ${ACCESS LEVEL DROPDOWN}/span
    Should be equal as strings    ${name shown}    Tmp Viewer
    Should be equal as strings    ${email shown}    ${tmp user}
    Should be equal as strings    ${role shown}    Viewer

    Log    Step 2
    Click Button    ${ACCESS LEVEL DROPDOWN}
    Wait until element is visible    ${ACCESS LEVEL DROPDOWN MENU}
    Click Element     ${ACCESS LEVEL DROPDOWN MENU}//span[text()='Administrator']
    Wait until elements are visible
        ...    ${SAVE BUTTON}
        ...    ${CANCEL BUTTON}
        ...    ${user in left menu}    # Role is not changed yet

    Log    Step 3
    Click Button    ${SAVE BUTTON}

    Wait until elements are not visible
       ...    ${SAVE BUTTON}
       ...    ${CANCEL BUTTON}
       ...    ${ACCESS LEVEL DROPDOWN MENU}

    ${user in left menu}=   Set Variable    //span[contains(text(), "${tmp user}")]/following-sibling::span/span[contains(text(), "Administrator")]/ancestor::nx-level-3-item
    Wait until elements are visible
        ...    ${ACCESS LEVEL DROPDOWN}
        ...    ${NO UNSAVED CHANGES}
        ...    ${user in left menu}
    ${role shown}=   Get Text    ${ACCESS LEVEL DROPDOWN}/span
    Should be equal as strings    ${role shown}    Administrator

14. Edit permission works
    [Tags]    C30657    C47041    webadmin    cloud
    ${random email}=   Get Random Email Robot    ${BASE EMAIL}
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}    ${server 1}[cloud users][cloudAdmin]
    ...    ELSE    Create List    ${server 1['owner']}    admin    ${server 1}[cloud users][cloudAdmin]    ${server 1}[local users][cloudAdmin][login]
    Share    ${server 1['cloud auth']}    ${server 1['cloud id']}    ${ACCESS ROLES}[liveViewer]    ${random email}    ${permissions}[liveViewer]
    
    # Check that the user's role is added correctly in vms
    FOR    ${user}    IN    @{list}
        Log in    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        ${users}=   Get Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
    
        Edit User Permissions In Systems    ${random email}    ${VIEWER TEXT}
        Check User Permissions    ${random email}    ${VIEWER TEXT}
    
        # Check that the user's role has changed in vms
        ${users}=   Get Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
    
        Edit User Permissions In Systems    ${random email}    ${LIVE VIEWER TEXT}
        Check User Permissions    ${random email}    ${LIVE VIEWER TEXT}
        Exit For Loop If    '''${user}'''=='''localcloudAdmin'''
        Log Out
    END

15. Delete user works
    [Tags]    email    C41903    webadmin    cloud    smoke
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}    ${server 1}[cloud users][cloudAdmin]
    ...    ELSE    Create List    ${server 1['owner']}    admin    ${server 1}[cloud users][cloudAdmin]    ${server 1}[local users][cloudAdmin][login]
    FOR    ${user}    IN    @{list}
        ${random email}=   Register and activate account with random email    mark    harmill    ${password}
        Share    ${server 1['cloud auth']}    ${server 1['cloud id']}    ${ACCESS ROLES}[liveViewer]    ${random email}     ${permissions}[liveViewer]
        Sleep    10
        Log in    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Select user in Users List    ${random email}
        Wait Until Element Is Visible    ${REMOVE USER BUTTON}
        Click Button    ${REMOVE USER BUTTON}
        Wait Until Element is Visible    ${REMOVE CANCEL BUTTON}
        Click Button    ${REMOVE CANCEL BUTTON}
        Remove User Permissions    ${random email}
        Log Out
        Log In    ${random email}    ${password}
        go to    ${ENV}
        IF    '''${mode}'''=='''cloud'''
            Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}    65
        ELSE
            Wait Until Element is Visible    //input[@id="login_email"]
        END
        Exit For Loop If    '''${user}'''=='''localcloudAdmin'''
        Run Keyword If    '''${mode}'''=='''cloud'''    Log Out
    END

16. Share with registered user works and sends him notification
    [Tags]    email    C41888    cloud    smoke
    ${random email}=    Register and activate account with random email    mark     hamil    ${password}
    ${user}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Register And Activate Account    users    notification    ${user}    ${BASE PASSWORD}
    Set Account Language    ${random email}    ${password}    ${LANGUAGE}
    Append to List    ${TMP USERS}    ${random email}
    Go To    ${url}
    Log in to user and system    ${server 1['owner']}    ${server 1['cloud id']}
    Verify In System    ${server 1['name']}
    Share To    ${user}    ${ADMIN TEXT}
    Sleep    10
    # Might not be necessary after CLOUD-6113
    ${role}=   Get Cloud User Role    ${server 1['cloud auth']}    ${user}    ${server 1['cloud id']}
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
    ...    ${server 1['name']}
    ${emailID}    Wait For Email    recipient=${user}    timeout=120
    ${check email status}=    Run Keyword And Ignore Error    Check Email Subject
    ...    ${emailID}
    ...    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}
    ...    ${BASE EMAIL}
    ...    ${BASE EMAIL PASSWORD}
    ...    ${BASE HOST}
    ...    ${BASE PORT}
    IF    ${check email status} == "PASS"
        Delete Email    ${emailID}
    END
    ${emailID}    Wait For Email    recipient=${user}    timeout=120
    Check Email Subject
    ...    ${emailID}
    ...    ${INVITED TO SYSTEM EMAIL SUBJECT}
    ...    ${BASE EMAIL}
    ...    ${BASE EMAIL PASSWORD}
    ...    ${BASE HOST}
    ...    ${BASE PORT}
    Delete Email    ${emailID}
    Close Mailbox

    ${role}=   Get Cloud User Role  ${server 1['cloud auth']}    ${user}    ${server 1['cloud id']}
    Should be equal as strings    ${role}    ${ACCESS ROLES}[admin]

17. Share with registered user gives user access to system
    [Tags]    email    C41888    cloud    smoke
    ${random email}=   Register and activate account with random email    mark    hamil    ${BASE PASSWORD}  
    Share    ${server 1['cloud auth']}    ${server 1['cloud id']}    viewer    ${random email}      ${permissions}[viewer]
    Log in to user and system    ${random email}    ${server 1['cloud id']}
    Go to System Administration

    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    ${TEST FIRST NAME} ${TEST LAST NAME}   
    Wait Until Elements Are Visible    ${current owner name}    ${OWNER LABEL}    ${OWNER LABEL}/following-sibling::span//span[contains(text(),"${server 1['owner']}")]    ${YOUR ACCESS LEVEL}    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${VIEWER TEXT}')]
    Element Should Be Enabled    ${DISCONNECT FROM MY ACCOUNT}
    Element Should Not Be Visible    ${RENAME SYSTEM}
    Element Should Not Be Visible    ${ADD USER BUTTON SYSTEMS}

18. Share with unregistered user - Verify email recieved
    [Tags]    email    C41889    cloud    CLOUD-8643    smoke
    Log    Step 1
    Log in to user and system    ${server 1['owner']}    ${server 1['cloud id']}
    ${random email}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Append To List    ${TMP USERS}    ${random email}
    Go To Users List
    Share To    ${random email}    ${ADMIN TEXT}
    sleep    10
    ${role}=   Get Cloud User Role  ${server 1['cloud auth']}    ${random email}    ${server 1['cloud id']}
    Should be equal as strings    ${role}    ${ACCESS ROLES}[admin]
    Wait Until Element Is Visible     //span[contains(text(),"${random email}")]
    ${text}=   Get Text    ${LOCAL USER NAME HEADER}
    Should Be Empty    ${text}
    Log Out
    
    Log    Step 2
    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
    ${email}    Wait For Email    recipient=${random email}    timeout=120
    ${email text}    Get Email Body    ${email}
    ${email text}    Decode Bytes To String    ${email text}    UTF-8    errors=ignore
    ${invite link}=   Get Nx Links From Email    ${email}    system_invite
    #${link}=   Get Email Link    ${random email}    system_invite
    Check Email Button    ${email text}    ${ENV}    ${THEME COLOR}
    Check Email User Names    ${email text}    ${EMPTY}    ${EMPTY}
    Check Email Cloud Name    ${email text}    ${PRODUCT NAME}
    Should Contain    ${email text}    ${TEST FIRST NAME} ${TEST LAST NAME}
    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    Replace String    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    {{message.sharer_name}}    ${TEST FIRST NAME} ${TEST LAST NAME}
    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    Replace String    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}    %PRODUCT_NAME%    ${PRODUCT_NAME}
    Check Email Subject    ${email}    ${INVITED TO SYSTEM EMAIL SUBJECT UNREGISTERED}   ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}

    Log    Step 3-4
    ${links}    Get Links From Email    ${email}
    @{expected links}    Set Variable    mailto:${server 1['owner']}    ${SUPPORT URL}    ${WEBSITE URL}    ${ENV}    ${ENV}/activate
    FOR    ${link}  IN  @{links}
        check in list    ${expected links}    ${link}
    END
    Delete Email    ${email}
    Close Mailbox

18.5 New user brought to registration page with code and with correct email locked after having a system shared
    [Tags]   email    C41889    cloud    CLOUD-8643    smoke
    [Setup]    Share System With New User And Grab Email Link
    Log    Step 5-6
    Go To    ${invite link}
    Wait Until Elements Are Visible
    ...    ${REGISTER FIRST NAME INPUT}
    ...    ${REGISTER LAST NAME INPUT}
    ...    ${REGISTER PASSWORD INPUT}
    ...    ${CREATE ACCOUNT BUTTON}
    ...    ${REGISTER EMAIL INPUT LOCKED}
    ${populated email}=   Get Value    ${REGISTER EMAIL INPUT LOCKED} 
    Should be equal as strings    ${populated email}    ${random email}
    Input Text    ${REGISTER FIRST NAME INPUT}    ${TEST FIRST NAME}
    Input Text    ${REGISTER LAST NAME INPUT}    ${TEST LAST NAME}
    Input Text    ${REGISTER PASSWORD INPUT}    ${password}
    Click Element    ${TERMS AND CONDITIONS CHECKBOX VISIBLE}
    Click Button    ${CREATE ACCOUNT BUTTON}
    # Modifying the flow according to CLOUD-8444, user will no longer login automatically after account creation, Activation of the account is needed first
    #Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}
    #Wait Until Element is Visible    ${SYSTEM NAME}
    #Element Text Should Be    ${SYSTEM NAME}    ${server 1['name']}
    #Log    Step 7 skipped thick client login
    #Log    Step 8
    #Log Out
    #Log in to user and system    ${server 1['owner']}    ${server 1['cloud id']}
    Wait Until Element Is Visible    ${ACCOUNT CREATION EMAIL SUCCESS}
    ${activate account result}=    Get Text    ${ACCOUNT CREATION EMAIL SUCCESS}
    Sleep    5
    Should Be Equal As Strings    ${activate account result}    ${ACCOUNT CREATED TEXT}
##  Commented out steps below are to check email that is no longer being sent out. Leaving it commented out in order to have an easy way to revert if this behavior changes again.
#    Open Mailbox    host=${BASE HOST}    password=${BASE EMAIL PASSWORD}    port=${BASE PORT}    user=${BASE EMAIL}    is_secure=True
#    ${email}    Wait For Email    recipient=${random email}    timeout=120    status=UNSEEN
#    ${email text}    Get Email Body    ${email}
#    ${email text}    Decode Bytes To String    ${email text}    UTF-8    errors=ignore
#    Check Email Button    ${email text}    ${ENV}    ${THEME COLOR}
#    Check Email User Names    ${email text}    ${EMPTY}    ${EMPTY}
#    Check Email Cloud Name    ${email text}    ${PRODUCT NAME}
#    Should Contain    ${email text}    ${TEST FIRST NAME} ${TEST LAST NAME}
#    Check Email Subject    ${email}    ${ACTIVATE YOUR ACCOUNT EMAIL SUBJECT}   ${BASE EMAIL}    ${BASE EMAIL PASSWORD}    ${BASE HOST}    ${BASE PORT}
#    ${activation link}    Get Links From Email    ${email}
#    @{expected links}    Set Variable    mailto:${server 1['owner']}    ${SUPPORT URL}    ${WEBSITE URL}    ${ENV}    ${ENV}/authorize/activate
#    FOR    ${link}  IN  @{activation link}
#        check in list    ${expected links}    ${link}
#    END
#    ${link2}=   Get Email Link    ${random email}    activate_account
#    Delete Email    ${email}
#    Close Mailbox
#    Go To    ${link2}
    Resource.Log in    user=${random email}    password=${BASE PASSWORD}    button=${ACTIVATE MODAL LOGIN BTN}    reset=${True}
#    Log In   ${random email}   ${BASE PASSWORD}
    Go To    ${ENV}/systems/${server 1['cloud id']}
    Go To Users List
    Wait Until Element Is Visible     //nx-menu//span[contains(text(),"${random email}")]
    Click Element    //nx-menu//span[contains(text(),"${random email}")]
    ${text}=   Get Text    ${LOCAL USER NAME HEADER}
    Element Text Should Be    ${LOCAL USER NAME HEADER}    ${TEST FIRST NAME} ${TEST LAST NAME}

19. Share System with the same user twice
    [Tags]    C41892    cloud
    Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True
    Delete All Emails
    ${user}=   Set Variable If    '''${mode}'''=='''cloud'''    ${server 1['owner']}
    ...    '''${mode}''' != '''cloud'''    admin
    Log in    ${user}    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
    Go to Users List
    Share To    ${server 1}[cloud users][cloudAdmin]    ${ADV VIEWER TEXT}    fail    system=${server 1['name']}
    Run Keyword And Expect Error    *    Wait For Email    recipient=${server 1}[cloud users][cloudAdmin]    timeout=30
    Close Mailbox

20. Check share email for registered user
    [Tags]    C47297    cloud
    ${random email}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Register And Activate Account    users    notification    ${random email}    ${BASE PASSWORD}
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

    Set Account Language    ${random email}    ${password}    ${LANGUAGE}
    Share    ${server 1['cloud auth']}    ${server 1['cloud id']}    ${ACCESS ROLES}[admin]    ${random email}      ${permissions}[cloudAdmin]
    ${role}=   Get Cloud User Role  ${server 1['cloud auth']}    ${random email}    ${server 1['cloud id']}
    Should be equal as strings    ${role}    ${ACCESS ROLES}[admin]

    ${INVITED TO SYSTEM EMAIL SUBJECT}    Replace String
    ...    ${INVITED TO SYSTEM EMAIL SUBJECT}
    ...    {{message.system_name}}
    ...    ${server 1['name']}
    ${email}    Wait For Email    recipient=${random email}    timeout=120    status=UNSEEN
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
    ...    ${ENV}/systems/${server 1['cloud id']}
    ...    mailto:${server 1['owner']}
    FOR    ${link}  IN  @{links}
        check in list    ${expected links}    ${link}
    END
    Delete Email    ${email}
    Close Mailbox

21. Users should be able to disconnect themselves from cloud
    [Tags]    cloud
    ${roles}=   Get Dictionary Values    ${ACCESS ROLES}
    FOR    ${role}    IN    @{roles}
        ${random email}=   Register and activate account with random email    firstname    lastname    ${password}
        Append To List    ${TMP USERS}    ${random email}
        #Save User    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}    mark    ${role}    ${random email}    Mark Hamil    ${password}    
        Share     ${server 1['cloud auth']}    ${server 1['cloud id']}    ${role}    ${random email}    ${permissions}[${role}]
        Sleep    5
        Log In    ${random email}    ${password}
        Wait until element is visible    ${SYSTEM NAME}    300
        Disconnect from my account    ${server 1['name']}
        Log Out
        Sleep    5
    END
    Open Browser and go to URL    ${url}

22. User with client custom settings has access to system
    [Tags]    webadmin    cloud
    @{custom roles}=    Get User Roles    https://${QA BURBANK IP}:${server 1['port']}    ${server 1}[local auth]
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}    ${server 1}[cloud users][cloudAdmin]
    ...    ELSE    Create List    ${server 1['owner']}    admin    ${server 1}[cloud users][cloudAdmin]    ${server 1}[local users][cloudAdmin][login]
    FOR    ${user}    IN    @{list}
        Log in    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        &{client custom permissions}=   Get Custom Permissions    ${custom roles}    Client Custom

    
        ${users}    Get Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']} 
        ${user id}=   Get Cloud User Id By Email    ${server 1['cloud auth']}    ${client custom}    ${server 1['cloud id']}
        Save User Existing
        ...    ${server 1}[local auth]
        ...    https://${QA BURBANK IP}:${server 1['port']}
        ...    ${client custom}
        ...    ${client custom permissions["permissions"]}
        ...    ${client custom}
        ...    ${client custom permissions["id"]}
        ...    ${user id}
    
        Verify In System    ${server 1['name']}
        Exit For Loop If    '''${user}'''=='''localcloudAdmin'''
        Log Out
    END

23. User can be invited with client custom permissions
    [Tags]    webadmin    cloud
    ${random email}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Register And Activate Account    users    notification    ${random email}    ${BASE PASSWORD}
    Append To List    ${TMP USERS}    ${random email}
    ${user}=   Set Variable If    '''${mode}'''=='''cloud'''    ${server 1['owner']}
    ...    '''${mode}''' != '''cloud'''    admin
    Log in    ${user}    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
    Share To    ${random email}    Client Custom
    
    Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True

    ${email}=   Wait For Email    recipient=${random email}    timeout=120
    Check User Permissions    ${random email}    Client Custom
    Delete Email    ${email}
    Close Mailbox


24. Disable enable User correctly affects the User
    [Tags]    C63390    C76245    webadmin    cloud
    ${user}=   Set Variable If    '''${mode}'''=='''cloud'''    ${server 1['owner']}
    ...    '''${mode}''' != '''cloud'''    admin
    Log in    ${user}    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
    Log    Step 1
    Check User Permissions    ${server 1}[cloud users][viewer]    ${VIEWER TEXT}

    Log    Step 2
    Set Checkbox Value   ${DISABLE USER SWITCH}    false
    Sleep    1
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${server 1}[cloud users][viewer]    ${VIEWER TEXT}
    Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}

    Log    Step 3
    Log Out
    Log In   ${server 1}[cloud users][viewer]    ${BASE PASSWORD}
    Run Keyword If    '''${mode}'''=='''cloud'''    Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}
    # ELSE     WRONG LOGIN OR PASSWORD SHOULD BE DETECTED
    Run Keyword If    '''${mode}'''=='''cloud'''    Log Out

    Log    Step 4
    Log In    ${server 1['owner']}    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
    Check User Permissions    ${server 1}[cloud users][viewer]    ${VIEWER TEXT}
    Set Checkbox Value   ${DISABLE USER SWITCH}    true
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${server 1}[cloud users][viewer]    ${VIEWER TEXT}
    Page Should Not Contain Element   ${USER DISABLED MSG}

    Log    Step 5
    Log Out
    Log In    ${server 1}[cloud users][viewer]    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
    Run Keyword If    '''${mode}'''=='''cloud'''    Page Should Not Contain Element    ${YOU HAVE NO SYSTEMS}
    # ELSE     WRONG LOGIN OR PASSWORD SHOULD BE DETECTED
        
25. Administrator can add, disable and enable Viewer
    [Tags]    C63391    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1}[cloud users][cloudAdmin]
    ...    ELSE    Create List    admin    ${server 1}[local users][cloudAdmin][login]
    FOR    ${user}    IN    @{list}
        ${random email}=   Register and activate account with random email    mark    harmill    ${BASE PASSWORD}
        Log    Steps 1 & 2
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Share To    ${random email}   ${VIEWER TEXT}    system=${server 1['name']}
        Select user in Users List    ${random email}
    
        Log    Step 3
        Log Out
        Log In    ${random email}    ${BASE PASSWORD}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Wait Until Elements Are Visible    ${YOUR ACCESS LEVEL}    //nx-section//span[contains(text(),'${VIEWER TEXT}')]
    
        Log     Step 4
        Log Out
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Check User Permissions    ${random email}    ${VIEWER TEXT}
        Set Checkbox Value   ${DISABLE USER SWITCH}    false
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        Check User Permissions    ${random email}    ${VIEWER TEXT}
        Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}
    
        Log    Step 5
        Log Out
        Log In   ${random email}    ${BASE PASSWORD}
        Run Keyword If    '''${mode}'''=='''cloud'''    Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}
        # ELSE     WRONG LOGIN OR PASSWORD SHOULD BE DETECTED
    
        Log    Step 6
        Run Keyword If    '''${mode}'''=='''cloud'''    Log Out
        Log In    ${server 1}[cloud users][cloudAdmin]    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Check User Permissions    ${random email}    ${VIEWER TEXT}
        Set Checkbox Value   ${DISABLE USER SWITCH}    true
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        Check User Permissions    ${random email}    ${VIEWER TEXT}
        Page Should Not Contain Element   ${USER DISABLED MSG}
    
        Log    Step 7
        Log Out
        
        Log In    ${random email}    ${BASE PASSWORD}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Page Should Not Contain Element    ${YOU HAVE NO SYSTEMS}
        Wait Until Elements Are Visible    ${YOUR ACCESS LEVEL}    //span[@class="name" and contains(text(),'${VIEWER TEXT}')]
        Exit For Loop If    '''${user}'''=='''${server 1}[local users][cloudAdmin][login]'''    
        Log Out
    END

# ***Currently removed due to CLOUD-6854***
#Cloud Owner/admin Can Change Local User Login
#    [Tags]    local_user    C76244    web_admin
#    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
#    ...    ELSE    Create List    admin    ${server 1['owner']}
#    FOR    ${user}    IN    @{list}
#        @{local users} =    Reset Local Users    ${server auth}    https://${QA BURBANK IP}:${server 1['port']}
#        Log In    ${user}    ${password}
#        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
#        Go to Users List
#        
#        Verify In Local Users UI    ${local users}    ${server 1['owner']}
#        @{new locals} =    Create List
#        Change All Local Users Login
#        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${server 1['port']}
#        Exit For Loop If    '''${user}'''=='''admin'''    
#        Log Out
#    END
    
26. Cloud Owner Can Change Local User Full Name
    [Tags]    local_user    C76244    webadmin    cloud    debug
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    @{new locals} =    Create List
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Verify In Local Users UI    ${server 1}[local users]    ${server 1['owner']}
        Set Test Variable    ${new locals}    ${new locals}
        Change All Local Users Full Name
        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${server 1['port']}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

27. Cloud Owner Can Change Local User Email
    [Tags]    local_user    C76244    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin

    @{new locals} =    Create List
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Verify In Local Users UI    ${server 1}[local users]    ${server 1['owner']}
        Set Test Variable    ${new locals}    ${new locals}
        Change All Local Users Email
        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${server 1['port']}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

28. Cloud Owner Can Change Local User Permissions
    [Tags]    local_user    C76243    webadmin    cloud
    Log    Same test as testrail "Cloud owner can change local user's access level (positive)."
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    @{new locals} =    Create List
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Verify In Local Users UI    ${server 1}[local users]    ${server 1['owner']}
        Set Test Variable    ${new locals}    ${new locals}
        Change All Local User Permissions
        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${server 1['port']}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END


29. Cloud Owner Can Change Local User Password
    [Tags]    local_user    C76246    webadmin    cloud
    Log    Same test as testrail "Cloud owner can change local user password (positive)"
   @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    @{new locals} =    Create List
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Verify In Local Users UI    ${server 1}[local users]    ${server 1['owner']}
        Log    Change password for ${user}
        Change ALl Local User Password
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

30. Cloud owner can change local users' information
    [Tags]    local_user    C76239    webadmin    cloud
     @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        ${new locals} =    Modify Local Users via Cloud UI    ${server 1}[local users]    ${server 1['owner']}
        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${server 1['port']}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

31. Cloud administrator cannot change local administrator's or owner's information
    [Tags]    local_user    C76240    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1}[cloud users][cloudAdmin]
    ...    ELSE    Create List    ${server 1}[cloud users][cloudAdmin]    ${server 1}[local users][cloudAdmin][login]
    @{local users} =    Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
    Log    Step 1
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Change All Local User Info
        Run Keyword and Expect Error    *    Delete All Local Users    //span[contains(text(),"ocal+")]
        Log    Step 2
        Wait Until Element is Visible    //span[text()="admin"]
        Click Element    //span[text()="admin"]
        Run Keyword and Expect Error    *    Modify All Local User Info    admin    ${server 1}[cloud users][cloudAdmin]    
        Elements Should Not Be Visible      ${DISABLE USER SWITCH}     ${LOCAL USER DELETE BUTTON}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

32. Local User Removed on Server is Removed From UI
    [Tags]    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    @{local users} =    Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Verify In Local Users UI    ${server 1}[local users]    ${server 1['owner']}
        @{users} =    Get Users     ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        ${user to delete} =    Set Variable    Local+viewer
        ${user id}=   Get Local User Id By Name    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}    Local+viewer
        Remove User    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}    ${user id}
        Reload Page
        Wait Until Element is Visible    ${ADD USER BUTTON SYSTEMS}
        Page Should Not Contain    //span[text()="${user to delete}"]
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

33. Verify Local Users Deleted On Server
    [Tags]    local_user    C76242    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Verify In Local Users UI    ${server 1}[local users]    ${server 1['owner']}
        Delete All Local Users    //span[contains(text(),"ocal+")]
        ${deleted user} =    Set Variable    Local
        User Should Not Exist    ${deleted user}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END


34. Adding New Local User Appears on Cloud Portal
    [Tags]    C76237    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}    ${server 1}[cloud users][cloudAdmin]
    ...    ELSE    Create List    ${server 1['owner']}    ${server 1}[cloud users][cloudAdmin]    ${server 1}[local users][cloudAdmin][login]    admin
    FOR    ${user}    IN    @{list}
        @{locals}=   Get Local Users
        Delete All Local Users via API    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}    ${locals}
        Log    Step 1
        @{new local users}=   Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Verify In Local Users UI    ${new local users}    ${user}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

35. Cloud/local owner cannot change local/cloud owner's information
    [Tags]    C76238    local_user    webadmin    cloud
    ${user}=   Set Variable If    '''${mode}'''=='''cloud'''    ${server 1['owner']}
    ...    '''${mode}''' != '''cloud'''    admin
    ${user2}=   Set Variable If    '''${mode}'''=='''cloud'''    admin
    ...    '''${mode}''' != '''cloud'''    ${server 1['owner']}
    Log    Step 1
    Log In    ${user}    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
    Go To Users List
    Log    Step 2
    Wait Until Element is Visible    //span[text()="${user2}"]
    Click Element    //span[text()="${user2}"]
    Run Keyword If    '''${mode}''' != '''cloud'''    Run Keyword and Expect Error    *    Modify All Local User Info    admin    ${email}
    Elements Should Not Be Visible      ${DISABLE USER SWITCH}     ${LOCAL USER DELETE BUTTON}    ${ADD USER PERMISSIONS DROPDOWN}
    
36. Unsaved changes are not sent to the server
    [Tags]    C76241    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    Log    Preconditions
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server auth}    https://${QA BURBANK IP}:${server 1['port']}
        @{locals} =    Get Users     ${server auth}    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Verify In Local Users UI    ${local users}    ${server 1['owner']}
        
        Log    Step 1
        Click Element    //span[text()="Local+advancedViewer"]
        
        Log    Step 2
        Wait Until Element is Visible     ${ACCESS LEVEL DROPDOWN}
        Click Button    ${ACCESS LEVEL DROPDOWN}
        Wait Until Element is Visible    //*[@id="permissionsSelect"]//a/span[text()="${VIEWER TEXT}"] 
        Click Element    //*[@id="permissionsSelect"]//a/span[text()="${VIEWER TEXT}"]
        Sleep    .1
        Set Checkbox Value   ${DISABLE USER SWITCH}    false
        Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}
        Input Text    ${LOCAL USER NAME}    C76241
        Input Text    ${LOCAL USER EMAIL}    C76241
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${USER CANCEL} 
        
        Log    Step 3
        @{check info} =    Get Users     ${server auth}    https://${QA BURBANK IP}:${server 1['port']}
        Lists Should Be Equal     ${check info}    ${locals}  
        
        Log    Step 4
        Click Button    ${USER CANCEL}
        Sleep    .1
        Elements Should Not Be Visible    ${ACCOUNT SAVE}    ${USER CANCEL}
        Element Text Should Be    //*[@id="permissionsSelect"]//span    ${role names}[advancedViewer]
        Page Should Not Contain Element   ${USER DISABLED MSG}
# commented out because of CLOUD-6854
        #Wait Until Element Contains    ${LOCAL USER LOGIN}    Local+advancedViewer
        Wait Until Textfield Contains    ${LOCAL USER NAME}    Local User
	    Wait Until Textfield Contains    ${LOCAL USER EMAIL}    noptixautoqa+local_advancedViewer@gmail.com
	    
	    Log    Step 5
	    @{check info} =    Get Users     ${server auth}    https://${QA BURBANK IP}:${server 1['port']}
        Lists Should Be Equal     ${check info}    ${locals}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END
# commented out because of CLOUD-6854
#Local User Login Field Cannot Be Left Blank
#    [Tags]    C76248    local_user    web_admin
#    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
#    ...    ELSE    Create List    ${server 1['owner']}    admin
#    FOR    ${user}    IN    @{list}
#        @{local users} =    Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
#        @{locals} =    Get Users     ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
#                
#        Log    Step 1
#        Log In    ${user}    ${password}
#        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
#        Go to Users List
#        Verify In Local Users UI    ${local users}    ${server 1['owner']}
#        Click Element    //span[text()="Local+advancedViewer"]
#        
#        Log    Step 2
#        Wait Until Element is Visible     ${LOCAL USER LOGIN}   
#        Click Element    ${LOCAL USER LOGIN}
#        Sleep    1
#        Input Content Editable Text    ${LOCAL USER LOGIN}    ${EMPTY}
#        # Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${USER CANCEL}
#        # Click Button     ${ACCOUNT SAVE} 
#        Page Should Contain    ${LOGIN IS REQUIRED TEXT}
#        # Page Should Contain Element   ${ACCOUNT SAVE} 
#        # Page Should Contain Element   ${USER CANCEL}
#        Element Style Should Be    ${LOCAL USER LOGIN}     border-color    ${ERROR COLOR}
#        
#        Log    Step 3
#        @{check info} =    Get Users     ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
#        Lists Should Be Equal     ${check info}    ${locals}
#    
#        Log    Step 4
#        Click Element    //label[@for="permissionsSelect"] 
#        Wait Until Element Contains    ${LOCAL USER LOGIN}    Local+advancedViewer
#        
#        Log    Step 5
#        @{check info} =    Get Users     ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
#        Lists Should Be Equal     ${check info}    ${locals} 
#        Exit For Loop If    '''${user}'''=='''admin'''    
#        Log Out
#    END

37. Local User name field can be left blank
    [Tags]    C76249    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${local users}    ${server 1['owner']}
        Click Element    //span[text()="Local+advancedViewer"]
        
        Log    Step 2
        Delete All Text     ${LOCAL USER NAME}
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${USER CANCEL}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        
        Log    Step 3
        @{check info}=    Get Users     ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        ${full name}=   Check User Full Name is None    local+advancedviewer    ${check info}
    
        Should Be Equal    ${full name}    ${None}   
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

38. Local User email field can be left blank
    [Tags]    C76250    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server 1['local auth']}    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${server 1['local users']}    ${server 1['owner']}
        Click Element    //span[text()="Local+advancedViewer"]
        
        Log    Step 2
        Delete All Text     ${LOCAL USER NAME}
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${USER CANCEL}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        
        Log    Step 3
        @{check info} =    Get Users     ${server 1['local auth']}    https://${QA BURBANK IP}:${server 1['port']}
        Check User Email is None    local+advancedviewer    ${check info}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

39. User list is available for owner and administrator
    [Tags]    C76233    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}    ${server 1['cloud users']}[cloudAdmin]
    ...    ELSE    Create List    ${server 1['owner']}    ${server 1['cloud users']}[cloudAdmin]    ${server 1}[local users][cloudAdmin][login]    admin
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server 1['local auth']}    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${server 1['local users']}     ${user}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

40. User list is not available for advanced viewer & lower
    [Tags]    C76462    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1}[cloud users][viewer]    ${server 1}[cloud users][liveViewer]   ${server 1}[cloud users][advancedViewer]    ${server 1}[cloud users][custom]
    ...    ELSE    Create List    ${server 1}[cloud users][viewer]    ${server 1}[cloud users][liveViewer]   ${server 1}[cloud users][advancedViewer]    ${server 1}[cloud users][custom]    ${server 1}[local users][viewer][login]    ${server 1}[local users][liveViewer][login]    ${server 1}[local users][advancedViewer][login]    ${server 1}[local users][custom][login]
    FOR    ${user}    IN    @{list}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Log    Step 1
        Verify In System    ${server 1['name']}    editable=${False}
        Sleep    5
        Element Should Not Be visible    ${USERS LIST LINK} 
        Exit For Loop If    '''${user}'''=='''${server 1}[local users][custom]'''    
        Log Out
    END

41. Cloud Administrator Can Delete Local User(positive)
    [Tags]    C76524    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1}[cloud users][cloudAdmin]
    ...    ELSE    Create List    ${server 1}[local users][cloudAdmin][login]    ${server 1}[cloud users][cloudAdmin]    
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${server 1['local users']}    ${server 1}[cloud users][cloudAdmin]
        Click Element    //span[text()="Local+advancedViewer"]
        Log    Step 2
        Click Button    ${LOCAL USER DELETE BUTTON}
        Wait Until Elements Are Visible    ${LOCAL USER DELETE CONFIRM BUTTON}    ${LOCAL USER DELETE CANCEL BUTTON}
        Log    Step 3
        Click Button    ${LOCAL USER DELETE CONFIRM BUTTON}
        Wait Until Element Is Not Visible    ${LOCAL USER DELETE CANCEL BUTTON}
        Wait Until Element Is Not Visible    //span[text()="Local+advancedViewer"]
        Log    Step 4
        @{current users} =    Get Users     ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        ${deleted user} =    Set Variable    Local+advancedViewer
        Verify User is Deleted on Server    Local+advancedViewer    ${current users}
        Exit For Loop If    '''${user}'''=='''${server 1}[cloud users][cloudAdmin]'''    
        Log Out
    END
        
42. Administrator can change local user's login permissions, name and email (positive)
    [Tags]    C76526    C76525    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1}[cloud users][cloudAdmin]
    ...    ELSE    Create List    ${server 1}[local users][cloudAdmin][login]    ${server 1}[cloud users][cloudAdmin]    
    FOR    ${user}    IN    @{list}
        @{new locals} =    Create List
        @{local users} =    Reset Local Users    ${server auth}    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${local users}    ${user}
        Click Element    //span[text()="Local+advancedViewer"]
        Log    Step 2 and 3
        ${new local} =    Modify All Local User Info    advancedViewer    ${user}    
        Append To List    ${new locals}    ${new local}
        Log    Step 4
        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${server 1['port']}    local user=ocal+advancedviewer    
        Exit For Loop If    '''${user}'''=='''${server 1}[cloud users][cloudAdmin]'''    
        Log Out
    END

43. Cloud administrator can enable/disable any viewer local user (positive)
    [Tags]    C76527    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1}[cloud users][cloudAdmin]
    ...    ELSE    Create List    ${server 1}[local users][cloudAdmin][login]    ${server 1}[cloud users][cloudAdmin]    
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server auth}    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${local users}    ${server 1}[cloud users][cloudAdmin]
        Click Element    //span[text()="Local+advancedViewer"]
        Log    Step 2   
        Set Checkbox Value   ${DISABLE USER SWITCH}    false
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Log    Step 3
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}
        # switching focus
        Click Element    //span[text()="Local+viewer"]
        Element Style Should Be    //span[text()="Local+advancedViewer"]    color    ${DISABLED TEXT COLOR}
        Click Element    //span[text()="Local+advancedViewer"]
        Log    Step 4
        ${name} =    Get Text    ${LOCAL USER LOGIN}
        @{current users} =    Get Users     ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        ${state}=   Check If User Is Enabled/Disabled    ${current users}    ${name}
        Should Be True   ${state} == ${False}
        Log    Step 5
        Set Checkbox Value   ${DISABLE USER SWITCH}    true
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        Page Should Not Contain Element   ${USER DISABLED MSG}
        Log    Step 6
        ${name} =    Get Text    ${LOCAL USER LOGIN}
        @{current users} =    Get Users     ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}
        ${state}=   Check If User Is Enabled/Disabled    ${current users}    ${name}
        Should Be True    ${state} == ${True}
        Exit For Loop If    '''${user}'''=='''${server 1}[cloud users][cloudAdmin]'''    
        Log Out
    END

44. Cloud administrator can change local user password (positive)
    [Tags]    C76530    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1}[cloud users][cloudAdmin]
    ...    ELSE    Create List    ${server 1}[local users][cloudAdmin][login]    ${server 1}[cloud users][cloudAdmin]    
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server auth}    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        Go to Users List
        Verify In Local Users UI    ${local users}    ${user}
    
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
        Run Keyword and Expect Error    *    Get Cameras    ${old auth}    https://${QA BURBANK IP}:${server 1['port']}
        
        Log    Step 5
        @{new auth} =    Create List    local+advancedviewer     ${ALT PASSWORD}
        ${response} =    Get Cameras    ${new auth}    https://${QA BURBANK IP}:${server 1['port']}
        Exit For Loop If    '''${user}'''=='''${server 1}[cloud users][cloudAdmin]'''    
        Log Out
    END

45. Changes made in thick client appear on cloud portal
    [Tags]    C76251    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${server 1['owner']}
    ...    ELSE    Create List    ${server 1['owner']}    admin
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server auth}    https://${QA BURBANK IP}:${server 1['port']}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 1['cloud id']}
        ${id}    Get Local User Id By Name    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}    Local+advancedViewer
        Log    Step 1 - 3
        Go to Users List
        Verify In Local Users UI    ${local users}    ${server 1['owner']}
        Click Element    //span[text()="Local+advancedViewer"]
        Log    Step 4
        Save User    
        ...    ${server 1}[local auth]    
        ...    https://${QA BURBANK IP}:${server 1['port']}    
        ...    Local+advancedViewer   
        ...    ${permissions}[advancedViewer]    
        ...    noptixautoqa+local_advancedViewer@gmail.com    
        ...    Api Changed    
        ...    ${BASE PASSWORD}    
        ...    userId=${id}    
        ...    isCloud=${False}
        ...    patch=${True}
        Wait Until Textfield Contains    ${LOCAL USER NAME}    Api Changed    timeout=65
        Log    Step 5
        Save User    
        ...    ${server 1}[local auth]    
        ...    https://${QA BURBANK IP}:${server 1['port']}    
        ...    Local+advancedViewer   
        ...    ${permissions}[advancedViewer]    
        ...    noptixautoqa+local_apichanged@gmail.com    
        ...    Api Changed    
        ...    ${BASE PASSWORD}    
        ...    userId=${id}    
        ...    isCloud=${False}
        ...    patch=${True}
        Wait Until Textfield Contains    ${LOCAL USER EMAIL}    noptixautoqa+local_apichanged@gmail.com    timeout=45
        Log    Step 6
        Save User    
        ...    ${server 1}[local auth]    
        ...    https://${QA BURBANK IP}:${server 1['port']}    
        ...    Local+advancedViewer   
        ...    ${permissions}[viewer]    
        ...    noptixautoqa+local_apichanged@gmail.com    
        ...    Api Changed    
        ...    ${BASE PASSWORD}    
        ...    userId=${id}    
        ...    isCloud=${False}
        ...    patch=${True}
        Wait Until Element is Visible    //span[text()="Local+advancedViewer"]/following-sibling::span[text()="${VIEWER TEXT}"]    timeout=45
        Log    Step 7
        Save User    
        ...    ${server 1}[local auth]    
        ...    https://${QA BURBANK IP}:${server 1['port']}    
        ...    Local+advancedViewer   
        ...    ${permissions}[viewer]    
        ...    noptixautoqa+local_apichanged@gmail.com    
        ...    Api Changed    
        ...    ${BASE PASSWORD}    
        ...    userId=${id}    
        ...    isCloud=${False}    
        ...    isEnabled=${False}
        ...    patch=${True}
        Wait Until Element is Visible    ${USER DISABLED MSG}    timeout=45
        Log    Step 8
        Save User    
        ...    ${server 1}[local auth]    
        ...    https://${QA BURBANK IP}:${server 1['port']}    
        ...    Local+advancedViewer   
        ...    ${permissions}[viewer]    
        ...    noptixautoqa+local_apichanged@gmail.com    
        ...    Api Changed    
        ...    ${BASE PASSWORD}    
        ...    userId=${id}    
        ...    isCloud=${False}
        ...    patch=${True}
        Wait Until Element is Not Visible    ${USER DISABLED MSG}    timeout=45
        Log    Step 9
        Remove User    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}    ${id}
        Wait Until Element is Not Visible    //span[text()="Local+advancedViewer"]    timeout=45
        
        Log    Step 10
        Save User    
        ...    ${server 1}[local auth]    
        ...    https://${QA BURBANK IP}:${server 1['port']}    
        ...    Local+newApiUser   
        ...    ${permissions}[advancedViewer]    
        ...    noptixautoqa+local_advancedViewer@gmail.com
        ...    New Api   
        ...    ${BASE PASSWORD}    
        ...    isCloud=${False}
        Wait Until Elements Are Visible
        ...    //span[text()="Local+newApiUser"]    
        ...    //span[text()="Local+newApiUser"]//preceding-sibling::${LOCAL USER ICON}
        ...    timeout=45   
        Element Should Contain    //span[text()="Local+newApiUser"]/following-sibling::span    ${role names}[advancedViewer]
        Element Should Not Be Visible     //span[text()="${server 1['owner']}"]//preceding-sibling::${LOCAL USER ICON}
        Click Element    //span[text()="Local+newApiUser"]
        Wait Until Elements Are Visible
        ...    ${LOCAL USER LOGIN}
        ...    ${LOCAL USER NAME}
        ...    ${LOCAL USER EMAIL}    
        ...    ${DISABLE USER SWITCH}/..
        ...    ${LOCAL USER DELETE BUTTON}
        ...    ${LOCAL USER CHANGE PASSWORD BUTTON}
        Wait Until Element Contains    ${LOCAL USER LOGIN}    Local+newApiUser
        Wait Until Textfield Contains    ${LOCAL USER NAME}    New Api
        Wait Until Textfield Contains    ${LOCAL USER EMAIL}    noptixautoqa+local_advancedViewer@gmail.com
        Element Text Should Be    //*[@id="componentId"]/span    ${role names}[advancedViewer]
        
        Log    Clean up
        ${id}    Get Local User Id By Name    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}    Local+newApiUser
        Remove User    ${server 1}[local auth]    https://${QA BURBANK IP}:${server 1['port']}    ${id}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

46. Local user list is not available for offline system
    [Tags]    C76234    local_user    System-offline    cloud
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    Log    Preconditions
    @{local users} =   Reset Local Users    ${server 2['local auth']}    https://${QA BURBANK IP}:${server 2['port']}
    ${results}    Execute Command    docker container stop ${server 2['name']}
    Log In    ${server 1['owner']}    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${server 2['cloud id']}
    Go To Users List
    FOR    ${user}    IN    @{local users}
        Element Should Not Be Visible    //span[text()="local+${user}"]
    END    
    Log    Step 2
    ${results}    Execute Command    docker container start ${server 2['name']}
    FOR    ${user}    IN    @{local users}
        Wait Until Element Is Visible   //span[text()="Local+${user}"]    125
    END   
    Log    Step 3
    ${results}    Execute Command    docker container stop ${server 2['name']}
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}    125
    Reload Page   
    FOR    ${user}    IN    @{local users}
        Wait Until Element Is Not Visible   //span[text()="local+${user}"]
    END   
    Log    Clean up
    ${results}    Execute Command    docker container start ${server 2['name']}
    Close Connection