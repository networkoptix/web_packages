*** Settings ***
Resource          ../resource.robot
Suite Setup       Server Settings Suite Setup
Test Setup        Server Settings Test Setup
Test Teardown     Server Settings Test Teardown
Suite Teardown    Server Settings Suite Tear Down
Force Tags        system    Threaded

*** Variables ***
# change password here because for web admin it needs to be sent in the url
${password}    qweasd1234
@{server auth}   admin    ${password}
${mode}    cloud

*** Keywords ***
Server Settings Suite Setup
    Run Keyword if    '''${mode}'''=='''cloud'''    Set Suite Variable    ${extra port}    7654
    ...    ELSE    Set Suite Variable    ${extra port}    8765
    
    ${owner}=    Register and activate account with random email    mark    hamil    ${password}
    Set Suite Variable    ${user in charge}          ${owner}
    @{auth}=    Create List    ${user in charge}    ${password}
    Set Suite Variable    @{auth}    @{auth} 
    
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    # we setup one server manually here because we need 2 ports
    ${random}=    Generate Random String
    ${id}    Execute Command    docker run -d --restart always -p 7001 -p ${extra port}:7002 --name servers1-${random} ${IMAGE}
    ${cont id 1}=    Evaluate    $id[:12]
    ${results}    Execute Command    docker container port ${id} 7001
    ${port info}=   Split String    ${results}    :
    ${port 1}=   Set Variable    ${port info[1]}
    # FOR   ${i}    IN RANGE    2    4
        # ${random}=    Generate Random String
        # ${server}=   Create Docker Server    servers${random}
        # Set Suite Variable    ${cont ${i}}    ${server}[name]
        # Set Suite Variable    ${cont id ${i}}    ${server}[id]
        # Set Suite Variable    ${port ${i}}    ${server}[port]
        # ${server name}=   Catenate    SEPARATOR=${SPACE}    Server    ${cont id ${i}}
        # Set Suite Variable    ${server name ${i}}    ${server name}
    # END

    Sleep    5 
    Setup Local System    https://${QA BURBANK IP}:${port 1}    ${password}    servers1-${random}
    ${server id 1}=   Get Server Id    https://${QA BURBANK IP}:${port 1}    ${server auth}    Server ${cont id 1}
    &{server 1}=   Create Dictionary    contId=${cont id 1}    port=${port 1}    serverId=${server id 1}
        
    ${server 2} =    Create Base System    servers2-${random}    owner=${user in charge}    password=${password}
    ${server 3} =    Create Base System    servers3-${random}    owner=${user in charge}    password=${password}
    
    # Setup Local System    https://${QA BURBANK IP}:${port 2}    ${password}    2servertest2
    # Setup Local System    https://${QA BURBANK IP}:${port 3}    ${password}    2servertest3
    
    # ${server id 2}=   ${server 2}[id]
    # ${server id 3}=   ${server 3}[id]
    Change server name via API    ${server auth}    server 1    ${server id 1}    https://${QA BURBANK IP}:${port 1}
    Change server name via API    ${server 2}[local auth]    server 2    ${server 2}[id]    https://${QA BURBANK IP}:${server 2}[port]


    # &{server 2}=   Create Dictionary    contId=${cont id 2}    port=${server 2}[port]    serverId=${server 2}[id]
    # &{server 3}=   Create Dictionary    contId=${cont id 3}    port=${server 3}[port]    serverId=${server 3}[id]
    Set Suite Variable    &{server 1}    &{server 1}
    Set Suite Variable    &{server 2}    &{server 2}
    Set Suite Variable    &{server 3}    &{server 3}
    Run Keyword If    '''${mode}'''=='''cloud'''    Cloud Suite Setup
    ...    ELSE    Web Admin Suite Setup

