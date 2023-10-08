*** Settings ***
Resource          ../Resources/front-end-resources/system-user-resource.robot
Suite Setup       Users Suite Setup
Test Setup        Run Keywords    QA Video Recording Start       Skip If Irrelevant
Test Teardown     Run Keywords    QA Video Recording Stop        Users Test Tear Down
Suite Teardown    Run Keyword and Ignore Error    users Teardown
Force Tags        system    Threaded    users

*** Test Cases ***
7. Sharing roles are ordered: more access is on top of the list with options
    [Tags]    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    FOR    ${user}  IN  @{list}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
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
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    FOR    ${user}  IN  @{list}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
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

13. Change role for Cloud User
    [Tags]    C41900    webadmin    cloud
    ${tmp user}=   Register and activate account with random email    Tmp    Viewer    ${base password}
    Share    ${servers}[0][cloud auth]    ${servers}[0][cloud id]    ${ACCESS ROLES}[viewer]    ${tmp user}     ${permissions}[viewer]
    Log in to system    ${servers}[0]    ${servers}[0][owner]
    Verify In System    ${servers}[0][name]

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
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]    ${servers}[0][cloudUsers][cloudAdmin]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin    ${servers}[0][cloudUsers][cloudAdmin]    ${servers}[0][local users][cloudAdmin]
    Share    ${servers}[0][cloudAuth]    ${servers}[0][id]    ${ACCESS ROLES}[liveViewer]    ${random email}    ${permissions}[liveViewer]

    # Check that the user's role is added correctly in vms
    FOR    ${user}    IN    @{list}
        Log in    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        ${users}=   Get Users    ${servers}[0][local auth]    https://${QA BURBANK IP}:${server 1['port']}

        Edit User Permissions In Systems    ${random email}    ${VIEWER TEXT}
        Check User Permissions    ${random email}    ${VIEWER TEXT}

        # Check that the user's role has changed in vms
        ${users}=   Get Users    ${servers}[0][local auth]    https://${QA BURBANK IP}:${server 1['port']}

        Edit User Permissions In Systems    ${random email}    ${LIVE VIEWER TEXT}
        Check User Permissions    ${random email}    ${LIVE VIEWER TEXT}
        Exit For Loop If    '''${user}'''=='''localcloudAdmin'''
        Log Out
    END

19. Share System with the same user twice
    [Tags]    C41892    cloud
    Open Mailbox
    ...    host=${BASE HOST}
    ...    password=${BASE EMAIL PASSWORD}
    ...    port=${BASE PORT}
    ...    user=${BASE EMAIL}
    ...    is_secure=True
    Delete All Emails
    ${user}=   Set Variable If    '''${mode}'''=='''cloud'''    ${servers}[0][cloudOwner]
    ...    '''${mode}''' != '''cloud'''    admin
    Log in    ${user}    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
    Go to Users List
    Share To    ${servers}[0][cloudUsers][cloudAdmin]    ${ADV VIEWER TEXT}    fail    system=${servers}[0][name]
    Run Keyword And Expect Error    *    Wait For Email    recipient=${servers}[0][cloudUsers][cloudAdmin]    timeout=30
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
    Share    ${servers}[0][cloudAuth]    ${servers}[0][id]    ${ACCESS ROLES}[admin]    ${random email}      ${permissions}[cloudAdmin]
    ${role}=   Get Cloud User Role  ${servers}[0][cloudAuth]    ${random email}    ${servers}[0][id]
    Should be equal as strings    ${role}    ${ACCESS ROLES}[admin]

    ${INVITED TO SYSTEM EMAIL SUBJECT}    Replace String
    ...    ${INVITED TO SYSTEM EMAIL SUBJECT}
    ...    {{message.system_name}}
    ...    ${servers}[0][name]
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
    ...    ${ENV}/systems/${servers}[0][id]
    ...    mailto:${servers}[0][cloudOwner]
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
        #Save User    ${servers}[0][local auth]    https://${QA BURBANK IP}:${server 1['port']}    mark    ${role}    ${random email}    Mark Hamil    ${password}
        Share     ${servers}[0][cloudAuth]    ${servers}[0][id]    ${role}    ${random email}    ${permissions}[${role}]
        Sleep    5
        Log In    ${random email}    ${password}
        Wait until element is visible    ${SYSTEM NAME}    300
        Disconnect from my account    ${servers}[0][name]
        Log Out
        Sleep    5
    END
    Open Browser and go to URL    ${url}

22. User with client custom settings has access to system
    [Tags]    webadmin    cloud
    @{custom roles}=    Get User Roles    https://${QA BURBANK IP}:${servers}[0][port][0]    ${servers}[0][localAuth]
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]    ${servers}[0][cloudUsers][cloudAdmin]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin    ${servers}[0][cloudUsers][cloudAdmin]    ${servers}[0][localUsers][cloudAdmin][login]
    FOR    ${user}    IN    @{list}
        Log in    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        &{client custom permissions}=   Get Custom Permissions    ${custom roles}    Client Custom


        ${users}    Get Users    ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
        ${user id}=   Get Cloud User Id By Email    ${servers}[0][cloudAuth]    Client Custom    ${servers}[0][id]
        Save User Existing
        ...    ${servers}[0][localAuth]
        ...    https://${QA BURBANK IP}:${server}[0][port][0]
        ...    Client Custom
        ...    ${client custom permissions["permissions"]}
        ...    Client Custom
        ...    ${client custom permissions["id"]}
        ...    ${user id}

        Verify In System    ${servers}[0][name]
        Exit For Loop If    '''${user}'''=='''localcloudAdmin'''
        Log Out
    END

