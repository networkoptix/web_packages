*** Settings ***
Resource          ../Resources/front-end-resources/system-admin-resource.robot
Suite Setup       System Admin Suite Setup
Test Setup        Run Keywords    QA Video Recording Start      System Admin Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop       System Admin Test Restart
Suite Teardown    Run Keyword and Ignore Error    System Admin Suite Teardown
Force Tags        system    cloud    webadmin    system settings

*** Test Cases ***
3. Changing the Setting 'Encrypt video traffic' changes it on the server
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    ${selected}=   Change Setting Encrypt video traffic
    Evaluate System Settings via API    ${system['local auth']}    ${server url}    videoTrafficEncryptionForced    ${selected}

4. Changing the Setting 'Limit session duration to' changes it on the server
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Change Setting And Save    ${LIMIT SESSION DURATION CHECKBOX}
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${LIMIT SESSION DURATION CHECKBOX}
    IF    ${status}==False
        Evaluate System Settings via API    ${system['local auth']}    ${server url}     sessionLimitMinutes    0
    ELSE
        Evaluate Session Limit
    END

5. Change Time Interval And Verify on Server
    [Tags]    C65722
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    ${status}=   Run Keyword and Return Status    Checkbox Should Be Selected     ${LIMIT SESSION DURATION CHECKBOX}
    Run Keyword If    ${status}==False    Change Setting    ${LIMIT SESSION DURATION CHECKBOX}
    Change Duration Time Interval    ${SYSTEM SAVE}
    Evaluate Session Limit
    Reload Page
    Wait Until Settings Are Visible
    Change Duration Time Interval    ${SYSTEM SAVE}
    Evaluate Session Limit

6. Changing Several Random Checkboxes Works
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Changing Several Settings at Random    ${SAVE BUTTON}
    Changing Several Settings at Random    ${CANCEL BUTTON}
    
7. Systems Settings Block is Available for Administrator or Owner
    [Tags]    C69736
    Log    Preconditions
    Reset Settings To Default    ${system['token']}    ${server url}
    FOR    ${user}    IN    ${system}[owner]    ${system}[cloud users][cloudAdmin]
        Log in to system    ${system}    ${user}
        Wait Until Settings Are Visible
        Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
        Checkbox should be selected     ${ENABLE AUTO DISCOVERY CHECKBOX}
        Checkbox should be selected     ${SEND ANONYMOUS USAGE CHECKBOX}
        Checkbox should be selected     ${ALLOW SYSTEM OPTIMIZE CHECKBOX}
        Log Out
    END

8. System and Security Settings block is not available for other users
    [Tags]    C69737    C65698
    FOR    ${user}    IN    ${system}[cloud users][viewer]    ${system}[cloud users][advancedViewer]    ${system}[cloud users][liveViewer]     ${system}[cloud users][custom]
        Log in to system    ${system}    ${user}
        Wait Until Elements Are Visible
        ...    //nx-text-editable[contains(text(), "${system}[name]")]
        ...    ${DISCONNECT FROM MY ACCOUNT}
        Wait until elements are not visible
        ...    ${SECURITY FORM}
        ...    ${SECURITY FORM}
        Log Out
    END
    
9. Cancel changes in System Settings block
    [Tags]    C69738
    Log    Preconditions
    Reset Settings To Default    ${system['token']}    ${server url}
    ${tested settings}=   Create List    ${ENABLE AUTO DISCOVERY CHECKBOX}    ${SEND ANONYMOUS USAGE CHECKBOX}    ${ALLOW SYSTEM OPTIMIZE CHECKBOX}
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

    FOR    ${setting}    IN    @{tested settings}
        Checkbox Is Selected    ${setting}    ${True}
        Change Setting    ${setting}
        Slow    Click Button    ${CANCEL BUTTON}    timeout=0.5
        Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
        Elements Should Not Be Visible    ${SYSTEM SAVE}    ${CANCEL BUTTON}
        Checkbox Is Selected    ${setting}    ${True}
    END