Web Admin Suite Setup
    Set Suite Variable    ${user in charge}    admin
    @{server auth}=   Create List    admin    ${password}
    #sleep    120
    Merge Systems Local    ${server auth}    admin:${password}    https://${QA BURBANK IP}:${server 1['port']}   ${QA BURBANK IP}:${server 2['port']}    currentPassword=${password}
    #Sleep    120
    #Open Browser and go to URL    https://${QA BURBANK IP}:${server 1['port']}
    #Wait Until Elements Are Visible    //input[@id="login_email"]    //input[@id="login_password"]    //button[@type="submit"]
    #Log In    admin    ${password}
    #Wait Until Element is Visible    ${SERVERS LINK}
    #Click Link    ${SERVERS LINK}    
    #Sleep    5
    #Select Server By Name    server 1
    #Wait Until Element is Visible    //header//button[@id="accountSettingsSelect"]
    #click button    //header//button[@id="accountSettingsSelect"]
    #Wait Until Element Is Visible    //header//a/span[text()="Log Out"]
    #Click Link    //header//a/span[text()="Log Out"]/..
    


    @{local users}=   Reset Local Users    ${server auth}    https://${QA BURBANK IP}:${server 1['port']}    password=${password}
    Set Suite Variable    ${admin}          Local+${local users[1]}
    Set Suite Variable    ${viewer}         Local+${local users[4]}
    Set Suite Variable    ${live viewer}    Local+${local users[3]}
    Set Suite Variable    ${adv viewer}     Local+${local users[0]}
    Set Suite Variable    ${custom}         Local+${local users[2]}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop ${server2['id']}
    Close Connection

Cloud Suite Setup

    Open Browser and go to URL    ${ENV}
       
    ${sysId1}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${server 1['port']}    2serverstest1    ${user in charge}    ${password}
    Set To Dictionary    ${server 1}    sysId=${sysId1}
    Set To Dictionary    ${server 2}    sysId=${server 2}[cloud id] 
    Set To Dictionary    ${server 3}    sysId=${server 3}[cloud id] 

    Log in to user and system    ${user in charge}    ${server 1['sysId']}    password=qweasd1234
    Sleep    5
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    
    Go To    ${ENV}/systems/${server 2['sysId']}
    Sleep    5
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Common Restart Logout    ${ENV}
    
    #Merge Cloud Systems    ${ENV}    ${server 1['sysId']}    ${server 2['sysId']}    ${user in charge}    ${password}
    Merge Systems Local    ${server auth}    admin:${password}    https://${QA BURBANK IP}:${server 1['port']}   ${QA BURBANK IP}:${server 2['port']}    currentPassword=${password}
    Sleep    30
    
    &{users}=    Register and Activate Generic Users    password=${password}
    Set Suite Variable    ${admin}          ${users}[cloudAdmin]
    Set Suite Variable    ${viewer}         ${users}[viewer]
    Set Suite Variable    ${live viewer}    ${users}[liveViewer]
    Set Suite Variable    ${adv viewer}     ${users}[advancedViewer]
    Set Suite Variable    ${custom}         ${users}[custom]
    Add user to cloud system if not there    ${server 1['sysId']}    cloudAdmin        ${admin}          auth=${auth}
    Add user to cloud system if not there    ${server 1['sysId']}    viewer            ${viewer}         auth=${auth}
    Add user to cloud system if not there    ${server 1['sysId']}    advancedViewer    ${adv viewer}     auth=${auth}
    Add user to cloud system if not there    ${server 1['sysId']}    custom            ${custom}         auth=${auth}
    Add user to cloud system if not there    ${server 1['sysId']}    liveViewer        ${live viewer}    auth=${auth}
        
    Log in to user and system    ${user in charge}    ${server 1['sysId']}    password=qweasd1234
    Sleep    10
    Wait Until Element is Visible    ${SERVERS LINK}    300
    Sleep    5
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Log Out

    Log in to user and system    ${user in charge}    ${server 3['sysId']}    password=qweasd1234

    Wait Until Element is Visible    ${SERVERS LINK}    300
    Sleep    5
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Log Out
    Open Browser and go to URL    ${ENV}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop ${server2['id']}
    Close Connection


