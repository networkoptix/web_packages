*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        Run Keywords    QA Video Recording Start      System Admin Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop       System Admin Test Restart
Suite Teardown    Run Keyword and Ignore Error    System Admin Suite Teardown
Force Tags        system    cloud    webadmin    system settings

*** Test Cases ***
16. System Settings block is not available when the system is offline
    [Tags]    C69744
    Remove Tags     webadmin
    Stop container    ${system}[container]
    Log in to system    ${system}    ${system}[owner]
    Wait Until Elements Are Visible
    ...    ${DISCONNECT FROM NX}
    ...    ${MERGE BUTTON SYSTEM}
    ...    ${PLACEHOLDER ICON}
    ...    //span[text()='${NOT ABLE TO LOAD TEXT}']
    Start container   ${system}[container]

17. Cancel changes in Security block
    [Tags]    C65724
    Log    Preconditions
    Reset Settings To Default    ${system['token']}    ${server url}

    Log    Step 1
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Change Setting    ${ENABLE AUDIT TRAIL CHECKBOX}
    Checkbox Is Selected     ${ENABLE AUDIT TRAIL CHECKBOX}    ${False}
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    
    Log    Step 2
    Click Button    ${CANCEL BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}     ${True}
    Checkbox Is Selected     ${ALLOW ONLY SECURE CHECKBOX}         ${False}
    Checkbox Is Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}     ${False}
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${False}
    
    Log    Step 3
    Change Setting    ${ALLOW ONLY SECURE CHECKBOX}
    Change Setting    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}
    Sleep    1
    ${element_xpath}=       Replace String      ${LIMIT SESSION DURATION CHECKBOX}        \"  \\\"
    Execute JavaScript  document.evaluate("${element_xpath}", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0).click();
    #Change Setting    ${LIMIT SESSION DURATION CHECKBOX}
    Checkbox Is Selected     ${ALLOW ONLY SECURE CHECKBOX}         ${True}
    Checkbox Is Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}     ${True}
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${True}
    Element Should Be Visible    ${ENCRYPTING VIDEO WARNING}
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    
    Log    Step 4
    Click Button    ${CANCEL BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}    ${ENCRYPTING VIDEO WARNING}
    Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${True}
    Checkbox Is Selected     ${ALLOW ONLY SECURE CHECKBOX}    ${False}
    Checkbox Is Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    ${False}
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${False}

