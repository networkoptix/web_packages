*** Settings ***
Resource          ../Resources/front-end-resources/system-user-resource.robot
Suite Setup       Users Suite Setup
Test Setup        Run Keywords    QA Video Recording Start       Skip If Irrelevant
Test Teardown     Run Keywords    QA Video Recording Stop        Users Test Tear Down
Suite Teardown    Run Keyword and Ignore Error    users Teardown
Force Tags        system    Threaded    users

*** Test Cases ***        
26. Cloud Owner Can Change Local User Full Name
    [Tags]    local_user    C76244    webadmin    cloud    debug
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    @{new locals} =    Create List
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        Verify In Local Users UI    ${servers}[0][localUsers]    ${servers}[0][cloudOwner]
        Set Test Variable    ${new locals}    ${new locals}
        Change All Local Users Full Name
        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${servers}[0][port][0]
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

27. Cloud Owner Can Change Local User Email
    [Tags]    local_user    C76244    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin

    @{new locals} =    Create List
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]    https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        Verify In Local Users UI    ${servers}[0][localUsers]    ${servers}[0][cloudOwner]
        Set Test Variable    ${new locals}    ${new locals}
        Change All Local Users Email
        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${servers}[0][port][0]
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

28. Cloud Owner Can Change Local User Permissions 
    [Tags]    local_user    C76243    webadmin    cloud   CLOUD-10348   CLOUD-10351
    Log    Same test as testrail "Cloud owner can change local user's access level (positive)."
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    @{new locals} =    Create List
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        Verify In Local Users UI    ${servers}[0][localUsers]    ${servers}[0][cloudOwner]
        Set Test Variable    ${new locals}    ${new locals}
        Change All Local User Permissions
        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${servers}[0][port][0]
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END


29. Cloud Owner Can Change Local User Password
    [Tags]    local_user    C76246    webadmin    cloud
    Log    Same test as testrail "Cloud owner can change local user password (positive)"
   @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    @{new locals} =    Create List
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        Verify In Local Users UI    ${servers}[0][localUsers]    ${servers}[0][cloudOwner]
        Log    Change password for ${user}
        Change ALl Local User Password
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

30. Cloud owner can change local users' information
    [Tags]    local_user    C76239    webadmin    cloud
     @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        ${new locals} =    Modify Local Users via Cloud UI    ${servers}[0][localUsers]    ${servers}[0][cloudOwner]
        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${servers}[0][port][0]
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

31. Cloud administrator cannot change local administrator's or owner's information
    [Tags]    local_user    C76240    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudUsers][cloudAdmin]
    ...    ELSE    Create List    ${servers}[0][cloudUsers][cloudAdmin]    ${servers}[0][localUsers][cloudAdmin][login]
    @{local users} =    Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
    Log    Step 1
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        Change All Local User Info
        Run Keyword and Expect Error    *    Delete All Local Users    //span[contains(text(),"ocal+")]
        Log    Step 2
        Wait Until Element is Visible    //span[text()="admin"]
        Click Element    //span[text()="admin"]
        Run Keyword and Expect Error    *    Modify All Local User Info    admin    ${servers}[0][cloudUsers][cloudAdmin]    
        Elements Should Not Be Visible      ${DISABLE USER SWITCH}     ${LOCAL USER DELETE BUTTON}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

32. Local User Removed on Server is Removed From UI
    [Tags]    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    @{local users} =    Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
    FOR    ${user}    IN    @{list}
        Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        Verify In Local Users UI    ${servers}[0][localUsers]    ${servers}[0][cloudOwner]
        @{users} =    Get Users     ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
        ${user to delete} =    Set Variable    Local+viewer
        ${user id}=   Get Local User Id By Name    ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]    Local+viewer
        Remove User    ${servers}[0][token]    https://${QA BURBANK IP}:${servers}[0][port][0]    ${user id}
        Reload Page
        Wait Until Element is Visible    ${ADD USER BUTTON SYSTEMS}
        Page Should Not Contain    //span[text()="${user to delete}"]
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

33. Verify Local Users Deleted On Server
    [Tags]    local_user    C76242    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        Verify In Local Users UI    ${servers}[0][localUsers]    ${servers}[0][cloudOwner]
        Delete All Local Users    //span[contains(text(),"ocal+")]
        ${deleted user} =    Set Variable    Local
        User Should Not Exist    ${deleted user}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END


