*** Settings ***
Resource          ../resource.robot
Suite Setup       Server Settings Suite Setup
Test Setup        Server Settings Test Setup
Test Teardown     Common Restart Logout    ${url}
Suite Teardown    Server Settings Suite Tear Down
Force Tags        system    Threaded

*** Variables ***
${password}    ${BASE PASSWORD}
${url}         ${ENV}
@{server auth}   admin    qweasd 123

*** Keywords ***
Server Settings Suite Setup
    ${owner}=    Register and activate account with random email    mark    hamil    ${BASE PASSWORD}
    Set Suite Variable    ${owner}          ${owner}
    @{auth}=    Create List    ${owner}    ${password}
    Open Browser and go to URL    ${url}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker run -d --name servertest1 --restart always -p 7001 -p 7002 4.1_test
    ${results}    Execute Command    docker container port servertest1
    @{port1}    Get Regexp Matches    ${results}    (:)(\\d{5})    2
    Set Suite Variable    ${port1}    ${port1}

    ${results}    Execute Command    docker run -d --name servertest2 --restart always -p 7001 4.1_test
    ${results}    Execute Command    docker container port servertest2
    @{port2}    Get Regexp Matches    ${results}    (:)(\\d{5})    2
    Set Suite Variable    ${port2}    ${port2}

    ${results}    Execute Command    docker run -d --name servertest3 --restart always -p 7001 4.1_test
    ${results}    Execute Command    docker container port servertest3
    @{port3}    Get Regexp Matches    ${results}    (:)(\\d{5})    2
    Set Suite Variable    ${port3}    ${port3}
    
    @{server auth}=   Create List    admin    qweasd 123
    Setup Local System    https://${QA BURBANK IP}:${port1[0]}    ${BASE PASSWORD}    2servertest1
    ${sysId1}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port1[0]}    2serverstest1    ${owner}    ${BASE PASSWORD}
    Set Suite Variable    ${sysId1}    ${sysId1}

    Setup Local System    https://${QA BURBANK IP}:${port2[0]}    ${BASE PASSWORD}    2servertest2
    ${sysId2}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port2[0]}    2serverstest2    ${owner}    ${BASE PASSWORD}
    Set Suite Variable    ${sysId2}    ${sysId2}

    Setup Local System    https://${QA BURBANK IP}:${port3[0]}    ${BASE PASSWORD}    2servertest3
    ${sysId3}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${port3[0]}    2serverstest3    ${owner}    ${BASE PASSWORD}
    Set Suite Variable    ${sysId3}    ${sysId3}
    
    ${server id 1}=   Get Server Id    https://${QA BURBANK IP}:${port1[0]}    ${server auth}    server 1
    ${server id 2}=   Get Server Id    https://${QA BURBANK IP}:${port2[0]}    ${server auth}    server 2
    ${server id 3}=   Get Server Id    https://${QA BURBANK IP}:${port3[0]}    ${server auth}    server 3
    Set Suite Variable    ${server id 1}    ${server id 1}
    Set Suite Variable    ${server id 2}    ${server id 2}

    Change server name via API    ${auth}    server 1    ${server id 1}    https://${QA BURBANK IP}:${port1[0]}
    Change server name via API    ${auth}    server 2    ${server id 2}    https://${QA BURBANK IP}:${port2[0]}

    Log in to user and system    ${owner}    ${sysId1}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=95
    
    Go To    ${ENV}/systems/${sysId2}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=95
    Common Restart Logout    ${url}
    Merge Systems    ${auth}    ${sysId1}    ${sysId2}
    
    &{users}=    Register and Activate Generic Users
    Set Suite Variable    ${admin}          ${users}[admin]
    Set Suite Variable    ${viewer}         ${users}[viewer]
    Set Suite Variable    ${live viewer}    ${users}[liveViewer]
    Set Suite Variable    ${adv viewer}     ${users}[advViewer]
    Set Suite Variable    ${custom}         ${users}[custom]
    Add user to cloud system if not there    ${sysId1}    cloudAdmin    ${admin}    auth=${auth}
    Add user to cloud system if not there    ${sysId1}    viewer    ${viewer}    auth=${auth}
    Add user to cloud system if not there    ${sysId1}    advancedViewer    ${adv viewer}    auth=${auth}
    Add user to cloud system if not there    ${sysId1}    custom    ${custom}    auth=${auth}
    Add user to cloud system if not there    ${sysId1}    liveViewer    ${live viewer}    auth=${auth}
        
    Log in to user and system    ${owner}    ${sysId1}
    Wait Until Element is Visible    ${SERVERS LINK}    95
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=95
    Log Out

    Log in to user and system    ${owner}    ${sysId3}
    Wait Until Element is Visible    ${SERVERS LINK}    95
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=95
    Log Out
    ${results}    Execute Command    docker container stop servertest2
    Close Connection

