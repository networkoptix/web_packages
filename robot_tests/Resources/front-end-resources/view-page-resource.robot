*** Keywords ***
View Page Suite Setup
    ${random}=   Generate Random String
    ${owner}=    Register and activate account with random email    mark    hamill    ${password}
    ${system}     Create Base System    View_Page-${random}    owner=${owner}
    Set Suite Variable    ${system}
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    QAbur777$    D8-D4-3C-60-F0-D3    http://192.168.0.27     manufacturer=Sony    #SNC-XM636
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    admin        54-42-49-A1-03-EA    http://192.168.0.201    manufacturer=Sony    #SNC-CH120
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    admin        54-42-49-40-31-68    http://192.168.0.208    manufacturer=Sony    #SNC-DH120T
    Add Camera    https://${QA BURBANK IP}:${system}[port]    admin    QAbur777$    00-16-6C-7F-65-67    http://192.168.0.206     manufacturer=Hanwha_Sunapi    #SND-6084
    Sleep    50
    ${camera id1}=    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SND-6084    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id1}    cameraName    ${camera name1}
    ${camera id2}=   Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SNC-DH120T    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id2}    cameraName    ${camera name2}
    ${data}=   evaluate    json.loads('''[{"name": "credentials", "value": "test:test", "resourceId": "${CAMERA ID2}"}]''')
    Set All Camera Add Params    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${data}
    ${camera id3}=   Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SNC-CH120    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id3}    cameraName    ${camera name3}
    ${camera id4}=    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    SNC-XM636    id
    Set Camera Attribute    https://${QA BURBANK IP}:${system}[port]    ${system}[local auth]    ${camera id4}    cameraName    ${camera name4}
 
    FOR   ${i}    IN RANGE    1    5
         ${camera id}=    Remove String        ${camera id${i}}   {    }
         Set Suite Variable    ${camera id${i}}    ${camera id}
         ${camera URL}=    Get Camera Attribute By Camera Name    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    ${camera name${i}}    url
         Set Suite Variable    ${camera URL${i}}    ${camera URL}
    END

    ${custom cameras}=    Create And Add Custom Camera User Type and User
    Activate License    ${system}[local auth]    https://${QA BURBANK IP}:${system}[port]    ${TRIAL LICENSE}
    Sleep    30
    Restart Docker Servers    ${system}[name]
    Sleep    90
    Open Browser and go to URL    ${url}
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
    Wait Until Element Is Not Visible    ${VIEW CAMERA LOADING}
    Wait Until Element Is Visible   ${VIEW CAMERA IS LIVE INDICATOR}    timeout=80    error=camera is not Live
