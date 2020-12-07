*** Settings ***
Resource          ../resource.robot
Suite Setup       Server Settings Suite Setup
Test Setup        Server Settings Test Setup
Test Teardown     Close Browser
Suite Teardown    Server Settings Suite Tear Down
Force Tags        system    Threaded

*** Variables ***
${password}    ${BASE PASSWORD}
@{server auth}   admin    qweasd 123
@{alt server auth}    admin     qweasd1234

*** Keywords ***
Server Settings Suite Setup
    @{auth}=    Create List    admin    ${password}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${cont id 1}    Execute Command    docker run -d --restart always -p 7001 -p 7002 4.3
    ${results}    Execute Command    docker container port ${cont id 1}
    @{port1}    Get Regexp Matches    ${results}    (:)(\\d{5})    2
    Set Suite Variable    ${cont id 1}    ${cont id 1}
    Set Suite Variable    ${port1}    ${port1}

    FOR   ${i}    IN RANGE    2    4
        ${server}=   Setup Docker Server    image=4.3
        Set Suite Variable    ${cont ${i}}    ${server}[name]
        Set Suite Variable    ${cont id ${i}}    ${server}[id]
        Set Suite Variable    ${port ${i}}    ${server}[port]
        ${server name}=   Catenate    SEPARATOR=${SPACE}    Server    ${cont id ${i}}
        Set Suite Variable    ${server name ${i}}    ${server name}
    END
    
    @{server auth}=   Create List    admin    qweasd 123
    Setup Local System    https://${QA BURBANK IP}:${port1[0]}    ${BASE PASSWORD}    2servertest1

    Setup Local System    https://${QA BURBANK IP}:${port 2}    qweasd1234    2servertest2

    Setup Local System    https://${QA BURBANK IP}:${port 3}    ${BASE PASSWORD}    2servertest3
    
    ${server id 1}=   Get Server Id    https://${QA BURBANK IP}:${port1[0]}    ${server auth}    server 1
    ${server id 2}=   Get Server Id    https://${QA BURBANK IP}:${port 2}    ${alt server auth}    server 2
    ${server id 3}=   Get Server Id    https://${QA BURBANK IP}:${port 3}    ${server auth}    server 3
    Set Suite Variable    ${server id 1}    ${server id 1}
    Set Suite Variable    ${server id 2}    ${server id 2}
    Set Suite Variable    ${server id 3}    ${server id 3}

    Change server name via API    ${server auth}    server 1    ${server id 1}    https://${QA BURBANK IP}:${port1[0]}
    Change server name via API    ${alt server auth}    server 2    ${server id 2}    https://${QA BURBANK IP}:${port 2}
    
    Merge Systems Local    ${server auth}    admin:qweasd1234    https://${QA BURBANK IP}:${port1[0]}   ${QA BURBANK IP}:${port 2}
    sleep    10
    
    @{local users}=   Reset Local Users    ${auth}    https://${QA BURBANK IP}:${port1[0]}
    log    ${local users}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop ${cont id 2}
    Close Connection

Server Settings Suite Tear Down
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop ${cont id 1} ${cont id 2} ${cont id 3}
    ${results}    Execute Command    docker container rm ${cont id 1} ${cont id 2} ${cont id 3}
    Close Connection
    Close All Browsers

Server Settings Test Setup
    [Arguments]    ${port}=${port1[0]}    ${user}=admin    ${pass}=${BASE PASSWORD}    ${validate}=${True}
    Open Browser and go to URL    https://${QA BURBANK IP}:${port}
    Sleep    2
    Wait Until Element Is Visible    //input[@id="login_email"]
    Input Text    //input[@id="login_email"]    ${user}
    Input Text    //input[@id="login_password"]    ${pass}
    Click Button    //button[@type="submit"]
    Run Keyword If    ${validate}    Wait Until Element is Visible    ${SERVERS LINK}
    Run Keyword If    ${validate}    Click Link    ${SERVERS LINK}

