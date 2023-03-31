*** Settings ***
Resource          ../Resources/front-end-resources/view-page-resource.robot
Suite Setup       View Page Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     View Page Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop      restart and log out
Suite Teardown    Run Keyword and Ignore Error    View Suite Teardown
Force Tags        cameras    WIP

*** Test Cases ***
1. Resource Tree is loaded correctly
    [Tags]    C84172    C84171    C84180    C84181    C84202
    ${UI server name}=    Get Text    ${SERVER LIST NAME INFO}//span
    Should Be Equal    ${UI server name}    Server ${system}[id]    msg=${UI server name} != ${system}[name]
    FOR    ${i}    IN RANGE    1    5
        ${UI camera name}=    Get Text    ${SERVER LIST MENU}//a[contains(@href,"${camera id${i}}")]//span
        Should Be Equal    ${UI camera name}    ${camera name${i}}    msg=${UI camera name} != ${camera name${i}}
    END
    Click Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id1}")]
    Wait Until Element Is Visible    ${CAMERA PAGE LIVE INDICATOR}    timeout=80    error=camera 1 is not online
    Element Should Be Visible    ${SERVER LIST MENU}//a[contains(@href,"${camera id1}")]//span[@class="name Live"]
    Wait Until Element Is Visible    ${CAMERA PLAYER}//video[contains(@poster,"${camera id1}")]    # Check if camera 1 playing
    Check if Camera is Live
    Click Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id3}")]
    Wait Until Element Is Visible    ${VIEW CAMERA PLAYER OFFLINE}    timeout=80    error=camera 2 is not offline
    Element Should Be Visible    ${SERVER LIST MENU}//a[contains(@href,"${camera id3}")]//span[@class="name Offline"]
    Click Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id2}")]
    Wait Until Element Is Visible    ${VIEW CAMERA PLAYER AUTHENTICATION}    timeout=80    error=camera 3 is not unauthorized
    Element Should Be Visible    ${SERVER LIST MENU}//a[contains(@href,"${camera id2}")]//span[@class="name Unauthorized"]
    Click Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id4}")]
    Wait Until Element Is Visible    ${CAMERA PAGE LIVE INDICATOR}    timeout=80    error=camera 4 is not online
    Element Should Be Visible    ${SERVER LIST MENU}//a[contains(@href,"${camera id4}")]//span[@class="name Live"]
    Wait Until Element Is Visible    ${CAMERA PLAYER}//video[contains(@poster,"${camera id4}")]    # Check if camera 4 playing
    Check if Camera is Live

2. Enable Info in Resource Tree
    [Tags]    C84174
    Click Element    ${SERVER LIST INFO OFF BTN}
    ${UI server IP}=    Get Text    ${SERVER LIST IP INFO}
    ${container IP}=    Get container IP by name    name=${system}[name]
    Should Be Equal    ${UI server IP}    ${container IP}    msg=${UI server IP} != ${container IP}
    FOR    ${i}    IN RANGE    1    5
        ${UI cam URL}=    Get Text    ${SERVER LIST MENU}//a[contains(@href,"${camera id${i}}")]//span[@class="ip-info"]
        Should Be Equal    ${UI cam URL}    ${camera URL${i}}    msg=${UI cam URL} != ${camera URL${i}}
    END
    Click Element    ${SERVER LIST INFO ON BTN}
    Element Should Not Be Visible    ${SERVER LIST IP INFO}
    FOR    ${i}    IN RANGE    1    5
        Element Should Not Be Visible    ${SERVER LIST MENU}//a[contains(@href,"${camera id${i}}")]//span[@class="ip-info"]   
    END

3. Expand/Collapse Servers in Resource Tree
    [Tags]    C84175
    Verify Server Tree Expanded
    Click Element    ${SERVER LIST NAME INFO}
    Verify Server Tree Collapsed
    Click Element    ${SERVER LIST NAME INFO}
    Verify Server Tree Expanded

