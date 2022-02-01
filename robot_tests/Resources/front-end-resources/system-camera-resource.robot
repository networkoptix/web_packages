*** Settings ***
Library    SSHLibrary
Resource    ../../resource.robot
*** Keywords ***
Start up
    [Arguments]    ${url}
    Reset All Cameras
    Open Browser and go to URL    ${url}

Reset cameras and log out
    Common Restart Logout    ${url}

Go To Cameras
    ${location}=   Get Location
    Go To    ${location}/cameras

Verify on Cameras Page
    Wait Until Elements are Visible    
    ...    ${CAMERAS VIEW BUTTON}
    ...    ${EDITABLE TITLE}
    ...    ${CAMERAS DETAILED INFO BUTTON}
    ...    ${ASPECT RATIO DROPDOWN}
    ...    ${ROTATION DROPDOWN}
    ...    ${ENABLE AUDIO CHECKBOX}
    ...    ${EDIT CREDENTIALS BUTTON}
    ...    ${RECORDING CHECK BOX}
    ...    timeout=65

Verify Authentication Form
    Wait Until Elements are Visible
    ...    ${EDIT CREDENTIALS LOGIN INPUT}
    ...    ${EDIT CREDENTIALS PASSWORD INPUT}
    ...    ${EDIT CREDENTIALS X BUTTON}
    ...    ${EDIT CREDENTIALS CANCEL BUTTON}
    ...    ${EDIT CREDENTIALS SAVE BUTTON}

Toggle Recording
    Wait Until Element Is Enabled    ${ENABLED RECORDING SLIDER}
    Wait Until Element Is Visible    ${ENABLED RECORDING SLIDER}
    Sleep    1    # added because the above checks weren't enough
    Click Element    ${RECORDING CHECK BOX}

Select Camera By Name
    [Arguments]    ${camera name}
    Wait Until Element is Visible    //nx-level-3-item/a//span[contains(text(),"${camera name}")]
    Sleep    1
    Click Link    //nx-level-3-item/a//span[contains(text(),"${camera name}")]/../..

Change Aspect Ratio
    [Arguments]    ${expected ratio}
    Click Button    ${ASPECT RATIO DROPDOWN}
    Click Element    ${ASPECT RATIO DROPDOWN}/following-sibling::div//span[contains(text(),"${expected ratio}")]/..

Aspect Ratio Should Be
    [Arguments]    ${expected ratio}
    Wait Until Element is Visible    ${ASPECT RATIO DROPDOWN}/span[contains(text(),"${expected ratio}")]

Change Rotation
    [Arguments]    ${expected rotation}
    Click Button    ${ROTATION DROPDOWN}
    Click Element    ${ROTATION DROPDOWN}/following-sibling::div//span[contains(text(),"${expected rotation}")]/..

Rotation Should Be
    [Arguments]    ${expected rotation}
    Wait Until Element is Visible    ${ROTATION DROPDOWN}/span[contains(text(),"${expected rotation}")]

Audio Enabled Should Be
    [Arguments]    ${expected state}
    Wait Until Element is Visible    ${ENABLE AUDIO CHECKBOX}
    ${current state}=   Get Checkbox Value    ${ENABLE AUDIO CHECKBOX}//input
    Should Be Equal    "${expected state}"    "${current state}"

Camera Name Should Be
    [Arguments]    ${auth}    ${server url}    ${camera id}    ${name}
    ${cameras}=   Get Cameras    ${auth}    ${server url}
    FOR    ${camera}  IN  @{cameras}
        log   ${camera}
        Run Keyword if    '''${camera['id']}'''=='''${camera id}'''    Should Be Equal    ${camera['name']}    ${name}
    END

Disable Motion Detection
    Wait Until Element Is Visible    ${DOT-MENU}
    Click Button    ${DOT-MENU}
    Wait Until Element is Visible    ${DISABLE MOTION DETECTION LINK}
    Click Link    ${DISABLE MOTION DETECTION LINK}
    Wait Until Element is Not Visible    ${DISABLE MOTION DETECTION LINK}
    Wait Until Element is Visible    ${ENABLE MOTION DETECTION BUTTON}