*** Test Cases ***
Rename server requires a name
    [Tags]    C70960    threaded
    
    Verify Server Buttons Are Enabled
    Rename System or Hardware    ${EMPTY}
    Wait Until Element Is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Element Text Should Be    ${SERVER NAME}    server 1

Server name can be changed
    [Tags]    C71000    threaded
    Select Server By Name    server 1
    Verify Server Buttons Are Enabled
    Capture Page Screenshot
    Rename System or Hardware    server 1 name changed
    Click Button    ${SYSTEM SAVE}
    Capture Page Screenshot
    Wait Until Element is Visible    //header//h2[contains(text(),"server 1 name changed")]/..
    Reload Page 
    Wait Until Element is Visible    //header//h2[contains(text(),"server 1 name changed")]/..

    Log    Reset the name to server 1
    Change server name via API    ${server auth}    server 1    ${server id 1}    https://${QA BURBANK IP}:${port1[0]}
    Reload Page
    Wait Until Element Is Visible    //header//h2[contains(text(),"server 1")]/..
    capture page screenshot

#Server name changed via API updates on cloud
#    [Tags]    C70961    threaded
#    Verify on Servers Page
#    Select Server By Name    server 1
#    Verify Server Buttons Are Enabled
#    @{auth}=    Create List    ${owner}    ${BASE PASSWORD}
#    ${loc}=   Get Location
#    ${split}=   Split String    ${loc}    separator=/servers/%7B
#    Change server name via API    ${server auth}    server 1 name changed    ${server id 1}    https://${QA BURBANK IP}:${port1[0]}
#    Sleep    1
#    Reload Page
#    Select Server By Name    server 1 name changed
#    Wait Until Element is Visible    //header//h2[contains(text(),"server 1 name changed")]/..   
#    
#    Log    Reset the name to server 1
#    Change server name via API    ${auth}    server 1    ${server id 1}    https://${QA BURBANK IP}:${port1[0]}
    
Restart close button works
    [Tags]    C70968    threaded
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog 
    Click Button    ${RESTART DIALOG CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}

Restart cancel button works
    [Tags]    C70968    threaded
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog 
    Click Button    ${RESTART DIALOG CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}

Restart server as owner
    [Tags]    C70968
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog  
    Click Button    ${RESTART DIALOG RESTART BUTTON}
    Wait Until Element Has Class    ${RESTART DIALOG RESTART BUTTON}    processing
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}
    Wait Until Elements are Visible    
    ...    ${RESTARTING BANNER}
    Check For Alert    ${SERVER RESTARTED TEXT}    timeout=90
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container port servertest1
    @{port1}    Get Regexp Matches    ${results}    (:)(\\d{5})    2
    Set Suite Variable    ${port1}    ${port1}
    Close Connection
      
#Restart server as admin
#    [Tags]    C70968
#    [Setup]    Server Settings Test Setup    email=${admin}
#    Verify on Servers Page
#    Wait Until Element Is Enabled    ${RESTART SERVER BUTTON}
#    Click Button    ${RESTART SERVER BUTTON}
#    Verify Restart Dialog  
#    Click Button    ${RESTART DIALOG RESTART BUTTON}
#    Wait Until Element Has Class    ${RESTART DIALOG RESTART BUTTON}    processing
#    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}
#    Wait Until Elements are Visible    
#    ...    ${RESTARTING BANNER}
#    ...    ${SYSTEM NAME OFFLINE}
#    Check For Alert    ${SERVER RESTARTED TEXT}    timeout=90
    
#Change port is only available for owner
#    [Tags]    C70927    threaded
#    Verify on Servers Page
#    Verify Server Buttons Are Enabled
#    Log Out
#    Validate Log Out
#    Server Settings Test Setup    email=${admin}
#    Verify on Servers Page
#    Element Should Be Disabled    ${PORT INPUT}

