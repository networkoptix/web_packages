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
@{checkboxes}
...    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}
...    ${SEND ANONYMOUS USAGE CHECKBOX REAL}
...    ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}
...    ${ENABLE AUDIT TRAIL CHECKBOX REAL}
...    ${ALLOW ONLY SECURE CHECKBOX REAL}
...    ${LIMIT SESSION DURATION CHECKBOX REAL}

*** Keywords ***
Restart
    Common Restart Logout    ${url}
    
Reset DB and Open New Browser On Failure
    Close Browser
    Reset System Names
    ${cloud system id}=   Connect system to cloud if not    ${AUTO SYS AUTH}    ${AUTO SYS IP}    7001    ${AUTO TESTS}    ${EMAIL OWNER}    ${BASE PASSWORD}
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
    Validate Log In
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
    [Tags]    C41880
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME INPUT}
    Clear Element Text    ${RENAME INPUT}
    Input Text    ${RENAME INPUT}    Auto Tests Rename
    Click Button    ${RENAME SAVE}
    Check For Alert    ${SYSTEM NAME SAVED}
    Verify In System    Auto Tests Rename

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
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    you
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

Should show system settings and security settings and they should match settings on server
    [Tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible
    ...    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}
    ...    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
    ...    ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}
    ...    ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}
    ...    ${ALLOW ONLY SECURE CHECKBOX VISIBLE}
    ...    ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}
    ...    ${LIMIT SESSION DURATION CHECKBOX VISIBLE}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Text Should Be    //label[@for="autoDiscoveryEnabled"]//span    ${ENABLE AUTO DISCOVERY TEXT}
    Element Text Should Be    //label[@id="autoDiscoveryEnabledHelpBlock"]    ${ENABLE AUTO DISCOVERY DESCRIPTION TEXT}
    Element Text Should Be    //label[@for="statisticsAllowed"]//span    ${SEND ANONYMOUS USAGE TEXT}
    Element Text Should Be    //label[@id="statisticsAllowedHelpBlock"]    ${SEND ANONYMOUS USAGE DESCRIPTION TEXT}
    Element Text Should Be    //label[@for="cameraSettingsOptimization"]//span    ${ALLOW SYSTEM OPTIMIZE TEXT}

    Element Text Should Be    //label[@for="auditTrailEnabled"]//span    ${ENABLE AUDIT TRAIL TEXT}
    Element Text Should Be    //label[@id="auditTrailEnabledHelpBlock"]    ${ENABLE AUDIT TRAIL DESCRIPTION TEXT}
    Element Text Should Be    //label[@for="trafficEncryptionForced"]//span    ${ALLOW ONLY SECURE TEXT}
    Element Text Should Be    //label[@for="videoTrafficEncryptionForced"]//span    ${ENCRYPT VIDEO TRAFFIC TEXT}
    Element Text Should Be    //label[@id="videoTrafficEncryptionForcedHelpBlock"]    ${ENCRYPT VIDEO TRAFFIC DESCRIPTION TEXT}
    Element Text Should Be    //label[@for="sessionLimitMinutes"]//span    ${LIMIT SESSION DURATION TEXT}

    Settings on page should match settings on server

