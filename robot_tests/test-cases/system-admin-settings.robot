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
${4.0 system}    http://10.1.5.126:7014
${3.2 system}    http://10.1.5.113:7001

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
Should show system settings and security settings and they should match settings on server
    [Tags]    system settings    threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until System Settings Are Visible
    Wait Until Security Settings Are Visible
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

Changing the Setting 'Enable auto discovery of cameras and servers' changes it on the server
    [Tags]    system settings    threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    autoDiscoveryEnabled

Changing the Setting 'Send anonymous usage and crash statistics to developers' changes it on the server
    [Tags]    system settings    threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    statisticsAllowed

Changing the Setting 'Allow system to optimize camera settings' changes it on the server
    [Tags]    system settings    threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    cameraSettingsOptimization

Changing the Setting 'Enable audit trail' changes it on the server
    [Tags]    system settings    threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ENABLE AUDIT TRAIL CHECKBOX REAL}     auditTrailEnabled

Changing the Setting 'Allow only secure connections' changes it on the server
    [Tags]    system settings    threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ALLOW ONLY SECURE CHECKBOX REAL}     trafficEncryptionForced

Changing the Setting 'Encrypt video traffic' changes it on the server
    [Tags]    system settings    threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    ${selected}=   Change Setting Encrypt video traffic
    Evaluate System Settings via API     videoTrafficEncryptionForced    ${selected}

Changing the Setting 'Limit session duration to' changes it on the server
    [Tags]    system settings    threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Change Setting and Save    ${LIMIT SESSION DURATION CHECKBOX REAL}
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${LIMIT SESSION DURATION CHECKBOX REAL}
    Run Keyword If    ${status}==False    Evaluate System Settings via API    sessionLimitMinutes    0
    ...    ELSE     Evaluate Session Limit

Change Time Interval And Verify on Server
    [Tags]    system settings    C65722    threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until System Settings Are Visible
    Wait Until Security Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${LIMIT SESSION DURATION CHECKBOX REAL}
    Run Keyword If    ${status}==False    Change Setting Without Saving    ${LIMIT SESSION DURATION CHECKBOX REAL}
    Change Duration Time Interval    ${SYSTEM SAVE}
    Evaluate Session Limit
    Reload Page
    Wait Until System Settings Are Visible
    Wait Until Security Settings Are Visible
    Change Duration Time Interval    ${SYSTEM SAVE}
    Evaluate Session Limit

Changing Several Random Checkboxes Works
    [Tags]    system settings    threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until System Settings Are Visible
    Wait Until Security Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Changing Several Settings at Random    ${SYSTEM SAVE}
    Changing Several Settings at Random    ${SYSTEM CANCEL}
    
Systems Settings Block is Available for Administrator or Owner
    [Tags]    C69736    system settings    threaded
    Log    Preconditions
    Set System Settings via API    autoDiscoveryEnabled    true
    Set System Settings via API    statisticsAllowed    true
    Set System Settings via API    cameraSettingsOptimization    true
    Log    Step 1
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until System Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    Log    Step 2
    Log Out
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Wait Until System Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    
System Settings block is not available for other users
    [Tags]    C69737    system settings     threaded
    @{users} =    Create List    ${EMAIL VIEWER}    ${EMAIL ADV VIEWER}    ${EMAIL LIVE VIEWER}    ${EMAIL CUSTOM} 
    Log    The following loop will go thru all users tested in testrail one at a time   
    FOR    ${user}    IN    @{users}
        Log in to Auto Tests System    ${user}
        Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
        Elements Should Not Be Visible
        ...    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}
        ...    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
        ...    ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}
        Log Out
    END
    
