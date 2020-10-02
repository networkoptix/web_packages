*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
Test Teardown     Run Keyword If Test Failed    Reset DB and Open New Browser On Failure
Suite Teardown    Close All Browsers
Force Tags        system

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
@{cloud auth}    ${EMAIL OWNER}    ${BASE PASSWORD}
${url}         ${ENV}

*** Keywords ***
Restart
    Common Restart Logout    ${url}
    
Reset DB and Open New Browser On Failure
    Close Browser
    Reset System Names
    ${cloud system id}=   Connect system to cloud if not    ${AUTO SYS AUTH}    ${AUTO SYS IP}    ${AUTO TESTS}    ${EMAIL OWNER}    ${BASE PASSWORD}
    FOR    ${user email}   ${user role}    IN ZIP   ${AUTO TESTS USERS.keys()}     ${AUTO TESTS USERS.values()}
        Add user to cloud system if not there    ${cloud system id}    ${user role}    ${user email}
    END
    Open Browser and go to URL    ${url}
    
*** Test Cases ***
Systems dropdown should allow you to go back to the systems page
    [Tags]    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Button    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${ALL SYSTEMS}
    Click Link    ${ALL SYSTEMS}
    Location Should Be    ${url}/systems
    Run keyword and continue on failure    Title Should Be    ${SYSTEMS TITLE TEXT} - ${PRODUCT_NAME}

Should confirm, if not owner deletes system (You will lose access to this system)
    [Tags]    Threaded
    Log In To Auto Tests System    ${EMAIL NOT OWNER}
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Click Button    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Element Is Visible    ${DISCONNECT MODAL WARNING}
    Click Element    ${DISCONNECT MODAL WARNING}
    Sleep    .5
    Wait Until Element Is Visible    ${DISCONNECT MODAL CANCEL}
    Click Button    ${DISCONNECT MODAL CANCEL}
    Wait Until Page Does Not Contain Element    ${REMOVE USER MODAL}

Correct items are shown for owner
    [Tags]    C41560    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    ${YOU TEXT}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}    ${current owner name}    ${MERGE BUTTON SYSTEM}
    Go To Users List
    Wait Until Elements are Visible    ${USERS LIST}    ${ADD USER BUTTON SYSTEMS}

Correct items are shown for admin
    [Tags]    C41561    Threaded
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM MY ACCOUNT}    ${OWNER LABEL}    ${current owner name}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${ADMIN TEXT}')]
    Go To Users List
    Wait Until Elements are Visible    ${USERS LIST}    ${ADD USER BUTTON SYSTEMS}

Correct items are shown for advanced viewer and below
    [Tags]    C41562    Threaded
    ${users}         Set Variable    ${EMAIL ADVVIEWER}    ${EMAIL VIEWER}    ${EMAIL LIVEVIEWER}    ${EMAIL CUSTOM}
    ${users text}    Set Variable    ${ADV VIEWER TEXT}    ${VIEWER TEXT}     ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    FOR    ${user}  ${text}  IN ZIP  ${users}  ${users text}
        Log in to Auto Tests System    ${user}
        Wait Until Elements Are Visible    ${current owner name}    ${OWNER LABEL}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),'${text}')]
        Element Should Be Enabled    ${DISCONNECT FROM MY ACCOUNT}
        Element Should Not Be Visible    ${RENAME SYSTEM}
        Element Should Not Be Visible    ${ADD USER BUTTON SYSTEMS}
        Log Out
    END

Rename button opens dialog and clicking cancel closes rename dialog without rename
    [Tags]    C41880    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${RENAME SYSTEM}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}
    Click Button    ${RENAME CANCEL}
    Wait Until Page Does Not Contain Element    //div[@uib-modal-backdrop="modal-backdrop"]
    Verify In System    ${AUTO TESTS}

Clicking 'X' closes rename dialog without rename
    [Tags]    C41880    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${RENAME SYSTEM}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME X BUTTON}
    Wait Until Textfield Contains    ${RENAME INPUT}    ${AUTO TESTS}
    Click Button    ${RENAME X BUTTON}
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Verify In System    ${AUTO TESTS}

