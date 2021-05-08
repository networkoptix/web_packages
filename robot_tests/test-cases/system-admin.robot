*** Settings ***
Resource          ../resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        System Admin Test Setup
Test Teardown     System Admin Test Restart
Suite Teardown    System Admin Suite Teardown
Force Tags        system    threaded

*** Variables ***
${password}    ${BASE PASSWORD}

*** Test Cases ***
# WEBADMIN
Cloud block is visible for owner
    [Tags]    webadmin
    Log in to system    ${local system}    admin
    Validate Cloud Block    False

Cloud block is not visible for not owner
    [Tags]    webadmin    deb
    Log in to system    ${local system}    local_viewer
    Wait until element is not visible    ${CLOUD BLOCK}

Connect To Cloud Form - email validation
    [Tags]    webadmin    deb
    ${broken emails}=   Create List    ${EMPTY}    ${SPACE}    dsfgdsgf    sdags@sfasf@    qa@qa@    qwerty@
    Log in to system    ${local system}    admin
    Validate Cloud Block    False

    FOR    ${email}    IN    ${broken emails}
        Click Button    ${CONNECT TO CLOUD BUTTON}
        Validate Connect To Cloud Form
        Fill in login and password    ${email}    ${password}
        Validate Email Input Error    Please enter a valid Email
        Close Connect to Cloud modal
    END

Connect To Cloud Form - negative scenarios
    [Tags]    webadmin    deb
    Log in to system    ${local system}    admin
    Validate Cloud Block    False
    Click Button    ${CONNECT TO CLOUD BUTTON}
    Validate Connect To Cloud Form

    Log    Step 1 - empty login and password
    Click Button    ${CONNECT TO CLOUD OK BUTTON}
    Validate Email Input Error    Email is required
    Validate Password Input Error    Password is required

    Connect To Cloud    ${EMPTY}    ${EMPTY}    success=False
    Validate Email Input Error    Email is required
    Validate Password Input Error    Password is required

    Log    Step 2 - empty password
    Connect To Cloud    ${EMAIL BASE}    ${EMPTY}    success=False
    Validate Password Input Error    Password is required

    Log    Step 3 - empty login
    Connect To Cloud    ${EMPTY}    ${password}    success=False
    Validate Password Input Error    Email is required

    Log    Step 4 - wrong password
    Connect To Cloud    ${EMAIL BASE}    dsv34    success=False
    Validate Password Input Error    Wrong password

    Log    Step 5 - not existing account
    Connect To Cloud    qa@test.com    ${EMPTY}    success=False
    Validate Email Input Error    Account not found

    Log    Step 6 - not activated account
    ${email}=   Get Random Email
    Register Account    Not    Activated    ${email}    ${password}
    Connect To Cloud    ${email}    ${password}    success=False
    ${error text}=   Get Text    ${CONNECT TO CLOUD PASSWORD ERROR}
    Run keyword and continue on failure    Validate Email Input Error    Account isn't activated. Please log in to Nx Cloud and follow provided instructions.

Connect To Cloud Form - cancel buttons works correctly
    [Tags]    webadmin    deb
    Log in to system    ${local system}    admin
    Validate Cloud Block    False
    Click Button    ${CONNECT TO CLOUD BUTTON}
    Validate Connect To Cloud Form
    Fill in login and email    ${system}[owner]    ${password}
    Wait until elements are not visible    ${CONNECT TO CLOUD EMAIL ERROR}    ${CONNECT TO CLOUD PASSWORD ERROR}
    Click Button    ${CONNECT TO CLOUD CANCEL BUTTON}
    Wait until elements are not visible    ${CONNECT TO CLOUD MODAL}    ${DISCONNECT FROM NX CLOUD}
    Validate Cloud Block    False

    Log   Check that Cancel button doesn't trigger connection
    ${cloud id}=   Get Cloud System Id    ${local auth}    https://${QABURBANK IP}:${system}[port]
    Should be equal as strings    ${cloud id}    ${EMPTY}

Local owner can connect system to cloud
    [Tags]    webadmin    deb
    Log in to system    ${local system}    admin
    Validate Cloud Block    False
    Click Button    ${CONNECT TO CLOUD BUTTON}
    Connect To Cloud    success
    Validate Cloud Block    True

#Check UI for local owner when connected to cloud
#    [Tags]    webadmin
#    Log in to system    ${local system}    admin
#    Connect system to cloud if not

#Check UI for local not owner
#    [Tags]    webadmin
#    Log in to system    ${local system}    local_viewer
##   Connect system to cloud if not
#    Log In as not owner
#   Cloud block:
#   - Connected button
#   - cloud name
#   - owner
#   There is no "Disconnect" buttons