18. Check Limit session duration
    [Tags]    C65703
    Log    Preconditions
    Reset Settings To Default    ${system['token']}    ${server url}

    Log    Step 1
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${False}
    Change Setting    ${LIMIT SESSION DURATION CHECKBOX}
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 30    Fail    Interval not 30 minutes as expected
    # This is here because the save/cancel buttons get in the way in 5.0
    ${element_xpath}=       Replace String      ${TIME DURATION INTERVAL BUTTON}        \"  \\\"
    Execute JavaScript  document.evaluate("${element_xpath}", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0).click();
    #Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Execute JavaScript  document.evaluate("${element_xpath}", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0).click();
    #Click Button    ${TIME DURATION INTERVAL BUTTON}
    
    Log    Step 2
    Clear Element Text    ${TIME NUMBER INPUT}
    Sleep    1
    # Page Should Not Contain Element     ${SAVE BUTTON}
    Input Text    ${TIME NUMBER INPUT}    0
    Sleep    1 
    
    
    # Sleep    1
    Execute JavaScript  document.evaluate("${element_xpath}", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0).click();
    #Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 1    Fail    Interval not 1 minute as expected
    # Page Should Not Contain Element     ${SAVE BUTTON}
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${True}
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    sessionLimitMinutes    0
    
    Log    Step 3
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    hjkl
    Sleep    1 
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 1    Fail    Interval not 1 minute as expected
    # Click Button    ${TIME DURATION INTERVAL BUTTON}
    # Wait Until Elements Are Visible
    # ...    ${TIME DURATION SELECTION HOURS} 
    # ...    ${TIME DURATION SELECTION MINUTES}
    # Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1
    # Page Should Not Contain Element     ${SAVE BUTTON}
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${True}
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    sessionLimitMinutes    0
    
    Log    Step 4
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    "&*("
    # Click Button    ${TIME DURATION INTERVAL BUTTON}
    # Wait Until Elements Are Visible
    # ...    ${TIME DURATION SELECTION HOURS} 
    # ...    ${TIME DURATION SELECTION MINUTES}
    # Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1 
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 1    Fail    Interval not 1 minute as expected
    # Page Should Not Contain Element     ${SAVE BUTTON}
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${True}
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    sessionLimitMinutes    0
    
    Log    Step 5
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    87840
    Execute JavaScript  document.evaluate("${element_xpath}", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0).click();
    #Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1
    Wait Until Elements Are Visible	 ${SAVE BUTTON}    ${CANCEL BUTTON}
    Click Button     ${SAVE BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Reload Page
    Wait Until Element Is Visible    ${TIME NUMBER INPUT}
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 61    Fail    Interval not 61 days as expected
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${True}
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    sessionLimitMinutes    87840
        
    Log    Step 6
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    1
    Execute JavaScript  document.evaluate("${element_xpath}", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0).click();
    #Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1
    Click Button     ${SAVE BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${True}
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    sessionLimitMinutes    1
    
    Log    Step 7
    Execute JavaScript  document.evaluate("${element_xpath}", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0).click();
    #Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION HOURS}
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    600  
    Sleep    1
    Click Button     ${SAVE BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    ${minutes} =    Evaluate    600*60
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${True}
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    sessionLimitMinutes    ${minutes}
    
    Log    Step added by auto qa (CLOUD-5221 found)
    Execute JavaScript  document.evaluate("${element_xpath}", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0).click();
    #Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Sleep    1
    Click Button     ${SAVE BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 25    Fail    Interval not 25 days as expected
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${True}
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    sessionLimitMinutes    25  #default value is in days
    
    Log    Step 8
    Clear Element Text    ${TIME NUMBER INPUT}
    Input Text    ${TIME NUMBER INPUT}    5
    Execute JavaScript  document.evaluate("${element_xpath}", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(0).click();
    #Click Button    ${TIME DURATION INTERVAL BUTTON}
    Wait Until Elements Are Visible
    ...    ${TIME DURATION SELECTION HOURS} 
    ...    ${TIME DURATION SELECTION MINUTES}
    Click Element    ${TIME DURATION SELECTION MINUTES}
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Click Button     ${SAVE BUTTON}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 5   Fail    Interval not 5 minutes as expected
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${True}
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    sessionLimitMinutes    5

19. Check HTTPS traffic encryption
    [Tags]    C65701
    Skip If Image Is    5.0    5.1    5.2    msg=5.0 and above not supported
    Log    Preconditions
    ${settings}=   Create Dictionary    trafficEncryptionForced=${true}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    
    Log    Step 1
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Change Setting And Save   ${ALLOW ONLY SECURE CHECKBOX}

    Log    Step 2
    Go To    ${server url}
    IF    '${IMAGE}' == '4.2_test'
        Wait until location is    ${server url}/static/index.html#/
    ELSE
        Wait until location is    ${server url}/#/settings
    END

    Log    Step 3
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    trafficEncryptionForced    false
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    videoTrafficEncryptionForced    false

    Log    Step 4
    ${resp}=   Check Connection    ${server url}    verify=False
    Should Be Equal As Strings    ${resp}    200    
    
    Log    Step 5
    Go To    ${env}/systems/${system}[cloud id]
    Wait Until Settings Are Visible
    Change Setting And Save    ${ALLOW ONLY SECURE CHECKBOX}

    Log    Step 6
    Go To    ${server url}
    Run keyword and continue on failure    Wait until location contains    ${server url}

    Log    Step 7
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    trafficEncryptionForced    true
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    videoTrafficEncryptionForced    false

    Log    Step 8
    ${resp}=   Check Connection    ${server url}
    Should Be Equal As Strings    ${resp}    SSL Error

    Log    Step 9
    ${resp}=   Check Connection    ${server url}    verify=False
    Should Be Equal As Strings    ${resp}    200

    Go To    ${ENV}

20. Changes in System Settings block are displayed in thick client
    [Tags]    C69740
    Log    Preconditions
    Reset Settings To Default    ${system['token']}    ${server url}
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible

    Log    Steps 1-6
    FOR    ${setting}    IN    autoDiscoveryEnabled    statisticsAllowed    cameraSettingsOptimization
        Repeat Keyword    2 times    Changing setting changes it on server     //*[@id="${setting}"]    ${setting}
    END

    Log    Step 7, 8
    Repeat Keyword    2 times    Changing All Settings    ${SAVE BUTTON}