Clicking save with no input in rename dialog throws error
    [Tags]    C41880    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME INPUT}
    sleep    2
    Input Text    ${RENAME INPUT}    ${SPACE}
    Press Keys    ${RENAME INPUT}    BACKSPACE
    Click Button    ${RENAME SAVE}
    Wait Until Elements Are Visible    ${RENAME INPUT WITH ERROR}    ${SYSTEM NAME IS REQUIRED}
    Click Button    ${RENAME CANCEL}

Clicking save in rename dialog renames system
    [Tags]    C41880    C30652
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME INPUT}
    Clear Element Text    ${RENAME INPUT}
    Input Text    ${RENAME INPUT}    Auto Tests Rename
    Click Button    ${RENAME SAVE}
    Check For Alert    ${SYSTEM NAME SAVED}
    Verify In System    Auto Tests Rename

    ${settings}=   Get Cloud System Settings    ${auth}    ${AUTO TESTS SYSTEM ID}
    Should be equal as strings    ${settings}[name]    Auto Tests Rename

    Rename System    ${auth}    ${AUTO TESTS SYSTEM ID}   ${AUTO TESTS}
    ${settings}=   Get Cloud System Settings    ${auth}    ${AUTO TESTS SYSTEM ID}
    Should be equal as strings    ${settings}[name]    ${AUTO TESTS}

System name on cloud is displayed correctly after it's changed in client
    [Tags]    C30678
    Rename System    ${auth}    ${AUTO TESTS SYSTEM ID}   Auto Tests Rename
    # Check that chnaged correctly via API
    ${local name}=   Get Local System Name    ${AUTO SYS IP}    ${AUTO SYS AUTH}
    Should be equal as strings    ${local name}    Auto Tests Rename
    ${settings}=   Get Cloud System Settings    ${auth}    ${AUTO TESTS SYSTEM ID}
    Should be equal as strings    ${settings}[name]    Auto Tests Rename

    # Check that changed correctly in UI
    Log in to Auto Tests System    ${EMAIL OWNER}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Verify In System    ${AUTO TESTS}

    # Get the initial name back
    Rename System    ${auth}    ${AUTO TESTS SYSTEM ID}   ${AUTO TESTS}
    ${settings}=   Get Cloud System Settings    ${auth}    ${AUTO TESTS SYSTEM ID}
    Should be equal as strings    ${settings}[name]    ${AUTO TESTS}

Should open System page by link to not authorized user and redirect to homepage, if he does not log in
    [Tags]    Threaded
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Wait Until Element Is Visible    ${JUMBOTRON}

Should open System page by link to not authorized user and show it, after owner logs in
    [Tags]    Threaded
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}   ${password}    button=None
    Verify In System    ${AUTO TESTS}

Should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    [Tags]    Threaded
    Log In    ${EMAIL NOPERM}    ${password}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

Should open System page by link not authorized user, and show alert if logs in and has no permission
    [Tags]    Threaded
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL NOPERM}    ${password}    button=None
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

Should show (your system) for owner and (owner's name) for non-owners
    [Tags]    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    ${YOU TEXT}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}    ${current owner name}
    FOR    ${user}    IN    @{EMAILS LIST}
        Run Keyword Unless    "${user}"=="${EMAIL OWNER}"    Check System Text    ${user}
    END

Should open a system page in anonymous state
    [Tags]    anonymous
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Location should be    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element Is Visible    ${LOG IN MODAL}
    Check Log In    button=None
             
Disconnect dialog interface checks
    [Tags]    C48834
    Log    Step 1
    Log in to Auto Tests System    ${EMAIL OWNER}
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form

    Log     Step 2
    Input Text    ${DISCONNECT PASSWORD INPUT}    ${password}
    Click Element    ${DISCONNECT FORM CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FORM}
    Reload Page
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}

    Log    Step 3
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form
    Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${DISCONNECT FORM}
    Reload Page
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}

    Log    Step 4
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form
    Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    Wait Until Element Is Visible    ${PASSWORD IS REQUIRED}

    Log    Step 5
    Input Text    ${DISCONNECT PASSWORD INPUT}    khgwearfgak
    Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM WRONG PASSWORD}
    ${input class}=   Get Element Attribute    ${DISCONNECT PASSWORD INPUT}    class
    Should Contain    ${input class}    ng-invalid
    Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    color    rgba(240, 44, 44, 1)
    Wait Until Element Has Style    ${DISCONNECT PASSWORD INPUT}    border-color    rgb(240, 44, 44)

