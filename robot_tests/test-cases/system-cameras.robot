*** Settings ***
Resource          ../resource.robot
Suite Setup       Camera Suite Setup
Test Setup        Camera Test Setup
Test Teardown     reset cameras and log out
Suite Teardown    Run Keyword and Ignore Error    Camera Suite Teardown
Force Tags        system    cameras


*** Test Cases ***
1. Camera settings is available to owner admin and custom with permission
    [Tags]    C76252    
    Verify on Cameras Page
    Log Out     add_delay=1
    
    Log in to user and system    ${system}[cloud users][cloudAdmin]    ${system}[cloud id]
    Go To Cameras
    Verify on Cameras Page
    Log Out     add_delay=1
    
    Log in to user and system    ${custom cameras}    ${system}[cloud id]
    Go To Cameras
    Wait Until Elements are Visible
    ...    ${CAMERAS VIEW BUTTON}
    ...    ${EDITABLE TITLE}
    ...    ${ASPECT RATIO DROPDOWN}
    ...    ${ROTATION DROPDOWN}
    ...    ${ENABLE AUDIO CHECKBOX}
    ...    ${EDIT CREDENTIALS BUTTON}
    ...    ${RECORDING CHECK BOX}
    Log Out

    # Not currentlty being tested
    #Log in to user and system    ${EMAIL CUSTOM CAMERAS LIMITED}    ${system}[cloud id]
    #Wait Until Element is Visible    ${CAMERAS LINK}
    #Click Link    ${CAMERAS LINK}
    #Wait Until Elements are Visible
    #...    ${CAMERAS VIEW BUTTON}
    #...    ${EDITABLE TITLE}
    #...    ${ASPECT RATIO DROPDOWN}
    #...    ${ROTATION DROPDOWN}
    #...    ${ENABLE AUDIO CHECKBOX}
    #...    ${EDIT CREDENTIALS BUTTON}
    #...    ${RECORDING CHECK BOX}

2. Camera settings is not available to any viewers
    [Tags]    C76253
    [Setup]    Log in to user and system    ${system}[cloud users][viewer]    ${system}[cloud id]
    Element should not be visible    ${CAMERAS LINK}
    Log Out     add_delay=1

    Log in to user and system    ${system}[cloud users][liveViewer]    ${system}[cloud id]
    Element should not be visible    ${CAMERAS LINK}
    Log Out     add_delay=1

    Log in to user and system    ${system}[cloud users][advancedViewer]    ${system}[cloud id]
    Element should not be visible    ${CAMERAS LINK}
    Log Out    add_delay=1

    Log in to user and system    ${system}[cloud users][custom]    ${system}[cloud id]
    Element should not be visible    ${CAMERAS LINK}
    Log Out

3. Camera settings is not available by direct link to any viewers
    [Tags]    C76255
    [Setup]    Log in to user and system    ${system}[cloud users][viewer]    ${system}[cloud id]
    ${camera id}    Get Camera Attribute By Camera Name    ${system}[local auth]    http://${QA BURBANK IP}:${system}[port]    good cam    id
    Go to    ${ENV}/systems/${system}[cloud id]/cameras/${camera id}
    Wait Until Elements Are Visible With Retry   ${PAGE NOT FOUND}    ${TAKE ME HOME}
    Element should not be visible    ${CAMERAS LINK}

    Log Out     add_delay=1

    Log in to user and system    ${system}[cloud users][liveViewer]    ${system}[cloud id]
    Go to    ${ENV}/systems/${system}[cloud id]/cameras/${camera id}
    Wait Until Elements Are Visible With Retry    ${PAGE NOT FOUND}    ${TAKE ME HOME}
    Element should not be visible    ${CAMERAS LINK}
    Log Out     add_delay=1

    Log in to user and system    ${system}[cloud users][advancedViewer]    ${system}[cloud id]
    Go to    ${ENV}/systems/${system}[cloud id]/cameras/${camera id}
    Wait Until Elements Are Visible With Retry    ${PAGE NOT FOUND}    ${TAKE ME HOME}
    Element should not be visible    ${CAMERAS LINK}
    Log Out     add_delay=1

    Log in to user and system    ${system}[cloud users][custom]    ${system}[cloud id]
    Go to    ${ENV}/systems/${system}[cloud id]/cameras/${camera id}
    Wait Until Elements Are Visible With Retry    ${PAGE NOT FOUND}    ${TAKE ME HOME}
    Element should not be visible    ${CAMERAS LINK}
    Log Out

4. Camera settings are not available by direct url to unauthorized user
    [Tags]    C79007
    [Setup]    Log in    ${no perm}    ${password}
    ${camera id}    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    good cam    id
    Go to    ${ENV}/systems/${system}[cloud id]/cameras/${camera id}
    ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    <br>    ${EMPTY}
    ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    \n    ${EMPTY}
    FOR    ${x}   IN RANGE    4
        ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    ${SPACE}${SPACE}    ${SPACE}
    END        
    Wait Until Elements Are Visible    ${SYSTEM NO ACCESS}    //div[normalize-space()\="${THIS LINK IS BROKEN TEXT}"]    //button//a[@href\='/']/..

