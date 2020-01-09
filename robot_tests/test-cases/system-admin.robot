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
${url}         ${ENV}
@{checkboxes}    
...    ${ENABLE AUTO DISCOVERY CHECKBOX REAL} 
...    ${SEND ANONYMOUS USAGE CHECKBOX REAL} 
...    ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}
...    ${ENABLE AUDIT TRAIL CHECKBOX REAL} 
...    ${ALLOW ONLY SECURE CHECKBOX REAL} 
...    ${LIMIT SESSION DURATION CHECKBOX REAL}

*** Keywords ***
Log in to Auto Tests System
    [arguments]    ${email}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${email}    ${password}    button=None
    Validate Log In
    Run Keyword If    '${email}' == '${EMAIL OWNER}'    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Run Keyword If    '${email}' == '${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    Run Keyword Unless    '${email}' == '${EMAIL OWNER}' or '${email}' == '${EMAIL ADMIN}'    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}

Check System Text
    [arguments]    ${user}
    Log Out
    Log in to Auto Tests System    ${user}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    Wait Until Elements Are Visible    ${current owner name}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}
    Run Keyword Unless    "${user}"=="${EMAIL ADMIN}"    Wait Until Element Is Not Visible    ${YOUR ACCESS LEVEL}/span[contains(text(),'${ADMIN TEXT}')]

Reset DB and Open New Browser On Failure
    Close Browser
    Reset System Names
    Make sure notowner is in the system
    Open Browser and go to URL    ${url}

Restart
    Common Restart Logout    ${url}

settings on page should match settings on server
    Log    Enable auto discovery of cameras and servers
    Setting on page matches server    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}     autoDiscoveryEnabled     
    Log    Send anonymous usage and crash statistics to developers
    Setting on page matches server     ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}    statisticsAllowed    
    Log    Allow system to optimize camera settings
    Setting on page matches server    ${ALLOW SYSTEM OPTIMIZE CHECKBOX VISIBLE}    cameraSettingsOptimization   
    Log    Enable audit trail
    Setting on page matches server    ${ENABLE AUDIT TRAIL CHECKBOX VISIBLE}    auditTrailEnabled   
    Log    Allow only secure connections
    Setting on page matches server    ${ALLOW ONLY SECURE CHECKBOX VISIBLE}    trafficEncryptionForced   
    Log    Encrypt video traffic
    Setting on page matches server    ${ENCRYPT VIDEO TRAFFIC CHECKBOX VISIBLE}     videoTrafficEncryptionForced  
    Log    Limit session duration to
    ${status} =    Run Keyword and Return Status    Element Attribute Value Should Be     ${LIMIT SESSION DURATION CHECKBOX VISIBLE}//span    class    tick checked
    Run Keyword If    ${status}==False    Evaluate Auto System Settings via API    sessionLimitMinutes    0
    ...    ELSE     Evaluate Session Limit 
       
Setting on page matches server
    [arguments]    ${setting}    ${id}
    ${status} =    Run Keyword and Return Status    Element Attribute Value Should Be     ${setting}//span    class    tick checked
    ${string} =    Convert To String    ${status}
    ${selected} =    Convert To Lowercase    ${string}    
    Run Keyword And Continue On Failure    Evaluate Auto System Settings via API     ${id}    ${selected}
    
Evaluate Session Limit
    ${value} =    Get Value    ${TIME NUMBER INPUT}     
    ${interval} =     Get Text    ${TIME DURATION INTERVAL TEXT}    
    ${multiplier} =     Set Variable If    "${interval}"=="hours"    60  
    ...    "${interval}"=="minutes"    1
    ${number} =   Evaluate      ${multiplier}*${value}       
    Evaluate Auto System Settings via API    sessionLimitMinutes      ${number}

Changing setting changes it on server
    [arguments]    ${setting}    ${id}
    ${status} =    Run Keyword and Return Status    Checkbox Should Be Selected     ${setting}
    ${selected} =    Set Variable If    ${status}==True    false
    ...    ${status}==False    true   
    Set Checkbox Value    ${setting}    ${selected}
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Evaluate Auto System Settings via API     ${id}    ${selected}
    
