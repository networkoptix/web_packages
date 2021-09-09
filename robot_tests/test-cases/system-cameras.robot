*** Settings ***
Resource          ../resource.robot
Suite Setup       Camera Suite Setup
Test Setup        Camera Test Setup
Test Teardown     reset cameras and log out
Suite Teardown    Camera Suite Teardown
Force Tags        system    cameras

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
@{auth}        ${email}    ${password}
${url}         ${ENV}

*** Keywords ***
Camera Suite Setup
    #system(name,port,cont,owner,id) 
    #local auth, cloud auth, server url, 
    #users('cloudAdmin, viewer, liveViewer, advancedViewer, custom)
    ${random}=   Generate Random String
    #Create Base Cloud System    cameras${random}
    ${owner}=    Register and activate account with random email    mark    hamill    ${password}
    ${system}     Create Base System    cameras-${random}    owner=${owner}
    ${system2}    Create Base System    cameras2-${random}    add users=${False}    owner=${owner}
    Set Suite Variable    ${system}
    Set Suite Variable    ${system2}

    #Log To Console    starting software cam offline
    #Open Connection    ${QA BURBANK IP}
    #SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    #${camera port}=   Get Random Available Port
    #Close Connection
    #
    #Start Software Camera    ${system}[port]    ${camera port}
    #
    #Add Software Camera    ${system}[port]    ${camera port}    offline
    #Sleep    15
    #Open Connection    ${QA BURBANK IP}
    #SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    #${pid}    Execute Command    pgrep -f "port ${camera port}"
    #Execute Command    kill -9 ${pid}
    #Close Connection
    #
    #Open Connection    ${QA BURBANK IP}
    #SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    #${camera port2}=   Get Random Available Port
    #Close Connection
    #Start Software Camera    ${system}[port]    ${camera port2}
    #Add Software Camera    ${system}[port]    ${camera port2}    unauth
    #Sleep    15
    #Open Connection    ${QA BURBANK IP}
    #SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    #${pid}    Execute Command    pgrep -f "port ${camera port2}"
    #Execute Command    kill -9 ${pid}
    #Start Command    camera-venv/bin/python -m software_cameras --port ${camera port2} --user jim --password henson
    #Close Connection
    #Sleep    15
    #
    #Open Connection    ${QA BURBANK IP}
    #SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    #${camera port3}=   Get Random Available Port
    #Close Connection
    #Start Software Camera    ${system}[port]    ${camera port3}
    #Add Software Camera    ${system}[port]    ${camera port3}    online
    #Sleep    30
    
    Add Camera    http://${QA BURBANK IP}:${system}[port]    admin    QAbur777$    D8-D4-3C-60-F0-D3    192.168.0.27     manufacturer=Sony    #SNC-XM636
    Add Camera    http://${QA BURBANK IP}:${system}[port]    admin    QAbur777$    00-16-6C-7F-65-67    192.168.0.206     manufacturer=Hanwha_Sunapi    #SND-6084
    Add Camera    http://${QA BURBANK IP}:${system}[port]    admin    admin        54-42-49-A1-03-EA    192.168.0.201    manufacturer=Sony    #SNC-CH120
    Add Camera    http://${QA BURBANK IP}:${system}[port]    admin    admin        54-42-49-40-31-68    192.168.0.208    manufacturer=Sony    #SNC-DH120T
    Add Camera    http://${QA BURBANK IP}:${system}[port]    admin    admin        78-84-3C-0F-82-76    192.168.0.209    manufacturer=Sony    #SNC-CH280
    Sleep    50
    ${camera id}=    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SNC-XM636    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id}    cameraName    good cam
    ${camera id2}=   Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SND-6084    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id2}    cameraName    unauth cam
    ${data}=   evaluate    json.loads('''[{"name": "credentials", "value": "test:test", "resourceId": "${camera id2}"}]''')
    Set All Camera Add Params    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${data}

    ${custom cameras}=    Create And Add Custom Camera User Type and User
    Activate License    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    ${TRIAL LICENSE}
    Sleep    30
    Restart Docker Servers    ${system}[port]    ${system}[id]    ${system}[local auth]
    
    ${no perm}=    Register and activate account with random email    mark   hamill    ${BASE PASSWORD}
    Set Suite Variable    ${no perm}    ${no perm}
    Set Suite Variable    ${custom cameras}    ${custom cameras}
    Open Browser and go to URL    ${url}
    #Run Keyword If    '''${mode}'''=='''cloud'''    Cloud Suite Setup
    #...    ELSE    Web Admin Suite Setup