5. No cameras placeholder
    [Tags]    C76257
    [Setup]    Camera Test Setup    user=${system3}[owner]    system=${system3}[cloud id]

    Wait Until Elements Are Visible    
    ...    ${NO CAMERAS PLACEHOLDER IMAGE}
    ...    ${NO CAMERAS TITLE}            
    ...    ${NO CAMERAS MESSAGE}       

6. Camera status match server
    [Tags]    C76256
    @{auth}=   Create List    admin    ${BASE PASSWORD}

    Element Should Not Be Visible    //nx-level-3-item//span[contains(text(),"good cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_recording.svg"]
    Element Should Not Be Visible    //nx-level-3-item//span[contains(text(),"good cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_offline.svg"]
    Element Should Not Be Visible    //nx-level-3-item//span[contains(text(),"good cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_unauthorized.svg"]
    
    Wait Until Elements Are Visible With Retry   
    #...    //nx-level-3-item//span[contains(text(),"no audio cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_recording.svg"]
    ...    //nx-level-3-item//span[contains(text(),"offline cam")]/..//svg-icon[@data-src="/static/images/icons/standard/device_offline.svg"]
    ...    //nx-level-3-item//span[contains(text(),"unauth cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_unauthorized.svg"]

    ${value}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    unauth cam    status
    Should Be Equal As Strings    ${value}    Unauthorized

    # ${value}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    no audio cam    scheduleEnabled
    # Should Be True    ${value}

    ${value}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    offline cam    status
    Should Be Equal As Strings    ${value}    Offline

7. Warning dialog appears when changes are made on navigating away and works correctly
    [Tags]    C76416
    Log    Step 1
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Log    Step 2
    Click Link    ${SERVERS LINK}
    Wait Until Elements are Visible
    ...    ${APPLY CHANGES BUTTON}     
    ...    ${DISCARD CHANGES BUTTON}   
    ...    ${CANCEL CHANGES BUTTON}
    ...    ${APPLY CHANGES CLOSE BUTTON}
    ...    ${APPLY CHANGES QUESTION}  
    Log    Step 3
    Click Button    ${APPLY CHANGES CLOSE BUTTON}
    Wait Until Elements Are Not Visible  
    ...    ${APPLY CHANGES BUTTON}     
    ...    ${DISCARD CHANGES BUTTON}   
    ...    ${CANCEL CHANGES BUTTON}
    ...    ${APPLY CHANGES CLOSE BUTTON}
    ...    ${APPLY CHANGES QUESTION}  
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    ${status}=   Get Camera Attribute By Camera Name    ${system}[local auth]    http://${QA BURBANK IP}:${system}[port]    good cam    scheduleEnabled
    Should Be Equal    ${status}    ${False}
    Log    Step 4
    Click Link    ${SERVERS LINK}
    Wait Until Elements are Visible
    ...    ${APPLY CHANGES BUTTON}     
    ...    ${DISCARD CHANGES BUTTON}   
    ...    ${CANCEL CHANGES BUTTON}
    ...    ${APPLY CHANGES CLOSE BUTTON}
    ...    ${APPLY CHANGES QUESTION}  
    Click Button    ${DISCARD CHANGES BUTTON}   
    Verify on Servers Page
    Go to System Administration
    Go To Cameras
    Verify on Cameras Page
    Select Camera By Name    good cam
    ${status}=   Get Camera Attribute By Camera Name    ${system}[local auth]    http://${QA BURBANK IP}:${system}[port]    good cam    scheduleEnabled
    Should Be Equal    ${status}    ${False}
    Log    Step 5
    Toggle Recording
    Click Link    ${SERVERS LINK}
    Wait Until Elements are Visible
    ...    ${APPLY CHANGES BUTTON}     
    ...    ${DISCARD CHANGES BUTTON}   
    ...    ${CANCEL CHANGES BUTTON}
    ...    ${APPLY CHANGES CLOSE BUTTON}
    ...    ${APPLY CHANGES QUESTION}  
    Click Button    ${CANCEL CHANGES BUTTON}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    ${status}=   Get Camera Attribute By Camera Name    ${system}[local auth]    http://${QA BURBANK IP}:${system}[port]    good cam    scheduleEnabled
    Should Be Equal    ${status}    ${False}
    Log    Step 6
    Click Link    ${SERVERS LINK}
    Wait Until Elements are Visible
    ...    ${APPLY CHANGES BUTTON}     
    ...    ${DISCARD CHANGES BUTTON}   
    ...    ${CANCEL CHANGES BUTTON}
    ...    ${APPLY CHANGES CLOSE BUTTON}
    ...    ${APPLY CHANGES QUESTION}  
    Click Button    ${APPLY CHANGES BUTTON}  
    sleep    5
    ${status}=   Get Camera Attribute By Camera Name    ${system}[local auth]    http://${QA BURBANK IP}:${system}[port]    good cam    scheduleEnabled
    Should Be Equal    ${status}    ${True}
    Log    Step 7
    Go to System Administration
    Go To Cameras
    Select Camera By Name    good cam
    Verify Recording Controls Are Open
    Toggle Recording
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    ${status}=   Get Camera Attribute By Camera Name    ${system}[local auth]    http://${QA BURBANK IP}:${system}[port]    good cam    scheduleEnabled
    Should Be Equal    ${status}    ${False}
    