Server Settings Suite Tear Down
    Run Keyword If    '''${mode}'''=='''cloud'''    Disconnect Server via API    ${auth}    ${server 1['sysId']}    ${password}    ${user in charge}
    Run Keyword If    '''${mode}'''=='''cloud'''    Disconnect Server via API    ${auth}    ${server 2['sysId']}    ${password}    ${user in charge}
    Run Keyword If    '''${mode}'''=='''cloud'''    Disconnect Server via API    ${auth}    ${server 3['sysId']}    ${password}    ${user in charge}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop ${server 1}[contId] ${server 2}[id] ${server 3}[id]
    ${results}    Execute Command    docker container rm ${server 1}[contId] ${server 2}[id] ${server 3}[id]
    Run Keyword If    '''${mode}'''=='''cloud'''    Delete Account    ${ENV}    ${admin}          ${password}  
    Run Keyword If    '''${mode}'''=='''cloud'''    Delete Account    ${ENV}    ${viewer}         ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Delete Account    ${ENV}    ${live viewer}    ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Delete Account    ${ENV}    ${adv viewer}     ${password}
    Run Keyword If    '''${mode}'''=='''cloud'''    Delete Account    ${ENV}    ${custom}         ${password}
    Close All Connections
    Close All Browsers

Server Settings Test Setup
    [Arguments]    ${server}=&{server 1}    ${user}=${user in charge}    ${verify}=${True}
    Run Keyword If    '''${mode}'''=='''cloud'''    Cloud Test Setup    ${server}    ${user}    ${verify}
    ...    ELSE    Web Admin Test Setup    ${server}    ${user}    ${verify}

Cloud Test Setup
    [Arguments]    ${server}    ${user}    ${verify}
    Log in to user and system    ${user}    ${server['sysId']}    password=qweasd1234
    Sleep    5
    Run Keyword If    ${verify}    Wait Until Element is Visible    ${SERVERS LINK}
    Run Keyword If    ${verify}    Click Link    ${SERVERS LINK}
    Run Keyword If    ${verify}    Verify on Servers Page    timeout=120

Web Admin Test Setup
    [Arguments]    ${server}    ${user}    ${verify}
    ${current port}=    Set Variable If    ${server}==${server 1}    ${server['port']}
    ...    ${server}==${server2} or ${server}==${server 3}    ${server['port']}
    Open Browser and go to URL    https://${QA BURBANK IP}:${current port}
    Log In Web Admin    ${user}    ${password}
    Sleep    5
    Run Keyword If    ${verify}    Wait Until Element is Visible    ${SERVERS LINK}
    Run Keyword If    ${verify}    Click Link    ${SERVERS LINK}

Server Settings Test Teardown
    Run Keyword If    '''${mode}'''=='''cloud'''    Common Restart Logout    ${ENV}
    ...    ELSE    Close Browser

Cloud Test Teardown
    Common Restart Logout    ${ENV}

Web Admin Test Teardown
    Close Browser

*** Test Cases ***
#Rename server requires a name
#    [Tags]    C70960    threaded
#    Verify Server Buttons Are Enabled
#    Rename System or Hardware    ${EMPTY}
#    Wait Until Element Is Visible    ${SYSTEM SAVE}
#    Click Button    ${SYSTEM SAVE}
## Temporary due to failure
#    Change server name via API    ${server auth}    server 1    ${server 1["serverId"]}    https://${QA BURBANK IP}:${server 1["port"]}
#    Element Text Should Be    ${SERVER NAME}    server 1

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
    Change server name via API    ${server auth}    server 1    ${server 1['serverId']}    https://${QA BURBANK IP}:${server 1['port']}
    Reload Page
    Wait Until Element Is Visible    //header//h2[contains(text(),"server 1")]/..
    capture page screenshot