Change Setting and Save
    [arguments]    ${setting}
    ${status} =    Run Keyword and Return Status    Checkbox Should Be Selected     ${setting}
    ${selected} =    Set Variable If    ${status}==True    false
    ...    ${status}==False    true   
    Set Checkbox Value    ${setting}    ${selected}
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    
Just Change Setting
    [arguments]    ${setting}
    ${status} =    Run Keyword and Return Status    Checkbox Should Be Selected     ${setting}
    ${selected} =    Set Variable If    ${status}==True    false
    ...    ${status}==False    true   
    Set Checkbox Value    ${setting}    ${selected}

Set Hidden Checkbox
     Log    BOTH CHECKBOXES ARE UNCHECKED TO START        
     Set Checkbox Value    ${ALLOW ONLY SECURE CHECKBOX REAL}    true   
     Sleep    1   
     Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}    true    
     Sleep    2    
     Capture Page Screenshot 
     
Change Setting Encrypt video traffic
    ${status} =    Run Keyword and Return Status    Checkbox Should Be Selected     ${ALLOW ONLY SECURE CHECKBOX REAL}
    ${status2} =    Run Keyword and Return Status    Checkbox Should Be Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL} 
    ${selected} =    Set Variable If    ${status}==False or ${status2}==False    true 
    ...    ${status}==True and ${status2}==True     false   
    Run Keyword If    ${status}==True and ${status2}==False   Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}    true
    ...    ELSE IF     ${status}==True and ${status2}==True    Set Checkbox Value    ${ENCRYPT VIDEO TRAFFIC CHECKBOX REAL}    false
    ...    ELSE    Set Hidden Checkbox
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    [return]    ${selected}
    
Changing Several Settings at Random
    [arguments]     ${action} 
    ${random} =    Evaluate    random.randint(2, 6)    modules=random    #need to uncomment and set to 6 max when bug fixed
    FOR    ${idx}    IN RANGE   ${random}
        ${checkbox} =    Evaluate    random.choice(@{checkboxes})    modules=random
        Log    ${checkbox}
        Just Change Setting    ${checkbox} 
    END
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${action} 
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Sleep    2
    settings on page should match settings on server
    
Changing All Settings
    [arguments]    ${action}
    FOR    ${checkbox}    IN   @{checkboxes}
        Log    ${checkbox}
        Just Change Setting    ${checkbox} 
    END
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${action}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Sleep    2
    settings on page should match settings on server
    
Change Duration Time Interval
    [arguments]    ${action}
    ${interval} =    Get Text    ${TIME DURATION INTERVAL TEXT}
    ${random} =    Evaluate    random.randint(1, 59)    modules=random
    Input Text    ${TIME NUMBER INPUT}    ${random}
    FOR    ${i}    IN RANGE    2
           ${status} =    Run Keyword And Return Status    Textfield Value Should Be    ${TIME NUMBER INPUT}    ${random}
           Run Keyword If    ${status}==False    Input Text    ${TIME NUMBER INPUT}    ${random}
           ...    ELSE    Exit For Loop
    END
    FOR    ${i}    IN RANGE    9
           ${status} =    Run Keyword And Return Status    Element Text Should Be    ${TIME DURATION INTERVAL TEXT}    ${interval}
           Run Keyword If    ${status}==False    Run Keywords    
           ...    Click Button    ${TIME DURATION INTERVAL BUTTON}    AND
           ...    Wait Until Element Is Visible    ${TIME DURATION NEW SELECTION}    AND
           ...    Click Link    ${TIME DURATION NEW SELECTION}
           ...    ELSE    Exit For Loop 
    END
    
    Click Button    ${TIME DURATION INTERVAL BUTTON}    
    Wait Until Element Is Visible    ${TIME DURATION NEW SELECTION}
    Click Link    ${TIME DURATION NEW SELECTION}
    Wait Until Elements Are Visible     ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${action}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
     
*** Test Cases ***
systems dropdown should allow you to go back to the systems page
    [tags]    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    Click Button    ${SYSTEMS DROPDOWN}
    Wait Until Element Is Visible    ${ALL SYSTEMS}
    Click Link    ${ALL SYSTEMS}
    Location Should Be    ${url}/systems
    Run keyword and continue on failure    Title Should Be    ${SYSTEMS TITLE TEXT} - ${PRODUCT_NAME}