34. Adding New Local User Appears on Cloud Portal
    [Tags]    C76237    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]    ${servers}[0][cloudUsers][cloudAdmin]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    ${servers}[0][cloudUsers][cloudAdmin]    ${servers}[0][localUsers][cloudAdmin][login]    admin
    FOR    ${user}    IN    @{list}
        @{locals}=   Get Local Users
        Delete All Local Users via API    ${servers}[0][token]    https://${QA BURBANK IP}:${servers}[0][port][0]    ${locals}
        Log    Step 1
        @{new local users}=   Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]    https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        Verify In Local Users UI    ${new local users}    ${user}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

35. Cloud/local owner cannot change local/cloud owner's information
    [Tags]    C76238    local_user    webadmin    cloud
    ${user}=   Set Variable If    '''${mode}'''=='''cloud'''    ${servers}[0][cloudOwner]
    ...    '''${mode}''' != '''cloud'''    admin
    ${user2}=   Set Variable If    '''${mode}'''=='''cloud'''    admin
    ...    '''${mode}''' != '''cloud'''    ${servers}[0][cloudOwner]
    Log    Step 1
    Log In    ${user}    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
    Go To Users List
    Log    Step 2
    Wait Until Element is Visible    //span[text()="${user2}"]
    Click Element    //span[text()="${user2}"]
    Run Keyword If    '''${mode}''' != '''cloud'''    Run Keyword and Expect Error    *    Modify All Local User Info    admin    ${email}
    Elements Should Not Be Visible      ${DISABLE USER SWITCH}     ${LOCAL USER DELETE BUTTON}    ${ADD USER PERMISSIONS DROPDOWN}
    
36. Unsaved changes are not sent to the server
    [Tags]    C76241    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    Log    Preconditions
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server auth}    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        @{locals} =    Get Users     ${server auth}    https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Go to Users List
        Verify In Local Users UI    ${local users}    ${servers}[0][cloudOwner]
        
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
        @{check info} =    Get Users     ${server auth}    https://${QA BURBANK IP}:${servers}[0][port][0]
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
	    @{check info} =    Get Users     ${server auth}    https://${QA BURBANK IP}:${servers}[0][port][0]
        Lists Should Be Equal     ${check info}    ${locals}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END
# commented out because of CLOUD-6854
#Local User Login Field Cannot Be Left Blank
#    [Tags]    C76248    local_user    web_admin
#    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
#    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
#    FOR    ${user}    IN    @{list}
#        @{local users} =    Reset Local Users    ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
#        @{locals} =    Get Users     ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
#                
#        Log    Step 1
#        Log In    ${user}    ${password}
#        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
#        Go to Users List
#        Verify In Local Users UI    ${local users}    ${servers}[0][cloudOwner]
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
#        @{check info} =    Get Users     ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
#        Lists Should Be Equal     ${check info}    ${locals}
#    
#        Log    Step 4
#        Click Element    //label[@for="permissionsSelect"] 
#        Wait Until Element Contains    ${LOCAL USER LOGIN}    Local+advancedViewer
#        
#        Log    Step 5
#        @{check info} =    Get Users     ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
#        Lists Should Be Equal     ${check info}    ${locals} 
#        Exit For Loop If    '''${user}'''=='''admin'''    
#        Log Out
#    END

37. Local User name field can be left blank
    [Tags]    C76249    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${local users}    ${servers}[0][cloudOwner]
        Click Element    //span[text()="Local+advancedViewer"]
        
        Log    Step 2
        Delete All Text     ${LOCAL USER NAME}
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${USER CANCEL}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        
        Log    Step 3
        @{check info}=    Get Users     ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
        ${full name}=   Check User Full Name is None    local+advancedviewer    ${check info}
    
        Should Be Equal    ${full name}    ${None}   
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

38. Local User email field can be left blank
    [Tags]    C76250    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${servers}[0][localUsers]    ${servers}[0][cloudOwner]
        Click Element    //span[text()="Local+advancedViewer"]
        
        Log    Step 2
        Delete All Text     ${LOCAL USER NAME}
        Wait Until Elements Are Visible    ${ACCOUNT SAVE}    ${USER CANCEL}
        Click Button    ${ACCOUNT SAVE}
        Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
        
        Log    Step 3
        @{check info} =    Get Users     ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
        Check User Email is None    local+advancedviewer    ${check info}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

39. User list is available for owner and administrator
    [Tags]    C76233    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]    ${server 1['cloudUsers']}[cloudAdmin]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    ${servers}[0][cloudUsers][cloudAdmin]    ${servers}[0][localUsers][cloudAdmin][login]    admin
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users     ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${servers}[0][localUsers]     ${user}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