10. Moving to a different page after making changes in System Settings without saving them first
    [Tags]    C69739
    Log    Preconditions
    Reset Settings To Default    ${system['token']}    ${server url}
    ${tested settings}=   Create List    ${ENABLE AUTO DISCOVERY CHECKBOX}    ${SEND ANONYMOUS USAGE CHECKBOX}    ${ALLOW SYSTEM OPTIMIZE CHECKBOX}

    Log    Step 1
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    FOR    ${setting}    IN    @{tested settings}
        Checkbox Is Selected     ${setting}    ${True}
    END
    FOR    ${setting}    IN    @{tested settings}
        Change Setting     ${setting}
    END
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

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
    Wait Until Location is    ${env}/systems/${system}[cloud id]/health/alerts

    Log    Step 4
    Go To    ${env}/systems/${system}[cloud id]
    Wait Until Settings Are Visible
    FOR    ${setting}    IN    @{tested settings}
        Change Setting     ${setting}
    END
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Click Link    ${HM INFORMATION TAB LINK}
    Wait Until Elements Are Visible
    ...    ${APPLY CHANGES QUESTION}
    ...    ${APPLY CHANGES BUTTON}  
    ...    ${DISCARD CHANGES BUTTON}
    ...    ${CANCEL CHANGES BUTTON}

    Log    Step 5
    Click Button    ${CANCEL CHANGES BUTTON}
    Wait Until Element is Not Visible    ${APPLY CHANGES QUESTION}
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    FOR    ${setting}    IN    @{tested settings}
        Checkbox Is Selected     ${setting}    ${False}
    END

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
    Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    FOR    ${setting}    IN    @{tested settings}
        Checkbox Is Selected     ${setting}    ${False}
    END

    Log    Step 8
    Reload Page
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Wait Until Element Is Visible    ${SECURITY FORM}
    FOR    ${setting}    IN    @{tested settings}
        Wait Until Element Is Visible    ${setting}/..
        Checkbox Should Be Selected     ${setting}
    END

11. Changing All Checkboxes Works
    [Tags]    C65722
    Log    Testrail: Changes in the security block are displayed in the thick client
    Log    Testrail: Changes in the System Settings block are displayed in the thick client
    Log    Preconditions
    Reset Settings To Default    ${system['token']}    ${server url}

    Log    Steps 1 - 8
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible    timeout=60
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Changing All Settings    ${SAVE BUTTON}
    Changing All Settings    ${CANCEL BUTTON}

12. Changes made in the thick client are displayed in System Settings block in Cloud Portal
    [Tags]    C69741
    Log    Preconditions
    Reset Settings To Default    ${system['token']}    ${server url}
    Log    Step 1
    ${settings}=   Create Dictionary    autoDiscoveryEnabled=${false}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${false}

    Log    Step 2
    ${settings}=   Create Dictionary    autoDiscoveryEnabled=${true}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${true}

    Log    Step 3
    ${settings}=   Create Dictionary    statisticsAllowed=${false}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${SEND ANONYMOUS USAGE CHECKBOX}    ${false}

    Log    Step 4
    ${settings}=   Create Dictionary    statisticsAllowed=${true}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${SEND ANONYMOUS USAGE CHECKBOX}    ${true}

    Log    Step 5
    ${settings}=   Create Dictionary    cameraSettingsOptimization=${false}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${ALLOW SYSTEM OPTIMIZE CHECKBOX}    ${false}

    Log    Step 6
    ${settings}=   Create Dictionary    cameraSettingsOptimization=${true}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${ALLOW SYSTEM OPTIMIZE CHECKBOX}    ${true}

    Log    Step 7
    ${settings}=   Create Dictionary    autoDiscoveryEnabled=${false}   statisticsAllowed=${false}    cameraSettingsOptimization=${false}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${SEND ANONYMOUS USAGE CHECKBOX}    ${false}
    Checkbox Is Selected     ${ALLOW SYSTEM OPTIMIZE CHECKBOX}    ${false}

    Log    Step 8
    Reset Settings To Default    ${system['token']}    ${server url}
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${true}
    Checkbox Is Selected     ${SEND ANONYMOUS USAGE CHECKBOX}    ${true}
    Checkbox Is Selected     ${ALLOW SYSTEM OPTIMIZE CHECKBOX}    ${true}