Local owner can disconnect system from cloud
    [Tags]    webadmin
    Log in to system    ${local system}    admin
#   Connect system to cloud if not
#    Disconnect from cloud
#    Check UI for local owner
#    Check UI for local not owner
#    Check cloud - system is not there

# CLOUD
Should confirm, if not owner deletes system
    [Tags]    cloud
    Log in to system    ${system}    ${users}[viewer]
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Element Is Visible    ${DISCONNECT MODAL WARNING}
    Click Element    ${DISCONNECT MODAL WARNING}
    Sleep    .5
    Wait Until Element Is Visible    ${DISCONNECT MODAL CANCEL}
    Click Button    ${DISCONNECT MODAL CANCEL}
    Wait Until Page Does Not Contain Element    ${REMOVE USER MODAL}

Should open System page by link to not authorized user and redirect to homepage, if he does not log in
    [Tags]    cloud
    Go To    ${ENV}/systems/${system}[id]
    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Wait Until Element Is Visible    ${JUMBOTRON}

Should open System page by link to not authorized user and show it, after owner logs in
    [Tags]    cloud
    Go To    ${ENV}/systems/${system}[id]
    Log In    ${system}[owner]   ${base password}    button=None
    Verify In System    ${system}[name]

Should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    [Tags]    cloud
    Log In    ${email noperm}    ${base password}
    Go To    ${ENV}/systems/${system}[id]
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

Should open System page by link not authorized user, and show alert if logs in and has no permission
    [Tags]    cloud
    Go To    ${ENV}/systems/${system}[id]
    Log In    ${email noperm}    ${base password}    button=None
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

# COMMON
User can rename System: change in web -> check server
    [Tags]    C41880    webadmin    cloud
    Log in to system    ${system}    ${system}[owner]
    Wait Until Elements Are Visible
        ...    ${SYSTEMS DROPDOWN}
        ...    ${RENAME SYSTEM}
        ...    ${NO UNSAVED CHANGES}

    Log    Cancel button works fine
    Change System Name    ${new system name}    save=False
    Click Button    ${CANCEL BUTTON}
    Wait until elements are not visible
    Wait until element is visible    ${NO UNSAVED CHANGES}
    ${actual name}=   Get Text    ${SYSTEM NAME}
    Should be equal as strings    ${actual name}    ${system}[name]

    Log    Save button works fine
    Change System Name    ${new system name}
    ${actual name}=   Get Text    ${SYSTEM NAME}
    Should be equal as strings    ${actual name}    ${new system name}

    Log    Header main button text is changed accordingly
    # button text is not updated without reloading the page
    Reload Page
    Wait Until Elements Are Visible    ${SYSTEMS DROPDOWN}    ${DISCONNECT FROM NX}
    Validate Header Button Text    ${new system name}    systems=False

    Log    Check that system name is changed - server
    Restart Server   http://${QABURBANK IP}:${system}[port]    ${cloud auth}
    Sleep    10
    ${settings}=   Get System Settings    ${cloud auth}    http://${QABURBANK IP}:${system}[port]
    FOR    ${s}    IN    @{settings}
        Run Keyword If    '''${s}[name]''' == '''systemName'''    Run Keywords
           ...   Should be equal as strings    ${new system name}    ${s}[value]   AND
           ...   Exit For Loop
    END

    Log    Get initial system name back
    Rename System    ${cloud auth}    ${system}[id]    ${system}[name]
    ${settings}=   Get Cloud System Settings    ${cloud auth}    ${system}[id]
    Should be equal as strings    ${settings}[name]    ${system}[name]

User can rename System: change on server side -> check in web
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
    ${settings}=   Get Cloud System Settings    ${cloud auth}    ${system}[id]
    Should be equal as strings    ${settings}[name]    ${system}[name]

# System Settings for different users
Correct items are shown for owner
    [Tags]    C41560    webadmin    cloud
    Log in to system    ${system}    ${system}[owner]
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${expected name}=   Replace String    ${OWNER NAME}    %OWNER_NAME%    ${YOU TEXT}
    Wait Until Elements Are Visible
        ...    ${SYSTEMS DROPDOWN}
        ...    ${RENAME SYSTEM}
        ...    ${DISCONNECT FROM NX}
