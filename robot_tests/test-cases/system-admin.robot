*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        System Admin Test Setup
Test Teardown     System Admin Test Restart
Suite Teardown    Run Keyword and Ignore Error    System Admin Suite Teardown
Force Tags        system    threaded


*** Test Cases ***
# WEBADMIN
1. Cloud block is visible for owner
    [Tags]    webadmin
    Log in to system    ${local system}    admin
    Validate Cloud Block    False

2. Cloud block is not visible for not owner
    [Tags]    webadmin
    Log in to system    ${local system}    ${local system}[local users][viewer]
    Wait until element is not visible    ${CLOUD BLOCK}

3. Connect To Cloud Form - email validation
    [Tags]    webadmin
    ${broken emails}=   Create List    qa    qa@    qa@test    qa@test.    qa@test.com@
    Log in to system    ${local system}    admin
    Validate Cloud Block    False

    FOR    ${email}    IN    @{broken emails}
        Click Button    ${CONNECT TO CLOUD BUTTON}
        Validate Connect To Cloud Form
        Fill in login and password    ${email}    ${password}
        Click Button    ${CONNECT TO CLOUD OK BUTTON}
        Validate Email Input Error    Please enter a valid Email
        Close Connect to Cloud modal
    END

4. Connect To Cloud Form - negative scenarios
    [Tags]    webadmin
    Log in to system    ${local system}    admin
    Validate Cloud Block    False
    Click Button    ${CONNECT TO CLOUD BUTTON}
    Validate Connect To Cloud Form

    Log    Step 1 - empty login and password
    Click Button    ${CONNECT TO CLOUD OK BUTTON}
    Validate Email Input Error    Please enter a valid Email
    Validate Password Input Error    Password is required

    Connect To Cloud    ${EMPTY}    ${EMPTY}    success=False
    Validate Email Input Error    Please enter a valid Email
    Validate Password Input Error    Password is required

    Log    Step 2 - empty password
    Connect To Cloud    ${BASE EMAIL}    ${EMPTY}    success=False
    Validate Password Input Error    Password is required

    Log    Step 3 - empty login
    Connect To Cloud    ${SPACE}    system-admin-variables.${password}    success=False
    Validate Email Input Error    Email is required

    Log    Step 4 - wrong password
    Connect To Cloud    ${BASE EMAIL}    dsv34    success=False
    Validate Password Input Error    Wrong password

    Log    Step 5 - not existing account
    ${email}=   Get Random Email Robot    ${BASE EMAIL}
    Connect To Cloud    ${email}    system-admin-variables.${password}    success=False
    Validate Email Input Error    Account not found

    Log    Step 6 - not activated account
    ${email}=   Get Random Email Robot    ${BASE EMAIL}
    Register Account    Not    Activated    ${email}    ${password}
    Connect To Cloud    ${email}    system-admin-variables.${password}    success=False
    Wait until element is visible    ${CONNECT TO CLOUD EMAIL INPUT}/following-sibling::div/div[contains(@class, "input-error")]
    ${error text}=   Get Text    ${CONNECT TO CLOUD EMAIL INPUT}/following-sibling::div/div[contains(@class, "input-error")]
    Run Keyword and continue on failure    Should be equal as strings   ${error text}    Account isn't activated. Please log in to Nx Cloud and follow provided instructions.

5. Connect To Cloud Form - cancel buttons works correctly
    [Tags]    webadmin
    Log in to system    ${local system}    admin
    Validate Cloud Block    False
    Click Button    ${CONNECT TO CLOUD BUTTON}
    Validate Connect To Cloud Form
    Fill in login and password    ${system}[owner]    ${password}
    Wait until elements are not visible    ${CONNECT TO CLOUD EMAIL ERROR}    ${CONNECT TO CLOUD PASSWORD ERROR}
    Click Button    ${CONNECT TO CLOUD CANCEL BUTTON}
    Wait until elements are not visible    ${CONNECT TO CLOUD MODAL}    ${DISCONNECT FROM NX}
    Validate Cloud Block    False

    Log   Check that Cancel button doesn't trigger connection
    ${cloud id}=   Get Cloud System Id    https://${QABURBANK IP}:${local system}[port]    ${system}[local auth]
    Should be equal as strings    ${cloud id}    Cannot find cloudSystemID key