should confirm, if owner deletes system (You are going to disconnect your system from cloud)
    [tags]    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Click Button    ${DISCONNECT FROM NX}
    Wait Until Elements Are Visible    ${DISCONNECT FORM}    ${DISCONNECT FORM HEADER}
    Click Element    ${DISCONNECT FORM}
    Click Button    ${DISCONNECT FORM CANCEL}
    Wait Until Page Does Not Contain Element    ${REMOVE USER MODAL}

should confirm, if not owner deletes system (You will lose access to this system)
    [tags]    Threaded
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

correct items are shown for owner
    [tags]    C41560    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    you
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}    ${current owner name}

correct items are shown for admin
    [tags]    C41561    Threaded
    Log in to Auto Tests System    ${EMAIL ADMIN}
    Wait Until Element Is Visible    ${USERS LIST LINK}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM MY ACCOUNT}    ${OWNER LABEL}    ${current owner name}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}    ${YOUR ACCESS LEVEL}/span[contains(text(),'${ADMIN TEXT}')]

correct items are shown for advanced viewer and below
    [tags]    C41562    Threaded
    ${users}         Set Variable    ${EMAIL ADVVIEWER}    ${EMAIL VIEWER}    ${EMAIL LIVEVIEWER}    ${EMAIL CUSTOM}
    ${users text}    Set Variable    ${ADV VIEWER TEXT}    ${VIEWER TEXT}     ${LIVE VIEWER TEXT}    ${CUSTOM TEXT}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    testFirstName testLastName
    FOR    ${user}  ${text}  IN ZIP  ${users}  ${users text}
        Log in to Auto Tests System    ${user}
        Wait Until Elements Are Visible    ${current owner name}    ${OWNER LABEL}    ${OWNER EMAIL}    ${YOUR ACCESS LEVEL}    ${YOUR ACCESS LEVEL}/span[contains(text(),"${text}")]
        Element Should Be Enabled    ${DISCONNECT FROM MY ACCOUNT}
        Element Should Not Be Visible    ${RENAME SYSTEM}
        Element Should Not Be Visible    ${SHARE BUTTON SYSTEMS}
        Log Out
    END

rename button opens dialog and clicking cancel closes rename dialog without rename
    [tags]    C41880    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${RENAME SYSTEM}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}
    Click Button    ${RENAME CANCEL}
    Wait Until Page Does Not Contain Element    //div[@uib-modal-backdrop="modal-backdrop"]
    Verify In System    Auto Tests

clicking 'X' closes rename dialog without rename
    [tags]    C41880    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Element Is Visible    ${RENAME SYSTEM}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME X BUTTON}
    Wait Until Textfield Contains    ${RENAME INPUT}    ${AUTO TESTS}
    Click Button    ${RENAME X BUTTON}
    Wait Until Page Does Not Contain Element    ${BACKDROP}
    Verify In System    Auto Tests

clicking save with no input in rename dialog throws error
    [tags]    C41880    Threaded
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

clicking save in rename dialog renames system
    [tags]    C41880
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME INPUT}
    Clear Element Text    ${RENAME INPUT}
    Input Text    ${RENAME INPUT}    Auto Tests Rename
    Click Button    ${RENAME SAVE}
    Check For Alert    ${SYSTEM NAME SAVED}
    Verify In System    Auto Tests Rename
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}
    Click Button    ${RENAME SYSTEM}
    Wait Until Elements Are Visible    ${RENAME CANCEL}    ${RENAME SAVE}    ${RENAME INPUT}
    Clear Element Text    ${RENAME INPUT}
    Input Text    ${RENAME INPUT}    Auto Tests
    Click Button    ${RENAME SAVE}
    Check For Alert    ${SYSTEM NAME SAVED}
    Verify In System    Auto Tests

should open System page by link to not authorized user and redirect to homepage, if he does not log in
    [tags]    Threaded
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element Is Visible    ${LOG IN CLOSE BUTTON}
    Click Button    ${LOG IN CLOSE BUTTON}
    Wait Until Element Is Visible    ${JUMBOTRON}

