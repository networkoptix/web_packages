*** Settings ***
Resource          ../Resources/front-end-resources/system-user-resource.robot
Suite Setup       Users Suite Setup
Test Setup        Run Keywords    QA Video Recording Start       Skip If Irrelevant
Test Teardown     Run Keywords    QA Video Recording Stop        Users Test Tear Down
Suite Teardown    Run Keyword and Ignore Error    users Teardown
Force Tags        system    Threaded    users

*** Test Cases ***
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