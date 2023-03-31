*** Settings ***
Resource          ../../resource.robot
Resource          system-camera-resource.robot

*** Keywords ***
View Page Suite Setup
    Open Browser and go to URL    ${url}
    ${random}=   Generate Random String      length=5
    ${owner}=    Register and activate account with random email    mark    hamill    ${password}
    ${system}     Create Base System    View_Page-${random}    owner=${owner}
    Set Suite Variable    ${system}
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    QAbur777$    00-16-6C-7F-65-67    http://192.168.0.206    ${system}[local auth]    manufacturer=Hanwha_Sunapi    #SND-6084
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    admin        54-42-49-40-31-68    http://192.168.0.208    ${system}[local auth]    manufacturer=Sony    #SNC-DH120T
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    admin        54-42-49-A1-03-EA    http://192.168.0.201    ${system}[local auth]    manufacturer=Sony    #SNC-CH120
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    QAbur777$    D8-D4-3C-60-F0-D3    http://192.168.0.27     ${system}[local auth]    manufacturer=Sony    #SNC-XM636
    
    Sleep    50
    ${camera id1}=    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SND-6084    id
    ${camera id2}=   Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SNC-DH120T    id
    ${camera id3}=   Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SNC-CH120    id
    ${camera id4}=    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SNC-XM636    id

    IF    '${IMAGE}' == '${IMAGE 5.0}'
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id1}    name    ${camera name1}    ${camera auth1}
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id1}    model    SND-6084    ${camera auth1}
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id2}    name    ${camera name2}    ${camera auth2}
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id2}    model    SNC-DH120T    ${camera auth2}
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id3}    name    ${camera name3}    ${camera auth3}
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id3}    model    SNC-CH120    ${camera auth3}
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id4}    name    ${camera name4}    ${camera auth4}
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id4}    model    SNC-XM636    ${camera auth4}
    ELSE
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id1}    cameraName    ${camera name1}    ${camera auth1}
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id2}    cameraName    ${camera name2}    ${camera auth2}
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id3}    cameraName    ${camera name3}    ${camera auth3}
        Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id4}    cameraName    ${camera name4}    ${camera auth4}
        ${data}=   evaluate    json.loads('''[{"name": "credentials", "value": "test:test", "resourceId": "${CAMERA ID2}"}]''')
        Set All Camera Add Params    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${data}
    END
 
    FOR   ${i}    IN RANGE    1    5
         ${camera id}=    Remove String        ${camera id${i}}   {    }
         Set Suite Variable    ${camera id${i}}    ${camera id}
         ${camera URL}=    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    ${camera name${i}}    url
         Set Suite Variable    ${camera URL${i}}    ${camera URL}
    END

    Activate License    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    ${TRIAL LICENSE}
    Sleep    30
    Restart container    ${system}[container]
    Sleep    90
    Go to    ${url}
    Take Camera Offline    ${system}[name]    192.168.0.201

View Page Test Setup   
    [Arguments]    ${user}=${system}[owner]    ${system}=${system}[cloud id]
    Log in to user and system    ${user}    ${system}
    Sleep    5
    Go To View Tab
    Verify on View Page
    Click Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id1}")]//span
    Check if Camera is Live

Restart and log out
    Common Restart Logout    ${url}

View Suite Teardown
    Delete Base System    ${system}
    Close All Browsers

Go To View Tab
    ${location}=   Get Location
    Go To    ${location}/view


Verify on View Page
    Wait Until Elements Are Visible
    ...    ${SERVER LIST}
    ...    ${SERVER LIST SEARCH BAR}    timeout=120


Verify Server Tree Expanded
    Wait Until Element Is Visible    ${SERVER LIST MENU}//div[contains(@class,"expanded")]
    FOR    ${i}    IN RANGE    1    5
        Element Should Be Visible    ${SERVER LIST MENU}//a[contains(@href,"${camera id${i}}")]//span    message=Camera ${i} is not visible on expanded server tree  
    END


Verify Server Tree Collapsed
    Element Should Not Be Visible    ${SERVER LIST MENU}//div[contains(@class,"expanded")]
    FOR    ${i}    IN RANGE    1    5
        Element Should Not Be Visible    ${SERVER LIST MENU}//a[contains(@href,"${camera id${i}}")]//span    message=Camera ${i} is visible on collapsed server tree  
    END


Verify Settings Elements When Tree Expanded
    Wait Until Element Is Visible    ${VIEW SETTINGS MENU EXPAND}
    Element Should Be Visible    ${VIEW SETTINGS TRANSPORT HLS}
    Element Should Be Visible    ${VIEW SETTINGS TRANSPORT WEBM}
    Element Should Be Visible    ${VIEW SETTINGS QUALITY HIGH}
    Element Should Be Visible    ${VIEW SETTINGS QUALITY LOW}


Verify Camera Name and Quality Appear on Camera Page
    [arguments]    ${expected quality}    ${expected camera name}
    Wait Until Element Is Visible    ${VIEW CAMERA NAME AND QUALITY}
    ${UI camera name and quality}=    Get Text    ${VIEW CAMERA NAME AND QUALITY}
    Should Contain    ${UI camera name and quality}    ${expected camera name}
    Should Contain    ${UI camera name and quality}    ${expected quality}


Check if Camera is Live
    Wait Until Element Is Not Visible    ${VIEW CAMERA LOADING}    timeout=90
    Wait Until Element Is Visible   ${VIEW CAMERA IS LIVE INDICATOR}    timeout=90    error=camera is not Live