Port field validation
    [Tags]    C70929    threaded
    Reload Page
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Log    Step 1
    ${before port}=    Get Value    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}
    Sleep    1
    ${after port}=    Get Value    ${PORT INPUT}
    Should Be Equal As Integers    ${before port}    ${after port}
    Log    Step 2
    Delete All Text    ${PORT INPUT}
    Press Keys    ${PORT INPUT}    0
    Sleep    1
    ${current port}=    Get Value    ${PORT INPUT} 
    Should Be Equal    ${current port}    ${EMPTY}
    Log    Step 3
    Click Element    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Press Keys    ${PORT INPUT}    1023
    Wait Until Element Is Visible    ${PORT TOO LOW ERROR}
    Log    Step 4
    Click Element    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Press Keys    ${PORT INPUT}    77777
    ${current port}=    Get Value    ${PORT INPUT} 
    Should Be Equal    ${current port}    7777
    Log    Step 5
    Click Element    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Press Keys    ${PORT INPUT}    -1
    ${current port}=    Get Value    ${PORT INPUT} 
    Should Be Equal    ${current port}    1
    Log    Step 6
    Click Element    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Press Keys    ${PORT INPUT}    1024
    ${current port}=    Get Value    ${PORT INPUT} 
    Should Be Equal    ${current port}    1024
    Log    Step 7
    Click Button    ${SYSTEM CANCEL}
    ${current port}=    Get Value    ${PORT INPUT} 
    Should Be Equal    ${current port}    ${before port}

Change port
    [Tags]    C70975
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container port servertest1
    Close Connection
    @{port1}    Get Regexp Matches    ${results}    (:)(\\d{5})    2
    Set Suite Variable    ${port1}    ${port1}
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Change Port To    7002
    Sleep    1
    Get Cameras    ${server auth}    http://${QA BURBANK IP}:${port1}[1]
    Change Port To    7001
    Get Cameras    ${server auth}    https://${QA BURBANK IP}:${port1}[0]

# I can validate that the api fails correctly but I can't make it work either.
# It gives a 200 but does not update. It works correctly in postman.
#Admin cannot change port via API
#    [Tags]    C70927    threaded
#    Verify on Servers Page
#    ${loc}=   Get Location
#    ${split}=   Split String    ${loc}    separator=/servers/
#    #${split[1]}=   Replace String    ${split[1]}    %7D    ${EMPTY}
#    @{auth}=    Create List    ${admin}    ${BASE PASSWORD}
#    ${resp}=   Change server port via API    ${auth}    https://${sysId1}.relay.vmsproxy.hdw.mx    7777    ${split[1]}
#    Should Be Equal As Strings    ${resp.status_code}    403

Check status
    [Tags]    C70957
    Verify on Servers Page
    Wait Until Element is Not Visible    ${CHECK STATUS BUTTON}    
    Select Server By Name    server 2
    Verify on Servers Page
    Wait Until Element is Visible    ${CHECK STATUS BUTTON}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container start servertest2
    Sleep    1
    Click Button    ${CHECK STATUS BUTTON}
    Wait Until Element is Visible    ${CHECKING BANNER}
    Wait Until Element Is Not Visible    ${CHECKING BANNER}
    Sleep    1
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}
    ${results}    Execute Command    docker container stop servertest2
    Close Connection