8. Rename Camera
    [Tags]    C76259    CLOUD-8269      
    Verify on Cameras Page
    Select Camera by Name    good cam
    Rename System or Hardware    good cam name changed 1
    Wait Until Elements are Visible    
    ...    ${SYSTEM SAVE}
    ...    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=    Create List    admin    ${password}
    Camera Name Should be    ${auth}    https://${QA BURBANK IP}:${system}[port]    ${AUTO TESTS GOOD CAM ID}    good cam name changed 1
    Wait Until Element Contains    ${EDITABLE TITLE}    good cam name changed 1
    Log Out     add_delay=1

    Log in to user and system    ${system}[cloud users][cloudAdmin]    ${system}[cloud id]
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam name changed 1
    Rename System or Hardware    good cam name changed 2
    Wait Until Elements are Visible    
    ...    ${SYSTEM SAVE}
    ...    ${SYSTEM CANCEL}
    Click Button    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=    Create List    admin    ${password}
    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    good cam name changed 2    id
    Camera Name Should be    ${auth}    https://${QA BURBANK IP}:${system}[port]    ${AUTO TESTS GOOD CAM ID}    good cam name changed 2
    Wait Until Element Contains    ${EDITABLE TITLE}    good cam name changed 2
    Log Out     add_delay=1

    Log in to user and system    ${system}[cloud users][cloudAdmin]    ${system}[cloud id]
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam name changed 2
    Rename System or Hardware    good cam name changed 3
    Wait Until Elements are Visible    
    ...    ${SYSTEM SAVE}
    ...    ${SYSTEM CANCEL}
    Click Button    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=    Create List    admin    ${password}
    Camera Name Should be    ${auth}    https://${QA BURBANK IP}:${system}[port]    ${AUTO TESTS GOOD CAM ID}    good cam name changed 3  
    Wait Until Element Contains    ${EDITABLE TITLE}    good cam name changed 3
    
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${camera id}    Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    good cam name changed 3    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${auth}    ${camera id}    cameraName    good cam

9. Name change in client changes in cloud
    [Tags]    C76261
    Verify on Cameras Page
    Select Camera by Name    good cam
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${camera id}    Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    good cam    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${auth}    ${camera id}    cameraName    api name
    Reload Page
    Wait Until Element Is Visible    ${EDITABLE TITLE}
    Element Text Should Be  ${EDITABLE TITLE}   api name
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${auth}    ${camera id}    cameraName    good cam

