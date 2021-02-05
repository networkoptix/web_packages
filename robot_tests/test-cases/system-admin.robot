*** Settings ***
Resource          ../resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        Common Restart Logout    ${ENV}
Test Teardown     System Admin Test Restart
Suite Teardown    System Admin Suite Teardown
Force Tags        system    threaded

*** Test Cases ***
# Misc
Should confirm, if not owner deletes system
    [Tags]    Threaded
    Log in to user and system    ${users}[viewer]    ${system}[id]
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Element Is Visible    ${DISCONNECT MODAL WARNING}
    Click Element    ${DISCONNECT MODAL WARNING}
    Sleep    .5
    Wait Until Element Is Visible    ${DISCONNECT MODAL CANCEL}
    Click Button    ${DISCONNECT MODAL CANCEL}
    Wait Until Page Does Not Contain Element    ${REMOVE USER MODAL}

Should open System page by link to not authorized user and redirect to homepage, if he does not log in
    [Tags]    Threaded
    Go To    ${ENV}/systems/${system}[id]
    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Wait Until Element Is Visible    ${JUMBOTRON}

Should open System page by link to not authorized user and show it, after owner logs in
    [Tags]    Threaded
    Go To    ${ENV}/systems/${system}[id]
    Log In    ${system}[owner]   ${base password}    button=None
    Verify In System    ${system}[name]

Should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    [Tags]    Threaded
    Log In    ${email noperm}    ${base password}
    Go To    ${ENV}/systems/${system}[id]
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

Should open System page by link not authorized user, and show alert if logs in and has no permission
    [Tags]    Threaded
    Go To    ${ENV}/systems/${system}[id]
    Log In    ${email noperm}    ${base password}    button=None
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

# Settings
User can rename System: change on cloud -> check server
    [Tags]    C41880
    Log in to user and system    ${system}[owner]    ${system}[id]
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
    Restart Server   https://${QABURBANK IP}:${system}[port]    ${cloud auth}
    Sleep    10
    ${settings}=   Get System Settings    ${cloud auth}    https://${QABURBANK IP}:${system}[port]
    FOR    ${s}    IN    @{settings}
        Run Keyword If    '''${s}[name]''' == '''systemName'''    Run Keywords
           ...   Should be equal as strings    ${new system name}    ${s}[value]   AND
           ...   Exit For Loop
    END

    Log    Get initial system name back
    Rename System    ${cloud auth}    ${system}[id]    ${system}[name]
    ${settings}=   Get Cloud System Settings    ${cloud auth}    ${system}[id]
    Should be equal as strings    ${settings}[name]    ${system}[name]

User can rename System: change on server side -> check cloud
    [Tags]    C47019    C30678
    Log    Rename System on server side and check it's changed on cloud
    Set System Name    https://${QABURBANK IP}:${system}[port]    ${cloud auth}    ${new system name}
    Restart Server   https://${QABURBANK IP}:${system}[port]    ${cloud auth}
    Sleep    20

    ${settings}=   Get Cloud System Settings    ${cloud auth}    ${system}[id]
    Should be equal as strings    ${settings}[name]    ${new system name}

    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Elements Are Visible
        ...    ${SYSTEMS DROPDOWN}
        ...    ${RENAME SYSTEM}
        ...    ${NO UNSAVED CHANGES}
    ${actual name}=   Get Text    ${SYSTEM NAME}
    Should be equal as strings    ${actual name}    ${new system name}
    Validate Header Button Text    ${new system name}    systems=False

    Log    Get initial system name back
    Rename System    ${cloud auth}    ${system}[id]    ${system}[name]
    ${settings}=   Get Cloud System Settings    ${cloud auth}    ${system}[id]
    Should be equal as strings    ${settings}[name]    ${system}[name]

