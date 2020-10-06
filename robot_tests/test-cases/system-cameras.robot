*** Settings ***
Resource          ../resource.robot
Suite Setup       Start up    ${url}
Test Setup        Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
Test Teardown     reset cameras and log out
Suite Teardown    Close All Browsers
Force Tags        system    cameras

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
@{auth}        ${email}    ${password}
${url}         ${ENV}

*** Test Cases ***
Camera settings is available to owner admin and custom with permission
    [Tags]    C76252    threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Log Out
    
    Log in to user and system    ${EMAIL ADMIN}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Log Out
    
    Log in to user and system    ${EMAIL CUSTOM CAMERAS}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
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
    #Log in to user and system    ${EMAIL CUSTOM CAMERAS LIMITED}    ${AUTO TESTS SYSTEM ID}
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

Camera settings is not available to any viewers
    [Tags]    C76253    threaded
    [Setup]    Log in to user and system    ${EMAIL VIEWER}    ${AUTO TESTS SYSTEM ID}
    Element should not be visible    ${CAMERAS LINK}
    Log Out

    Log in to user and system    ${EMAIL LIVE VIEWER}    ${AUTO TESTS SYSTEM ID}
    Element should not be visible    ${CAMERAS LINK}
    Log Out

    Log in to user and system    ${EMAIL ADV VIEWER}    ${AUTO TESTS SYSTEM ID}
    Element should not be visible    ${CAMERAS LINK}
    Log Out

    Log in to user and system    ${EMAIL CUSTOM}    ${AUTO TESTS SYSTEM ID}
    Element should not be visible    ${CAMERAS LINK}
    Log Out

Camera settings is not available by direct link to any viewers
    [Tags]    C76255    threaded
    [Setup]    Log in to user and system    ${EMAIL VIEWER}    ${AUTO TESTS SYSTEM ID}
    ${auth}=    Create List    admin    ${BASE PASSWORD}
    ${camera id}    Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    good cam    id
    Go to    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/cameras/${camera id}
    Wait Until Elements Are Visible    ${PAGE NOT FOUND}    ${TAKE ME HOME}
    Element should not be visible    ${CAMERAS LINK}

    Log Out

    Log in to user and system    ${EMAIL LIVE VIEWER}    ${AUTO TESTS SYSTEM ID}
    Go to    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/cameras/${camera id}
    Wait Until Elements Are Visible    ${PAGE NOT FOUND}    ${TAKE ME HOME}
    Element should not be visible    ${CAMERAS LINK}
    Log Out

    Log in to user and system    ${EMAIL ADV VIEWER}    ${AUTO TESTS SYSTEM ID}
    Go to    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/cameras/${camera id}
    Wait Until Elements Are Visible    ${PAGE NOT FOUND}    ${TAKE ME HOME}
    Element should not be visible    ${CAMERAS LINK}
    Log Out

    Log in to user and system    ${EMAIL CUSTOM}    ${AUTO TESTS SYSTEM ID}
    Go to    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/cameras/${camera id}
    Wait Until Elements Are Visible    ${PAGE NOT FOUND}    ${TAKE ME HOME}
    Element should not be visible    ${CAMERAS LINK}
    Log Out

Camera settings are not available by direct url to unauthorized user
    [Tags]    C79007    Threaded
    [Setup]    Log in    ${EMAIL NOPERM}    ${password}
    ${auth}=    Create List    admin    ${BASE PASSWORD}
    ${camera id}    Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    good cam    id
    Go to    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/cameras/${camera id}
    ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    <br>    ${EMPTY}
    ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    \n    ${EMPTY}
    FOR    ${x}   IN RANGE    4
        ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    ${SPACE}${SPACE}    ${SPACE}
    END        
    Wait Until Elements Are Visible    ${SYSTEM NO ACCESS}    //div[normalize-space()\="${THIS LINK IS BROKEN TEXT}"]    //button//a[@href\='/']/..