40. User list is not available for advanced viewer & lower
    [Tags]    C76462    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudUsers][viewer]    ${servers}[0][cloudUsers][liveViewer]   ${servers}[0][cloudUsers][advancedViewer]    ${servers}[0][cloudUsers][custom]
    ...    ELSE    Create List    ${servers}[0][cloudUsers][viewer]    ${servers}[0][cloudUsers][liveViewer]   ${servers}[0][cloudUsers][advancedViewer]    ${servers}[0][cloudUsers][custom]    ${servers}[0][localUsers][viewer][login]    ${servers}[0][localUsers][liveViewer][login]    ${servers}[0][localUsers][advancedViewer][login]    ${servers}[0][localUsers][custom][login]
    FOR    ${user}    IN    @{list}
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Log    Step 1
        Verify In System    ${servers}[0][name]    editable=${False}
        Sleep    5
        Element Should Not Be visible    ${USERS LIST LINK} 
        Exit For Loop If    '''${user}'''=='''${servers}[0][localUsers][custom]'''    
        Log Out
    END

41. Cloud Administrator Can Delete Local User(positive)
    [Tags]    C76524    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudUsers][cloudAdmin]
    ...    ELSE    Create List    ${servers}[0][localUsers][cloudAdmin][login]    ${servers}[0][cloudUsers][cloudAdmin]    
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${servers}[0][localAuth]    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${servers}[0][localUsers]   ${servers}[0][cloudUsers][cloudAdmin]
        Click Element    //span[text()="Local+advancedViewer"]
        Log    Step 2
        Click Button    ${LOCAL USER DELETE BUTTON}
        Wait Until Elements Are Visible    ${LOCAL USER DELETE CONFIRM BUTTON}    ${LOCAL USER DELETE CANCEL BUTTON}
        Log    Step 3
        Click Button    ${LOCAL USER DELETE CONFIRM BUTTON}
        Wait Until Element Is Not Visible    ${LOCAL USER DELETE CANCEL BUTTON}
        Wait Until Element Is Not Visible    //span[text()="Local+advancedViewer"]
        Log    Step 4
        @{current users} =    Get Users     ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
        ${deleted user} =    Set Variable    Local+advancedViewer
        Verify User is Deleted on Server    Local+advancedViewer    ${current users}
        Exit For Loop If    '''${user}'''=='''${servers}[0][cloudUsers][cloudAdmin]'''    
        Log Out
    END
        
42. Administrator can change local user's login permissions, name and email (positive)
    [Tags]    C76526    C76525    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudUsers][cloudAdmin]
    ...    ELSE    Create List    ${servers}[0][localUsers][cloudAdmin][login]    ${servers}[0][cloudUsers][cloudAdmin]    
    FOR    ${user}    IN    @{list}
        @{new locals} =    Create List
        @{local users} =    Reset Local Users    ${server auth}    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${local users}    ${user}
        Click Element    //span[text()="Local+advancedViewer"]
        Log    Step 2 and 3
        ${new local} =    Modify All Local User Info    advancedViewer    ${user}    
        Append To List    ${new locals}    ${new local}
        Log    Step 4
        Verify Changed Info Via API    ${new locals}    https://${QA BURBANK IP}:${servers}[0][port][0]    local user=ocal+advancedviewer    
        Exit For Loop If    '''${user}'''=='''${servers}[0][cloudUsers][cloudAdmin]'''    
        Log Out
    END

43. Cloud administrator can enable/disable any viewer local user (positive)
    [Tags]    C76527    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudUsers][cloudAdmin]
    ...    ELSE    Create List    ${servers}[0][localUsers][cloudAdmin][login]    ${servers}[0][cloudUsers][cloudAdmin]    
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server auth}    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        Log    Step 1
        Go to Users List
        Verify In Local Users UI    ${local users}    ${servers}[0][cloudUsers][cloudAdmin]
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
        @{current users} =    Get Users     ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
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
        @{current users} =    Get Users     ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]
        ${state}=   Check If User Is Enabled/Disabled    ${current users}    ${name}
        Should Be True    ${state} == ${True}
        Exit For Loop If    '''${user}'''=='''${servers}[0][cloudUsers][cloudAdmin]'''    
        Log Out
    END