Camera Test Setup    
    [Arguments]    ${user}=${system}[owner]    ${system}=${system}[cloud id]
    Log in to user and system    ${user}    ${system}
    Go To Cameras
    
Camera Suite Teardown
    Delete Base System    ${system}
    Delete Base System    ${system2}
    Close All Browsers

Set Radio Value
    [Arguments]    ${element}    ${value}
    ${current value}=   Get Element Attribute    ${element}    value

*** Test Cases ***
Camera settings is available to owner admin and custom with permission
    [Tags]    C76252     threaded
    Verify on Cameras Page
    Log Out
    
    Log in to user and system    ${system}[cloud users][cloudAdmin]    ${system}[cloud id]
    Go To Cameras
    Verify on Cameras Page
    Log Out
    
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

Camera settings is not available to any viewers
    [Tags]    C76253    threaded
    [Setup]    Log in to user and system    ${system}[cloud users][viewer]    ${system}[cloud id]
    Element should not be visible    ${CAMERAS LINK}
    Log Out

    Log in to user and system    ${system}[cloud users][liveViewer]    ${system}[cloud id]
    Element should not be visible    ${CAMERAS LINK}
    Log Out

    Log in to user and system    ${system}[cloud users][advancedViewer]    ${system}[cloud id]
    Element should not be visible    ${CAMERAS LINK}
    Log Out

    Log in to user and system    ${system}[cloud users][custom]    ${system}[cloud id]
    Element should not be visible    ${CAMERAS LINK}
    Log Out

Camera settings is not available by direct link to any viewers
    [Tags]    C76255    threaded
    [Setup]    Log in to user and system    ${system}[cloud users][viewer]    ${system}[cloud id]
    ${camera id}    Get Camera Attribute By Camera Name    ${system}[local auth]    http://${QA BURBANK IP}:${system}[port]    good cam    id
    Go to    ${ENV}/systems/${system}[cloud id]/cameras/${camera id}
    Wait Until Elements Are Visible    ${PAGE NOT FOUND}    ${TAKE ME HOME}
    Element should not be visible    ${CAMERAS LINK}

    Log Out

    Log in to user and system    ${system}[cloud users][liveViewer]    ${system}[cloud id]
    Go to    ${ENV}/systems/${system}[cloud id]/cameras/${camera id}
    Wait Until Elements Are Visible    ${CAMERAS PAGE CANNOT BE LOADED}
    Element should not be visible    ${CAMERAS LINK}
    Log Out

    Log in to user and system    ${system}[cloud users][advancedViewer]    ${system}[cloud id]
    Go to    ${ENV}/systems/${system}[cloud id]/cameras/${camera id}
    Wait Until Elements Are Visible    ${CAMERAS PAGE CANNOT BE LOADED}
    Element should not be visible    ${CAMERAS LINK}
    Log Out

    Log in to user and system    ${system}[cloud users][custom]    ${system}[cloud id]
    Go to    ${ENV}/systems/${system}[cloud id]/cameras/${camera id}
    Wait Until Elements Are Visible    ${CAMERAS PAGE CANNOT BE LOADED}
    Element should not be visible    ${CAMERAS LINK}
    Log Out

Camera settings are not available by direct url to unauthorized user
    [Tags]    C79007    Threaded
    [Setup]    Log in    ${no perm}    ${password}
    ${camera id}    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    good cam    id
    Go to    ${ENV}/systems/${system}[cloud id]/cameras/${camera id}
    ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    <br>    ${EMPTY}
    ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    \n    ${EMPTY}
    FOR    ${x}   IN RANGE    4
        ${THIS LINK IS BROKEN TEXT}    Replace String    ${THIS LINK IS BROKEN TEXT}    ${SPACE}${SPACE}    ${SPACE}
    END        
    Wait Until Elements Are Visible    ${SYSTEM NO ACCESS}    //div[normalize-space()\="${THIS LINK IS BROKEN TEXT}"]    //button//a[@href\='/']/..

No cameras placeholder
    [Tags]    C76257    threaded
    [Setup]    Camera Test Setup    user=${system2}[owner]    system=${system2}[cloud id]

    Wait Until Elements Are Visible    
    ...    ${NO CAMERAS PLACEHOLDER IMAGE}
    ...    ${NO CAMERAS TITLE}            
    ...    ${NO CAMERAS MESSAGE}       