23. User can be invited with client custom permissions
    [Tags]    webadmin    cloud
    ${random email}=   Get Random Email Robot    ${BASE EMAIL}    sendemail=${True}
    Register And Activate Account    users    notification    ${random email}    ${BASE PASSWORD}
    Append To List    ${TMP USERS}    ${random email}
    ${user}=   Set Variable If    '''${mode}'''=='''cloud'''    ${servers}[0][cloudOwner]
    ...    '''${mode}''' != '''cloud'''    admin
    Log in    ${user}    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
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
    ${user}=   Set Variable If    '''${mode}'''=='''cloud'''    ${servers}[0][cloudOwner]
    ...    '''${mode}''' != '''cloud'''    admin
    Log in    ${user}    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
    Log    Step 1
    Check User Permissions    ${servers}[0][cloudUsers][viewer]    ${VIEWER TEXT}

    Log    Step 2
    Set Checkbox Value   ${DISABLE USER SWITCH}    false
    Sleep    1
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${servers}[0][cloudUsers][viewer]    ${VIEWER TEXT}
    Element Text Should Be    ${USER DISABLED MSG}    ${USER DISABLED TEXT}

    Log    Step 3
    Log Out
    Log In   ${servers}[0][cloudUsers][viewer]    ${BASE PASSWORD}
    Run Keyword If    '''${mode}'''=='''cloud'''    Wait Until Element is Visible    ${YOU HAVE NO SYSTEMS}
    # ELSE     WRONG LOGIN OR PASSWORD SHOULD BE DETECTED
    Run Keyword If    '''${mode}'''=='''cloud'''    Log Out

    Log    Step 4
    Log In    ${servers}[0][cloudOwner]    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
    Check User Permissions    ${servers}[0][cloudUsers][viewer]    ${VIEWER TEXT}
    Set Checkbox Value   ${DISABLE USER SWITCH}    true
    Wait Until Elements Are Visible    ${ACCOUNT SAVE}
    Click Button    ${ACCOUNT SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Check User Permissions    ${servers}[0][cloudUsers][viewer]    ${VIEWER TEXT}
    Page Should Not Contain Element   ${USER DISABLED MSG}

    Log    Step 5
    Log Out
    Log In    ${servers}[0][cloudUsers][viewer]    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
    Run Keyword If    '''${mode}'''=='''cloud'''    Page Should Not Contain Element    ${YOU HAVE NO SYSTEMS}
    # ELSE     WRONG LOGIN OR PASSWORD SHOULD BE DETECTED

25. Administrator can add, disable and enable Viewer
    [Tags]    C63391    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudUsers][cloudAdmin]
    ...    ELSE    Create List    admin    ${servers}[0][local users][cloudAdmin][login]
    FOR    ${user}    IN    @{list}
        ${random email}=   Register and activate account with random email    mark    harmill    ${BASE PASSWORD}
        Log    Steps 1 & 2
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        Share To    ${random email}   ${VIEWER TEXT}    system=${servers}[0][name]
        Select user in Users List    ${random email}

        Log    Step 3
        Log Out
        Log In    ${random email}    ${BASE PASSWORD}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Wait Until Elements Are Visible    ${YOUR ACCESS LEVEL}    //nx-section//span[contains(text(),'${VIEWER TEXT}')]

        Log     Step 4
        Log Out
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
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
        Log In    ${servers}[0][cloudUsers][cloudAdmin]    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
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
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Page Should Not Contain Element    ${YOU HAVE NO SYSTEMS}
        Wait Until Elements Are Visible    ${YOUR ACCESS LEVEL}    //span[@class="name" and contains(text(),'${VIEWER TEXT}')]
        Exit For Loop If    '''${user}'''=='''${servers}[0][local users][cloudAdmin][login]'''
        Log Out
    END

# ***Currently removed due to CLOUD-6854***
#Cloud Owner/admin Can Change Local User Login
#    [Tags]    local_user    C76244    web_admin
#    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
#    ...    ELSE    Create List    admin    ${servers}[0][cloudOwner]
#    FOR    ${user}    IN    @{list}
#        @{local users} =    Reset Local Users    ${server auth}    https://${QA BURBANK IP}:${server 1['port']}
#        Log In    ${user}    ${password}
#        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
#        Go to Users List
#
#        Verify In Local Users UI    ${local users}    ${servers}[0][cloudOwner]
#        @{new locals} =    Create List
#        Change All Local Users Login
#        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${server 1['port']}
#        Exit For Loop If    '''${user}'''=='''admin'''
#        Log Out
#    END