Changing the Setting "Enable auto discovery of cameras and servers" changes it on the server
    [Tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    autoDiscoveryEnabled

Changing the Setting "Send anonymous usage and crash statistics to developers" changes it on the server
    [Tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    statisticsAllowed

Changing the Setting "Allow system to optimize camera settings" changes it on the server
    [Tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    cameraSettingsOptimization

Changing the Setting "Enable audit trail" changes it on the server
    [Tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ENABLE AUDIT TRAIL CHECKBOX REAL}     auditTrailEnabled

Changing the Setting "Allow only secure connections" changes it on the server
    [Tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ALLOW ONLY SECURE CHECKBOX REAL}     trafficEncryptionForced

Changing the Setting "Encrypt video traffic" changes it on the server
    [Tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    ${selected}=   Change Setting Encrypt video traffic
    Evaluate Auto System Settings via API     videoTrafficEncryptionForced    ${selected}

Changing the Setting "Limit session duration to" changes it on the server
    [Tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Change Setting and Save    ${LIMIT SESSION DURATION CHECKBOX REAL}
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${LIMIT SESSION DURATION CHECKBOX REAL}
    Run Keyword If    ${status}==False    Evaluate Auto System Settings via API    sessionLimitMinutes    0
    ...    ELSE     Evaluate Session Limit

Change Time Interval And Verify on Server
    [Tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible
    ...    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}
    ...    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${LIMIT SESSION DURATION CHECKBOX REAL}
    Run Keyword If    ${status}==False    Just Change Setting    ${LIMIT SESSION DURATION CHECKBOX REAL}
    Change Duration Time Interval    ${SYSTEM SAVE}
    Evaluate Session Limit
    Reload Page
    Wait Until Elements Are Visible
    ...    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}
    ...    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
    Change Duration Time Interval    ${SYSTEM SAVE}
    Evaluate Session Limit

Changing Several Random Checkboxes Works
    [Tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible
    ...    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}
    ...    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Changing Several Settings at Random    ${SYSTEM SAVE}
    Changing Several Settings at Random    ${SYSTEM CANCEL}

Changing All Checkboxes Works
    [Tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible
    ...    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}
    ...    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Changing All Settings    ${SYSTEM SAVE}
    Changing All Settings    ${SYSTEM CANCEL}

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
    ${cloud system id}=   Connect system to cloud    ${AUTO SYS AUTH}   ${AUTO SYS IP}    ${AUTO TESTS}    ${EMAIL OWNER}    ${password}
    FOR    ${user email}   ${user role}    IN ZIP   ${Auto Tests users.keys()}     ${Auto Tests users.values()}
        Share    ${cloud auth}   ${cloud system id}    ${user role}    ${user email}
    END
    
The page is opened and shows the user list to owner
    [Tags]    C41881    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Location Should Be    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    # Title Should Be    Systems - ${PRODUCT_NAME}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${USERS LIST}

Should confirm, if owner deletes system (You are going to disconnect your system from cloud)
    [Tags]    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM HEADER}    ${DISCONNECT FORM CANCEL BUTTON}
    Click Element    ${DISCONNECT FORM}
    Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    Wait Until Page Does Not Contain Element    ${BACKDROP}

Offline system should confirm, if not owner deletes system (You will lose access to this system)
    [Tags]    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM HEADER}    ${DISCONNECT FORM CANCEL BUTTON}
    Click Element    ${DISCONNECT FORM}
    Click Button    ${DISCONNECT FORM CANCEL BUTTON}
    Wait Until Page Does Not Contain Element    ${REMOVE USER MODAL}

Share button should be disabled
    [Tags]    C41881    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Page Does Not Contain Element    //div[contains(@uib-modal-backdrop, "modal-backdrop")]
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    Wait Until Element Is Visible    ${ADD USER BUTTON SYSTEMS}${DISABLED}

Open in nx button should be disabled
    [Tags]    C41881    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${OPEN IN NX BUTTON}${DISABLED}
    Log Out
    Log in to Autotests 2 System    ${EMAIL VIEWER}
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Element    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${OPEN IN NX BUTTON}${DISABLED}

Should show offline next to system name
    [Tags]    C41881    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}
    Log Out
    Log in to Autotests 2 System    ${EMAIL VIEWER}
    Wait Until Element Is Visible    ${SYSTEM NAME OFFLINE}

Should not be able to delete/edit users
    [Tags]    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    ${USERS LIST LINK}
    Click Link    ${USERS LIST LINK}
    ${User In List}=   Set Variable    ${USERS LIST}//nx-level-3-item//span[text()='${EMAIL VIEWER}']/../../../a
    Wait Until Element Is Visible    ${User In List}
    Click Link    ${User In List}
    Wait Until Elements Are Visible    ${ACCESS LEVEL DROPDOWN}${DISABLED}    ${REMOVE USER BUTTON}${DISABLED}

Offline system should open System page by link to not authorized user and redirect to homepage, if he does not log in
    [Tags]    Threaded    System-offline
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Wait Until Element Is Visible    ${JUMBOTRON}

Offline system should open System page by link to not authorized user and show it, after owner logs in
    [Tags]    Threaded    System-offline
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Log In    ${EMAIL OWNER}   ${password}    button=None
    Verify In System    Auto Tests 2

Offline system should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    [Tags]    C41572    Threaded    System-offline
    Log In    ${EMAIL NOPERM}    ${password}
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Wait Until Elements Are Visible    ${SYSTEM NO ACCESS}    ${AVAILABLE SYSTEMS LIST}
    Click Link    ${AVAILABLE SYSTEMS LIST}
    # If there is another system connected to account url is different from ${url}/systems
    ${actual url}=   Get Location
    Should not Contain    ${actual url}    ${AUTOTESTS OFFLINE SYSTEM ID}
    # Location Should Be    ${url}/systems

Offline system should open System page by link not authorized user, and show alert if logs in and has no permission
    [Tags]    Threaded    System-offline
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Log In    ${EMAIL NOPERM}   ${password}    button=None
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

Offline system rename button opens dialog and clicking cancel closes rename dialog without rename
    [Tags]    C41880    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Open Rename System Dialog
    Click Button    ${RENAME CANCEL}
    Wait Until Page Does Not Contain Element    //div[@uib-modal-backdrop="modal-backdrop"]
    Verify In System    Auto Tests 2

Offline system clicking 'X' closes rename dialog without rename
    [Tags]    C41880    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Open Rename System Dialog
    Wait Until Textfield Contains    ${RENAME INPUT}    ${AUTO TESTS 2}
    Click Button    ${RENAME X BUTTON}
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Verify In System    Auto Tests 2

Offline system clicking save with no input in rename dialog throws error
    [Tags]    C41880    Threaded    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    Open Rename System Dialog
    Input Text    ${RENAME INPUT}    ${SPACE}
    Press Keys    ${RENAME INPUT}    BACKSPACE
    Click Button    ${RENAME SAVE}
    Wait Until Elements Are Visible    ${RENAME INPUT WITH ERROR}    ${SYSTEM NAME IS REQUIRED}
    Click Button    ${RENAME CANCEL}

Owner is able to rename offline system via Cloud
    [Tags]    C41889    System-offline
    Log in to Autotests 2 System    ${EMAIL OWNER}
    ${current name}=   Get text    ${SYSTEM NAME}
    ${new name}=   Get random system name
    Open Rename System Dialog
    Input Text    ${RENAME INPUT}    ${new name}
    Click button    ${RENAME SAVE}
    Log Out

    # Make sure new name is saved
    ${system info}=   Get Cloud System Settings    ${auth}    ${AUTOTESTS OFFLINE SYSTEM ID}
    Should be equal as strings    ${system info}[name]     ${new name}

    # Return to initial name
    Rename System    ${auth}    ${AUTOTESTS OFFLINE SYSTEM ID}    ${current name}

    # Make sure old name is saved
    ${system info}=   Get Cloud System Settings    ${auth}    ${AUTOTESTS OFFLINE SYSTEM ID}
    Should be equal as strings    ${system info}[name]     ${current name}

Does not show Share button to viewer, advanced viewer, live viewer
    [Tags]    Threaded    System-offline
    @{emails}    Set Variable    ${EMAIL VIEWER}    ${EMAIL LIVE VIEWER}    ${EMAIL ADV VIEWER}
    FOR    ${user}    IN    @{emails}
        Log in to Autotests 2 System    ${user}
        Elements Should Not Be Visible    ${USERS LIST LINK}    ${ADD USER BUTTON SYSTEMS}
        Log Out
    END

Your permissions is shown for non-owners
    [Tags]    Threaded    C41881    System-offline
    ${users}         Set Variable    ${EMAIL ADVVIEWER}    ${EMAIL VIEWER}    ${EMAIL LIVEVIEWER}    ${EMAIL CUSTOM}    ${EMAIL ADMIN}
    ${users text}    Set Variable    ${ADV VIEWER TEXT}    ${VIEWER TEXT}     ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}     ${ADMIN TEXT}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    FOR    ${user}  ${text}  IN ZIP  ${users}  ${users text}
        Log in to Auto Tests 2 System    ${user}
        Wait Until Elements Are Visible    ${current owner name}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}    ${YOUR ACCESS LEVEL}/following-sibling::span[contains(text(),"${text}")]
        Log Out
    END

Should show (you) for owner and (owner's name & email) for non-owners
    [Tags]    C41881    Threaded    System-offline
    Log in to AutoTests 2 System    ${EMAIL OWNER}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    ${YOU TEXT}
    Wait Until Element Is Visible    ${current owner name}
    Log Out
    Log in to Autotests 2 System    ${EMAIL VIEWER}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    Wait Until Elements Are Visible    ${current owner name}    ${OWNER EMAIL}