Cancel changes in System Settings block
    [Tags]    C69738    system settings    threaded
    Log    Preconditions
    Set System Settings via API    autoDiscoveryEnabled    true   
    Set System Settings via API    statisticsAllowed    true
    Set System Settings via API    cameraSettingsOptimization    true
    Log    Step 1
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until System Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    Change Setting Without Saving    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Log    Step 2
    Click Button    ${SYSTEM CANCEL}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Log    Step 3
    Change Setting Without Saving    ${SEND ANONYMOUS USAGE CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Log    Step 4
    Click Button    ${SYSTEM CANCEL}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    
Moving to a different page after making changes in System Settings without saving them first
    [Tags]    C69739    system settings    threaded
    Log    Preconditions
    Set System Settings via API    autoDiscoveryEnabled    true
    Set System Settings via API    statisticsAllowed    true
    Set System Settings via API    cameraSettingsOptimization    true
    Log    Step 1    
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until System Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    Change Setting Without Saving    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}
    Change Setting Without Saving    ${SEND ANONYMOUS USAGE CHECKBOX REAL}
    Change Setting Without Saving    ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Log    Step 2
    Click Link    ${HM INFORMATION TAB LINK}
    Wait Until Elements Are Visible
    ...    ${APPLY CHANGES QUESTION}
    ...    ${APPLY CHANGES BUTTON}  
    ...    ${DISCARD CHANGES BUTTON}
    ...    ${CANCEL CHANGES BUTTON}
    Log    Step 3
    Click Button    ${DISCARD CHANGES BUTTON}
    Wait Until Element is Not Visible    ${APPLY CHANGES QUESTION}
    Wait Until Location is    ${url}/systems/${AUTO TESTS SYSTEM ID}/health/alerts
    Log    Step 4
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until System Settings Are Visible
    Change Setting Without Saving    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}
    Change Setting Without Saving    ${SEND ANONYMOUS USAGE CHECKBOX REAL}
    Change Setting Without Saving    ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Link    ${HM INFORMATION TAB LINK}
    Wait Until Elements Are Visible
    ...    ${APPLY CHANGES QUESTION}
    ...    ${APPLY CHANGES BUTTON}  
    ...    ${DISCARD CHANGES BUTTON}
    ...    ${CANCEL CHANGES BUTTON}
    Log    Step 5
    Click Button    ${CANCEL CHANGES BUTTON}
    Wait Until Element is Not Visible    ${APPLY CHANGES QUESTION}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick unchecked
    Log    Step 6
    Click Link    ${HM INFORMATION TAB LINK}
    Wait Until Elements Are Visible
    ...    ${APPLY CHANGES QUESTION}
    ...    ${APPLY CHANGES BUTTON}  
    ...    ${DISCARD CHANGES BUTTON}
    ...    ${CANCEL CHANGES BUTTON}
    ...    ${APPLY CHANGES CLOSE BUTTON} 
    Log    Step 7
    Click Button    ${APPLY CHANGES CLOSE BUTTON}
    Wait Until Element is Not Visible    ${APPLY CHANGES QUESTION}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick unchecked
    Log    Step 8
    Reload Page
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked

Changing All Checkboxes Works
    [Tags]    system settings    C65722    threaded
    Log    Testrail: Changes in the security block are displayed in the thick client
    Log    Testrail: Changes in the System Settings block are displayed in the thick client
    Log    Preconditions
    Set System Settings via API    autoDiscoveryEnabled    true
    Set System Settings via API    statisticsAllowed    true
    Set System Settings via API    cameraSettingsOptimization    true
    Set System Settings via API    auditTrailEnabled    true
    Set System Settings via API    trafficEncryptionForced    false
    Set System Settings via API    videoTrafficEncryptionForced    false
    Set System Settings via API    sessionLimitMinutes    0
    Log    Steps 1 - 8
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Changing All Settings    ${SYSTEM SAVE}
    Changing All Settings    ${SYSTEM CANCEL}
    Changing All Settings    ${SYSTEM SAVE}
    
Changes made in the thick client are displayed in System Settings block in Cloud Portal
    [Tags]    C69741    system settings    threaded
    Log    Preconditions
    Set System Settings via API    autoDiscoveryEnabled    true
    Set System Settings via API    statisticsAllowed    true
    Set System Settings via API    cameraSettingsOptimization    true
    
    Log    Step 1
    Set System Settings via API    autoDiscoveryEnabled    false
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    
    Log    Step 2
    Set System Settings via API    autoDiscoveryEnabled    true
    Reload Page
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    
    Log    Step 3
    Set System Settings via API    statisticsAllowed    false
    Reload Page
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick unchecked
    
    Log    Step 4
    Set System Settings via API    statisticsAllowed    true
    Reload Page
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    
    Log    Step 5
    Set System Settings via API    cameraSettingsOptimization    false
    Reload Page
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick unchecked 
    
    Log    Step 6
    Set System Settings via API    cameraSettingsOptimization    true
    Reload Page
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked   
    
    Log    Step 7
    Set System Settings via API    autoDiscoveryEnabled    false
    Set System Settings via API    statisticsAllowed    false
    Set System Settings via API    cameraSettingsOptimization    false
    Reload Page
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick unchecked

    Log    Step 8
    Set System Settings via API    autoDiscoveryEnabled    true
    Set System Settings via API    statisticsAllowed    true
    Set System Settings via API    cameraSettingsOptimization    true
    Reload Page
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked

