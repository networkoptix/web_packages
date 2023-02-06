*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     System Admin Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop      System Admin Test Restart
Suite Teardown    Run Keyword and Ignore Error    System Admin Suite Teardown
Force Tags        system    cloud


*** Test Cases ***
# CLOUD
9. Should confirm, if not owner deletes system
    Log in to system new   ${system}    ${system}[cloudUsers][viewer]
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
#    Go To    ${ENV}/systems/${system}[id]
#    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
#    Click Button    ${LOG IN CLOSE BUTTON}
#    Wait Until Element Is Visible    ${JUMBOTRON}

10. Should open System page by link to not authorized user and show it, after owner logs in
    [tags]    smoke    ci
    Go To    ${ENV}/systems/${system}[id]
    Log In    ${system}[cloudOwner]   ${base password}    button=None
    Verify In System    ${system}[name]

11. Should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    ${email noperm}    Register and activate account with random email    mark    hamil    ${password}
    Log In    ${email noperm}    ${base password}
    Go To    ${ENV}/systems/${system}[id]
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

12. Should open System page by link not authorized user, and show alert if logs in and has no permission
    ${email noperm}    Register and activate account with random email    mark    hamil    ${password}
    Go To    ${ENV}/systems/${system}[id]
    Log In    ${email noperm}    ${base password}    button=None
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

# COMMON
13. User can rename System: change in web -> check server
    [Tags]    C41880    webadmin
    Log    Step 1
    Log in to system new    ${system}    ${system}[cloudOwner]
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
    Restart Server   https://${QABURBANK IP}:${system}[port]    ${system}[localAuth]
    Sleep    10
    ${settings}=   Get System Settings From Server   ${system}[localAuth]    ${server url}
    Should be equal as strings    ${new system name}    ${settings}[systemName]

    Log    Get initial system name back
    Rename System    ${system}[cloudAuth]    ${system}[id]    ${system}[name]
    ${settings}=   Get Cloud System Settings    ${system}[cloudAuth]    ${system}[id]
    Should be equal as strings    ${settings}[name]    ${system}[name]

14. User can rename System: change on server side -> check in web
    [Tags]    C47019    C30678    webadmin
    Log    Rename System on server side and check it's changed in web
    Set System Name    https://${QABURBANK IP}:${system}[port]    ${local auth}    ${new system name}

    Log in to system new    ${system}    ${system}[cloudOwner]
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
    ${settings}=   Get Cloud System Settings    ${system}[cloudAuth]    ${system}[id]
    Should be equal as strings    ${settings}[name]    ${system}[name]

# System Settings for different users
15. Correct items are shown for owner
    [Tags]    C41560    webadmin    CB-1596
    [Documentation]     Currently failing due to work around for CB-1596
    Log in to system new    ${system}    ${system}[cloudOwner]
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
    [Tags]    C41561    webadmin
    Log    currenty failing due to CLOUD-9047
    Log in to system new    ${system}    ${system}[cloudUsers][cloudAdmin]
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${expected name}=   Replace String    ${OWNER NAME}    %OWNER_NAME%    System Owner
    Wait Until Elements Are Visible
        ...    ${SYSTEMS DROPDOWN}
        ...    ${RENAME SYSTEM}
        ...    ${DISCONNECT FROM MY ACCOUNT}
        ...    ${OWNER LABEL}
        ...    ${expected name}
        ...    //span[contains(text(), "${system}[cloudOwner]")]
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
    [Tags]    C41562    webadmin
    ${custom role}=    Create And Add Custom Camera User Type and User
    ${viewers}=    Create List
        ...    ${system}[cloudUsers][advancedViewer]
        ...    ${system}[cloudUsers][viewer]
        ...    ${system}[cloudUsers][liveViewer]
        ...    ${system}[cloudUsers][custom]
        ...    ${custom role}
    ${viewers text}=   Create List    ${ADV VIEWER TEXT}    ${VIEWER TEXT}     ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}    Custom Cameras
    ${current owner name}=   Replace String    ${OWNER NAME}    %OWNER_NAME%    System Owner
    FOR    ${user}    ${text}    IN ZIP    ${viewers}    ${viewers text}
        Log in to system new    ${system}    ${user}
        Wait Until Elements Are Visible
            ...    ${current owner name}
            ...    ${DISCONNECT FROM MY ACCOUNT}
            ...    ${OWNER LABEL}
            ...    //span[contains(text(), "${system}[cloudOwner]")]
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
    Remove User By Email    ${system}[localAuth]    ${server url}    ${custom role}   ${IMAGE}