Server name changed via API updates on cloud
    [Tags]    C70961    threaded
    Verify on Servers Page
    Select Server By Name    server 1
    Verify Server Buttons Are Enabled
    ${loc}=   Get Location
    ${split}=   Split String    ${loc}    separator=/servers/%7B
    Change server name via API    ${server auth}    server 1 name changed    ${server 1['serverId']}    https://${QA BURBANK IP}:${server 1['port']}
    Sleep    1
    Reload Page
    Sleep   5
    Select Server By Name    server 1 name changed
    Wait Until Element is Visible    //header//h2[contains(text(),"server 1 name changed")]/..   
    
    Log    Reset the name to server 1
    Change server name via API    ${server auth}    server 1    ${server 1['serverId']}    https://${QA BURBANK IP}:${server 1['port']}
    
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
    Run Keyword If    '''${mode}'''=='''cloud'''    Check For Alert    ${SERVER RESTARTED TEXT}    timeout=90
    Run Keyword If    '''${mode}'''!='''cloud'''    Sleep    60
    Run Keyword If    '''${mode}'''!='''cloud'''    Close Browser
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container port ${server 1['contId']} 7001
    ${port info}=   Split String    ${results}    :
    Set To Dictionary    ${server 1}    port=${port info[1]}
    Run Keyword If    '''${mode}'''!='''cloud'''    Open Browser and go to URL    https://${QA BURBANK IP}:${server 1['port']}
    Run Keyword If    '''${mode}'''!='''cloud'''    Wait Until Elements Are Visible    //input[@id="login_email"]    //input[@id="login_password"]    //button[@type="submit"]    timeout=95
 
    Close Connection
      
Restart server as administrator
    [Tags]    C70968
    [Setup]    Server Settings Test Setup    user=${admin}
    Verify on Servers Page
    Wait Until Element Is Enabled    ${RESTART SERVER BUTTON}
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog  
    Click Button    ${RESTART DIALOG RESTART BUTTON}
    Wait Until Element Has Class    ${RESTART DIALOG RESTART BUTTON}    processing
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}
    Wait Until Elements are Visible    
    ...    ${RESTARTING BANNER}
    Run Keyword If    '''${mode}'''=='''cloud'''    Check For Alert    ${SERVER RESTARTED TEXT}    timeout=90
    Run Keyword If    '''${mode}'''!='''cloud'''    Sleep    60
    Run Keyword If    '''${mode}'''!='''cloud'''    Close Browser
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container port ${server 1['contId']} 7001
    ${port info}=   Split String    ${results}    :
    Set To Dictionary    ${server 1}    port=${port info[1]}
    Run Keyword If    '''${mode}'''!='''cloud'''    Open Browser and go to URL    https://${QA BURBANK IP}:${server 1['port']}
    Run Keyword If    '''${mode}'''!='''cloud'''    Wait Until Elements Are Visible    //input[@id="login_email"]    //input[@id="login_password"]    //button[@type="submit"]    timeout=95
 
    Close Connection
    
Change port is only available for owner
    [Tags]    C70927    threaded
    [Setup]    Server Settings Test Setup    user=${admin}
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
    ${results}    Execute Command    docker container port ${server 1['contId']} 7001
    ${port info}=   Split String    ${results}    :
    Set To Dictionary    ${server 1}    port=${port info[1]}
    Close Connection
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Change Port To    7002
    Sleep    1
    @{auth}=    Create List    ${user in charge}    ${password}
    Get Cameras    ${auth}    https://${QA BURBANK IP}:${extra port}
    Change server port via API    ${auth}    https://${QA BURBANK IP}:${extra port}    7001    ${server 1['serverId']}
    Log To Console    port changed back
    Sleep    1
    Get Cameras    ${auth}    https://${QA BURBANK IP}:${server 1['port']}

# Waiting to hear back from server team about proper error code
Admin cannot change port via API
    [Tags]    C70927    threaded
    Verify on Servers Page
    ${loc}=   Get Location
    ${split}=   Split String    ${loc}    separator=/servers/
    @{auth}=    Create List    ${admin}    ${password}
    ${resp}=   Run Keyword If    '''${mode}'''=='''cloud'''    Change server port via API    ${auth}    https://${server 1['sysId']}.relay.vmsproxy.hdw.mx    7777    ${split[1]}
    ...    ELSE    Change server port via API    ${auth}    https://${QA BURBANK IP}:${server 1['port']}    7777    ${split[1]}
    Should Be Equal As Strings    ${resp.status_code}    401