Server Settings Suite Tear Down
    Disconnect Server via API    ${auth}    ${sysId1}    ${password}    ${owner}
    Disconnect Server via API    ${auth}    ${sysId2}    ${password}    ${owner}
    Disconnect Server via API    ${auth}    ${sysId3}    ${password}    ${owner}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop servertest1 servertest2 servertest3
    ${results}    Execute Command    docker container rm servertest1 servertest2 servertest3
    Close Connection
    Close All Browsers

Server Settings Test Setup
    [Arguments]    ${email}=${owner}    ${sysId}=${sysId1}    ${verify}=${True}
    Log in to user and system    ${email}    ${sysId}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Run Keyword If    ${verify}==${True}    Verify on Servers Page    timeout=95
    Capture Page Screenshot

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

Server name changed via API updates on cloud
    [Tags]    C70961    threaded
    Verify on Servers Page
    Select Server By Name    server 1
    Verify Server Buttons Are Enabled
    @{auth}=    Create List    ${owner}    ${BASE PASSWORD}
    ${loc}=   Get Location
    ${split}=   Split String    ${loc}    separator=/servers/%7B
    Change server name via API    ${server auth}    server 1 name changed    ${server id 1}    https://${QA BURBANK IP}:${port1[0]}
    Sleep    1
    Reload Page
    Select Server By Name    server 1 name changed
    Wait Until Element is Visible    //header//h2[contains(text(),"server 1 name changed")]/..   
    
    Log    Reset the name to server 1
    Change server name via API    ${auth}    server 1    ${server id 1}    https://${QA BURBANK IP}:${port1[0]}
    
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
    ...    ${RESTARTING BADGE}
    ...    ${SYSTEM NAME OFFLINE}
    Check For Alert    ${SERVER RESTARTED TEXT}    timeout=90
      
Restart server as admin
    [Tags]    C70968
    [Setup]    Server Settings Test Setup    email=${admin}
    Verify on Servers Page
    Wait Until Element Is Enabled    ${RESTART SERVER BUTTON}
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog  
    Click Button    ${RESTART DIALOG RESTART BUTTON}
    Wait Until Element Has Class    ${RESTART DIALOG RESTART BUTTON}    processing
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}
    Wait Until Elements are Visible    
    ...    ${RESTARTING BADGE}
    ...    ${SYSTEM NAME OFFLINE}
    Check For Alert    ${SERVER RESTARTED TEXT}    timeout=90
    
Change port is only available for owner
    [Tags]    C70927    threaded
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Log Out
    Validate Log Out
    Server Settings Test Setup    email=${admin}
    Verify on Servers Page
    Element Should Be Disabled    ${PORT INPUT}

Port field validation
    [Tags]    C70929    threaded
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
    @{auth}=    Create List    ${owner}    ${BASE PASSWORD}
    Get Cameras    ${auth}    http://${QA BURBANK IP}:${port1}[1]
    Change Port To    7001
    @{auth}=    Create List    ${owner}    ${BASE PASSWORD}
    Get Cameras    ${auth}    https://${QA BURBANK IP}:${port1}[0]