No cameras placeholder
    [Tags]    C76257    threaded
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS 4.0 SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Wait Until Elements Are Visible    
    ...    ${NO CAMERAS PLACEHOLDER IMAGE}
    ...    ${NO CAMERAS TITLE}            
    ...    ${NO CAMERAS MESSAGE}       

Camera status match server
    [Tags]    C76256    Threaded
    @{auth}=   Create List    admin    ${BASE PASS WORD}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Element Should Not Be Visible    //nx-level-3-item//span[contains(text(),"good cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_recording.svg"]
    Element Should Not Be Visible    //nx-level-3-item//span[contains(text(),"good cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_offline.svg"]
    Element Should Not Be Visible    //nx-level-3-item//span[contains(text(),"good cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_unauthorized.svg"]

    ${value}=   Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    no audio cam    scheduleEnabled
    Should Be True    ${value}

    ${value}=   Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    offline cam    status
    Should Be Equal As Strings    ${value}    Offline
    
    ${value}=   Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    unauth cam    status
    Should Be Equal As Strings    ${value}    Unauthorized

    Wait Until Elements Are Visible    
    ...    //nx-level-3-item//span[contains(text(),"no audio cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_recording.svg"]
    ...    //nx-level-3-item//span[contains(text(),"offline cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_offline.svg"]
    ...    //nx-level-3-item//span[contains(text(),"unauth cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_unauthorized.svg"]

Warning dialog appears when changes are made on navigating away and works correctly
    [Tags]    C76416    threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Toggle Recording
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Link    ${SERVERS LINK}
    Wait Until Elements are Visible
    ...    ${APPLY CHANGES BUTTON}     
    ...    ${DISCARD CHANGES BUTTON}   
    ...    ${CANCEL CHANGES BUTTON}
    ...    ${APPLY CHANGES CLOSE BUTTON}
    ...    ${APPLY CHANGES QUESTION}  


Rename Camera
    [Tags]    C76259
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam

    Rename Camera    good cam name changed 1
    Wait Until Elements are Visible    
    ...    ${SYSTEM SAVE}
    ...    ${SYSTEM CANCEL}
    Click Button    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=    Create List    admin    ${password}
    Camera Name Should be    ${auth}    ${AUTO SYS IP}    ${AUTO TESTS GOOD CAM ID}    good cam name changed 1
    Wait Until Element Contains    ${EDITABLE TITLE}    good cam name changed 1
    Log Out

    Log in to user and system    ${EMAIL ADMIN}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam name changed 1
    Rename Camera    good cam name changed 2
    Wait Until Elements are Visible    
    ...    ${SYSTEM SAVE}
    ...    ${SYSTEM CANCEL}
    Click Button    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=    Create List    admin    ${password}
    Camera Name Should be    ${auth}    ${AUTO SYS IP}    ${AUTO TESTS GOOD CAM ID}    good cam name changed 2
    Wait Until Element Contains    ${EDITABLE TITLE}    good cam name changed 2
    Log Out

    Log in to user and system    ${EMAIL ADMIN}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam name changed 2
    Rename Camera    good cam name changed 3
    Wait Until Elements are Visible    
    ...    ${SYSTEM SAVE}
    ...    ${SYSTEM CANCEL}
    Click Button    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=    Create List    admin    ${password}
    Camera Name Should be    ${auth}    ${AUTO SYS IP}    ${AUTO TESTS GOOD CAM ID}    good cam name changed 3  
    Wait Until Element Contains    ${EDITABLE TITLE}    good cam name changed 3
    
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${camera id}    Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    good cam name changed 3    id

Name change in client changes in cloud
    [Tags]    C76261    threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${camera id}    Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    good cam    id
    Set Camera Attribute    ${AUTO SYS IP}    ${auth}    ${camera id}    cameraName    api name
    Reload Page
    Wait Until Element Contains    ${EDITABLE TITLE}    api name

