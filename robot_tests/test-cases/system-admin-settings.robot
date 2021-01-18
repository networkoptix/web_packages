*** Settings ***
Resource          ../resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        Common Restart Logout    ${ENV}
Test Teardown     Run Keyword If Test Failed    Execute Command Remotely    docker start ${system}[cont]
Suite Teardown    System Admin Suite Tear Down
Force Tags        system

*** Variables ***
@{checkboxes}
...    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}
...    ${SEND ANONYMOUS USAGE CHECKBOX REAL}
...    ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}
...    ${ENABLE AUDIT TRAIL CHECKBOX REAL}
...    ${ALLOW ONLY SECURE CHECKBOX REAL}
...    ${LIMIT SESSION DURATION CHECKBOX REAL}
${3.2 system url}    http://10.1.5.113:7001

*** Test Cases ***
Should show system settings and security settings and they should match settings on server
    [Tags]    system settings    threaded
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
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
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Changing setting changes it on server     ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    autoDiscoveryEnabled    https://${QABURBANK IP}:${system}[port]

Changing the Setting 'Send anonymous usage and crash statistics to developers' changes it on the server
    [Tags]    system settings    threaded
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Changing setting changes it on server    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    statisticsAllowed    https://${QABURBANK IP}:${system}[port]

Changing the Setting 'Allow system to optimize camera settings' changes it on the server
    [Tags]    system settings    threaded
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Changing setting changes it on server     ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    cameraSettingsOptimization    https://${QABURBANK IP}:${system}[port]

Changing the Setting 'Enable audit trail' changes it on the server
    [Tags]    system settings    threaded
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Changing setting changes it on server     ${ENABLE AUDIT TRAIL CHECKBOX REAL}     auditTrailEnabled    https://${QABURBANK IP}:${system}[port]

Changing the Setting 'Allow only secure connections' changes it on the server
    [Tags]    system settings    threaded
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Changing setting changes it on server     ${ALLOW ONLY SECURE CHECKBOX REAL}     trafficEncryptionForced    https://${QABURBANK IP}:${system}[port]

Changing the Setting 'Encrypt video traffic' changes it on the server
    [Tags]    system settings    threaded
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    ${selected}=   Change Setting Encrypt video traffic
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    videoTrafficEncryptionForced    ${selected}

Changing the Setting 'Limit session duration to' changes it on the server
    [Tags]    system settings    threaded
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Change Setting    ${LIMIT SESSION DURATION CHECKBOX REAL}
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${LIMIT SESSION DURATION CHECKBOX REAL}
    Run Keyword If    ${status}==False    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]     sessionLimitMinutes    0
    ...    ELSE     Evaluate Session Limit

Change Time Interval And Verify on Server
    [Tags]    system settings    C65722    threaded
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${LIMIT SESSION DURATION CHECKBOX REAL}
    Run Keyword If    ${status}==False    Change Setting    ${LIMIT SESSION DURATION CHECKBOX REAL}    save=False
    Change Duration Time Interval    ${SYSTEM SAVE}
    Evaluate Session Limit
    Reload Page
    Wait Until Settings Are Visible
    Change Duration Time Interval    ${SYSTEM SAVE}
    Evaluate Session Limit

Changing Several Random Checkboxes Works
    [Tags]    system settings    threaded
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Changing Several Settings at Random    ${SYSTEM SAVE}
    Changing Several Settings at Random    ${SYSTEM CANCEL}
    
Systems Settings Block is Available for Administrator or Owner
    [Tags]    C69736    system settings    threaded
    Log    Preconditions
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]   autoDiscoveryEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    statisticsAllowed    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    cameraSettingsOptimization    true
    Log    Step 1
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    Log    Step 2
    Log Out
    Log in to user and system    ${users}[cloudAdmin]    ${system}[id]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    
System Settings block is not available for other users
    [Tags]    C69737    system settings     threaded
    @{users}=   Create List    ${users}[viewer]    ${users}[advancedViewer]    ${users}[liveViewer]    ${users}[custom]
    FOR    ${user}    IN    @{users}
        Log in to user and system    ${user}    ${system}[id]
        Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
        Wait until elements are not visible
        ...    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}
        ...    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
        ...    ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}
        Log Out
    END
    