Check status
    [Tags]    C70957
    Verify on Servers Page
    Wait Until Element is Not Visible    ${CHECK STATUS BUTTON}    
    Select Server By Name    server 2
    Verify on Servers Page
    Wait Until Element is Visible    ${CHECK STATUS BUTTON}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container start ${server 2['contId']}
    Sleep    1
    Click Button    ${CHECK STATUS BUTTON}
    Wait Until Element is Visible    ${CHECKING BANNER}
    Wait Until Element Is Not Visible    ${CHECKING BANNER}
    Sleep    1
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}    95
    ${results}    Execute Command    docker container stop ${server 2['contId']}
    Close Connection

Detailed info 1 server
    [Tags]   C70923    threaded
    [Setup]    Server Settings Test Setup    server=${server 3}
    Verify on Servers Page
    Click Button    ${SERVER DETAILED INFO BUTTON}
    ${loc}=    Get Location
    log    ${loc}
    Run Keyword If    '''${mode}'''=='''cloud'''    Wait Until Location Contains    ${ENV}/systems/${server 3['sysId']}/health/servers
    ...    ELSE    Wait Until Location Contains    https://${QA BURBANK IP}:${server 3['port']}/#/health/servers
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    Page Should Not Contain Element    ${HM TABLE}

Detailed info 2 servers
    [Tags]    C70923    threaded
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container start ${server2['id']}
    Close Connection
    Verify on Servers Page
    Select Server By Name    server 1
    Verify on Servers Page
    Click Button    ${SERVER DETAILED INFO BUTTON}
    Run Keyword If    '''${mode}'''=='''cloud'''    Wait Until Location Contains    ${ENV}/systems/${server 1['sysId']}/health/servers
    ...    ELSE    Wait Until Location Contains    https://${QA BURBANK IP}:${server 1['port']}/#/health/servers
    
    Wait Until Page Contains Element    ${HM TABLE}
    Page Should Not Contain Element    ${HM SINGLE ENTITY}
    Wait Until Element is Visible    ${HM DETAILS PANEL}/../..//div[@class="panel-title"]/span[contains(text(),"server 1")]
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop ${server2['id']}
    Close Connection

Offline system 1 server settings
    [Tags]    C70950    threaded
    [Setup]    Server Settings Test Setup    server=${server 3}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop ${server 3['id']}
    Close Connection
    Reload Page
    Wait Until Element is Visible    ${SERVER NOT ACCESIBLE IMAGE}
    Wait Until Element is Visible    ${SYSTEM OFFLINE HEADER} 
    Element Should not be Visible    ${PORT INPUT}
    Element Should not be Visible    ${RENAME SERVER BUTTON}
    Element Should not be Visible    ${RESTART SERVER BUTTON}
    Element Should not be Visible    ${SERVER DETAILED INFO BUTTON}

Online two servers
    [Tags]    C701205    threaded
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

Owner/Admin has Access
    [Tags]    C69853    C70927    threaded
    Wait Until Element is Visible    ${SERVERS LINK}
    Verify on Servers Page
    Verify Server Buttons Are Enabled

Administrator has Access
    [Tags]    C69853    C70927    threaded
    [Setup]    Server Settings Test Setup    ${server 1}    ${admin}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Element Should Be Disabled    ${PORT INPUT}

Viewer does not have Access
    [Tags]    C69853    threaded
    [Setup]    Server Settings Test Setup    ${server 1}    ${viewer}    verify=${False}
    Element Should not be Visible    ${SERVERS LINK}

Advanced Viewer does not have Access
    [Tags]    C69853    threaded
    [Setup]    Server Settings Test Setup    ${server 1}    ${adv viewer}    verify=${False}
    Element Should not be Visible    ${SERVERS LINK}

Live Viewer does not have Access
    [Tags]    C69853    threaded
    [Setup]    Server Settings Test Setup    ${server 1}    ${live viewer}    verify=${False}
    Element Should not be Visible    ${SERVERS LINK}

Custom User does not have Access
    [Tags]    C69853    threaded
    [Setup]    Server Settings Test Setup    ${server 1}    ${custom}    verify=${False}
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