6. Local owner can connect system to cloud
    [Tags]    webadmin    smoke
    Log in to system    ${local system}    admin
    Validate Cloud Block    False
    Click Button    ${CONNECT TO CLOUD BUTTON}
    Connect To Cloud    ${system}[owner]    system-admin-variables.${password}    success=True
    Validate Cloud Block    True

7. Check UI for local not owner when connected to cloud
    [Tags]    webadmin
    Connect system to cloud if not    ${local auth}    https://${QABURBANK IP}:${local system}[port]     ${local system}[name]    ${system}[owner]    ${password}

    Log in to system    ${local system}    ${local system}[local users][viewer]
    Wait until elements are visible
       ...    ${CLOUD NAME}
       ...    ${CLOUD LINK}
       ...    ${CONNECTION STATUS}\[contains(text(), "CONNECTED")]
    Wait until element is not visible    ${DISCONNECT FROM NX}

8. Local owner can disconnect system from cloud
    [Tags]    webadmin
    Connect system to cloud if not    ${local auth}    https://${QABURBANK IP}:${local system}[port]     ${local system}[name]    ${system}[owner]    ${password}

    Log    Step 1
    Log in to system    ${local system}    admin
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Validate Header Button Text    ${local system}[name]    systems=False
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form

    Log    Step 2
    Slow    Input Text    ${DISCONNECT PASSWORD INPUT}    ${base password}    timeout=0.1
    Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    Validate Cloud Block    connected=False

#    TODO
#    Check UI for local not owner
#    Check cloud - system is not there

# CLOUD
9. Should confirm, if not owner deletes system
    [Tags]    cloud
    Log in to system    ${system}    ${system}[cloud users][viewer]
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Element Is Visible    ${DISCONNECT MODAL WARNING}
    Click Element    ${DISCONNECT MODAL WARNING}
    Sleep    .5
    Wait Until Element Is Visible    ${DISCONNECT MODAL CANCEL}
    Click Button    ${DISCONNECT MODAL CANCEL}
    Wait Until Page Does Not Contain Element    ${REMOVE USER MODAL}

# Commenting out below TC since login is page instead of window on 21.1
#10. Should open System page by link to not authorized user and redirect to homepage, if he does not log in
#    [Tags]    cloud
#    Go To    ${ENV}/systems/${system}[cloud id]
#    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
#    Click Button    ${LOG IN CLOSE BUTTON}
#    Wait Until Element Is Visible    ${JUMBOTRON}

10. Should open System page by link to not authorized user and show it, after owner logs in
    [Tags]    cloud
    Go To    ${ENV}/systems/${system}[cloud id]
    Log In    ${system}[owner]   ${base password}    button=None
    Verify In System    ${system}[name]

11. Should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    [Tags]    cloud
    ${email noperm}    Register and activate account with random email    mark    hamil    ${password}
    Log In    ${email noperm}    ${base password}
    Go To    ${ENV}/systems/${system}[cloud id]
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

12. Should open System page by link not authorized user, and show alert if logs in and has no permission
    [Tags]    cloud
    ${email noperm}    Register and activate account with random email    mark    hamil    ${password}
    Go To    ${ENV}/systems/${system}[cloud id]
    Log In    ${email noperm}    ${base password}    button=None
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