Camera status match server
    [Tags]    C76256    Threaded
    @{auth}=   Create List    admin    ${BASE PASSWORD}

    Element Should Not Be Visible    //nx-level-3-item//span[contains(text(),"good cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_recording.svg"]
    Element Should Not Be Visible    //nx-level-3-item//span[contains(text(),"good cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_offline.svg"]
    Element Should Not Be Visible    //nx-level-3-item//span[contains(text(),"good cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_unauthorized.svg"]

    ${value}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    unauth cam    status
    Should Be Equal As Strings    ${value}    Unauthorized

    ${value}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    no audio cam    scheduleEnabled
    Should Be True    ${value}

    ${value}=   Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    offline cam    status
    Should Be Equal As Strings    ${value}    Offline

    Wait Until Elements Are Visible    
    ...    //nx-level-3-item//span[contains(text(),"no audio cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_recording.svg"]
    ...    //nx-level-3-item//span[contains(text(),"offline cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_offline.svg"]
    ...    //nx-level-3-item//span[contains(text(),"unauth cam")]/..//svg-icon[@data-src="/static/images/icons/standard/camera_unauthorized.svg"]

Warning dialog appears when changes are made on navigating away and works correctly
    [Tags]    C76416    threaded
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
    ${status}=   Get Camera Attribute By Camera Name    ${local auth}    http://${QA BURBANK IP}:${system}[port]    good cam    scheduleEnabled
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
    ${status}=   Get Camera Attribute By Camera Name    ${local auth}    http://${QA BURBANK IP}:${system}[port]    good cam    scheduleEnabled
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
    ${status}=   Get Camera Attribute By Camera Name    ${local auth}    http://${QA BURBANK IP}:${system}[port]    good cam    scheduleEnabled
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
    ${status}=   Get Camera Attribute By Camera Name    ${local auth}    http://${QA BURBANK IP}:${system}[port]    good cam    scheduleEnabled
    Should Be Equal    ${status}    ${True}
    Log    Step 7
    Go to System Administration
    Go To Cameras
    Select Camera By Name    good cam
    Verify Recording Controls Are Open




Rename Camera
    [Tags]    C76259
    Verify on Cameras Page
    Select Camera by Name    good cam
    
    Rename System or Hardware    good cam name changed 1
    Wait Until Elements are Visible    
    ...    ${SYSTEM SAVE}
    ...    ${SYSTEM CANCEL}
    Click Button    //nx-apply//nx-process-button//button[contains(text(), "${SAVE BUTTON TEXT}")]
    Wait Until Element is Not Visible    ${SYSTEM CANCEL}
    @{auth}=    Create List    admin    ${password}
    Camera Name Should be    ${auth}    https://${QA BURBANK IP}:${system}[port]    ${AUTO TESTS GOOD CAM ID}    good cam name changed 1
    Wait Until Element Contains    ${EDITABLE TITLE}    good cam name changed 1
    Log Out

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
    Log Out

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

Name change in client changes in cloud
    [Tags]    C76261    threaded
    Verify on Cameras Page
    Select Camera by Name    good cam
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${camera id}    Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    good cam    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${auth}    ${camera id}    cameraName    api name
    Reload Page
    Wait Until Element Is Visible    ${EDITABLE TITLE}
    Element Attribute Value Should Be    ${EDITABLE TITLE}    innertext    api name
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${auth}    ${camera id}    cameraName    good cam

View button
    [Tags]    C76262    threaded
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