4. Search devices in Resource Tree
    [Tags]    C84176
    Input Text    ${SERVER LIST SEARCH BAR}    Test Search
    Element Should Not Be Visible    ${SERVER LIST SEARCH RESULT PANE}     #Verify no results appear to search
    Click Element    ${SERVER LIST SEARCH CLEAR INPUT}
    Verify Server Tree Expanded
    Input Text    ${SERVER LIST SEARCH BAR}    ${camera name1}
    Page Should Contain Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id1}")]    message=Camera 1 is not visible after search by name
    Page Should Contain Element    ${SERVER LIST NAME INFO}//span[text()="Server ${system}[id]"]
    FOR    ${i}    IN RANGE    2    5
        Page Should Not Contain Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id${i}}")]    message=Camera ${i} is visible after search  
    END
    Click Element    ${SERVER LIST SEARCH CLEAR INPUT}
    Input Text    ${SERVER LIST SEARCH BAR}    192.168.3.14
    Element Should Not Be Visible    ${SERVER LIST SEARCH RESULT PANE}     #Verify no results appear to search
    Input Text    ${SERVER LIST SEARCH BAR}    ${camera URL4}
    Page Should Contain Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id4}")]    message=Camera 4 is not visible after search by IP
    Page Should Contain Element    ${SERVER LIST NAME INFO}//span[text()="Server ${system}[id]"]
    FOR    ${i}    IN RANGE    1    4
        Page Should Not Contain Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id${i}}")]    message=Camera ${i} is visible after search  
    END

5. Expend/collapse buttons on scene
    [Tags]    C84899
    # Vertical exapnd button flow
    Element Should Be Visible    ${STREAM AND CONTROLS VISIBLE}
    ${vertical position expand button before}=    Get Vertical Position    ${VERTICAL TOGGLE EAR BEFORE CLICK}
    Click Element    ${VERTICAL TOGGLE EAR BEFORE CLICK}
    Element Should Not Be Visible    ${STREAM AND CONTROLS VISIBLE}
    ${vertical position expand button after}=    Get Vertical Position    ${VERTICAL TOGGLE EAR BEFORE CLICK} 
    IF    "${vertical position expand button before}" == "${vertical position expand button after}"
        Fail    msg=Vertical expand doesn't work
    END
    Click Element    ${VERTICAL TOGGLE EAR BEFORE CLICK} 
    Element Should Be Visible    ${STREAM AND CONTROLS VISIBLE}
    # Horizontal exapnd button flow
    Element Should Be Visible    ${SERVER LIST IS VISIBLE}
    ${horizontal position expand button before}=    Get Horizontal Position    ${HORIZONTAL TOGGLE EAR}
    Click Element    ${HORIZONTAL TOGGLE EAR}
    Element Should Not Be Visible    ${SERVER LIST IS VISIBLE}
    ${horizontal position expand button after}=    Get Horizontal Position    ${HORIZONTAL TOGGLE EAR}
    IF    "${horizontal position expand button before}" == "${horizontal position expand button after}"
        Fail    msg=Horizontal expand doesn't work
    END
    Click Element    ${HORIZONTAL TOGGLE EAR}
    Element Should Be Visible    ${SERVER LIST IS VISIBLE}

6. H265 stream
    [Tags]    C84203
    Wait Until Element Is Visible    ${SETTINGS HEADER TAB}
    Click Element    ${SETTINGS HEADER TAB}
    Wait Until Element Is Visible    ${SYSTEM NAME}
    Click Element    ${VIEW HEADER TAB}
    Verify on View Page
    Wait Until Element Is Visible    ${VIEW SETTINGS TOGGLER}
    Click element    ${VIEW SETTINGS TOGGLER}
    Verify Settings Elements When Tree Expanded
    Click Element    ${VIEW SETTINGS TRANSPORT WEBM}
    # Verify webm selected
    ${class value}=    Get Element Attribute    ${VIEW SETTINGS TRANSPORT WEBM}/..    class
    Should Contain    ${class value}    selected
    # Selecting High quality
    Wait Until Element Is Visible    ${VIEW SETTINGS QUALITY HIGH}
    Click Element    ${VIEW SETTINGS QUALITY HIGH}
    # Verify High quality selected
    ${class value}=    Get Element Attribute    ${VIEW SETTINGS QUALITY HIGH}/..    class
    Should Contain    ${class value}    selected
    # Selecting 1080p quality
    Click element    ${VIEW SETTINGS TOGGLER}
    Wait Until Element Is Visible    ${VIEW SETTINGS MENU EXPAND}
    Click Element    ${VIEW SETTINGS QUALITY 1080P}
    # Verify 1080p quality selected
    ${quality}=    Get Text    ${VIEW CAMERA QUALITY}
    Should Contain    ${quality}=    1080p

7. Change resolution on LIVE
    [Tags]    C84206
    Click element    ${VIEW SETTINGS TOGGLER}
    Verify Settings Elements When Tree Expanded
    Verify Camera Name and Quality Appear on Camera Page    expected quality=1080    expected camera name=${camera name1}
    Click Element    ${VIEW SETTINGS QUALITY HIGH}
    Verify Camera Name and Quality Appear on Camera Page    expected quality=High    expected camera name=${camera name1}
    Wait Until Element Is Visible    ${SERVER LIST MENU}//a[contains(@href,"${camera id4}")]//span
    Click Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id4}")]//span
    Sleep    1
    Verify Camera Name and Quality Appear on Camera Page    expected quality=Low    expected camera name=${camera name4}
    Click element    ${VIEW SETTINGS TOGGLER}
    Element Should Not Be Visible    ${VIEW SETTINGS QUALITY HIGH}