Checking the dependency of system settings checkboxes
    [Tags]    C69742    system settings    threaded
    Log    Preconditions
    Set System Settings via API    autoDiscoveryEnabled    true
    Set System Settings via API    statisticsAllowed    true
    Set System Settings via API    cameraSettingsOptimization    true
    Log    Step 1    
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until System Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    Log    Step 2
    Change Setting Without Saving    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    Log    Step 3
    Change Setting Without Saving    ${SEND ANONYMOUS USAGE CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick unchecked 
    Log    Step 4
    Change Setting Without Saving    ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL} 
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick unchecked 
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick unchecked
    Log    Step 5
    Reload Page
    Wait Until System Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    
Changes made in the thick client are displayed in the security block in Cloud Portal
    [Tags]    C65723    system settings    threaded
    Log    Preconditions
    Set System Settings via API    auditTrailEnabled    true
    Set System Settings via API    trafficEncryptionForced    false
    Set System Settings via API    videoTrafficEncryptionForced    false
    Set System Settings via API    sessionLimitMinutes    0
    
    Log    Step 1
    Set System Settings via API    auditTrailEnabled    false
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Security Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick unchecked
    
    Log    Step 2
    Set System Settings via API    auditTrailEnabled    true
    Reload Page
    Wait Until Security Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    
    Log    Step 3
    Set System Settings via API    trafficEncryptionForced    true
    Reload Page
    Wait Until Security Settings Are Visible
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick checked
    
    Log    Step 4
    Set System Settings via API    videoTrafficEncryptionForced    true
    Reload Page
    Wait Until Security Settings Are Visible
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick checked
    
    Log    Step 5
    Set System Settings via API    videoTrafficEncryptionForced    false
    Reload Page
    Wait Until Security Settings Are Visible
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked 
    
    Log    Step 6
    Set System Settings via API    trafficEncryptionForced    false
    Reload Page
    Wait Until Security Settings Are Visible
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked   
    
    Log    Step 7
    Set System Settings via API    sessionLimitMinutes    30
    Reload Page
    Wait Until Security Settings Are Visible
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked 
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 30    Fail
    
    Log    Step 8
    Set System Settings via API    sessionLimitMinutes    0
    Reload Page
    Wait Until Security Settings Are Visible
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 

Security block is available for administrator or owner
    [Tags]    C65697    system settings    threaded
    Log    Preconditions
    Set System Settings via API    auditTrailEnabled    true
    Set System Settings via API    trafficEncryptionForced    false
    Set System Settings via API    videoTrafficEncryptionForced    false
    Set System Settings via API    sessionLimitMinutes    0
    Log    Step 1
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Security Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//label    disabled    true
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 
    
    Log    Step 2
    Log Out
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Wait Until Security Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//label    disabled    true
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 
    
System Settings block is not available when the system is offline
    [Tags]    C69744    system settings    threaded
    Go To    ${url}/systems/${AUTOTESTS OFFLINE SYSTEM ID}
    Log In    ${email}    ${password}    button=None
    Run Keyword If    '${email}'=='${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${EDITABLE TITLE}    ${MERGE BUTTON SYSTEM}
    Run Keyword If    '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${EDITABLE TITLE}
    Run Keyword Unless    '${email}'=='${EMAIL OWNER}' or '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible    ${PLACEHOLDER ICON}    //span[text()='${NOT ABLE TO LOAD TEXT}']
    Element Should Not Be Visible    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}
    Element Should Not Be Visible      ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
    Element Should Not Be Visible      ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}
    
