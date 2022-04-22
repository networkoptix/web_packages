*** Settings ***
Resource          ../../resource.robot
Resource          system-user-resource.robot

*** Keywords ***
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
    ${role id}=   Save User Role    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    Custom Cameras    GlobalEditCamerasPermission|GlobalAccessAllMediaPermission
    #Rest Save User     ${system}[local auth]    h${QA BURBANK IP}:${system}[port]    ${user}    Custom Cameras    ${user}    mark Hamill    ${BASE PASSWORD}
    Share    ${system}[cloud auth]    ${system}[cloud id]    viewer    ${user}    ${permissions}[viewer]
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
    Execute Command Remotely   docker exec -d ${docker name} iptables -D INPUT -s ${Camera IP} -j DROP

Camera Suite Setup
    #system(name,port,cont,owner,id) 
    #local auth, cloud auth, server url, 
    #users('cloudAdmin, viewer, liveViewer, advancedViewer, custom)
    ${random}=   Generate Random String
    #Create Base Cloud System    cameras${random}
    ${owner}=    Register and activate account with random email    mark    hamill    ${password}
    ${system}     Create Base System    cameras-${random}    owner=${owner}
    ${system2}    Create Base System    cameras2-${random}    owner=${owner}
    ${system3}    Create Base System    cameras3-${random}    owner=${owner}
    Set Suite Variable    ${system}
    Set Suite Variable    ${system2}
    Set Suite Variable    ${system3}

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
    
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    QAbur777$    D8-D4-3C-60-F0-D3    http://192.168.0.27     manufacturer=Sony    #SNC-XM636
    Add Camera    https://${QA BURBANK IP}:${system2}[port]    admin    QAbur777$    00-16-6C-7F-65-67    http://192.168.0.206     manufacturer=Hanwha_Sunapi    #SND-6084
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    admin        54-42-49-A1-03-EA    http://192.168.0.201    manufacturer=Sony    #SNC-CH120
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    admin        54-42-49-40-31-68    http://192.168.0.208    manufacturer=Sony    #SNC-DH120T
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    admin        78-84-3C-0F-82-76    http://192.168.0.209    manufacturer=Sony    #SNC-CH280 not connected
    Sleep    50
    ${camera id}=    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SNC-XM636    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id}    cameraName    good cam
    ${camera id2}=   Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SNC-DH120T    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id2}    cameraName    unauth cam
    ${data}=   evaluate    json.loads('''[{"name": "credentials", "value": "test:test", "resourceId": "${camera id2}"}]''')
    Set All Camera Add Params    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${data}
    ${camera id3}=   Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SNC-CH120    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id3}    cameraName    offline cam
    
    ${camera id4}=   Get Camera Attribute By Camera Name    ${system2}[local auth]    https://${QA BURBANK IP}:${system2}[port]    SND-6084    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system2}[port]    ${system2}[local auth]    ${camera id4}    cameraName    no license cam
    

    ${custom cameras}=    Create And Add Custom Camera User Type and User
    Activate License    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    ${TRIAL LICENSE}
    Sleep    30
    Restart Docker Servers    ${system}[name]
    Sleep    90
    # Stop Docker Server    ${system2}[id]
    ${no perm}=    Register and activate account with random email    mark   hamill    ${BASE PASSWORD}
    Set Suite Variable    ${no perm}    ${no perm}
    Set Suite Variable    ${custom cameras}    ${custom cameras}
    Open Browser and go to URL    ${url}
    #Run Keyword If    '''${mode}'''=='''cloud'''    Cloud Suite Setup
    #...    ELSE    Web Admin Suite Setup
    Take Camera Offline    ${system}[name]    192.168.0.201
    Log To Console    ${system}[port]

Camera Test Setup    
    [Arguments]    ${user}=${system}[owner]    ${system}=${system}[cloud id]
    Log in to user and system    ${user}    ${system}
    Sleep    5
    Go To Cameras

Offline Server Test Setup
    Stop Docker Server    ${system3}[name]
    Camera Test Setup    user=${system3}[owner]    system=${system3}[cloud id]

Camera Suite Teardown
    Delete Base System    ${system}
    Delete Base System    ${system2}
    Delete Base System    ${system3}
    Close All Browsers

Set Radio Value
    [Arguments]    ${element}    ${value}
    ${current value}=   Get Element Attribute    ${element}    value