# System Settings for different users
Correct items are shown for owner
    [Tags]    C41560    Threaded
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${expected name}=   Replace String    ${OWNER NAME}    %OWNER_NAME%    ${YOU TEXT}
    Wait Until Elements Are Visible
        ...    ${SYSTEMS DROPDOWN}
        ...    ${RENAME SYSTEM}
        ...    ${DISCONNECT FROM NX}
        ...    ${expected name}
        ...    ${MERGE BUTTON SYSTEM}
        ...    ${LICENSES LINK}
        ...    ${CAMERAS LINK}
        ...    ${USERS LINK}
        ...    ${SERVERS LINK}
        ...    ${SYSTEM SETTINGS FORM}
        ...    ${SECURITY FORM}
    Validate Header Button Text    ${system}[name]    systems=False
    Run keyword and continue on failure    Title Should Be    ${system}[name] - ${PRODUCT NAME}
    Go To Users List
    Wait Until Elements Are Visible    ${USERS LIST}    ${ADD USER BUTTON SYSTEMS}

Correct items are shown for admin
    [Tags]    C41561    Threaded
    Log in to user and system    ${users}[cloudAdmin]    ${system}[id]
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
        ...    ${SYSTEM SETTINGS FORM}
        ...    ${SECURITY FORM}
    Wait Until Elements Are Not Visible    ${DISCONNECT FROM NX}    ${MERGE BUTTON SYSTEM}
    Validate Header Button Text    ${system}[name]    systems=False
    Go To Users List
    Wait Until Elements are Visible    ${USERS LIST}    ${ADD USER BUTTON SYSTEMS}

Correct items are shown for advanced viewer and below
    [Tags]    C41562    Threaded
    ${viewers}=    Create List    ${users}[advancedViewer]    ${users}[viewer]     ${users}[liveViewer]     ${users}[custom]
    ${viewers text}=   Create List    ${ADV VIEWER TEXT}    ${VIEWER TEXT}     ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}
    ${current owner name}=   Replace String    ${OWNER NAME}    %OWNER_NAME%    System Owner
    FOR    ${user}    ${text}    IN ZIP    ${viewers}    ${viewers text}
        Log in to user and system    ${user}    ${system}[id]
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
            ...    ${CAMERAS LINK}
            ...    ${USERS LINK}
            ...    ${SERVERS LINK}
        Element Should Be Enabled    ${DISCONNECT FROM MY ACCOUNT}
        Log Out
    END

# Disconnect System from Cloud
Disconnect dialog interface checks
    [Tags]    C48834
    Log    Step 1
    Log in to user and system    ${system}[owner]    ${system}[id]
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

Owner can disconnect System from Cloud
    [Tags]    C41883   C47020
    ${local auth}=   Create List    admin    ${base password}

    Log    Step 1
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Element Is Visible    ${DISCONNECT FROM NX}
    Validate Header Button Text    ${system}[name]    systems=False
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form

    Log    Step 2
    Slow    Input Text    ${DISCONNECT PASSWORD INPUT}    ${base password}    timeout=0.1
    Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    Run keyword and continue on failure    Check For Alert    ${SUCCESSFULLY DISCONNECTED}
    Run keyword and continue on failure    Wait Until Location Is    ${ENV}/systems
    Run keyword and continue on failure    Wait Until Element Is Not Visible    ${SYSTEMS TILE}//h2[text()="${system}[name]"]
    Validate Header Button Text    0
    Slow    Click Button    ${SYSTEMS DROPDOWN}    timeout=0.1
    Wait until element is not visible    ${DROPDOWN SYSTEMS GRID}
    Slow    Click Button    ${SYSTEMS DROPDOWN}    timeout=0.1
    Log Out

    Log     C47020: checking that system is disconnected from cloud on the server side
    Restart Server    https://${QA BURBANK IP}:${system}[port]    ${local auth}
    Sleep    10
    ${cloud system id}=   Get Cloud System Id    https://${QA BURBANK IP}:${system}[port]    ${local auth}
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