Get Camera Attribute By Camera Name
    [Arguments]    ${auth}    ${server url}    ${name}    ${attribute}
    ${cameras}=    Get Cameras    ${auth}    ${server url}
    FOR    ${camera}  IN  @{cameras}
        Run Keyword If    '''${camera['name']}'''=='''${name}'''    Return From Keyword    ${camera}[${attribute}]
    END

Verify Recording Controls Are Open
    Wait Until Elements Are Visible
    ...    ${RECORD ALWAYS RADIO BUTTON}/..           
    ...    ${RECORD MOTION RADIO BUTTON}/..      
    ...    ${RECORD MOTION LOW QUALITY RADIO BUTTON}/..
    ...    ${FPS INPUT}                             
    ...    ${QUALITY DROPDOWN}

Reset Camera
    [Arguments]    ${camera name}    ${server ip}
    ${auth}=    Create List    admin    ${BASE PASSWORD}
    ${data}=   evaluate    json.loads('''${${camera name} JSON 1}''')
    Set All Camera Attributes    ${server ip}    ${auth}    ${data}
    
    ${data2}=   evaluate    json.loads('''${${camera name} JSON 2}''')
    Set All Camera Add Params    ${server ip}    ${auth}    ${data2}

Start Software Camera
    [Arguments]    ${server port}    ${camera port}    ${user}=mark    ${password}=hamill
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    Start Command    camera-venv/bin/python -m software_cameras --port ${camera port} --user ${user} --password ${password}
    Close Connection
    Sleep    5

Add Software Camera
    [Arguments]    ${server port}    ${camera port}    ${file}
    ${uuid}=    Camera Search    http://${QA BURBANK IP}:${server port}    ${camera port}    ${file}    ${QA BURBANK IP}
    Sleep    5
    ${camera}=    Camera Status    http://${QA BURBANK IP}:${server port}    ${uuid}
    Add Fake Camera   http://${QA BURBANK IP}:${server port}    ${camera}[reply][cameras]

Create And Add Custom Camera User Type and User
    ${user}=    Register and activate account with random email    mark     hamill    ${BASE PASSWORD}
    ${role id}=   Save User Role    ${system}[cloud auth]    https://${QA BURBANK IP}:${system}[port]    Custom Cameras    GlobalEditCamerasPermission|GlobalAccessAllMediaPermission
    #Rest Save User     ${system}[local auth]    h${QA BURBANK IP}:${system}[port]    ${user}    Custom Cameras    ${user}    mark Hamill    ${BASE PASSWORD}
    Share    ${system}[cloud auth]    ${system}[cloud id]    viewer    ${user}
    ${id}=   Get Cloud User Id By Email    ${system}[cloud auth]    ${user}    ${system}[cloud id]
    @{custom roles}=    Get User Roles    https://${QA BURBANK IP}:${system['port']}    ${local auth}
    &{custom permissions}=   Get Custom Permissions    ${custom roles}    Custom Cameras
    ${user id}=   Get Cloud User Id By Email    ${system}[cloud auth]    ${user}    ${system}[cloud id]
    #Save User    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    ${user}    ${custom permissions}[permissions]    ${user}    ${BASE PASSWORD}    user id=${id}    user role id=${role id}
    Save User Existing    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    ${user}    ${custom permissions}[permissions]    ${user}    ${custom permissions}[id]    ${id}
    [Return]    ${user}
    
Take Camera Offline
    [Documentation]    Simulates the camera going offline by blacklisting its IP on the docker server
    [Arguments]    ${docker name}    ${Camera IP}
    Execute Command Remotely    docker exec -d ${docker name} iptables -A INPUT -s ${Camera IP} -j DROP
    
Bring Camera Online
    [Documentation]    Brings the camera back online by removing the blacklisting of its IP on the docker server
    [Arguments]    ${docker name}    ${Camera IP}
    Execute Command Remotely    docker exec -d ${docker name} iptables -D INPUT -s ${Camera IP} -j DROP