10. View button
    [Tags]    C76262     
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    Verify on Cameras Page
    Select Camera by Name    good cam
    ${camera id}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    good cam    id
    # The above keyword returns the id with {} and we don't want those for the url
    ${camera id}=   Remove String    ${camera id}    }     {
    Click Button    ${CAMERAS VIEW BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${system}[cloud id]/view/${camera id}
    
    Go To    ${ENV}/systems/${system}[cloud id]
    Go To Cameras
    Verify on Cameras Page
    Select Camera by Name    unauth cam
    ${camera id}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    unauth cam    id
    ${camera id}=   Remove String    ${camera id}    }     {
    Capture Page Screenshot
    Click Button    ${CAMERAS VIEW BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${system}[cloud id]/view/${camera id}

    Go To    ${ENV}/systems/${system}[cloud id]
    Go To Cameras
    Verify on Cameras Page
    Select Camera by Name    offline cam
    ${camera id}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    offline cam    id
    ${camera id}=   Remove String    ${camera id}    }     {
    Click Button    ${CAMERAS VIEW BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${system}[cloud id]/view/${camera id}


11. Detailed Info
    [Tags]    C76274
    Verify on Cameras Page
    Click Button    ${CAMERAS DETAILED INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${system}[cloud id]/health
    Log Out     add_delay=1

    Log in to user and system    ${system}[cloud users][cloudAdmin]    ${system}[cloud id]
    Go To Cameras
    Verify on Cameras Page
    Click Button    ${CAMERAS DETAILED INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${system}[cloud id]/health
    Log Out

12. Aspect Ratio
    [Tags]      
    Verify on Cameras Page
    Select Camera By Name    good cam
    Change Aspect Ratio    1:1
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Aspect Ratio Should Be    1:1
    Reload Page
    Aspect Ratio Should Be    1:1

    Change Aspect Ratio    Auto
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}


13. Rotation
    [Tags]      
    Select Camera By Name    good cam
    Verify on Cameras Page
    Change Rotation    90˚
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Rotation Should Be    90˚
    Reload Page
    Rotation Should Be    90˚

    Change Rotation    0˚
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}

14. Audio enable Disabled
    [Tags]    C76378        
    Verify on Cameras Page
    Select Camera by Name    good cam
    Set Checkbox Value    ${ENABLE AUDIO CHECKBOX}//input    True
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${cams}=   Get Cameras    ${auth}    https://${QA BURBANK IP}:${system}[port]
    FOR    ${camera}  IN  @{cams}
        ${audio enabled}=    Set Variable If    '''${camera['name']}'''=='''good cam'''    ${camera['audioEnabled']}
        Exit For Loop If    '''${audio enabled}'''=='''True'''
    END
    Should Be True    ${audio enabled}
    Audio Enabled Should Be    True
    Reload Page
    Audio Enabled Should Be    True

15. Audio unavailable
    [Tags]     C76376
    Skip    No no-audio cams exist
    Go To Cameras
    Verify on Cameras Page
    Select Camera by Name    good cam
    Wait Until Element is Enabled    ${ENABLE AUDIO CHECKBOX}
    Select Camera by Name    no audio cam
    Wait Until Element is Visible    ${ENABLE AUDIO CHECKBOX}//label[@disabled]

16. No image placeholder shows for offline and unauthorized cameras
    [Tags]    C76275
    Verify on Cameras Page
    Select Camera by Name    unauth cam
    Wait Until Elements are Visible    
    ...    ${NO IMAGE PLACEHOLDER}
    ...    ${CAMERA ERROR ICON}
    ...    ${CAMERA ERROR TEXT}
    Element Text Should Be    ${CAMERA ERROR TEXT}    ${CAMERA UNAUTHORIZED TEXT}

    Select Camera by Name    offline cam
    Wait Until Elements are Visible    
    ...    ${NO IMAGE PLACEHOLDER}
    ...    ${CAMERA ERROR ICON}
    ...    ${CAMERA ERROR TEXT}
    Element Text Should Be    ${CAMERA ERROR TEXT}    ${CAMERA OFFLINE TEXT}    

17. Edit credentials form Close and Cancel buttons
    [Tags]    C78236
    Verify on Cameras Page

    Click Button    ${EDIT CREDENTIALS BUTTON}
    Verify Authentication Form
    Click Button    ${EDIT CREDENTIALS X BUTTON}
    Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}

    Click Button    ${EDIT CREDENTIALS BUTTON}
    Verify Authentication Form
    Click Button    ${EDIT CREDENTIALS CANCEL BUTTON}
    Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}

18. Changes made in Image settings in thick client appear correctly on cloud portal
    [Tags]    C76374
    Select Camera by Name    good cam
    Verify on Cameras Page
    Capture Page Screenshot
    Element Should Contain    ${ASPECT RATIO DROPDOWN}    ${AUTO TEXT}
    Element Should Contain    ${ROTATION DROPDOWN}    0˚
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${camera id}=   Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    good cam    id
    ${data}=   evaluate    json.loads('''[{"name":"overrideAr","value":"1","resourceId":"${camera id}"},{"name":"rotation","value":"90","resourceId":"${camera id}"}]''')
    Set All Camera Add Params    https://${QA BURBANK IP}:${system}[port]    ${auth}    ${data}
    Reload Page
    Verify on Cameras Page
    Capture Page Screenshot
    Element Should Contain    ${ASPECT RATIO DROPDOWN}    1:1
    Element Should Contain    ${ROTATION DROPDOWN}    90˚

19. Recording toggle shows correct options
    [Tags]    C76401    
    Verify on Cameras Page
    Select Camera by Name    offline cam
    Verify on Cameras Page
    Toggle Recording
    Verify recording controls are open
    Wait Until Elements Are Visible
    ...    ${SYSTEM SAVE}
    ...    ${SYSTEM CANCEL}
    ${checked}    Get Element Attribute    ${RECORD MOTION RADIO BUTTON}    value
    Should Be Equal    ${checked}    2

    Select Camera by Name    good cam
    Wait Until Element is Visible    ${DISCARD CHANGES BUTTON}
    Click Button     ${DISCARD CHANGES BUTTON}
    Verify on Cameras Page
    Toggle Recording
    Verify recording controls are open
    Wait Until Elements Are Visible
    ...    ${SYSTEM SAVE}
    ...    ${SYSTEM CANCEL}
    ${checked}    Get Element Attribute    ${RECORD MOTION RADIO BUTTON}    value
    Should Be Equal    ${checked}    2

    Select Camera by Name    unauth cam
    Wait Until Element is Visible    ${DISCARD CHANGES BUTTON}
    Click Button     ${DISCARD CHANGES BUTTON}
    Verify on Cameras Page
    Toggle Recording
    Verify recording controls are open
    ${checked}    Get Element Attribute    ${RECORD MOTION RADIO BUTTON}    value
    Should Be Equal    ${checked}    2

20. Recording Status
    [Tags]    C76391    deb
    [Setup]    Camera Test Setup    user=${system2}[owner]    system=${system2}[cloud id] 
    Select Camera by Name    no license cam
    Verify on Cameras Page
    Select Camera By Name    no license cam
    Wait Until Element Is Visible    ${RECORDING CHECK BOX}
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    False
    Wait Until Element Is Visible    ${LICENSE REQUIRED WARNING}

    Go to    ${ENV}/systems/${system}[cloud id]
    Go To Cameras
    Verify on Cameras Page
    Select Camera By Name    good cam
    Wait Until Element Is Visible    ${RECORDING CHECK BOX}
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    False
    Wait Until Element Is Visible    ${ONE LICENSE WILL BE USED WARNING}

    # Select Camera By Name    no audio cam
    Wait Until Element Is Visible    ${RECORDING CHECK BOX}
    Toggle Recording
    Verify recording controls are open
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Verify recording controls are open
    
21. Record Always
    [Tags]    C76408
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Verify recording controls are open
    ${value}    Get Element Attribute     ${RECORD ALWAYS RADIO BUTTON}    value
    Should Be Equal As Strings    ${value}    0
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Click Element    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Element Attribute     ${RECORD ALWAYS RADIO BUTTON}    value
    Should Be Equal As Strings    ${state}    2
    Wait Until Element Is Visible    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]

    Toggle Recording
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

22. Record Motion
    [Tags]
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Verify Recording Controls Are Open
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Sleep    5
    #Click Element    ${RECORD MOTION RADIO BUTTON}/following-sibling::span
    Log To Console    clicked the radio button
    sleep    30
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    sleep    5
    Reload Page
    Verify on Cameras Page
    ${state}    Get Element Attribute    ${RECORD MOTION RADIO BUTTON}    value
    Log To Console    got elemenet value
    sleep    30
    Should Be Equal As Strings    ${state}    2
    Wait Until Element Is Visible    ${RECORD MOTION RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]

    Toggle Recording
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

23. Record Motion + Low Quality
    [Tags]    C76408
    Verify on Cameras Page    
    Select Camera By Name    good cam
    Toggle Recording
    Verify Recording Controls Are Open
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Click Element    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Element Attribute    ${RECORD MOTION LOW QUALITY RADIO BUTTON}    value
    Should Be Equal As Strings    ${state}    2
    Wait Until Element Is Visible    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    Toggle Recording
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    
24. Check recording triple state
    [Tags]
    #[Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    ${data} =    Evaluate    json.loads('''${TRIPLE STATE CAM JSON 1}''')
    Set All Camera Attributes    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${data}
    Verify on Cameras Page
    Select Camera By Name    triple state cam
    # Toggle Recording
    # Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    # Click Button    ${SYSTEM SAVE}
    # Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Wait Until Elements are Visible
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD MOTION RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    # Toggle Recording
    # Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    # Click Button    ${SYSTEM SAVE}
    # Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    ${data} =    Evaluate    json.loads('''${GOOD CAM JSON 1}''')
    Set All Camera Attributes    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${data}

25. Recording Mode functionality (with recording schedule set)
    [Tags]    C78982
    # [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    # ${camera id}=    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    good cam    id
    ${data} =    Evaluate    json.loads('''${TRIPLE STATE CAM JSON 1}''')
    Set All Camera Attributes    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${data}
    Verify on Cameras Page
    Select Camera By Name     triple state cam
    # Toggle Recording
    # Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    # Click Button    ${SYSTEM SAVE}
    # Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Wait Until Elements are Visible
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD MOTION RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Set Checkbox Value    ${RECORD ALWAYS RADIO BUTTON}    True
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Wait Until Element Is Visible    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    # Toggle Recording
    # Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    # Click Button    ${SYSTEM SAVE}
    # Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    ${data} =    Evaluate    json.loads('''${GOOD CAM JSON 1}''')
    Set All Camera Attributes    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${data}

26. Disabled Motion With Recording
    [Tags]    C78983
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${camera id}    Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    good cam    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${auth}    ${camera id}    motionType    8
    Reload Page
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Element Should Be Enabled    ${RECORD ALWAYS RADIO BUTTON}
    Wait Until Elements are Visible    ${RECORD MOTION RADIO BUTTON}/..    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/..
    Element Should Be Disabled    ${RECORD MOTION LOW QUALITY RADIO BUTTON}
    Element Should Be Disabled    ${RECORD MOTION RADIO BUTTON}
    Wait Until Element Is Visible    ${MOTION DETECTION DISABLED WARNING}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Wait Until Element Is Visible    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    Wait Until Element is Visible    ${ENABLE MOTION DETECTION BUTTON}
    Click Button    ${ENABLE MOTION DETECTION BUTTON}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    Toggle Recording
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Elements Are Visible    ${NO UNSAVED CHANGES}
    ${status}=   Get Camera Attribute By Camera Name    ${system}[local auth]    http://${QA BURBANK IP}:${system}[port]    good cam    scheduleEnabled
    Should Be Equal    ${status}    ${False}
    
27. Change FPS
    [Tags]
    Verify on Cameras Page
    Select Camera By Name    good cam
    #Temp removed for uggins
    #Toggle Recording
    Toggle Recording
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Wait Until Element is Visible    ${FPS INPUT}
    Input Text    ${FPS INPUT}    20
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${fps}    Get Element Attribute    ${FPS INPUT}    value
    Should Be Equal As Numbers    ${fps}    20
    Toggle Recording
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

28. Erasing current FPS has placeholder
    [Tags]    C76409
    Skip    Skipped until we learn if - Current should have been removed
    Verify on Cameras Page
    Select Camera By Name    good cam
    #Temp removed for uggins
    #Toggle Recording
    Toggle Recording
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Wait Until Element is Visible    ${FPS INPUT}
    Delete All Text    ${FPS INPUT}
    Input Text    ${FPS INPUT}    27
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Delete All Text    ${FPS INPUT}
    Element Attribute Value Should Be    ${FPS INPUT}    placeholder    30 - ${CURRENT TEXT}
    Click Button    ${SYSTEM CANCEL}
    Toggle Recording
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

29. Change Quality
    [Tags]    C76410
    #Skip    No no audio cam available
    Verify on Cameras Page
    Select Camera By Name    good cam    #no audio cam
    Toggle Recording
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Wait Until Element is Visible    ${QUALITY DROPDOWN} 
    Click Element    ${QUALITY DROPDOWN} 
    Wait Until Element Is Visible    ${QUALITY DROPDOWN}/following-sibling::div//a/span[contains(text(),"${BEST TEXT}")]
    Click Element    ${QUALITY DROPDOWN}/following-sibling::div//a/span[contains(text(),"${BEST TEXT}")]
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Wait Until Element Contains    ${QUALITY DROPDOWN}    ${BEST TEXT}
    Toggle Recording
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

30. Enable/disable motion detection with recording off
    [Tags]    C78981
    Verify on Cameras Page
    Select Camera By Name    good cam
    Verify on Cameras Page
#    Toggle Recording
#    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
#    Click Button    ${SYSTEM SAVE}
#    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Wait Until Element Is Visible    ${DOT-MENU}
    Click Button    ${DOT-MENU}
    Wait Until Element is Visible    ${DISABLE MOTION DETECTION LINK}
    Click Link    ${DISABLE MOTION DETECTION LINK}
    Wait Until Element is Not Visible    ${DISABLE MOTION DETECTION LINK}
    Wait Until Element is Visible    ${ENABLE MOTION DETECTION BUTTON}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Wait Until Element is Visible    ${ENABLE MOTION DETECTION BUTTON}
    Reload Page
    Wait Until Element is Visible    ${ENABLE MOTION DETECTION BUTTON}
    Wait Until Element Is Not Visible    ${MOTION SENSITIVITY IMAGE}
    Click Button    ${ENABLE MOTION DETECTION BUTTON}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Wait Until Elements are Visible
    ...    ${CANVAS}
    ...    ${DOT-MENU}
    Reload Page
    Wait Until Elements are Visible
    ...    ${CANVAS}
    ...    ${DOT-MENU}
#    Toggle Recording
#    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
#    Click Button    ${SYSTEM SAVE}
#    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

31. Enable/disable motion detection with recording on
    [Tags]    C76398
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Click Button    ${SYSTEM SAVE}
    Verify on Cameras Page
    Wait Until Element Is Visible    ${DOT-MENU}
    Click Button    ${DOT-MENU}
    Wait Until Element is Visible    ${DISABLE MOTION DETECTION LINK}
    Click Link    ${DISABLE MOTION DETECTION LINK}
    Wait Until Element is Not Visible    ${DISABLE MOTION DETECTION LINK}
    Wait Until Element is Visible    ${ENABLE MOTION DETECTION BUTTON}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Wait Until Element is Visible    ${ENABLE MOTION DETECTION BUTTON}
    Reload Page
    Wait Until Element is Visible    ${ENABLE MOTION DETECTION BUTTON}
    Wait Until Element Is Not Visible    ${MOTION SENSITIVITY IMAGE}
    Click Button    ${ENABLE MOTION DETECTION BUTTON}
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Wait Until Elements are Visible
    ...    ${CANVAS}
    ...    ${DOT-MENU}
    Reload Page
    Wait Until Elements are Visible
    ...    ${CANVAS}
    ...    ${DOT-MENU}

#Record motion and record motion low quality radio buttons should be disabled

32. Placeholder shows when system is offline
    [Tags]    C76254    
    [Setup]    Offline Server Test Setup
    Wait Until Elements are Visible
    ...    ${OFFLINE PLACEHOLDER IAMGE}
    ...    ${OFFLINE TITLE}
    ...    ${OFFLINE MESSAGE}
    Log Out     add_delay=1

    Log in to user and system    ${system3}[cloud users][cloudAdmin]    ${system3}[cloud id]
    Wait Until Element is Visible    ${CAMERAS LINK}    timeout=5
    Click Link    ${CAMERAS LINK}
    Wait Until Elements are Visible
    ...    ${OFFLINE PLACEHOLDER IAMGE}
    ...    ${OFFLINE TITLE}
    ...    ${OFFLINE MESSAGE}
    Log Out    add_delay=1

    Log in to user and system    ${system2}[cloud users][custom]    ${system2}[cloud id]
    Element should not be visible    ${CAMERAS LINK}
    Log Out

33. Motion sensitivity block for cameras with different statuses
    [Tags]    C76418
    Verify on Cameras Page
    Select Camera By Name    offline cam
    Verify on Cameras Page
    Element Should Not Be Visible    ${MOTION SENSITIVITY IMAGE}

    Select Camera By Name    good cam
    Verify on Cameras Page
    Toggle Recording
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Wait Until Element Is Visible    ${MOTION SENSITIVITY IMAGE}

    Select Camera By Name    unauth cam
    Verify on Cameras Page
    Element Should Not Be Visible    ${MOTION SENSITIVITY IMAGE}

34. Recording Quality dropdown menu functionality for camera with schedule
    [Tags]    C76417
    # [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    ${data} =    Evaluate    json.loads('''${TRIPLE STATE CAM JSON 1}''')
    Set All Camera Attributes    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${data}
    Verify on Cameras Page
    Select Camera By Name    triple state cam
    # Toggle Recording
    # Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    # Click Button    ${SYSTEM SAVE}
    # Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Verify Recording Controls are Open
#    Wait Until Elements Are Visible
#    ...    ${RECORDING MODE ERROR}
#    ...    ${FPS ERROR}
#    ...    ${QUALITY ERROR}
    Element Should Contain    ${QUALITY DROPDOWN}/span    ${DIFFERENT VALUES TEXT}
    Click Button    ${QUALITY DROPDOWN}
    Wait Until Element Is Visible    ${QUALITY DROPDOWN}/following-sibling::div//a/span[contains(text(),"${HIGH TEXT}")]
    Click Element    ${QUALITY DROPDOWN}/following-sibling::div//a/span[contains(text(),"${HIGH TEXT}")]
    Wait Until Elements Are Visible    
    ...    ${SYSTEM SAVE}
    ...    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Visible    ${SAVE ERROR}

    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Set Checkbox Value    ${RECORD ALWAYS RADIO BUTTON}    True
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    ${data} =    Evaluate    json.loads('''${GOOD CAM JSON 1}''')
    Set All Camera Attributes    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${data}

35. UDP stream settings
    [Tags]    C79005
    Skip    UDP stream not available
    Verify on Cameras Page
    Select Camera By Name    UDP cam
    Log    1
    Rename System or Hardware    UDP cam changed
    Log    2
    Change Aspect Ratio    1:1 
    Change Rotation    90˚
    Log    3
    Toggle Recording
    Wait Until Elements Are Visible
    ...    ${RECORD ALWAYS RADIO BUTTON}/..           
    ...    ${RECORD MOTION RADIO BUTTON}/..      
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/..
    Wait Until Element Is Not Visible    ${FPS INPUT}     
    Wait Until Element Is Not Visible     ${QUALITY DROPDOWN}
    Log    4
    Set Checkbox Value    ${RECORD MOTION LOW QUALITY RADIO BUTTON}    True
    Log    5
    Disable Motion Detection
    Wait Until Element Is Not Visible    ${MOTION SENSITIVITY IMAGE}
    Log    6    
    Click Button    ${ENABLE MOTION DETECTION BUTTON}
    Wait Until Element Is Visible    ${MOTION SENSITIVITY IMAGE}
    
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    
    Log    1
    ${UDP id}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    UDP cam    id
    @{auth}=   Create List    admin    ${password}
    Camera Name Should Be    ${auth}    https://${QA BURBANK IP}:${system}[port]    ${UDP id}    UDP cam changed
    Wait Until Element Contains    ${EDITABLE TITLE}    UDP cam changed
    Log    2
    ${cameras}=   Get Cameras    ${auth}    https://${QA BURBANK IP}:${system}[port]
    FOR    ${camera}  IN  @{cameras}
        ${UDP json}=   Set Variable If    '''${camera['name']}'''=='''UDP cam changed'''    ${camera}
        Exit For Loop If    '''${camera['name']}'''=='''UDP cam changed'''
    END
    Should Be Equal As Strings    1    ${UDP json['addParams'][9]['value']}
    Should Be Equal As Strings    90    ${UDP json['addParams'][10]['value']}
    Wait Until Element Contains    ${ASPECT RATIO DROPDOWN}    1:1
    Wait Until Element Contains    ${ROTATION DROPDOWN}    90˚
    Log    3
    Should Be Equal As Strings    ${UDP json['scheduleEnabled']}    True
    Wait Until Elements Are Visible
    ...    ${RECORD ALWAYS RADIO BUTTON}/..           
    ...    ${RECORD MOTION RADIO BUTTON}/..      
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/..
    Log    4
    Should Be Equal As Strings    RT_Always    ${UDP json['scheduleTasks'][0]['recordingType']}
    Wait Until Element Is Visible    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    Log    5/6
    Should Be Equal As Strings    ${UDP json['motionType']}    0    
    Wait Until Element Is Visible    ${DOT-MENU}

36. RTSP stream settings
    [Tags]    C79002
    Skip    RTSP stream not available
    Verify on Cameras Page
    Select Camera By Name    RTSP cam
    Log    1
    Rename System or Hardware    RTSP cam changed
    Log    2
    Change Aspect Ratio    1:1 
    Change Rotation    90˚
    Log    3
    Toggle Recording
    Wait Until Elements Are Visible
    ...    ${RECORD ALWAYS RADIO BUTTON}/..           
    ...    ${RECORD MOTION RADIO BUTTON}/..      
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/..
    Wait Until Element Is Not Visible    ${FPS INPUT}     
    Wait Until Element Is Not Visible     ${QUALITY DROPDOWN}
    Log    4
    Set Checkbox Value    ${RECORD MOTION LOW QUALITY RADIO BUTTON}    True
    Log    5
    Disable Motion Detection
    Wait Until Element Is Not Visible    ${MOTION SENSITIVITY IMAGE}
    Log    6    
    Click Button    ${ENABLE MOTION DETECTION BUTTON}
    Wait Until Element Is Visible    ${MOTION SENSITIVITY IMAGE}
    
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    
    Log    1
    ${RSTP id}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    RSTP cam    id
    @{auth}=   Create List    admin    ${password}
    Camera Name Should Be    ${auth}    https://${QA BURBANK IP}:${system}[port]    ${RSTP id}    RSTP cam changed
    Wait Until Element Contains    ${EDITABLE TITLE}    RSTP cam changed
    Log    2
    ${cameras}=   Get Cameras    ${auth}    https://${QA BURBANK IP}:${system}[port]
    FOR    ${camera}  IN  @{cameras}
        ${RSTP json}=   Set Variable If    '''${camera['name']}'''=='''RSTP cam changed'''    ${camera}
        Exit For Loop If    '''${camera['name']}'''=='''RSTP cam changed'''
    END
    Should Be Equal As Strings    1    ${RSTP json['addParams'][9]['value']}
    Should Be Equal As Strings    90    ${RSTP json['addParams'][10]['value']}
    Wait Until Element Contains    ${ASPECT RATIO DROPDOWN}    1:1
    Wait Until Element Contains    ${ROTATION DROPDOWN}    90˚
    Log    3
    Should Be Equal As Strings    ${RSTP json['scheduleEnabled']}    True
    Wait Until Elements Are Visible
    ...    ${RECORD ALWAYS RADIO BUTTON}/..           
    ...    ${RECORD MOTION RADIO BUTTON}/..      
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/..
    Log    4
    Should Be Equal As Strings    RT_Always    ${RSTP json['scheduleTasks'][0]['recordingType']}
    Wait Until Element Is Visible    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    Log    5/6
    Should Be Equal As Strings    ${RSTP json['motionType']}    0    
    Wait Until Element Is Visible    ${DOT-MENU}

37. HTTP stream settings
    [Tags]    C79092
    Skip    HTTP stream not available
    Verify on Cameras Page
    Select Camera By Name    HTTP cam
    Log    1
    Rename System or Hardware    HTTP cam changed
    Log    2
    Change Aspect Ratio    1:1 
    Change Rotation    90˚
    Log    3
    Toggle Recording
    Wait Until Elements Are Visible
    ...    ${RECORD ALWAYS RADIO BUTTON}/..           
    ...    ${RECORD MOTION RADIO BUTTON}/..      
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/..
    Wait Until Element Is Not Visible    ${FPS INPUT}     
    Wait Until Element Is Not Visible     ${QUALITY DROPDOWN}
    Log    4
    Set Checkbox Value    ${RECORD MOTION LOW QUALITY RADIO BUTTON}    True
    Log    5
    Disable Motion Detection
    Wait Until Element Is Not Visible    ${MOTION SENSITIVITY IMAGE}
    Log    6    
    Click Button    ${ENABLE MOTION DETECTION BUTTON}
    Wait Until Element Is Visible    ${MOTION SENSITIVITY IMAGE}
    
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    
    Log    1
    ${http id}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    HTTP cam    id
    @{auth}=   Create List    admin    ${password}
    Camera Name Should Be    ${auth}    https://${QA BURBANK IP}:${system}[port]    ${http id}    HTTP cam changed
    Wait Until Element Contains    ${EDITABLE TITLE}    HTTP cam changed
    Log    2
    ${cameras}=   Get Cameras    ${auth}    https://${QA BURBANK IP}:${system}[port]
    FOR    ${camera}  IN  @{cameras}
        ${http json}=   Set Variable If    '''${camera['name']}'''=='''HTTP cam changed'''    ${camera}
        Exit For Loop If    '''${camera['name']}'''=='''HTTP cam changed'''
    END
    Should Be Equal As Strings    1    ${http json['addParams'][9]['value']}
    Should Be Equal As Strings    90    ${http json['addParams'][10]['value']}
    Wait Until Element Contains    ${ASPECT RATIO DROPDOWN}    1:1
    Wait Until Element Contains    ${ROTATION DROPDOWN}    90˚
    Log    3
    Should Be Equal As Strings    ${http json['scheduleEnabled']}    True
    Wait Until Elements Are Visible
    ...    ${RECORD ALWAYS RADIO BUTTON}/..           
    ...    ${RECORD MOTION RADIO BUTTON}/..      
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/..
    Log    4
    Should Be Equal As Strings    RT_Always    ${http json['scheduleTasks'][0]['recordingType']}
    Wait Until Element Is Visible    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    Log    5/6
    Should Be Equal As Strings    ${http json['motionType']}    0    
    Wait Until Element Is Visible    ${DOT-MENU}

38. Changing credentials from invalid ones to valid ones makes the camera authorized
    [Tags]    C76390
    Verify on Cameras Page
    Select Camera By Name    unauth cam
    Click Button    ${EDIT CREDENTIALS BUTTON}
    Verify Authentication Form
    Sleep    1
    Input Text    ${EDIT CREDENTIALS LOGIN INPUT}    admin
    Input Text    ${EDIT CREDENTIALS PASSWORD INPUT}    admin
    Click Button    ${EDIT CREDENTIALS SAVE BUTTON}
    Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}
    Reload Page
    Wait Until Element is Not Visible    //nx-level-3-item//span[contains(text(),"unauth cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_unauthorized.svg"]    180
    Sleep    120
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${status}    Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    unauth cam    status
    Should Be Equal As Strings    ${status}    Online
#    Click Button    ${EDIT CREDENTIALS BUTTON}
#    Verify Authentication Form
#    Sleep    1
#    Input Text    ${EDIT CREDENTIALS LOGIN INPUT}    qwe
#    Input Text    ${EDIT CREDENTIALS PASSWORD INPUT}    qwe
#    Click Button    ${EDIT CREDENTIALS SAVE BUTTON}
#    Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}
#    Restart Docker Servers    ${system}[name]
#    Sleep   90
#    Reload Page
#    Wait Until Element Is Not Visible    ${SYSTEM NAME OFFLINE}    90