Cancel changes in System Settings block
    [Tags]    C69738    system settings    threaded
    Log    Preconditions
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    autoDiscoveryEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    statisticsAllowed    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    cameraSettingsOptimization    true
    Log    Step 1
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    Change Setting    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    save=False
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Log    Step 2
    Click Button    ${SYSTEM CANCEL}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Log    Step 3
    Change Setting    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    save=False
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Log    Step 4
    Click Button    ${SYSTEM CANCEL}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    
Moving to a different page after making changes in System Settings without saving them first
    [Tags]    C69739    system settings    threaded
    Log    Preconditions
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    autoDiscoveryEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    statisticsAllowed    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    cameraSettingsOptimization    true
    Log    Step 1    
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    Change Setting    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    save=False
    Change Setting    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    save=False
    Change Setting    ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    save=False
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
    Wait Until Location is    ${env}/systems/${system}[id]/health/alerts
    Log    Step 4
    Go To    ${env}/systems/${system}[id]
    Wait Until Settings Are Visible
    Change Setting    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    save=False
    Change Setting    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    save=False
    Change Setting    ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    save=False
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
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    autoDiscoveryEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    statisticsAllowed    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    cameraSettingsOptimization    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    auditTrailEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    trafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    videoTrafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    0
    Log    Steps 1 - 8
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible    timeout=60
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
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    autoDiscoveryEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    statisticsAllowed    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    cameraSettingsOptimization    true
    
    Log    Step 1
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    autoDiscoveryEnabled    false
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    
    Log    Step 2
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    autoDiscoveryEnabled    true
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    
    Log    Step 3
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    statisticsAllowed    false
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick unchecked
    
    Log    Step 4
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    statisticsAllowed    true
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    
    Log    Step 5
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    cameraSettingsOptimization    false
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick unchecked 
    
    Log    Step 6
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    cameraSettingsOptimization    true
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked   
    
    Log    Step 7
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    autoDiscoveryEnabled    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    statisticsAllowed    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    cameraSettingsOptimization    false
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick unchecked

    Log    Step 8
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    autoDiscoveryEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    statisticsAllowed    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    cameraSettingsOptimization    true
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked

Checking the dependency of system settings checkboxes
    [Tags]    C69742    system settings    threaded
    Log    Preconditions
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    autoDiscoveryEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    statisticsAllowed    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    cameraSettingsOptimization    true

    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked

    Log    Step 1
    Change Setting    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    save=False
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked

    Log    Step 2
    Change Setting    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    save=False
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked

    Log    Step 3
    Change Setting    ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    save=False
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick unchecked 
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick unchecked

    Log    Step 4
    Reload Page
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked
    
Changes made in the thick client are displayed in the security block in Cloud Portal
    [Tags]    C65723    system settings    threaded
    Log    Preconditions
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    auditTrailEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    trafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    videoTrafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    0
    
    Log    Step 1
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    auditTrailEnabled    false
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick unchecked
    
    Log    Step 2
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    auditTrailEnabled    true
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    
    Log    Step 3
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    trafficEncryptionForced    true
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick checked
    
    Log    Step 4
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    videoTrafficEncryptionForced    true
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick checked
    
    Log    Step 5
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    videoTrafficEncryptionForced    false
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked 
    
    Log    Step 6
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    trafficEncryptionForced    false
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked   
    
    Log    Step 7
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    30
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked 
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 30    Fail
    
    Log    Step 8
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    0
    Reload Page
    Wait Until Settings Are Visible
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 

Security block is available for administrator or owner
    [Tags]    C65697    system settings    threaded
    Log    Preconditions
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    auditTrailEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    trafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    videoTrafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    0
    Log    Step 1
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible    timeout=60
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//label    disabled    true
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 
    
    Log    Step 2
    Log Out
    Log in to user and system    ${users}[cloudAdmin]    ${system}[id]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//label    disabled    true
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 