should open System page by link to not authorized user and show it, after owner logs in
    [tags]    Threaded
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}   ${password}    button=None
    Verify In System    Auto Tests

should open System page by link to user without permission and show alert (System info is unavailable: You have no access to this system)
    [tags]    Threaded
    Log In    ${EMAIL NOPERM}    ${password}
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

should open System page by link not authorized user, and show alert if logs in and has no permission
    [tags]    Threaded
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL NOPERM}    ${password}    button=None
    Wait Until Element Is Visible    ${SYSTEM NO ACCESS}

should show (your system) for owner and (owner's name) for non-owners
    [tags]    Threaded
    Log in to Auto Tests System    ${EMAIL OWNER}
    ${current owner name}    Replace String    ${OWNER NAME}    %OWNER_NAME%    you
    Wait Until Elements Are Visible    ${RENAME SYSTEM}    ${DISCONNECT FROM NX}    ${current owner name}
    FOR    ${user}    IN    @{EMAILS LIST}
        Run Keyword Unless    "${user}"=="${EMAIL OWNER}"    Check System Text    ${user}
    END
    
should open a system page in anonymous state
    [tags]    anonymous
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Location should be    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element Is Visible    ${LOG IN MODAL} 
    Check Log In    button=None
    
should show system settings and security settings and they should match settings on server
    [tags]    checkbox settings testing
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
    
    settings on page should match settings on server
        
Changing the Setting "Enable auto discovery of cameras and servers" changes it on the server
    [tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ENABLE AUTO DISCOVERY CHECKBOX REAL}    autoDiscoveryEnabled  

Changing the Setting "Send anonymous usage and crash statistics to developers" changes it on the server
    [tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server    ${SEND ANONYMOUS USAGE CHECKBOX REAL}    statisticsAllowed    

Changing the Setting "Allow system to optimize camera settings" changes it on the server
    [tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ALLOW SYSTEM OPTIMIZE CHECKBOX REAL}    cameraSettingsOptimization  

    
Changing the Setting "Enable audit trail" changes it on the server
    [tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ENABLE AUDIT TRAIL CHECKBOX REAL}     auditTrailEnabled    

    
Changing the Setting "Allow only secure connections" changes it on the server
    [tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Changing setting changes it on server     ${ALLOW ONLY SECURE CHECKBOX REAL}     trafficEncryptionForced 

Changing the Setting "Encrypt video traffic" changes it on the server 
    [tags]    checkbox settings testing  
    Log in to Auto Tests System    ${EMAIL OWNER}
    ${selected} =    Change Setting Encrypt video traffic
    Evaluate Auto System Settings via API     videoTrafficEncryptionForced    ${selected}    

Changing the Setting "Limit session duration to" changes it on the server 
    [tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Change Setting and Save    ${LIMIT SESSION DURATION CHECKBOX REAL}
    ${status} =    Run Keyword and Return Status    Checkbox Should Be Selected     ${LIMIT SESSION DURATION CHECKBOX REAL}
    Run Keyword If    ${status}==False    Evaluate Auto System Settings via API    sessionLimitMinutes    0
    ...    ELSE     Evaluate Session Limit
    
Change Time Interval And Verify on Server
    [tags]    checkbox settings testing
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    
    ...    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}     
    ...    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL} 
    ${status} =    Run Keyword and Return Status    Checkbox Should Be Selected     ${LIMIT SESSION DURATION CHECKBOX REAL}
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
    [tags]    checkbox settings testing  
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    
    ...    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}     
    ...    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL} 
    Changing Several Settings at Random    ${SYSTEM SAVE}
    Changing Several Settings at Random    ${SYSTEM CANCEL}    #commented out due to bug 4195
    
Changing All Checkboxes Works    
    [tags]    checkbox settings testing  
    Log in to Auto Tests System    ${EMAIL OWNER}
    Wait Until Elements Are Visible    
    ...    ${ENABLE AUTO DISCOVERY CHECKBOX VISIBLE}     
    ...    ${SEND ANONYMOUS USAGE CHECKBOX VISIBLE}
    Elements Should Not Be Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL} 
    Changing All Settings    ${SYSTEM SAVE}
    Changing All Settings    ${SYSTEM CANCEL}    #commented out due to bug 4195
    
    

    