# COMMON
13. User can rename System: change in web -> check server
    [Tags]    C41880    webadmin    cloud
    Log    Step 1
    Log In To System    ${system}    ${system}[owner]
    Wait Until Elements Are Visible
    ...    ${SYSTEMS DROPDOWN}
    ...    ${RENAME SYSTEM}
    ...    ${NO UNSAVED CHANGES}
    Log    Step 2
    Mouse Over    ${SYSTEM NAME}

    Element Style Should Be    ${SYSTEM NAME}    background-color    ${COLOR ALIGHT4 RGB}
    Log    Cancel button works fine
    Log    Step 3 & 4
    Change System Name    ${new system name}    save=False
    Log    Step 5
    Click Button    ${CANCEL BUTTON}
    Wait until elements are not visible    ${CANCEL BUTTON}    ${SAVE BUTTON}
    Wait until element is visible    ${NO UNSAVED CHANGES}
    ${actual name}=   Get Text    ${SYSTEM NAME}
    Should be equal as strings    ${actual name}    ${system}[name]
    Log    Step 6
    Click Element    ${SYSTEM NAME}
    Delete All Text    ${SYSTEM NAME}
    Element Style Should Be    ${SYSTEM NAME}    border-color    ${ERROR COLOR}
    Click Button    ${SAVE BUTTON}
    Element Text Should Be    ${SYSTEM NAME}    ${system}[name]

    Log    Save button works fine
    Log    Step 7
    Change System Name    ${new system name}
    ${actual name}=   Get Text    ${SYSTEM NAME}
    Should be equal as strings    ${actual name}    ${new system name}

    Log    Header main button text is changed accordingly
    # button text is not updated without reloading the page
    Reload Page
    Wait Until Elements Are Visible    ${SYSTEMS DROPDOWN}    ${DISCONNECT FROM NX}
    Validate Header Button Text    ${new system name}    systems=False

    Log    Check that system name is changed - server
    Restart Server   https://${QABURBANK IP}:${system}[port]    ${system}[local auth]
    Sleep    10
    ${settings}=   Get System Settings From Server   ${system}[local auth]    https://${QABURBANK IP}:${system}[port]
    Should be equal as strings    ${new system name}    ${settings}[systemName]

    Log    Get initial system name back
    Rename System    ${system}[cloud auth]    ${system}[cloud id]    ${system}[name]
    ${settings}=   Get Cloud System Settings    ${system}[cloud auth]    ${system}[cloud id]
    Should be equal as strings    ${settings}[name]    ${system}[name]

14. User can rename System: change on server side -> check in web
    [Tags]    C47019    C30678    webadmin    cloud
    Log    Rename System on server side and check it's changed in web
    Set System Name    https://${QABURBANK IP}:${system}[port]    ${local auth}    ${new system name}

    Log in to system    ${system}    ${system}[owner]
    Wait Until Elements Are Visible
        ...    ${SYSTEMS DROPDOWN}
        ...    ${RENAME SYSTEM}
        ...    ${NO UNSAVED CHANGES}
    ${actual name}=   Get Text    ${SYSTEM NAME}
    Should be equal as strings    ${actual name}    ${new system name}
    Validate Header Button Text    ${new system name}    systems=False

    Log    Get initial system name back
    Set System Name    https://${QABURBANK IP}:${system}[port]    ${local auth}    ${system}[name]
    Sleep  1
    ${settings}=   Get Cloud System Settings    ${system}[cloud auth]    ${system}[cloud id]
    Should be equal as strings    ${settings}[name]    ${system}[name]

# System Settings for different users
15. Correct items are shown for owner
    [Tags]    C41560    webadmin    cloud    CB-1596
    [Documentation]     Currently failing due to work around for CB-1596
    Log in to system    ${system}    ${system}[owner]
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${expected name}=   Replace String    ${OWNER NAME}    %OWNER_NAME%    ${YOU TEXT}
    Wait Until Elements Are Visible
        ...    ${SYSTEMS DROPDOWN}
        ...    ${RENAME SYSTEM}
            # fail on above step due to CB-1596
        ...    ${DISCONNECT FROM NX}
#        ...    ${expected name}
        ...    ${MERGE BUTTON SYSTEM}
        ...    ${LICENSES LINK}
        ...    ${CAMERAS LINK}
        ...    ${USERS LINK}
        ...    ${SERVERS LINK}
        ...    ${SECURITY FORM}
    Validate Header Button Text    ${system}[name]    systems=False
    IF    '${mode}'=='cloud'
        Title Should Be    ${system}[name] - ${PRODUCT NAME}
    ELSE IF    '${mode}'=='webadmin'
        Title Should Be    ${system}[name] - webadmin
    END
    Go To Users List
    Wait Until Elements Are Visible    ${USERS LIST}    ${ADD USER BUTTON SYSTEMS}