#        ...    ${expected name}
        ...    ${MERGE BUTTON SYSTEM}
        ...    ${LICENSES LINK}
        ...    ${CAMERAS LINK}
        ...    ${USERS LINK}
        ...    ${SERVERS LINK}
        ...    ${SYSTEM SETTINGS FORM}
        ...    ${SECURITY FORM}
    Validate Header Button Text    ${system}[name]    systems=False
    Run keyword If    '''${mode}'''=='''cloud'''    Title Should Be    ${system}[name] - ${PRODUCT NAME}
    ...    ELSE IF    '''${mode}'''=='''webadmin'''    Title Should Be    ${system}[name] - webadmin
    Go To Users List
    Wait Until Elements Are Visible    ${USERS LIST}    ${ADD USER BUTTON SYSTEMS}

Correct items are shown for admin
    [Tags]    C41561    webadmin    cloud
    Log in to system    ${system}    ${users}[cloudAdmin]
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${expected name}=   Replace String    ${OWNER NAME}    %OWNER_NAME%    System Owner
    Wait Until Elements Are Visible
        ...    ${SYSTEMS DROPDOWN}
        ...    ${RENAME SYSTEM}
        ...    ${DISCONNECT FROM MY ACCOUNT}
#        ...    ${OWNER LABEL}
#        ...    ${expected name}
#        ...    //span[contains(text(), "${system}[owner]")]
        ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${ADMIN TEXT}')]
        ...    ${LICENSES LINK}
        ...    ${CAMERAS LINK}
        ...    ${USERS LINK}
        ...    ${SERVERS LINK}
        ...    ${SYSTEM SETTINGS FORM}
        ...    ${SECURITY FORM}
    Wait Until Elements Are Not Visible    ${DISCONNECT FROM NX}    ${MERGE BUTTON SYSTEM}
    Validate Header Button Text    ${system}[name]    systems=False
    Go To Users List
    Wait Until Elements are Visible    ${USERS LIST}    ${ADD USER BUTTON SYSTEMS}

Correct items are shown for advanced viewer and below
    [Tags]    C41562    webadmin    cloud
    ${viewers}=    Create List    ${users}[advancedViewer]    ${users}[viewer]     ${users}[liveViewer]     ${users}[custom]
    ${viewers text}=   Create List    ${ADV VIEWER TEXT}    ${VIEWER TEXT}     ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}
    ${current owner name}=   Replace String    ${OWNER NAME}    %OWNER_NAME%    System Owner
    FOR    ${user}    ${text}    IN ZIP    ${viewers}    ${viewers text}
        Log in to system    ${system}    ${user}
        Wait Until Elements Are Visible
#            ...    ${current owner name}
            ...    ${DISCONNECT FROM MY ACCOUNT}
#            ...    ${OWNER LABEL}
#            ...    //span[contains(text(), "${system}[owner]")]
            ...    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${text}')]
        Wait Until Elements Are Not Visible
            ...    ${RENAME SYSTEM}
            ...    ${DISCONNECT FROM NX}
            ...    ${MERGE BUTTON SYSTEM}
            ...    ${LICENSES LINK}
            ...    ${CAMERAS LINK}
            ...    ${USERS LINK}
            ...    ${SERVERS LINK}
        Element Should Be Enabled    ${DISCONNECT FROM MY ACCOUNT}
        Log Out
    END


# Left search
Left menu search: Position and style
    [Tags]    C81759    webadmin    cloud    search

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
    Click Element    ${SEARCH DETAILS TOGGLER}
    Wait Until Element Is Visible    ${SEARCH SERVER IP INFO}

Left menu search: Search menu for offline system
    [Tags]    C81761    webadmin    cloud    search
    Stop Docker Server    ${system}[cont]
    Log in to system    ${system}    ${system}[owner]

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
    Wait Until element Is Not Visible    ${SEARCH INPUT}
    Start Docker Server    ${system}[cont]

Left menu search: Availability for different users
    [Tags]    C81760    webadmin    cloud    search
    FOR     ${user}    IN    ${system}[owner]    ${users}[cloudAdmin]
        Log in to system    ${system}    ${user}
        Validate Search Input
        Log Out
    END

    FOR     ${user}    IN    ${users}[advancedViewer]    ${users}[viewer]
        Log in to system    ${system}    ${user}
        Wait until element is not visible    ${SEARCH INPUT}
        Log Out
    END

Left menu search: Search mechanics
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

    Log    Step 4
    ${viewer info}=   Get Account Info    ${users}[viewer]
    ${viewer id}=   Set Variable    ${viewer info}[id]
    Set Suite Variable    ${viewer id}
    ${all users found}=   Get WebElements    //span[contains(@class, "user") and span[contains(@class, "highlighted") and text()="noptix"]]
    ${num users found}=   Get Length    ${all users found}
    Should Be Equal As Numbers    ${num users found}    6
    Wait until element is visible    //a[contains(@href, "${viewer id}")]//span[contains(@class, "highlighted") and text()="noptix"]
    Click Link     //a[@id="${viewer id}"]
    #TODO:  figure out failure
    Wait until element is visible    //h2[contains(text(), "${users}[viewer]")]