44. Cloud administrator can change local user password (positive)
    [Tags]    C76530    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudUsers][cloudAdmin]
    ...    ELSE    Create List    ${servers}[0][localUsers][cloudAdmin][login]    ${servers}[0][cloudUsers][cloudAdmin]    
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server auth}    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
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
        Run Keyword and Expect Error    *    Get Cameras    ${old auth}    https://${QA BURBANK IP}:${servers}[0][port][0]
        
        Log    Step 5
        @{new auth} =    Create List    local+advancedviewer     ${ALT PASSWORD}
        ${response} =    Get Cameras    ${new auth}    https://${QA BURBANK IP}:${servers}[0][port][0]
        Exit For Loop If    '''${user}'''=='''${servers}[0][cloudUsers][cloudAdmin]'''    
        Log Out
    END

45. Changes made in thick client appear on cloud portal
    [Tags]    C76251    local_user    webadmin    cloud
    @{list}=   Run Keyword If    '''${mode}'''=='''cloud'''    Create List    ${servers}[0][cloudOwner]
    ...    ELSE    Create List    ${servers}[0][cloudOwner]    admin
    FOR    ${user}    IN    @{list}
        @{local users} =    Reset Local Users    ${server auth}    ${servers}[0][token]   https://${QA BURBANK IP}:${servers}[0][port][0]
        Log In    ${user}    ${password}
        Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[0][id]
        ${id}    Get Local User Id By Name    ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]    Local+advancedViewer
        Log    Step 1 - 3
        Go to Users List
        Verify In Local Users UI    ${local users}    ${servers}[0][cloudOwner]
        Click Element    //span[text()="Local+advancedViewer"]
        Log    Step 4
        Save User    
        ...    ${servers}[0][token]
        ...    https://${QA BURBANK IP}:${servers}[0][port][0]    
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
        ...    ${servers}[0][token]
        ...    https://${QA BURBANK IP}:${servers}[0][port][0]    
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
        ...    ${servers}[0][token]
        ...    https://${QA BURBANK IP}:${servers}[0][port][0]    
        ...    Local+advancedViewer   
        ...    ${permissions}[viewer]    
        ...    noptixautoqa+local_apichanged@gmail.com    
        ...    Api Changed    
        ...    ${BASE PASSWORD}    
        ...    userId=${id}    
        ...    isCloud=${False}
        ...    patch=${True}
        Wait Until Element is Visible    //nx-permissions-select/div/button/span[text()="${VIEWER TEXT}"]    timeout=45
        Log    Step 7
        Save User    
        ...    ${servers}[0][token]
        ...    https://${QA BURBANK IP}:${servers}[0][port][0]    
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
        ...    ${servers}[0][token]
        ...    https://${QA BURBANK IP}:${servers}[0][port][0]    
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
        Remove User    ${servers}[0][token]    https://${QA BURBANK IP}:${servers}[0][port][0]    ${id}
        Wait Until Element is Not Visible    //span[text()="Local+advancedViewer"]    timeout=45
        
        Log    Step 10
        Save User    
        ...    ${servers}[0][token]
        ...    https://${QA BURBANK IP}:${servers}[0][port][0]    
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
        Element Should Not Be Visible     //span[text()="${servers}[0][cloudOwner]"]//preceding-sibling::${LOCAL USER ICON}
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
        ${id}    Get Local User Id By Name    ${servers}[0][localAuth]    https://${QA BURBANK IP}:${servers}[0][port][0]    Local+newApiUser
        Remove User    ${servers}[0][token]    https://${QA BURBANK IP}:${servers}[0][port][0]    ${id}
        Exit For Loop If    '''${user}'''=='''admin'''    
        Log Out
    END

46. Local user list is not available for offline system
    [Tags]    C76234    local_user    System-offline    cloud
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    Log    Preconditions
    @{local users} =   Reset Local Users    ${servers}[1][localAuth]    ${servers}[1][token]   https://${QA BURBANK IP}:${servers}[1][port][0]
    ${results}    Execute Command    docker container stop ${servers}[1][name]
    Log In    ${servers}[0][cloudOwner]    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Go To    ${ENV}/systems/${servers}[1][id]
    Go To Users List
    FOR    ${user}    IN    @{local users}
        Element Should Not Be Visible    //span[text()="local+${user}"]
    END    
    Log    Step 2
    ${results}    Execute Command    docker container start ${servers}[1][name]
    FOR    ${user}    IN    @{local users}
        Wait Until Element Is Visible   //span[text()="Local+${user}"]    125
    END   
    Log    Step 3
    ${results}    Execute Command    docker container stop ${servers}[1][name]
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}    125
    Reload Page   
    FOR    ${user}    IN    @{local users}
        Wait Until Element Is Not Visible   //span[text()="local+${user}"]
    END   
    Log    Clean up
    ${results}    Execute Command    docker container start ${servers}[1][name]
    Close Connection