# Left search
18. Left menu search: Position and style
    [Tags]    C81759    webadmin    search
    Skip If Image Is     5.0_test    msg=Cameras can't be added via API for this server version

    Log    Step 1
    Log in to system new    ${system}    ${system}[cloudOwner]
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
    [Tags]    C81761    search
    Stop Docker Server    ${system}[id]
    Log in to system new    ${system}    ${system}[cloudOwner]

    Log    Steps 2, 3
    ${links}=   Create List    ${LICENSES LINK}    ${CAMERAS LINK}    ${USERS LINK}    ${SERVERS LINK}
    ${aliases}=   Create List    licenses    cameras    users    servers
    FOR    ${link}    ${alias}    IN ZIP    ${links}    ${aliases}
        Wait until element is visible    ${link}
        Click Link    ${link}
        Wait Until Location Contains    ${ENV}/systems/${system}[id]/${alias}
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
    [Tags]    C81760    webadmin    search
    FOR     ${user}    IN    ${system}[cloudOwner]    ${system}[cloudUsers][cloudAdmin]
        Log in to system new    ${system}    ${user}
        Validate Search Input
        Log Out
        Wait Until Element Is Visible    ${ANONYMOUS BODY}
    END

    FOR     ${user}    IN    ${system}[cloudUsers][advancedViewer]    ${system}[cloudUsers][viewer]
        Log in to system new    ${system}    ${user}
        Wait until element is not visible    ${SEARCH INPUT}
        Log Out
        Wait Until Element Is Visible    ${ANONYMOUS BODY}
    END

21. Left menu search: Search mechanics
    [Tags]    C81762    webadmin    search
    Log in to system new    ${system}    ${system}[cloudOwner]

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

    
    ${viewer info}=   Get Account Info    ${system}[cloudUsers][viewer]    ${password}
    ${viewer id}=   Set Variable    ${viewer info}[id]
    Set Suite Variable    ${viewer id}
    ${all users found}=   Get WebElements    //span[contains(@class, "user") and span[contains(@class, "highlighted") and text()="noptix"]]
    ${num users found}=   Get Length    ${all users found}
    Capture Page Screenshot
    IF   '${IMAGE}' == '5.0'
        Should Be Equal As Numbers    ${num users found}    7
    ELSE
        Should Be Equal As Numbers    ${num users found}    6
    END
    
    Log    Step 4
    ${name} =    Get Text    ${all users found}[0]
    Click Element    ${all users found}[0]
    Wait until element is visible    //h2[contains(text(), "${name}")]

22. Left menu search: Collapsable tabs
    [Tags]    C81771    webadmin    search
    Log in to system new    ${system}    ${system}[cloudOwner]
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
    [Tags]    C81772    webadmin    search
    Log in to system new    ${system}    ${system}[cloudOwner]
    Search For    backup
    Wait until element is visible    ${SEARCH NOTHING FOUND}

24. Left menu search: Searchable fields
    [Tags]    C81796    webadmin    search
    Skip If Image Is     5.0_test    msg=Cameras can't be added via API for this server version
    Log in to system new    ${system}    ${system}[cloudOwner]
    
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
    Search For    ${system}[cloudUsers][viewer]
    ${highlighted}=   Fetch From Right    ${system}[cloudUsers][viewer]    ${TEST EMAIL}+
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and text()="${TEST EMAIL}"]/following-sibling::span[contains(@class, "highlighted") and text()="${highlighted}"]

    Log    Step 9
    Search For    ${system}[id]
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and text()="${system}[id]"]


# Disconnect System from Cloud
25. Disconnect dialog interface checks
    [Tags]    C48834    webadmin
    Log    Step 1
    Log in to system new    ${system}    ${system}[cloudOwner]
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
    [Tags]    C41883   C47020    webadmin    smoke    ci
    ${local auth}=   Create List    admin    ${base password}

    Log    Step 1
    Log in to system new    ${system}    ${system}[cloudOwner]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
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
    ${viewer systems}=   Get Account Systems    ${system}[cloudUsers][viewer]    ${base password}
    Should Not Contain    ${viewer systems}    ${system}[id]

    Log     C47020: checking that system is disconnected from cloud on the server side
    Restart Server    ${server url}    ${system}[localAuth]
    Sleep   95
    ${cloud system id}=   Get Cloud System Id    ${server url}    ${system}[localAuth]
    Should Be Equal As Strings    ${cloud system id}    ${EMPTY}

    # Verify the system is removed from others' users accounts
    Log In    ${system}[cloudUsers][viewer]    ${base password}
    Wait Until Location Is    ${ENV}/systems
    Wait until element is visible    //span[contains(text(), "${YOU HAVE NO SYSTEMS TEXT}")]
    Validate Header Button Text    0
    Click Button    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