Left menu search: Collapsable tabs
    [Tags]    C81771    webadmin    cloud    search
    Log in to system    ${system}    ${system}[owner]
    Validate Search Input

    Log    Step 1
    Search For    a
    Wait until elements are visible    ${SEARCH CLOSE BUTTON}    ${SEARCH ICON}

Left menu search: Placeholder
    [Tags]    C81772    webadmin    cloud    search
    Log in to system    ${system}    ${system}[owner]
    Search For    backup
    Wait until element is visible    ${SEARCH NOTHING FOUND}

Left menu search: Searchable fields
    [Tags]    C81796    webadmin    cloud    search
    Log in to system    ${system}    ${system}[owner]

    Log    Step 1
    Search For    en
    Wait until elements are visible
    ...    ${LICENSES LINK}
    ...    ${GENERAL LINK}

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
    Search For    ${users}[viewer]
    ${highlighted}=   Fetch From Right    ${users}[viewer]    ${TEST EMAIL}+
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and text()="${TEST EMAIL}"]/following-sibling::span[contains(@class, "highlighted") and text()="${highlighted}"]

    Log    Step 9
    Search For    ${system}[cont]
    Run keyword and continue on failure    Wait until element is visible    //span[contains(@class, "highlighted") and text()="${system}[cont]"]


# Disconnect System from Cloud
Disconnect dialog interface checks
    [Tags]    C48834    webadmin    cloud
    Log    Step 1
    Log in to system    ${system}    ${system}[owner]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form

    Log     Step 2
    Input Text    ${DISCONNECT PASSWORD INPUT}    ${base password}
    Click Element    ${DISCONNECT FORM CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FORM}
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}

    Log    Step 3
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form
    Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FORM}
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}

    Log    Step 4
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form
    Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    Wait Until Element Is Visible    ${PASSWORD IS REQUIRED}
    Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    border-color    ${ERROR COLOR}

    Log    Step 5
    Input Text    ${DISCONNECT PASSWORD INPUT}    khgwearfgak
    Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM WRONG PASSWORD}
    ${input class}=   Get Element Attribute    ${DISCONNECT PASSWORD INPUT}    class
    Should Contain    ${input class}    ng-invalid
    Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    color    ${ERROR COLOR WITH OPACITY}
    Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    border-color    ${ERROR COLOR}
    Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FORM}

Owner can disconnect System from Cloud
    [Tags]    C41883   C47020    webadmin    cloud
    ${local auth}=   Create List    admin    ${base password}

    Log    Step 1
    Log in to system    ${system}    ${system}[owner]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Validate Header Button Text    ${system}[name]    systems=False
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form

    Log    Step 2
    Slow    Input Text    ${DISCONNECT PASSWORD INPUT}    ${base password}    timeout=0.1
    Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    Run keyword and continue on failure    Check For Alert    ${SUCCESSFULLY DISCONNECTED}
    Run keyword if   '''${mode}''' == '''cloud'''    Wait Until Location Is    ${ENV}/systems
    Run keyword and continue on failure    Wait Until Element Is Not Visible    ${SYSTEMS TILE}//h2[text()="${system}[name]"]
    Validate Header Button Text    0
    Slow    Click Button    ${SYSTEMS DROPDOWN}    timeout=0.1
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
    Slow    Click Button    ${SYSTEMS DROPDOWN}    timeout=0.1
    Log Out

    Log     C47020: checking that system is disconnected from cloud on the server side
    Restart Server    http://${QA BURBANK IP}:${system}[port]    ${local auth}
    Sleep    10
    ${cloud system id}=   Get Cloud System Id    http://${QA BURBANK IP}:${system}[port]    ${local auth}
    Should Be Equal As Strings    ${cloud system id}    ${EMPTY}

    Log    Step 3
    ${viewer systems}=   Get Account Systems    ${ENV}    ${users}[viewer]    ${base password}
    Should Not Contain    ${viewer systems}    ${system}[id]

    Log In    ${users}[viewer]    ${base password}
    Wait Until Location Is    ${ENV}/systems
    Wait until element is visible    //span[contains(text(), "${YOU HAVE NO SYSTEMS TEXT}")]
    Validate Header Button Text    0
    Click Button    ${SYSTEMS DROPDOWN}
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