View button
    [Tags]    C76262    threaded
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam
    ${camera id}=   Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    good cam    id
    # The above keyword returns the id with {} and we don't want those for the url
    ${camera id}=   Remove String    ${camera id}    }     {
    Click Button    ${CAMERAS VIEW BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/view/${camera id}
    
    Go To    ${ENV}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    offline cam
    ${camera id}=   Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    offline cam    id
    ${camera id}=   Remove String    ${camera id}    }     {
    Click Button    ${CAMERAS VIEW BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/view/${camera id}

    Go To    ${ENV}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    unauth cam
    ${camera id}=   Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    unauth cam    id
    ${camera id}=   Remove String    ${camera id}    }     {
    Click Button    ${CAMERAS VIEW BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/view/${camera id}

Detailed Info
    [Tags]    C76274    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Click Button    ${CAMERAS DETAILED INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/health
    Log Out

    Log in to user and system    ${EMAIL ADMIN}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Click Button    ${CAMERAS DETAILED INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/health
    Log Out

Aspect Ratio
    [Tags]    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Change Aspect Ratio    1:1
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Aspect Ratio Should Be    1:1
    Reload Page
    Aspect Ratio Should Be    1:1

Rotation
    [Tags]    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera By Name    good cam
    Verify on Cameras Page
    Change Rotation    90˚
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Rotation Should Be    90˚
    Reload Page
    Rotation Should Be    90˚

Audio enable Disabled
    [Tags]    C76378    threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam
    Set Checkbox Value    ${ENABLE AUDIO CHECKBOX}//input    True
    Wait Until Elements are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${cams}=   Get Cameras    ${auth}    ${AUTO SYS IP}
    FOR    ${camera}  IN  @{cams}
        ${audio enabled}=    Set Variable If    '''${camera['name']}'''=='''good cam'''    ${camera['audioEnabled']}
        Exit For Loop If    '''${audio enabled}'''=='''True'''
    END
    Should Be True    ${audio enabled}
    Audio Enabled Should Be    True
    Reload Page
    Audio Enabled Should Be    True

Audio unavailable
    [Tags]     C76376    threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam
    Wait Until Element is Enabled    ${ENABLE AUDIO CHECKBOX}
    Select Camera by Name    no audio cam
    Wait Until Element is Visible    ${ENABLE AUDIO CHECKBOX}//label[@disabled]

No image placeholder shows for offline and unauthorized cameras
    [Tags]    C76275    threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
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

Edit credentials form Close and Cancel buttons
    [Tags]    C78236    threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page

    Click Button    ${EDIT CREDENTIALS BUTTON}
    Verify Authentication Form
    Click Button    ${EDIT CREDENTIALS X BUTTON}
    Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}

    Click Button    ${EDIT CREDENTIALS BUTTON}
    Verify Authentication Form
    Click Button    ${EDIT CREDENTIALS CANCEL BUTTON}
    Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}

Changes made in Image settings in thick client appear correctly on cloud portal
    [Tags]    C76374    Theaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera by Name    good cam
    Verify on Cameras Page
    Element Should Contain    ${ASPECT RATIO DROPDOWN}    ${AUTO TEXT}
    Element Should Contain    ${ROTATION DROPDOWN}    0˚
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${data}=   evaluate    json.loads('''[{"name":"overrideAr","value":"1","resourceId":"{d6de2b74-9c74-2dad-8bc0-f1e10ba7b6b2}"},{"name":"rotation","value":"90","resourceId":"{d6de2b74-9c74-2dad-8bc0-f1e10ba7b6b2}"}]''')
    Set All Camera Add Params    ${AUTO SYS IP}    ${auth}    ${data}
    Reload Page
    Verify on Cameras Page
    Element Should Contain    ${ASPECT RATIO DROPDOWN}    1:1
    Element Should Contain    ${ROTATION DROPDOWN}    90˚

Recording toggle shows correct options
    [Tags]    C76401    threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
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

Recording Status
    [Tags]    C76391    Threaded
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera by Name    no license cam
    Verify on Cameras Page
    Select Camera By Name    no license cam
    Wait Until Element Is Visible    ${RECORDING CHECK BOX}
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    False
    Wait Until Element Is Visible    ${LICENSE REQUIRED WARNING}

    Go to    ${ENV}/systems/${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Wait Until Element Is Visible    ${RECORDING CHECK BOX}
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    False
    Wait Until Element Is Visible    ${ONE LICENSE WILL BE USED WARNING}

    Select Camera By Name    no audio cam
    Wait Until Element Is Visible    ${RECORDING CHECK BOX}
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Verify recording controls are open
    
Record Always
    [Tags]    C76408    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Verify recording controls are open
    ${value}    Get Checkbox Value    ${RECORD MOTION RADIO BUTTON}
    Should Be Equal As Strings    ${value}    False
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

Record Motion
    [Tags]    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Verify Recording Controls Are Open
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Set Checkbox Value    ${RECORD MOTION RADIO BUTTON}    True
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Wait Until Element Is Visible    ${RECORD MOTION RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]

Record Motion + Low Quality
    [Tags]    C76408    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Verify Recording Controls Are Open
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Set Checkbox Value    ${RECORD MOTION LOW QUALITY RADIO BUTTON}    True
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Wait Until Element Is Visible    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]

Check recording triple state
    [Tags]    Threaded
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    triple state cam
    Wait Until Elements are Visible
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD MOTION RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]

Recording Mode functionality (with recording schedule set)
    [Tags]    C78982
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    triple state cam
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


Disabled Motion With Recording
    [Tags]    C78983    Threaded
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${camera id}    Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    good cam    id
    Set Camera Attribute    ${AUTO SYS IP}    ${auth}    ${camera id}    motionType    8
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
    
Change FPS
    [Tags]    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Wait Until Element is Visible    ${FPS INPUT}
    Delete All Text    ${FPS INPUT}
    Input Text    ${FPS INPUT}    20
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${fps}    Get Element Attribute    ${FPS INPUT}    value
    Should Be Equal As Numbers    ${fps}    20

Erasing current FPS has placeholder
    [Tags]    C76409    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Wait Until Element is Visible    ${FPS INPUT}
    Delete All Text    ${FPS INPUT}
    Input Text    ${FPS INPUT}    27
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Delete All Text    ${FPS INPUT}
    Element Attribute Value Should Be    ${FPS INPUT}    placeholder    30 - ${CURRENT TEXT}
    Click Button    ${SYSTEM CANCEL}

Change Quality
    [Tags]    C76410    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    no audio cam
    Wait Until Element is Visible    ${QUALITY DROPDOWN} 
    Click Element    ${QUALITY DROPDOWN} 
    Wait Until Element Is Visible    ${QUALITY DROPDOWN}/following-sibling::div//a/span[contains(text(),"${BEST TEXT}")]
    Click Element    ${QUALITY DROPDOWN}/following-sibling::div//a/span[contains(text(),"${BEST TEXT}")]
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Wait Until Element Contains    ${QUALITY DROPDOWN}    ${BEST TEXT}

Enable/disable motion detection with recording off
    [Tags]    C78981
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
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

Enable/disable motion detection with recording ones
    [Tags]    C76398
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera By Name    no audio cam
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

Placeholder shows when system is offline
    [Tags]    C76254    threaded
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS OFFLINE SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Wait Until Elements are Visible
    ...    ${OFFLINE PLACEHOLDER IAMGE}
    ...    ${OFFLINE TITLE}
    ...    ${OFFLINE MESSAGE}
    Log Out

    Log in to user and system    ${EMAIL ADMIN}    ${AUTO TESTS OFFLINE SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Wait Until Elements are Visible
    ...    ${OFFLINE PLACEHOLDER IAMGE}
    ...    ${OFFLINE TITLE}
    ...    ${OFFLINE MESSAGE}
    Log Out

Motion sensitivity block for cameras with different statuses
    [Tags]    C76418    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    offline cam
    Verify on Cameras Page
    Element Should Not Be Visible    ${MOTION SENSITIVITY IMAGE}

    Select Camera By Name    good cam
    Verify on Cameras Page
    Wait Until Element Is Visible    ${MOTION SENSITIVITY IMAGE}

    Select Camera By Name    unauth cam
    Verify on Cameras Page
    Element Should Not Be Visible    ${MOTION SENSITIVITY IMAGE}

Recording Quality dropdown menu functionality for camera with schedule
    [Tags]    C76417    Threaded
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    triple state cam
    Verify Recording Controls are Open
    Wait Until Elements Are Visible   
    ...    ${RECORDING MODE ERROR}
    ...    ${FPS ERROR}           
    ...    ${QUALITY ERROR}        
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

UDP stream settings
    [Tags]    C79005    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    UDP cam
    Log    1
    Rename Camera    UDP cam changed
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
    ${UDP id}=   Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    UDP cam    id
    @{auth}=   Create List    admin    ${password}
    Camera Name Should Be    ${auth}    ${AUTO SYS IP}    ${UDP id}    UDP cam changed
    Wait Until Element Contains    ${EDITABLE TITLE}    UDP cam changed
    Log    2
    ${cameras}=   Get Cameras    ${auth}    ${AUTO SYS IP}
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

RTSP stream settings
    [Tags]    C79002    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    RTSP cam
    Log    1
    Rename Camera    RTSP cam changed
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
    ${RSTP id}=   Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    RSTP cam    id
    @{auth}=   Create List    admin    ${password}
    Camera Name Should Be    ${auth}    ${AUTO SYS IP}    ${RSTP id}    RSTP cam changed
    Wait Until Element Contains    ${EDITABLE TITLE}    RSTP cam changed
    Log    2
    ${cameras}=   Get Cameras    ${auth}    ${AUTO SYS IP}
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

HTTP stream settings
    [Tags]    C79092    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    HTTP cam
    Log    1
    Rename Camera    HTTP cam changed
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
    ${http id}=   Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    HTTP cam    id
    @{auth}=   Create List    admin    ${password}
    Camera Name Should Be    ${auth}    ${AUTO SYS IP}    ${http id}    HTTP cam changed
    Wait Until Element Contains    ${EDITABLE TITLE}    HTTP cam changed
    Log    2
    ${cameras}=   Get Cameras    ${auth}    ${AUTO SYS IP}
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



Changing credentials from invalid ones to valid ones makes the camera authorized
    [Tags]    C76390
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    unauth cam
    Click Button    ${EDIT CREDENTIALS BUTTON}
    Verify Authentication Form
    Sleep    1
    Input Text    ${EDIT CREDENTIALS LOGIN INPUT}    admin
    Input Text    ${EDIT CREDENTIALS PASSWORD INPUT}    ${NOAUTH CAMERA PASSWORD}
    Click Button    ${EDIT CREDENTIALS SAVE BUTTON}
    Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}
    Wait Until Element is Not Visible    //nx-level-3-item//span[contains(text(),"unauth cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_unauthorized.svg"]    180
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${status}    Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    unauth cam    status
    Should Be Equal As Strings    ${status}    Online
    Click Button    ${EDIT CREDENTIALS BUTTON}
    Verify Authentication Form
    Sleep    1
    Input Text    ${EDIT CREDENTIALS LOGIN INPUT}    qwe
    Input Text    ${EDIT CREDENTIALS PASSWORD INPUT}    qwe
    Click Button    ${EDIT CREDENTIALS SAVE BUTTON}
    Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}
    Open Connection    10.1.5.126
    SSHLibrary.Login    docker-server-factory    qweasd 123    
    ${results}    Execute Command    docker container restart autotests
    Reload Page
    Wait Until Element Is Not Visible    ${SYSTEM NAME OFFLINE}    90