System settings block view for different System versions
    [Tags]    C69743    system settings    threaded
    Set System Settings via API    autoDiscoveryEnabled    true    ${4.0 system}
    Set System Settings via API    statisticsAllowed    true    ${4.0 system}
    Set System Settings via API    cameraSettingsOptimization    true    ${4.0 system}
    Go To    ${url}/systems/${AUTO TESTS 4.0 SYSTEM ID}
    Log In    ${email}    ${password}    button=None
    Run Keyword If    '${email}'=='${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${EDITABLE TITLE}    ${MERGE BUTTON SYSTEM}
    Run Keyword If    '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${EDITABLE TITLE}
    Run Keyword Unless    '${email}'=='${EMAIL OWNER}' or '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    Log Out
    Set System Settings via API    autoDiscoveryEnabled    true
    Set System Settings via API    statisticsAllowed    true
    Set System Settings via API    cameraSettingsOptimization    true
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    Log Out
    Set System Settings via API    autoDiscoveryEnabled    true    ${3.2 system}
    Set System Settings via API    statisticsAllowed    true    ${3.2 system}
    Set System Settings via API    cameraSettingsOptimization    true    ${3.2 system}
    Go To    ${url}/systems/${3 DOT 2 SYSTEM ID}
    Log In    ${email}    ${password}    button=None
    Run Keyword If    '${email}'=='${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${EDITABLE TITLE}    ${MERGE BUTTON SYSTEM}
    Run Keyword If    '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${EDITABLE TITLE}
    Run Keyword Unless    '${email}'=='${EMAIL OWNER}' or '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until System Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked


Security block is not available for other users
    [Tags]    C65698    system settings    threaded
    @{users} =    Create List    ${EMAIL ADV VIEWER}    ${EMAIL VIEWER}    ${EMAIL LIVE VIEWER}    ${EMAIL CUSTOM}
    FOR    ${user}    IN    @{users}
	    Log in to Auto Tests System    ${user}
	    Sleep    1
	    Page Should Not Contain Element    ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE} 
	    Page Should Not Contain Element    ${ALLOW ONLY SECURE CHECKBOX VISIBLE}
	    Page Should Not Contain Element    ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}
	    Page Should Not Contain Element    ${LIMIT SESSION DURATION CHECKBOX VISIBLE}
	    Log Out
	END  
	
