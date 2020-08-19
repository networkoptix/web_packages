*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
Test Teardown     Common Restart Logout    ${url}
Suite Teardown    Close All Browsers
Force Tags        system

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
    Verify on Cameras Page

Camera settings is not available to any viewers
    [Tags]    C76253    threaded
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
    ${auth}=    Create List    admin    ${BASE PASSWORD}
    ${camera id}    Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    good cam    id
    Go to    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/cameras/${camera id}
    
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
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Link    ${SERVERS LINK}
    Wait Until Elements are Visible
    ...    ${APPLY CHANGES BUTTON}     
    ...    ${DISCARD CHANGES BUTTON}   
    ...    ${CANCEL CHANGES BUTTON}    
    ...    ${APPLY CHANGES CLOSE BUTTON}
    ...    ${APPLY CHANGES QUESTION}  


Rename Camera
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam

    Click Element    ${EDITABLE TITLE}
    Input Content Editable Text    ${EDITABLE TITLE}    good cam name changed 1
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
    Click Element    ${EDITABLE TITLE}
    Input Content Editable Text    ${EDITABLE TITLE}    good cam name changed 2
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
    Click Element    ${EDITABLE TITLE}
    Input Content Editable Text    ${EDITABLE TITLE}    good cam name changed 3
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
    Set Camera Attribute    ${AUTO SYS IP}    ${auth}    ${camera id}    cameraName     good cam

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

    Set Camera Attribute    ${AUTO SYS IP}    ${auth}    ${camera id}    cameraName    good cam 

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

    Log in to user and system    ${EMAIL ADMIN}    ${AUTO TESTS SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Click Button    ${CAMERAS DETAILED INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/health
    Log Out

Aspect Ratio
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Change Aspect Ratio    1:1
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Aspect Ratio Should Be    1:1
    Reload Page
    Aspect Ratio Should Be    1:1
    Change Aspect Ratio    Auto
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Aspect Ratio Should Be    Auto
    Reload Page
    Aspect Ratio Should Be    Auto

Rotation
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera By Name    good cam
    Verify on Cameras Page
    Change Rotation    90˚
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Rotation Should Be    90˚
    Reload Page
    Rotation Should Be    90˚
    Change Rotation    0˚
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    Rotation Should Be    0˚
    Reload Page
    Rotation Should Be    0˚       

Get the camera json
   
        

Get the camera json
   
        

Audio enable Disabled
    [Tags]    C76378    threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera by Name    good cam
    Verify on Cameras Page
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
    ${camera id}    Get Camera Attribute By Camera Name    ${auth}    ${AUTO SYS IP}    good cam    id
    Set Camera Attribute    ${AUTO SYS IP}    ${auth}    ${camera id}    audioEnabled    ${False}

Audio unavailable
    [Tags]     C76376    threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera by Name    good cam
    Wait Until Element is Enabled    ${ENABLE AUDIO CHECKBOX}
    Select Camera by Name    no audio cam
    Wait Until Element is Visible    ${ENABLE AUDIO CHECKBOX}//label[@disabled]

No iamge placeholder shows for offline and unauthorized cameras
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

# Changing credentials from valid to invalid ones makes the camera unauthorized
#     Log in to user and system    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
#     Wait Until Element is Visible    ${CAMERAS LINK}
#     Click Link    ${CAMERAS LINK}
#     Verify on Cameras Page
#     Select Camera By Name    good cam
#     Click Button    ${EDIT CREDENTIALS BUTTON}
#     Verify Authentication Form
#     Input Text    ${EDIT CREDENTIALS LOGIN INPUT}    qwer
#     Input Text    ${EDIT CREDENTIALS PASSWORD INPUT}    asdf
#     Click Button    ${EDIT CREDENTIALS SAVE BUTTON}
#     Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}


Changing credentials from invalid ones to valid ones makes the camera authorized
    [Tags]    C76390    Threaded
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
    Wait Until Element is Not Visible    //nx-level-3-item//span[contains(text(),"unauth cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_unauthorized.svg"]    90
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

Recording toggle shows correct options
    [Tags]    C76401    threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Select Camera by Name    offline cam
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
    Wait Until Elements Are Visible
    ...    ${SYSTEM SAVE}
    ...    ${SYSTEM CANCEL}
    ${checked}    Get Element Attribute    ${RECORD MOTION RADIO BUTTON}    value
    Should Be Equal    ${checked}    2

Recording Status
    [Tags]    C76391    Threaded
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
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
    Toggle Recording
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

Record Motion
    [Tags]    C76408    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Set Checkbox Value    ${RECORD MOTION RADIO BUTTON}    True
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Wait Until Element Is Visible    ${RECORD MOTION RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    Toggle Recording
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

Record Motion + Low Quality
    [Tags]    C76408    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Toggle Recording
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Set Checkbox Value    ${RECORD MOTION LOW QUALITY RADIO BUTTON}    True
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Wait Until Element Is Visible    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    Toggle Recording
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

Check recording triple state
    [Tags]    C76408    Threaded
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    triple state cam
    Wait Until Elements are Visible
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD MOTION RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]

Disabled Motion With Recording
    [Tags]    C76408    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Select Camera By Name    good cam
    Click Button    ${DOT-MENU}
    Wait Until Element is Visible    ${DISABLE MOTION DETECTION LINK}
    Click Link    ${DISABLE MOTION DETECTION LINK}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Reload page
    Toggle Recording
    Wait Until Element is Visible    ${RECORD ALWAYS RADIO BUTTON}/ancestor::nx-radio 
    Element Should Be Enabled    ${RECORD ALWAYS RADIO BUTTON}
    Wait Until Elements are Visible    ${RECORD MOTION RADIO BUTTON}/..    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/..
    Element Should Be Disabled    ${RECORD MOTION LOW QUALITY RADIO BUTTON}
    Element Should Be Disabled    ${RECORD MOTION RADIO BUTTON}
    Wait Until Element Is Visible    ${MOTION DETECTION DISABLED WARNING}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Wait Until Element Is Visible    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"checked")]
    Toggle Recording
    Click Button    ${ENABLE MOTION DETECTION BUTTON} 
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    

Change FPS
    [Tags]    C76409    Threaded
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Toggle Recording
    Wait Until Element is Visible    ${FPS INPUT}
    #Click Element    ${FPS INPUT}
    Input Text    ${FPS INPUT}    20
    sleep    20
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}
    Reload Page
    Verify on Cameras Page
    ${fps}    Get Element Attribute    ${FPS INPUT}    value
    Should Be Equal As Numbers    ${fps}    20
    Toggle Recording
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Not Visible    ${SYSTEM CANCEL}

Change Quality
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Verify on Cameras Page
    Toggle Recording
    Wait Until Element is Visible    ${QUALITY DROPDOWN} 
    Click Element    ${QUALITY DROPDOWN} 
    Wait Until Element Is Visible    ${QUALITY DROPDOWN}/following-sibling::div//a/span[contains(text(),"Low")]
    Click Element    ${QUALITY DROPDOWN}/following-sibling::div//a/span[contains(text(),"Low")]
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Toggle Recording

Enable/disable motion detection
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
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
    Click Button    ${ENABLE MOTION DETECTION BUTTON}
    Wait Until Element Is Visible    ${SYSTEM SAVE}
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