System Settings block is not available when the system is offline
    [Tags]    C69744    system settings    threaded
    Stop Docker Server    ${system}[cont]
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Elements Are Visible
    ...    ${DISCONNECT FROM NX}
    ...    ${EDITABLE TITLE}
    ...    ${MERGE BUTTON SYSTEM}
    ...    ${PLACEHOLDER ICON}
    ...    //span[text()='${NOT ABLE TO LOAD TEXT}']
    Element Should Not Be Visible    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}
    Element Should Not Be Visible    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
    Element Should Not Be Visible    ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}
    Start Docker Server    ${system}[cont]

System settings block view for different System versions
    [Tags]    C69743    system settings    threaded    deb
    ${sys}=   Setup Docker System    image=${image 4.0}    cloud email=${system}[owner]

    Log    Check 3.2
    Set System Settings via API    ${local auth}    ${3.2 system url}    autoDiscoveryEnabled    true
    Set System Settings via API    ${local auth}    ${3.2 system url}    statisticsAllowed    true
    Set System Settings via API    ${local auth}    ${3.2 system url}    cameraSettingsOptimization    true

    ${3.2 sys id}=   Get Cloud System Id    ${3.2 system url}    ${local auth}
    Log in to user and system    ${EMAIL OWNER}    ${3.2 sys id}
    Wait Until Settings Are Visible    timeout=60    old system=True
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be    ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked

    Log    Fails due to CLOUD-6523
    Changing setting changes it on server    ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    autoDiscoveryEnabled    ${3.2 system url}
    Changing setting changes it on server    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    statisticsAllowed    ${3.2 system url}
    Changing setting changes it on server    ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    cameraSettingsOptimization    ${3.2 system url}
    Log Out

    Log    Check 4.0
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${sys}[port]    autoDiscoveryEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${sys}[port]    statisticsAllowed    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${sys}[port]    cameraSettingsOptimization    true

    Log in to user and system    ${sys}[owner]    ${sys}[id]
    Wait Until Settings Are Visible    timeout=60
    Element Attribute Value Should Be     ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}//span    class    tick checked

    Changing Several Settings at Random    ${SYSTEM SAVE}    server url=https://${QABURBANK IP}:${sys}[port]
    Log Out

Security block is not available for other users
    [Tags]    C65698    system settings    threaded
    FOR    ${user}    IN    @{users.values()}
	    Log in to user and system    ${user}    ${base password}
	    Sleep    1
	    Page Should Not Contain Elements
	        ...    ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}
	        ...    ${ALLOW ONLY SECURE CHECKBOX VISIBLE}
	        ...    ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}
	        ...    ${LIMIT SESSION DURATION CHECKBOX VISIBLE}
	    Log Out
	END  
	
Cancel changes in Security block
    [Tags]    C65724    system settings    threaded
    Log    Preconditions
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    auditTrailEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    trafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    videoTrafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    0
    Log    Step 1
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Change Setting    ${ENABLE AUDIT TRAIL CHECKBOX REAL}    save=False
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
    Change Setting    ${ALLOW ONLY SECURE CHECKBOX REAL}    save=False
    Change Setting    ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}    save=False
    Change Setting    ${LIMIT SESSION DURATION CHECKBOX REAL}        save=False
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
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    auditTrailEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    trafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    videoTrafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    0
    
    Log    Step 1
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible    timeout=60
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//label    disabled    true    
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 
    
    Log    Step 2
    Change Setting    ${ALLOW ONLY SECURE CHECKBOX REAL}    save=False
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick checked
    Run Keyword And Expect Error    *    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//label    disabled    true
    
    Log    Step 3
    Change Setting    ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}    save=False
    Wait Until Element is Visible    ${ENCRYPTING VIDEO WARNING}
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick checked
    Element Style Should Be    ${ENCRYPTING VIDEO WARNING}    color    ${ERROR COLOR WITH OPACITY}
    
    Log    Step 4
    Change Setting    ${ALLOW ONLY SECURE CHECKBOX REAL}    save=False    buttons=False
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//label    disabled    true  
    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}//span    class    tick unchecked
    Element Attribute Value Should Be     ${ALLOW ONLY SECURE CHECKBOX VISIBLE}//span    class    tick unchecked
    Page Should Not Contain Element    ${ENCRYPTING VIDEO WARNING}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Wait until elements are not visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}