# I can validate that the api fails correctly but I can't make it work either.
# It gives a 200 but does not update. It works correctly in postman.
Admin cannot change port via API
    [Tags]    C70927    threaded
    Verify on Servers Page
    ${loc}=   Get Location
    ${split}=   Split String    ${loc}    separator=/servers/
    #${split[1]}=   Replace String    ${split[1]}    %7D    ${EMPTY}
    @{auth}=    Create List    ${admin}    ${BASE PASSWORD}
    ${resp}=   Change server port via API    ${auth}    https://${sysId1}.relay.vmsproxy.hdw.mx    7777    ${split[1]}
    Should Be Equal As Strings    ${resp.status_code}    403

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
    Wait Until Element is Visible    ${CHECKING BADGE}
    Wait Until Element Is Not Visible    ${CHECKING BADGE}
    Sleep    1
    Wait Until Element Is Not Visible    ${OFFLINE BADGE}
    ${results}    Execute Command    docker container stop servertest2
    Close Connection

Detailed info 1 server
    [Tags]   C70923    threaded
    [Setup]    Server Settings Test Setup    sysId=${sysId3}    verify=${False}
    Verify on Servers Page
    Click Button    ${SERVER DETAILED INFO BUTTON}
    ${loc}=    Get Location
    log    ${loc}
    Wait Until Location Contains    ${ENV}/systems/${sysId3}/health/servers
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    Page Should Not Contain Element    ${HM TABLE}

Detailed info 2 servers
    [Tags]    C70923    threaded
    Verify on Servers Page
    Select Server By Name    server 1
    Verify on Servers Page
    Click Button    ${SERVER DETAILED INFO BUTTON}
    ${loc}=    Get Location
    log    ${loc}
    Wait Until Location Contains    ${ENV}/systems/${sysId1}/health/servers
    Wait Until Page Contains Element    ${HM TABLE}
    Page Should Not Contain Element    ${HM SINGLE ENTITY}
    Wait Until Element is Visible    ${HM DETAILS PANEL}/../..//div[@class="panel-title"]/span[contains(text(),"server 1")]

Offline system 1 server settings
    [Tags]    C70950    threaded
    [Setup]    Server Settings Test Setup    sysId=${sysId3}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop servertest3
    Close Connection
    Reload Page
    Wait Until Element is Visible    ${SERVER NOT ACCESIBLE IMAGE}
    Element Should not be Visible    ${PORT INPUT}
    Element Should not be Visible    ${RENAME SERVER BUTTON}
    Element Should not be Visible    ${RESTART SERVER BUTTON}
    Element Should not be Visible    ${SERVER DETAILED INFO BUTTON}

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

Owner has Access
    [Tags]    C69853    C70927    threaded
    Wait Until Element is Visible    ${SERVERS LINK}
    Verify on Servers Page
    Verify Server Buttons Are Enabled

Admin has Access
    [Tags]    C69853    C70927    threaded
    [Setup]    Log in to user and system    ${admin}    ${sysId1}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Element Should Be Disabled    ${PORT INPUT}

Viewer does not have Access
    [Tags]    C69853    threaded
    [Setup]    Log in to user and system    ${viewer}    ${sysId1}
    Element Should not be Visible    ${SERVERS LINK}

Advanced Viewer does not have Access
    [Tags]    C69853    threaded
    [Setup]    Log in to user and system    ${adv viewer}    ${sysId1}
    Element Should not be Visible    ${SERVERS LINK}

Live Viewer does not have Access
    [Tags]    C69853    threaded
    [Setup]    Log in to user and system    ${live viewer}    ${sysId1}
    Element Should not be Visible    ${SERVERS LINK}

Custom User does not have Access
    [Tags]    C69853    threaded
    [Setup]    Log in to user and system    ${custom}    ${sysId1}
    Element Should not be Visible    ${SERVERS LINK}

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