13. Checking the dependency of system settings checkboxes
    [Tags]    C69742
    Log    Preconditions
    Reset Settings To Default    ${system['token']}    ${server url}

    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${True}
    Checkbox Is Selected     ${SEND ANONYMOUS USAGE CHECKBOX}    ${True}
    Checkbox Is Selected     ${ALLOW SYSTEM OPTIMIZE CHECKBOX}    ${True}

    Log    Step 1
    Change Setting    ${ENABLE AUTO DISCOVERY CHECKBOX}
    Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${False}
    Checkbox Is Selected     ${SEND ANONYMOUS USAGE CHECKBOX}    ${True}
    Checkbox Is Selected     ${ALLOW SYSTEM OPTIMIZE CHECKBOX}    ${True}

    Log    Step 2
    Change Setting    ${SEND ANONYMOUS USAGE CHECKBOX}
    Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${False}
    Checkbox Is Selected     ${SEND ANONYMOUS USAGE CHECKBOX}    ${False}
    Checkbox Is Selected     ${ALLOW SYSTEM OPTIMIZE CHECKBOX}    ${True}

    Log    Step 3
    Change Setting    ${ALLOW SYSTEM OPTIMIZE CHECKBOX}
    Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${False}
    Checkbox Is Selected     ${SEND ANONYMOUS USAGE CHECKBOX}    ${False}
    Checkbox Is Selected     ${ALLOW SYSTEM OPTIMIZE CHECKBOX}    ${False}

    Log    Step 4
    Reload Page
    Wait Until Settings Are Visible
    Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${True}
    Checkbox Is Selected     ${SEND ANONYMOUS USAGE CHECKBOX}    ${True}
    Checkbox Is Selected     ${ALLOW SYSTEM OPTIMIZE CHECKBOX}    ${True}
    
14. Changes made in the thick client are displayed in the security block in Cloud Portal
    [Tags]    C65723
    Log    Preconditions
    Reset Settings To Default    ${system['token']}    ${server url}

    Log    Step 1
    ${settings}=   Create Dictionary    autoDiscoveryEnabled=${false}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Log in to system    ${system}    ${system}[owner]
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${False}

    Log    Step 2
    ${settings}=   Create Dictionary    auditTrailEnabled=${true}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${ENABLE AUDIT TRAIL CHECKBOX}    ${True}

    Log    Step 3
    ${settings}=   Create Dictionary    trafficEncryptionForced=${true}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${ALLOW ONLY SECURE CHECKBOX}    ${True}

    Log    Step 4
    ${settings}=   Create Dictionary    videoTrafficEncryptionForced=${true}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    ${True}

    Log    Step 5
    ${settings}=   Create Dictionary    videoTrafficEncryptionForced=${False}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    ${False}

    Log    Step 6
    ${settings}=   Create Dictionary    trafficEncryptionForced=${False}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${ALLOW ONLY SECURE CHECKBOX}    ${False}

    Log    Step 7
    ${settings}=   Create Dictionary    sessionLimitMinutes=${30}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${True}
    ${value}=   Get Value    ${TIME NUMBER INPUT}
    Run Keyword If    ${value} != 30    Fail
    
    Log    Step 8
    ${settings}=   Create Dictionary    sessionLimitMinutes=${0}
    Set System Settings    ${server url}    ${settings}   ${system}[token]
    Reload Page
    Wait Until Settings Are Visible
    Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${False}

15. Security block is available for administrator or owner
    [Tags]    C65697
    Log    Preconditions
    Reset Settings To Default    ${system['token']}    ${server url}

    Log    Step 1, 2
    FOR    ${user}    IN    ${system}[owner]    ${system}[cloud users][cloudAdmin]
    Log in to user and system    ${user}    ${system}[cloud id]
        Wait Until Settings Are Visible    timeout=60
        Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
        # Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}${visible}//label    disabled    true
        Checkbox Is Selected     ${ENABLE AUDIT TRAIL CHECKBOX}    ${True}
        Checkbox Is Selected     ${ALLOW ONLY SECURE CHECKBOX}    ${False}
        Checkbox Is Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    ${False}
        Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${False}
        Log Out
    END

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