16. Correct items are shown for admin
    [Tags]    C41561    webadmin    cloud
    Log in to system    ${system}    ${system}[cloud users][cloudAdmin]
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${expected name}=   Replace String    ${OWNER NAME}    %OWNER_NAME%    System Owner
    Wait Until Elements Are Visible
        ...    ${SYSTEMS DROPDOWN}
        ...    ${RENAME SYSTEM}
        ...    ${DISCONNECT FROM MY ACCOUNT}
        ...    ${OWNER LABEL}
        ...    ${expected name}
        ...    //span[contains(text(), "${system}[owner]")]
        ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${ADMIN TEXT}')]
        ...    ${LICENSES LINK}
        ...    ${CAMERAS LINK}
        ...    ${USERS LINK}
        ...    ${SERVERS LINK}
        ...    ${SECURITY FORM}
    Wait Until Elements Are Not Visible    ${DISCONNECT FROM NX}    ${MERGE BUTTON SYSTEM}
    Validate Header Button Text    ${system}[name]    systems=False
    Go To Users List
    Wait Until Elements are Visible    ${USERS LIST}    ${ADD USER BUTTON SYSTEMS}

17. Correct items are shown for advanced viewer and below
    [Tags]    C41562    webadmin    cloud
    ${custom role}=    Create And Add Custom Camera User Type and User
    ${viewers}=    Create List
        ...    ${system}[cloud users][advancedViewer]
        ...    ${system}[cloud users][viewer]
        ...    ${system}[cloud users][liveViewer]
        ...    ${system}[cloud users][custom]
        ...    ${custom role}
    ${viewers text}=   Create List    ${ADV VIEWER TEXT}    ${VIEWER TEXT}     ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}    Custom Cameras
    ${current owner name}=   Replace String    ${OWNER NAME}    %OWNER_NAME%    System Owner
    FOR    ${user}    ${text}    IN ZIP    ${viewers}    ${viewers text}
        Log in to system    ${system}    ${user}
        Wait Until Elements Are Visible
            ...    ${current owner name}
            ...    ${DISCONNECT FROM MY ACCOUNT}
            ...    ${OWNER LABEL}
            ...    //span[contains(text(), "${system}[owner]")]
            ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${text}')]
        Wait Until Elements Are Not Visible    
            ...    ${RENAME SYSTEM}
            ...    ${DISCONNECT FROM NX}
            ...    ${MERGE BUTTON SYSTEM}
            ...    ${LICENSES LINK}
            ...    ${USERS LINK}
            ...    ${SERVERS LINK}
        IF    '${text}' != 'Custom Cameras'
            Wait Until Element Is Not Visible    ${CAMERAS LINK}
        END
        Element Should Be Enabled    ${DISCONNECT FROM MY ACCOUNT}
        Log Out
        Wait Until Element Is Visible    ${ANONYMOUS BODY}
    END
    Remove User By Email    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    ${custom role}


# Left search
18. Left menu search: Position and style
    [Tags]    C81759    webadmin    cloud    search
    Skip If Image Is     5.0_test    msg=Cameras can't be added via API for this server version

    Log    Step 1
    Log in to system    ${system}    ${system}[owner]
    Validate Search Input

    Log    Step 2
    Click Element    ${SEARCH INPUT}
    Element Should Be Focused    ${SEARCH INPUT}

    Log    Step 3
    Click Element    ${CAMERAS LINK}
    Run keyword and continue on failure    Validate Search Input

    Log    Step 4
    Click Element    ${USERS LINK}
    Run keyword and continue on failure    Validate Search Input

    Log    Step 5
    Click Element    ${SERVERS LINK}
    Run keyword and continue on failure    Validate Search Input

    Log    Step 6
    Click Element    ${VIEW TAB}
    Run keyword and continue on failure    Validate Search Input    view page=True

    Log    Step 7
    Click Element    ${VIEW SEARCH DETAILS TOGGLER}
    ${server info}=   Replace String    ${VIEW SEARCH SERVER IP INFO}    %SERVER NAME%    Server ${system}[id]
    Wait Until Element Is Visible    ${server info}

    Log    Step 8
    Click Element    ${INFORMATION TAB}
    Wait Until Element Is Not Visible    ${SEARCH INPUT}