Owner can disconnect System from Cloud
    [Tags]    C41883   C47020
    Log    Step 1
    Log in to Auto Tests System    ${EMAIL OWNER}
    ${old cloud system id}=   Get Cloud System Id    ${AUTO SYS IP}    ${AUTO SYS AUTH}
    Click Button    ${DISCONNECT FROM NX}
    Validate Disconnect Form

    Log    Step 2
    Input Text    ${DISCONNECT PASSWORD INPUT}    ${password}
    Click Element    ${DISCONNECT FORM DISCONNECT BUTTON}
    Run keyword and continue on failure    Check For Alert    ${SUCCESSFULLY DISCONNECTED}
    Run keyword and continue on failure    Wait Until Location Is    ${ENV}/systems
    Run keyword and continue on failure    Wait Until Element Is Not Visible    ${SYSTEMS TILE}//h2[text()="${AUTO TESTS}"]

    # Restarting the server is to let it know the cloud system is unbound
    Restart Server    ${AUTO SYS IP}    ${AUTO SYS AUTH}
    Sleep    30

    Log     C47020: checking that system is disconnected from cloud on the server side
    ${cloud system id}=   Get Cloud System Id    ${AUTO SYS IP}    ${AUTO SYS AUTH}
    Should Be Equal As Strings    ${cloud system id}    ${EMPTY}

    Log    Step 3
    FOR    ${user}    IN    @{EMAILS LIST}
        @{user systems}=   Get Account Systems    ${ENV}    ${user}    ${password}
        Should Not Contain    ${user systems}    ${old cloud system id}
    END

    Log    Test teardown: get system and system users back to cloud
    @{custom roles}=    Get User Roles    ${AUTO SYS IP}    ${AUTO SYS AUTH}
    ${cloud system id}=   Connect system to cloud    ${AUTO SYS AUTH}   ${AUTO SYS IP}    ${AUTO TESTS}    ${EMAIL OWNER}    ${password}
    FOR    ${user email}   ${user role}    IN ZIP   ${Auto Tests users.keys()}     ${Auto Tests users.values()}
        Share    ${cloud auth}   ${cloud system id}    ${user role}    ${user email}
    END
    FOR    ${role}    IN    @{custom roles}
        &{custom cameras}=   Set Variable If    '''${role["name"]}'''=='''Custom Cameras'''    &{role}
        Exit For Loop If    '''${role["name"]}'''=='''Custom Cameras'''
    END
    FOR    ${role}    IN    @{custom roles}
        &{custom cameras limited}=   Set Variable If    '''${role["name"]}'''=='''Custom Cameras Limited'''    ${role}
        Exit For Loop If    '''${role["name"]}'''=='''Custom Cameras Limited'''
    END
    FOR    ${role}    IN    @{custom roles}
        &{client custom}=   Set Variable If    '''${role["name"]}'''=='''Client Custom'''    ${role}
        Exit For Loop If    '''${role["name"]}'''=='''Client Custom'''
    END
    Save User Existing
    ...    ${AUTO SYS AUTH}    
    ...    ${AUTO SYS IP}    
    ...    ${EMAIL CUSTOM CAMERAS}
    ...    ${custom cameras["permissions"]}  
    ...    ${EMAIL CUSTOM CAMERAS}    
    ...    ${custom cameras["id"]} 

    Save User Existing
    ...    ${AUTO SYS AUTH}    
    ...    ${AUTO SYS IP}    
    ...    ${EMAIL CUSTOM CAMERAS LIMITED}   
    ...    ${custom cameras limited["permissions"]}    
    ...    ${EMAIL CUSTOM CAMERAS LIMITED}    
    ...    ${custom cameras limited["id"]}

    Save User Existing 
    ...    ${AUTO SYS AUTH}    
    ...    ${AUTO SYS IP}    
    ...    ${EMAIL CLIENT CUSTOM}   
    ...    ${client custom["permissions"]}
    ...    ${EMAIL CLIENT CUSTOM}    
    ...    ${client custom["id"]}