Check Limit session duration
    [Tags]    C65703    system settings    threaded
    Log    Preconditions
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    auditTrailEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    trafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    videoTrafficEncryptionForced    false
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    0
    
    Log    Step 1
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick unchecked 
    Change Setting    ${LIMIT SESSION DURATION CHECKBOX REAL}    save=False
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
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    0
    
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
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    0
    
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
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    0
    
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
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    65
        
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
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    1
    
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
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    ${minutes}
    
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
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    600
    
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
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    sessionLimitMinutes    5

Check HTTPS traffic encryption
    [Tags]    C65701    system settings    threaded
    Log    Preconditions
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    trafficEncryptionForced    true
    
    Log    Step 1
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Change Setting    ${ALLOW ONLY SECURE CHECKBOX REAL}

    Log    Step 2
    Go To    http://${QABURBANK IP}:${system}[port]
    Wait until location is    http://${QABURBANK IP}:${system}[port]/static/index.html#/

    Log    Step 3
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    trafficEncryptionForced    false
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    videoTrafficEncryptionForced    false

    Log    Step 4
    ${resp}=   Check Connection    http://${QABURBANK IP}:${system}[port]
    Should Be Equal As Strings    ${resp}    200

    Log    Step 5
    Go To    ${env}/systems/${system}[id]
    Wait until settings are visible
    Change Setting    ${ALLOW ONLY SECURE CHECKBOX REAL}

# TODO: figure out failure
#    Log    Step 6
#    Go To    http://${QABURBANK IP}:${system}[port]
#    Wait until location contains    https://${QABURBANK IP}:${system}[port]

    Log    Step 7
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    trafficEncryptionForced    true
    Evaluate System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    videoTrafficEncryptionForced    false

    Log    Step 8
    ${resp}=   Check Connection    http://${QABURBANK IP}:${system}[port]
    Should Be Equal As Strings    ${resp}    SSL Error

    Log    Step 9
    ${resp}=   Check Connection    https://${QABURBANK IP}:${system}[port]    verify=False
    Should Be Equal As Strings    ${resp}    200

    ${resp}=   Check Connection    https://${QABURBANK IP}:${system}[port]
    Should Be Equal As Strings    ${resp}    SSL Error

Security block view for 3 dot 2 System
    [Tags]    C65829    system settings    threaded
    Log    Preconditions
    Set System Settings via API    ${local auth}    ${3.2 system url}    auditTrailEnabled    true
    ${3.2 sys id}=   Get Cloud System Id    ${3.2 system url}    ${local auth}

    Log    Step 1 covered in other testcases by default
    Log    Step 2
    Log in to user and system    ${EMAIL OWNER}    ${3.2 sys id}
    Wait until element is visible    ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}
    Element Attribute Value Should Be     ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}//span    class    tick checked
    
Changes in System Settings block are displayed in thick client
    [Tags]    C69740    threaded    system settings
    Log    Preconditions
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    autoDiscoveryEnabled    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    statisticsAllowed    true
    Set System Settings via API    ${local auth}    https://${QABURBANK IP}:${system}[port]    cameraSettingsOptimization    true
    
    Log in to user and system    ${system}[owner]    ${system}[id]
    Wait until settings are visible

    Log    Step 1
    Changing setting changes it on server     ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    autoDiscoveryEnabled    https://${QABURBANK IP}:${system}[port]
    
    Log    Step 2
    Changing setting changes it on server     ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    autoDiscoveryEnabled    https://${QABURBANK IP}:${system}[port]
    
    Log    Step 3
    Changing setting changes it on server    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    statisticsAllowed    https://${QABURBANK IP}:${system}[port]
    
    Log    Step 4
    Changing setting changes it on server    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    statisticsAllowed    https://${QABURBANK IP}:${system}[port]
    
    Log    Step 5
    Changing setting changes it on server     ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    cameraSettingsOptimization    https://${QABURBANK IP}:${system}[port]
    
    Log    Step 6
    Changing setting changes it on server     ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    cameraSettingsOptimization    https://${QABURBANK IP}:${system}[port]
    
    Log    Step 7
    Changing All Settings    ${SYSTEM SAVE}
    
    Log    Step 8
    Changing All Settings    ${SYSTEM SAVE}