19. Left menu search: Search menu for offline system
    [Tags]    C81761    cloud    search
    Stop Docker Server    ${system}[id]
    Log in to system    ${system}    ${system}[owner]

    Log    Steps 2, 3
    ${links}=   Create List    ${LICENSES LINK}    ${CAMERAS LINK}    ${USERS LINK}    ${SERVERS LINK}
    ${aliases}=   Create List    licenses    cameras    users    servers
    FOR    ${link}    ${alias}    IN ZIP    ${links}    ${aliases}
        Wait until element is visible    ${link}
        Click Link    ${link}
        Wait Until Location Contains    ${ENV}/systems/${system}[cloud id]/${alias}
        Run keyword and continue on failure    Validate Search Input
    END

    Log    Step 4
    Click Link    ${VIEW TAB}
    Wait Until Elements Are Visible     ${SYSTEM OFFLINE HEADER}    ${THIS SYSTEM IS OFFLINE}
    Wait Until Element Is Not Visible    ${SEARCH INPUT}

    Log    Step 5
    Click Link    ${INFORMATION TAB}
    Wait Until Elements Are Visible     ${SYSTEM OFFLINE HEADER}    ${THIS SYSTEM IS OFFLINE}
    Wait Until Element Is Not Visible    ${SEARCH INPUT}

    Start Docker Server    ${system}[id]

20. Left menu search: Availability for different users
    [Tags]    C81760    webadmin    cloud    search
    FOR     ${user}    IN    ${system}[owner]    ${system}[cloud users][cloudAdmin]
        Log in to system    ${system}    ${user}
        Validate Search Input
        Log Out
        Wait Until Element Is Visible    ${ANONYMOUS BODY}
    END

    FOR     ${user}    IN    ${system}[cloud users][advancedViewer]    ${system}[cloud users][viewer]
        Log in to system    ${system}    ${user}
        Wait until element is not visible    ${SEARCH INPUT}
        Log Out
        Wait Until Element Is Visible    ${ANONYMOUS BODY}
    END

21. Left menu search: Search mechanics
    [Tags]    C81762    webadmin    cloud    search 
    Log in to system    ${system}    ${system}[owner]

    Log    Step 1
    Search For    a
    Wait until elements are visible    ${SEARCH CLOSE BUTTON}    ${SEARCH ICON}

    Log    Step 2
    Search For    User
    Wait until element is not visible    ${MENU SECTION}
    Wait until element is visible    ${SEARCH NOTHING FOUND}

    Log    Step 3
    Search For    noptix
    Wait until elements are visible
    ...    ${USERS LIST}
    ...    ${SEARCHABLE MENU}
    ...    ${SEARCH RESULT ARROW}

    
    ${viewer info}=   Get Account Info    ${system}[cloud users][viewer]    ${password}
    ${viewer id}=   Set Variable    ${viewer info}[id]
    Set Suite Variable    ${viewer id}
    ${all users found}=   Get WebElements    //span[contains(@class, "user") and span[contains(@class, "highlighted") and text()="noptix"]]
    ${num users found}=   Get Length    ${all users found}
    Capture Page Screenshot
    IF   '${IMAGE}' == '5.0_test'
        Should Be Equal As Numbers    ${num users found}    7
    ELSE
        Should Be Equal As Numbers    ${num users found}    6
    END
    
    Log    Step 4
    ${name} =    Get Text    ${all users found}[0]
    Click Element    ${all users found}[0]
    Wait until element is visible    //h2[contains(text(), "${name}")]

22. Left menu search: Collapsable tabs
    [Tags]    C81771    webadmin    cloud    search
    Log in to system    ${system}    ${system}[owner]
    Validate Search Input

    Log    Step 1
    Search For    a
    Wait until elements are visible    ${SEARCH CLOSE BUTTON}    ${SEARCH ICON}
    Log    Step 2
    Click Element    ${USERS EXPAND BUTTON}
    Wait Until Element Is Visible    ${USERS RESULTS SUMMARY}
    Log    Step 3
    Click Element    ${USERS EXPAND BUTTON}
    Wait Until Element Is Visible    ${USERS EXPAND RESULTS}

23. Left menu search: Placeholder
    [Tags]    C81772    webadmin    cloud    search
    Log in to system    ${system}    ${system}[owner]
    Search For    backup
    Wait until element is visible    ${SEARCH NOTHING FOUND}