Detailed Info
    [Tags]    C76274    ThreadedRAS LINK}
    Verify on Cameras Page
    Click Button    ${CAMERAS DETAILED INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${system}[cloud id]/health
    Log Out

    Log in to user and system    ${system}[cloud users][cloudAdmin]    ${system}[cloud id]
    Go To Cameras
    Verify on Cameras Page
    Click Button    ${CAMERAS DETAILED INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${system}[cloud id]/health
    Log Out

Aspect Ratio
    [Tags]    Threaded
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


Rotation
    [Tags]    Threaded
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

Audio enable Disabled
    [Tags]    C76378    threaded
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

Audio unavailable
    [Tags]     C76376    threaded
    Go To Cameras
    Verify on Cameras Page
    Select Camera by Name    good cam
    Wait Until Element is Enabled    ${ENABLE AUDIO CHECKBOX}
    Select Camera by Name    no audio cam
    Wait Until Element is Visible    ${ENABLE AUDIO CHECKBOX}//label[@disabled]

No image placeholder shows for offline and unauthorized cameras
    [Tags]    C76275    threaded
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
    Select Camera by Name    good cam
    Verify on Cameras Page
    Element Should Contain    ${ASPECT RATIO DROPDOWN}    ${AUTO TEXT}
    Element Should Contain    ${ROTATION DROPDOWN}    0˚
    @{auth}=   Create List    admin    ${BASE PASSWORD}
    ${camera id}=   Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    good cam    id
    ${data}=   evaluate    json.loads('''[{"name":"overrideAr","value":"1","resourceId":"${camera id}"},{"name":"rotation","value":"90","resourceId":"${camera id}"}]''')
    Set All Camera Add Params    https://${QA BURBANK IP}:${system}[port]    ${auth}    ${data}
    Reload Page
    Verify on Cameras Page
    Element Should Contain    ${ASPECT RATIO DROPDOWN}    1:1
    Element Should Contain    ${ROTATION DROPDOWN}    90˚

Recording toggle shows correct options
    [Tags]    C76401    threaded
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

    Select Camera By Name    no audio cam
    Wait Until Element Is Visible    ${RECORDING CHECK BOX}
    ${state}    Get Checkbox Value    ${RECORDING CHECK BOX}//input
    Should Be Equal As Strings    ${state}    True
    Verify recording controls are open
    
Record Always
    [Tags]    C76408    Threaded
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

Record Motion
    [Tags]    Threaded
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

Record Motion + Low Quality
    [Tags]    C76408    Threaded
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
Check recording triple state
    [Tags]    Threaded
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Verify on Cameras Page
    Select Camera By Name    triple state cam
    Wait Until Elements are Visible
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD MOTION RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]
    ...    ${RECORD ALWAYS RADIO BUTTON}/following-sibling::span[contains(@class,"tristate")]

Recording Mode functionality (with recording schedule set)
    [Tags]    C78982
    [Setup]    Log in to user and system    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
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
    
Change FPS
    [Tags]    Threaded
    Verify on Cameras Page
    Select Camera By Name    good cam
    #Temp removed for debuggins
    #Toggle Recording
    Wait Until Element is Visible    ${FPS INPUT}
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
    Verify on Cameras Page
    Select Camera By Name    good cam
    #Temp removed for debuggins
    #Toggle Recording
    Wait Until Element is Visible    ${FPS INPUT}
    Delete All Text    ${FPS INPUT}
    Input Text    ${FPS INPUT}    27
    Wait Until Elements Are Visible    ${SYSTEM SAVE}    ${SYSTEM CANCEL}
    Delete All Text    ${FPS INPUT}
    Element Attribute Value Should Be    ${FPS INPUT}    placeholder    30 - ${CURRENT TEXT}
    Click Button    ${SYSTEM CANCEL}

Change Quality
    [Tags]    C76410    Threaded
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

Enable/disable motion detection with recording on
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

Placeholder shows when system is offline
    [Tags]    C76254    threaded
    [Setup]    Camera Test Setup    user=${system}[owner]    system=${system2}[cloud id]
    Wait Until Elements are Visible
    ...    ${OFFLINE PLACEHOLDER IAMGE}
    ...    ${OFFLINE TITLE}
    ...    ${OFFLINE MESSAGE}
    Log Out

    Log in to user and system    ${system}[cloud users][cloudAdmin]    ${AUTO TESTS OFFLINE SYSTEM ID}
    Wait Until Element is Visible    ${CAMERAS LINK}
    Click Link    ${CAMERAS LINK}
    Wait Until Elements are Visible
    ...    ${OFFLINE PLACEHOLDER IAMGE}
    ...    ${OFFLINE TITLE}
    ...    ${OFFLINE MESSAGE}
    Log Out

Motion sensitivity block for cameras with different statuses
    [Tags]    C76418    Threaded
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

RTSP stream settings
    [Tags]    C79002    Threaded
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

HTTP stream settings
    [Tags]    C79092    Threaded
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



Changing credentials from invalid ones to valid ones makes the camera authorized
    [Tags]    C76390
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
    ${status}    Get Camera Attribute By Camera Name    ${auth}    https://${QA BURBANK IP}:${system}[port]    unauth cam    status
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