Detailed info 1 server
    [Tags]   C70923    threaded
    [Setup]    Server Settings Test Setup    port=${port 3}
    Verify on Servers Page
    Click Button    ${SERVER DETAILED INFO BUTTON}
    Validate Alerts Page
    ${loc}=    Get Location
    log    ${loc}
    ${server id}=   Remove String    ${server id 3}    }    {
    Wait Until Location Contains    ${QA BURBANK IP}:${port 3}/#/health/servers?id=${server id}
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    Page Should Not Contain Element    ${HM TABLE}

Detailed info 2 servers
    [Tags]    C70923    threaded
    Verify on Servers Page
    Select Server By Name    server 1
    Verify on Servers Page
    Click Button    ${SERVER DETAILED INFO BUTTON}
    Validate Alerts Page
    ${loc}=    Get Location
    log    ${loc}
    ${server id}=   Remove String    ${server id 1}    }    {
    Wait Until Location Contains    ${QA BURBANK IP}:${port1[0]}/#/health/servers?id=${server id}
    Wait Until Page Contains Element    ${HM TABLE}
    Page Should Not Contain Element    ${HM SINGLE ENTITY}
    Wait Until Element is Visible    ${HM DETAILS PANEL}/../..//div[@class="panel-title"]/span[contains(text(),"server 1")]
    
# One server can't be offline then there is no web admin to view
#Offline system 1 server settings
#    [Tags]    C70950    threaded
#    [Setup]    Server Settings Test Setup    port=${port 3}
#    Open Connection    ${QA BURBANK IP}
#    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
#    ${results}    Execute Command    docker container stop servertest3
#    Close Connection
#    Sleep   5
#    Reload Page
#    Wait Until Element is Visible    ${SERVER NOT ACCESIBLE IMAGE}
#    Element Should not be Visible    ${PORT INPUT}
#    Element Should not be Visible    ${RENAME SERVER BUTTON}
#    Element Should not be Visible    ${RESTART SERVER BUTTON}
#    Element Should not be Visible    ${SERVER DETAILED INFO BUTTON}

Online two servers
    [Tags]    C70955    threaded
    Verify on Servers Page
    Select Server By Name    server 1
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    
Offline two servers
    [Tags]    C70955    threaded
    Select Server By Name    server 2
    Verify on Servers Page
    Wait Until Element is Visible    ${CHECK STATUS BUTTON}
    Element Should be Disabled    ${PORT INPUT}
    Element Should be Disabled    ${RESTART SERVER BUTTON}
    Element Should Not be Visible    ${SYSTEM NAME OFFLINE}

Viewer does not have Access
    [Tags]    C69853    threaded
    [Setup]    Server Settings Test Setup    user=local+viewer    validate=${False}
    Element Should not be Visible    ${SERVERS LINK}

Advanced Viewer does not have Access
    [Tags]    C69853    threaded
    [Setup]    Server Settings Test Setup    user=local+advancedViewer    validate=${False}
    Element Should not be Visible    ${SERVERS LINK}

Live Viewer does not have Access
    [Tags]    C69853    threaded
    [Setup]    Server Settings Test Setup    user=local+liveViewer    validate=${False}
    Element Should not be Visible    ${SERVERS LINK}

Custom User does not have Access
    [Tags]    C69853    threaded
    [Setup]    Server Settings Test Setup    user=local+custom    validate=${False}
    Element Should not be Visible    ${SERVERS LINK}

Admin has Access
    [Tags]    C69853    C70927    threaded
    [Setup]    Server Settings Test Setup    user=local+cloudAdmin
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Element Should Be Disabled    ${PORT INPUT}
# This is probably deprecated by the new left menu search.
#Tab order is correct for online system
#    [Tags]    C69882    threaded
#    Verify on Servers Page
#    Press Keys    None    TAB
#    Element Should Be Focused    //nx-level-3-item/a//span[contains(text(),"server 1")]/../..
#    Press Keys    None    TAB
#    Element Should Be Focused    //nx-level-3-item/a//span[contains(text(),"server 2")]/../..
#    Verify Server Buttons Are Enabled
#    @{tab items}=   Create List
#    ...    ${SERVER DETAILED INFO BUTTON}
#    ...    ${RENAME SERVER BUTTON}
#    ...    ${RESTART SERVER BUTTON} 
#    ...    ${PORT INPUT}
#    ...    ${FOOTER ABOUT LINK}
#    ...    ${DOWNLOAD LINK}
#    ...    ${FOOTER INTEGRATIONS LINK}
#    ...    ${FOOTER SUPPORT LINK} 
#    ...    ${FOOTER TERMS LINK}
#    ...    ${FOOTER PRIVACY LINK} 
#    ...    ${FOOTER SUPPORTED DEVICES LINK}  
#
#    FOR    ${element}    IN    @{tab items}
#        Press Keys    None    TAB
#        Element Should Be Focused    ${element}
#    END