Cancel changes in Security block
    [Tags]    C65724    system settings    threaded
    Log    Preconditions
    Set System Settings via API    auditTrailEnabled    true
    Set System Settings via API    trafficEncryptionForced    false
    Set System Settings via API    videoTrafficEncryptionForced    false
    Set System Settings via API    sessionLimitMinutes    0
    Log    Step 1
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Security Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Change Setting Without Saving    ${ENABLE AUDIT TRAIL CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    
    Log    Step 2
    Click Button    ${SYSTEM CANCEL}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 
    
    Log    Step 3
    Change Setting Without Saving    ${ALLOW ONLY SECURE CHECKBOX REAL}
    Change Setting Without Saving    ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}
    Change Setting Without Saving    ${LIMIT SESSION DURATION CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    
    Log    Step 4
    Click Button    ${SYSTEM CANCEL}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 
    
Checking the dependency of security settings checkboxes
    [Tags]    C65700    system settings    threaded
    Log    Preconditions
    Set System Settings via API    auditTrailEnabled    true
    Set System Settings via API    trafficEncryptionForced    false
    Set System Settings via API    videoTrafficEncryptionForced    false
    Set System Settings via API    sessionLimitMinutes    0
    
    Log    Step 1
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Security Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//label    disabled    true    
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 
    
    Log    Step 2
    Change Setting Without Saving    ${ALLOW ONLY SECURE CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick checked
    Run Keyword And Expect Error    *    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//label    disabled    true
    
    Log    Step 3
    Change Setting Without Saving    ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}
    Wait Until Element is Visible    ${ENCRYPTING VIDEO WARNING}
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick checked
    Element Style Should Be    ${ENCRYPTING VIDEO WARNING}    color    ${ERROR COLOR WITH OPACITY}
    
    Log    Step 4
    Change Setting Without Saving    ${ALLOW ONLY SECURE CHECKBOX REAL}
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//label    disabled    true  
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked
    Page Should Not Contain Element    ${ENCRYPTING VIDEO WARNING}
    
Check Limit session duration
    [Tags]    C65703    system settings    threaded
    Log    Preconditions
    Set System Settings via API    auditTrailEnabled    true
    Set System Settings via API    trafficEncryptionForced    false
    Set System Settings via API    videoTrafficEncryptionForced    false
    Set System Settings via API    sessionLimitMinutes    0
    
    Log    Step 1
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Security Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 
    Change Setting Without Saving    ${LIMIT SESSION DURATION CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 24    Fail    Interval not 24 hours as expected
    Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    
    Log    Step 2
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    0
    Sleep    1
    Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1
    Page Should Not Contain Element     ${SYSTEM SAVE}
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked
    Evaluate System Settings via API    sessionLimitMinutes    0
    
    Log    Step 3
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    hjkl
    Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1
    Page Should Not Contain Element     ${SYSTEM SAVE}
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked
    Evaluate System Settings via API    sessionLimitMinutes    0
    
    Log    Step 4
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    "&*("
    Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1    
    Page Should Not Contain Element     ${SYSTEM SAVE}
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked
    Evaluate System Settings via API    sessionLimitMinutes    0
    
    Log    Step 5
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    654
    Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1
    Wait Until Elements Are Visible	 ${SYSTEM SAVE}    ${SYSTEM CANCEL}    
    Click Button     ${SYSTEM SAVE} 
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 65    Fail    Interval not 65 minutes as expected
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked
    Evaluate System Settings via API    sessionLimitMinutes    65
        
    Log    Step 6
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    1
    Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1
    Click Button     ${SYSTEM SAVE} 
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked
    Evaluate System Settings via API    sessionLimitMinutes    1
    
    Log    Step 7
    Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION HOURS}
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    600  
    Sleep    1
    Click Button     ${SYSTEM SAVE} 
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    ${minutes} =    Evaluate    600*60
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked
    Evaluate System Settings via API    sessionLimitMinutes    ${minutes}
    
    Log    Step added by auto qa (CLOUD-5221 found)
    Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1
    Click Button     ${SYSTEM SAVE} 
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 10    Fail    Interval not 10 hours as expected
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked
    Evaluate System Settings via API    sessionLimitMinutes    600
    
    Log    Step 8
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    5
    Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button     ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 5   Fail    Interval not 5 minutes as expected
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked
    Evaluate System Settings via API    sessionLimitMinutes    5

Check HTTPS traffic encryption
    [Tags]    C65701    system settings    threaded
    Log    Preconditions
    Set System Settings via API    trafficEncryptionForced    true
    
    Log    Step 1 - 4
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Security Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Change Setting Without Saving    ${ALLOW ONLY SECURE CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Sleep    5
    ${status code} =    Check HTTP Connection    http://    ${AUTO SYS IP ONLY}    /static/index.html#/    
    Should Be Equal As Strings    ${status code}    200
    
    Log    Step 5 - 9
    Change Setting Without Saving    ${ALLOW ONLY SECURE CHECKBOX REAL}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Sleep    5
    Run Keyword And Expect Error    *   Check HTTP Connection    http://    ${AUTO SYS IP ONLY}    /static/index.html#/    
    Check Allow Only Secure Connections    ${AUTO SYS IP}    ${AUTO SYS AUTH}     
    
Security block view for 3 dot 2 System
    [Tags]    C65829    system settings    threaded
    Log    Preconditions
    Set 3 dot 2 System Settings via API    auditTrailEnabled    true
    Log    Step 1 covered in other testcases by default
    Log    Step 2
    Go To    ${url}/systems/${3 DOT 2 SYSTEM ID}
    Log In    ${email}    ${password}    button=None
    Run Keyword If    '${email}'=='${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Run Keyword If    '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    Run Keyword Unless    '${email}'=='${EMAIL OWNER}' or '${email}'=='${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}
    Wait Until Elements Are Visible
    ...    ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    
Changes in System Settings block are displayed in thick client
    [Tags]    C69740    threaded    system settings 
    Log    Preconditions
    Set System Settings via API    autoDiscoveryEnabled    true
    Set System Settings via API    statisticsAllowed    true
    Set System Settings via API    cameraSettingsOptimization    true
    
    Log    Step 1
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    autoDiscoveryEnabled
    
    Log    Step 2
    Changing setting changes it on server     ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    autoDiscoveryEnabled
    
    Log    Step 3
    Changing setting changes it on server    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    statisticsAllowed
    
    Log    Step 4
    Changing setting changes it on server    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    statisticsAllowed
    
    Log    Step 5
    Changing setting changes it on server     ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    cameraSettingsOptimization
    
    Log    Step 6
    Changing setting changes it on server     ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    cameraSettingsOptimization
    
    Log    Step 7
    Changing All Settings    ${SYSTEM SAVE}
    
    Log    Step 8
    Changing All Settings    ${SYSTEM SAVE}