24. Left menu search: Searchable fields
    [Tags]    C81796    webadmin    cloud    search
    Skip If Image Is     5.0_test    msg=Cameras can't be added via API for this server version
    Log in to system    ${system}    ${system}[owner]
    
    IF    '${LANGUAGE}'=='en_US'
        Log    Step 1
        Search For    en
        Wait until elements are visible
        ...    ${LICENSES LINK}
        ...    ${GENERAL LINK}
    END

    Log    Step 2
    Search For    ${CAMERA NAME}
    Run keyword and continue on failure    Wait Until Element is Visible    //span[@class="highlighted" and contains(text(), "${CAMERA NAME}")]

    Log    Steps 3,4,5 - cannot be autotested

    Log    Step 6
    Search For    admin
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "user") and span[contains(@class, "highlighted") and text()="admin"]]

    Log    Step 7
    Search For    viewer
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and contains(text(), "viewer")]

    Log    Step 8
    Search For    ${system}[cloud users][viewer]
    ${highlighted}=   Fetch From Right    ${system}[cloud users][viewer]    ${TEST EMAIL}+
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and text()="${TEST EMAIL}"]/following-sibling::span[contains(@class, "highlighted") and text()="${highlighted}"]

    Log    Step 9
    Search For    ${system}[id]
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and text()="${system}[id]"]


# Disconnect System from Cloud
25. Disconnect dialog interface checks
    [Tags]    C48834    webadmin    cloud
    Log    Step 1
    Log in to system    ${system}    ${system}[owner]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form

    Log     Step 2
    #Input Text    ${DISCONNECT PASSWORD INPUT}    ${base password}
    Click Element    ${DISCONNECT FORM CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FORM}
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}

    Log    Step 3
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form
    Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FORM}
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    # removing the below step since no password is needed anymore in order to disconnect system from cloud
    #Log    Step 4
    #Click Button    ${DISCONNECT FROM NX}
    #Validate Disconnect Form
    #Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    #The below steps commented out since password field was removed from "Discconect System from Nx Cloud"
    #Wait Until Element Is Visible    ${PASSWORD IS REQUIRED}
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    color    ${ERROR COLOR WITH OPACITY}
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    border-color    ${ERROR COLOR}

    #Log    Step 5
    #Input Text    ${DISCONNECT PASSWORD INPUT}    khgwearfgak
    #Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    #Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM WRONG PASSWORD}
    #${input class}=   Get Element Attribute    ${DISCONNECT PASSWORD INPUT}    class
    #Should Contain    ${input class}    ng-invalid
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    color    ${ERROR COLOR WITH OPACITY}
    #Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    border-color    ${ERROR COLOR}
    #Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    #Wait Until Element Is Not Visible    ${DISCONNECT FORM}

26. Cloud Owner can disconnect System from Cloud
    [Tags]    C41883   C47020    webadmin    cloud    smoke
    ${local auth}=   Create List    admin    ${base password}

    Log    Step 1
    Log in to system    ${system}    ${system}[owner]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Validate Header Button Text    ${system}[name]    systems=False
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form

    Log    Step 2
    #Slow    Input Text    ${DISCONNECT PASSWORD INPUT}    ${base password}    timeout=0.1
    Click Element    ${DISCONNECT FORM DISCONNECT CLOUD BUTTON}

    # Finish the test in webadmin mode
    Run keyword if   '''${mode}''' == '''webadmin'''    Run Keywords
        ...    Validate Log Out Web Admin    AND
        ...    Pass Execution    Webadmin tests complete

    Run keyword and continue on failure    Check For Alert    ${SUCCESSFULLY DISCONNECTED}
    Wait Until Location Is    ${ENV}/systems
    Wait Until Element Is Not Visible    ${SYSTEMS TILE}//h2[text()="${system}[name]"]

    # Verify changes are reflected correctly in the header
    Validate Header Button Text    0
    Slow    Click Button    ${SYSTEMS DROPDOWN}    timeout=0.1
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
    Slow    Click Button    ${SYSTEMS DROPDOWN}    timeout=0.1
    Log Out

    Log    Step 3 - Verify cloud API gets correct list of systems
    ${viewer systems}=   Get Account Systems    ${system}[cloud users][viewer]    ${base password}
    Should Not Contain    ${viewer systems}    ${system}[cloud id]

    Log     C47020: checking that system is disconnected from cloud on the server side
    Restart Server    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]
    Sleep   65
    ${cloud system id}=   Get Cloud System Id    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]
    Should Be Equal As Strings    ${cloud system id}    ${EMPTY}

    # Verify the system is removed from others' users accounts
    Log In    ${system}[cloud users][viewer]    ${base password}
    Wait Until Location Is    ${ENV}/systems
    Wait until element is visible    //span[contains(text(), "${YOU HAVE NO SYSTEMS TEXT}")]
    Validate Header Button Text    0
    Click Button    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