8. Reload page
    [Tags]    C84234
    Reload Page
    Check if Camera is Live

9. Switch between previous/next pages
    [Tags]    C84235
    Click Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id4}")]//span
    Sleep    1
    Check if Camera is Live
    ${camera 2 location}=    Get Location
    Go Back
    Wait Until Element Is Visible    ${CAMERA PLAYER}//video[contains(@poster,"${camera id1}")]
    Go To    ${camera 2 location}
    Wait Until Element Is Visible    ${CAMERA PLAYER}//video[contains(@poster,"${camera id4}")]

10. Switch to another page and back to View
    [Tags]    C84236
    Click Element    ${SETTINGS HEADER TAB}
    Wait Until Element Is Visible    ${SYSTEM NAME}
    Go To View Tab
    Wait Until Element Is Visible    ${CAMERA PLAYER}//video[contains(@poster,"${camera id1}")]

11. Open link in new tab for menu tabs
    [Tags]    C84237
    Wait Until Element Is Visible    ${SETTINGS HEADER TAB}
    Execute Javascript    window.open('${ENV}/systems/${system}[cloud id]')
    Switch Window  locator=NEW
    Wait Until Element Is Visible    ${SYSTEM NAME}    timeout=80
    ${location}=   Get Location
    Execute Javascript    window.open('${location}/view')
    Switch Window  locator=NEW
    Wait Until Element Is Visible    ${CAMERA PLAYER}//video[contains(@poster,"${camera id1}")]    timeout=80
    @{title_var}=    Get Window Handles
    FOR    ${i}    IN RANGE    0    2
        Close Window
        Switch Window    ${title_var}[${i}]
        Wait Until Element Is Visible    ${SYSTEMS DROPDOWN}
    END
    Set Window Size    1920    1080
    
12. Resizing browser window
    [Tags]    C84239
    Set Window Size    750    550
    Element Should Not Be Visible    ${SERVER LIST}
    Click Element    ${HORIZONTAL TOGGLE EAR}/div
    Verify Server Tree Expanded
    Element Should Be Visible    ${HORIZONTAL TOGGLE EAR}/div
    Click Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id4}")]//span
    Check if Camera is Live
    Set Window Size    1920    1080
    Verify on View Page

13. Offline System
    [Tags]    C84170
    Close All Browsers
    Stop container    ${system}[container]
    Open Browser and go to URL    ${url}
    Log in to user and system    ${system}[owner]    ${system}[cloud id]
    Go To View Tab
    Wait Until Element Is Visible    ${SYSTEM OFFLINE}
    Start container   ${system}[container]

14. Resource status is updated correctly
    [Tags]    C84173
    Take Camera Offline    docker name=${system}[name]    Camera IP=192.168.0.206
    Wait Until Element Is Visible    ${VIEW CAMERA PLAYER OFFLINE}    timeout=100    error=camera 1 is not offline
    Bring Camera Online    docker name=${system}[name]    Camera IP=192.168.0.206
    Check if Camera is Live
    Click Element    ${SERVER LIST MENU}//a[contains(@href,"${camera id2}")]//span
    Wait Until Element Is Visible    ${VIEW CAMERA PLAYER AUTHENTICATION}    timeout=80    error=camera 3 is not unauthorized
    Go To    ${URL}/systems/${system}[cloud id]/cameras/${camera id2}
    Wait Until Element Is Visible    ${EDIT CREDENTIALS BUTTON}
    Click Button    ${EDIT CREDENTIALS BUTTON}
    Wait Until Element Is Visible    ${EDIT CREDENTIALS LOGIN INPUT}
    Input Text    ${EDIT CREDENTIALS LOGIN INPUT}    admin
    Input Text    ${EDIT CREDENTIALS PASSWORD INPUT}    admin
    Click Button    ${EDIT CREDENTIALS SAVE BUTTON}
    Wait Until Element is Not Visible    ${EDIT CREDENTIALS FORM}
    Go To    ${URL}/systems/${system}[cloud id]/view/${camera id2}
    Check if Camera is Live
    Stop container    ${system}[container]
    Sleep    10
    Wait Until Element Is Visible    ${SYSTEM OFFLINE}    timeout=80
    Start container   ${system}[container]
    Verify on View Page