#System settings block view for different System versions
#    [Tags]    C69743    C65829    cloud    system settings    
#    ${rand}=   Generate Random String
#    ${4.0 system}=   Create Base System    system_4.0_${rand}    image=${image 4.0}    owner=${EMAIL OWNER}
#    Set Suite Variable    ${4.0 cont}    ${4.0 system}[cont]
#    ${3.2 system id}=   Get Cloud System Id    ${3.2 system url}    ${system}[local auth]
#    ${ids}=   Create List    ${3.2 system id}    ${4.0 system}[cloud id]
#    ${urls}=   Create List    ${3.2 system url}    https://${QABURBANK IP}:${4.0 system}[port]
#    Common Restart Logout    ${ENV}
#    FOR    ${url}    ${id}    IN ZIP    ${urls}    ${ids}
#        Set System Settings    ${system['local auth']}    ${url}     ${default settings}
#        Log in to user and system    ${EMAIL OWNER}    ${id}
#        Reload Page
#        Run Keyword If    '''${url}''' == '''${3.2 system url}'''    Wait Until Settings Are Visible    timeout=60    old system=True
#        ...    ELSE    Wait Until Settings Are Visible    timeout=60    old system=False
#        Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${True}
#        Checkbox Is Selected     ${SEND ANONYMOUS USAGE CHECKBOX}    ${True}
#        Checkbox Is Selected     ${ALLOW SYSTEM OPTIMIZE CHECKBOX}    ${True}
#        Checkbox Is Selected     ${ENABLE AUDIT TRAIL CHECKBOX}    ${True}
#
#        Changing setting changes it on server    ${ENABLE AUTO DISCOVERY CHECKBOX}    autoDiscoveryEnabled    ${url}
#        Changing setting changes it on server    ${SEND ANONYMOUS USAGE CHECKBOX}    statisticsAllowed    ${url}
#        Changing setting changes it on server    ${ALLOW SYSTEM OPTIMIZE CHECKBOX}    cameraSettingsOptimization    ${url}
#        Changing setting changes it on server    ${ENABLE AUDIT TRAIL CHECKBOX}    auditTrailEnabled    ${url}
#        Log Out
#    END
#
#    Delete Docker Server    ${4.0 system}[id]

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
    
# The testcase below is retired - no dependency of checkboxes is expected
# Checking the dependency of security settings checkboxes
    # [Tags]    C65700    cloud    webadmin    system settings    
    # Log    Preconditions
    # Set System Settings    ${system['local auth']}    ${server url}    ${default settings}
    
    # Log    Step 1
    # Log in to system    ${system}    ${system}[owner]
    # Wait Until Settings Are Visible    timeout=60
    # Elements Should Not Be Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    # Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}${visible}//label    disabled    true
    # Checkbox Is Selected     ${ENABLE AUTO DISCOVERY CHECKBOX}    ${True}
    # Checkbox Is Selected     ${ALLOW ONLY SECURE CHECKBOX}    ${False}
    # Checkbox Is Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    ${False}
    # Checkbox Is Selected     ${LIMIT SESSION DURATION CHECKBOX}    ${False}

    # Log    Step 2
    # Change Setting    ${ALLOW ONLY SECURE CHECKBOX}
    # Wait Until Elements Are Visible    ${SAVE BUTTON}    ${CANCEL BUTTON}
    # Checkbox Is Selected     ${ALLOW ONLY SECURE CHECKBOX}    ${True}
    # Run Keyword And Expect Error    *    Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}${visible}//label    disabled    true
    
    # Log    Step 3
    # Change Setting    ${ENCRYPT VIDEO TRAFFIC CHECKBOX}
    # Wait Until Element is Visible    ${ENCRYPTING VIDEO WARNING}
    # Checkbox Is Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    ${True}
    # Element Style Should Be    ${ENCRYPTING VIDEO WARNING}    color    ${ERROR COLOR WITH OPACITY}
    
    # Log    Step 4
    # Change Setting    ${ALLOW ONLY SECURE CHECKBOX}    buttons=False
    # Element Attribute Value Should Be     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}${visible}//label    disabled    true
    # Checkbox Is Selected     ${ENCRYPT VIDEO TRAFFIC CHECKBOX}    ${False}
    # Checkbox Is Selected     ${ALLOW ONLY SECURE CHECKBOX}    ${False}

    # Page Should Not Contain Element    ${ENCRYPTING VIDEO WARNING}
    # Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    # Wait until elements are not visible    ${SAVE BUTTON}    ${CANCEL BUTTON}

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

#Security block view for 3 dot 2 System
#    [Tags]    C65829    cloud    system settings    
#    Log    Preconditions
#    ${settings}=   Create Dictionary    auditTrailEnabled=true
#    Set System Settings via API    ${system['local auth']}    ${3.2 system url}    ${settings}
#    ${3.2 sys id}=   Get Cloud System Id    ${3.2 system url}    ${system}[local auth]
#
#    Log in to user and system    ${EMAIL OWNER}    ${3.2 sys id}
#    Wait Until Settings Are Visible    old system=True
#    Checkbox Is Selected     ${ENABLE AUDIT TRAIL CHECKBOX}    ${True}

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