*** Settings ***
Resource          ../resource.robot
Suite Setup       Server Settings Suite Setup
Test Setup        Server Settings Test Setup
Test Teardown     Server Settings Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Server Settings Suite Tear Down
Force Tags        system    

*** Variables ***
${password}    ${BASE PASSWORD}
@{server auth}   admin    ${password}

*** Keywords ***
Server Settings Suite Setup
    ${owner}=    Register and activate account with random email    mark    hamil    ${password}
    Set Suite Variable    ${user in charge}    ${owner}
    @{auth}=    Create List    ${user in charge}    ${password}
    Set Suite Variable    ${auth}

    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}
    # We setup one server manually here because we need 2 ports
    ${random}=    Generate Random String
    ${port 1}=   Get Random Available Port
    Set Suite Variable    ${port 1}
    ${extra port}=  Get Random Available Port
    Set Suite Variable    ${extra port}
    IF    '5.0' not in $image
        Set Local Variable   ${vms}    old
    ELSE
        Set Local Variable    ${vms}    new
    END
    ${id}=   Execute Command    docker run -d --restart always -p ${port 1}:7001 -p ${extra port}:7002 --name servers1-${random} -e VMS=${vms} ${IMAGE}
    ${cont id 1}=    Evaluate    $id[:12]

    Sleep    5
    Setup Local System    https://${QA BURBANK IP}:${port 1}    ${password}    servers1-${random}
    ${server 1 id}=   Get Server Id    https://${QA BURBANK IP}:${port 1}    ${server auth}    Server ${cont id 1}
    ${server 1}=   Create Dictionary    contId=${cont id 1}    port=${port 1}    serverId=${server 1 id}

    ${server 2}=    Run Keyword If    '''${mode}'''=='''cloud'''    Create Base System    servers2-${random}    owner=${user in charge}
    ...    ELSE    Create Base System    servers2-${random}
    ${server 2 id}=   Get Server Id    https://${QA BURBANK IP}:${server 2}[port]    ${server auth}    Server ${server 2}[id]
    ${server 3}=    Run Keyword If    '''${mode}'''=='''cloud'''    Create Base System    servers3-${random}    owner=${user in charge}
    ...    ELSE    Create Base System    servers3-${random}

    Change server name via API    ${server auth}    server 1    ${server 1 id}    https://${QA BURBANK IP}:${port 1}
    Change server name via API    ${server 2}[local auth]    server 2    ${server 2 id}    https://${QA BURBANK IP}:${server 2}[port]
    FOR    ${i}    IN RANGE    1    4
        Set Suite Variable    ${server ${i}}
    END

    Run Keyword If    '''${mode}'''=='''cloud'''    Cloud Suite Setup
    ...    ELSE    Web Admin Suite Setup

Web Admin Suite Setup
    Set Suite Variable    ${user in charge}    admin
    #sleep    120
    Merge Systems Local    ${server auth}    admin:${password}    https://${QA BURBANK IP}:${server 1}[port]   ${QA BURBANK IP}:${server 2}[port]    currentPassword=${password}
    Sleep    120
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

    @{local users}=   Reset Local Users    ${server auth}    https://${QA BURBANK IP}:${server 1}[port]    password=${password}
    Set Suite Variable    ${admin}          Local+${local users[1]}
    Set Suite Variable    ${viewer}         Local+${local users[4]}
    Set Suite Variable    ${live viewer}    Local+${local users[3]}
    Set Suite Variable    ${adv viewer}     Local+${local users[0]}
    Set Suite Variable    ${custom}         Local+${local users[2]}
    Execute Command Remotely    docker container stop ${server 2}[id]

Cloud Suite Setup

    Open Browser and go to URL    ${ENV}

    ${sysId1}=   Connect System to Cloud    ${server auth}    https://${QA BURBANK IP}:${server 1}[port]    2serverstest1    ${user in charge}    ${password}
    Set To Dictionary    ${server 1}    sysId=${sysId1}
    Set To Dictionary    ${server 2}    sysId=${server 2}[cloud id]
    Set To Dictionary    ${server 3}    sysId=${server 3}[cloud id]

    Log in to user and system    ${user in charge}    ${server 1}[sysId]    password=${password}
    Go to Servers
    Verify on Servers Page    timeout=120

    Go To    ${ENV}/systems/${server 2}[sysId]
    Sleep    5
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Sleep    300
    Common Restart Logout    ${ENV}
    cdb Merge Cloud Systems    ${server 1}[sysId]    ${server 2}[cloud id]    ${server 2}[owner]    ${password}
    Sleep    120

    ${users}=    Register and Activate Generic Users    password=${password}
    Set Suite Variable    ${admin}          ${users}[cloudAdmin]
    Set Suite Variable    ${viewer}         ${users}[viewer]
    Set Suite Variable    ${live viewer}    ${users}[liveViewer]
    Set Suite Variable    ${adv viewer}     ${users}[advancedViewer]
    Set Suite Variable    ${custom}         ${users}[custom]
    Add user to cloud system if not there    ${server 1}[sysId]    cloudAdmin        ${admin}          auth=${auth}
    Add user to cloud system if not there    ${server 1}[sysId]    viewer            ${viewer}         auth=${auth}
    Add user to cloud system if not there    ${server 1}[sysId]    advancedViewer    ${adv viewer}     auth=${auth}
    Add user to cloud system if not there    ${server 1}[sysId]    custom            ${custom}         auth=${auth}
    Add user to cloud system if not there    ${server 1}[sysId]    liveViewer        ${live viewer}    auth=${auth}

    Log in to user and system    ${user in charge}    ${server 1}[sysId]    password=${password}
    Sleep    10
    Wait Until Element is Visible    ${SERVERS LINK}    300
    Sleep    5
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Log Out

    Log in to user and system    ${user in charge}    ${server 3}[sysId]    password=${password}

    Wait Until Element is Visible    ${SERVERS LINK}    300
    Sleep    5
    Click Link    ${SERVERS LINK}
    Verify on Servers Page    timeout=120
    Log Out
    Open Browser and go to URL    ${ENV}
    Execute Command Remotely    docker container stop ${server 2}[id]


Server Settings Suite Tear Down
    FOR    ${i}    IN RANGE    1    4
        Run Keyword If    '''${mode}'''=='''cloud'''    Disconnect Server via API    ${auth}    ${server ${i}}[sysId]    ${password}    ${user in charge}
    END

    Execute Command Remotely     docker container rm -f ${server 1}[contId] ${server 2}[id] ${server 3}[id]

    FOR    ${user}    IN    ${admin}    ${viewer}    ${live viewer}    ${adv viewer}    ${custom}
        Run Keyword If    '''${mode}'''=='''cloud'''    Delete Account    ${user}    ${password}
    END

    Close All Connections
    Close All Browsers

Server Settings Test Setup
    [Arguments]    ${server}=${server 1}    ${user}=${user in charge}    ${verify}=${True}
    Skip If Irrelevant
    Run Keyword If    '''${mode}'''=='''cloud'''    Cloud Test Setup    ${server}    ${user}    ${verify}
    ...    ELSE    Web Admin Test Setup    ${server}    ${user}    ${verify}

Cloud Test Setup
    [Arguments]    ${server}    ${user}    ${verify}
    Log in to user and system    ${user}    ${server}[sysId]    password=${password}
    Sleep    5
    Run Keyword If    ${verify}    Wait Until Element is Visible    ${SERVERS LINK}
    Run Keyword If    ${verify}    Go To Servers
    Run Keyword If    ${verify}    Verify on Servers Page    timeout=120

Web Admin Test Setup
    [Arguments]    ${server}    ${user}    ${verify}
    Open Browser and go to URL    https://${QA BURBANK IP}:${server}[port]
    Log In Web Admin    ${user}    ${password}    ${verify}
    Sleep    5
    Run Keyword If    ${verify}    Wait Until Element is Visible    ${SERVERS LINK}
    Run Keyword If    ${verify}    Click Link    ${SERVERS LINK}

Server Settings Test Teardown
    Run Keyword If    '''${mode}'''=='''cloud'''    Common Restart Logout    ${ENV}
    ...    ELSE    Close Browser
    Run Keyword If Test Failed    Run Keywords
        ...    Change server name via API    ${server auth}    server 1    ${server 1}[serverId]    https://${QA BURBANK IP}:${server 1}[port]    AND
        ...    Execute Command Remotely    docker container stop ${server 2}[id]

Cloud Test Teardown
    Common Restart Logout    ${ENV}
    Run Keyword If Test Failed    Run Keywords
        ...    Change server name via API    ${server auth}    server 1    ${server 1}[serverId]    https://${QA BURBANK IP}:${server 1}[port]    AND
        ...    Execute Command Remotely    docker container stop ${server 2}[id]

Web Admin Test Teardown
    Close Browser

*** Test Cases ***
#Rename server requires a name
#    [Tags]    C70960    
#    Verify Server Buttons Are Enabled
#    Rename System or Hardware    ${EMPTY}
#    Wait Until Element Is Visible    ${SYSTEM SAVE}
#    Click Button    ${SYSTEM SAVE}
## Temporary due to failure
#    Change server name via API    ${server auth}    server 1    ${server 1["serverId"]}    https://${QA BURBANK IP}:${server 1["port"]}
#    Element Text Should Be    ${SERVER NAME}    server 1

1. Server name can be changed
    [Tags]    C71000    cloud    webadmin
    Select Server By Name    server 1
    Verify Server Buttons Are Enabled
    Change System Name    server 1 name changed    save=True
    Wait Until Element is Visible    //header//nx-text-editable[contains(text(),"server 1 name changed")]
    Reload Page
    Wait Until Element is Visible    //header//nx-text-editable[contains(text(),"server 1 name changed")]
    Wait Until Element is Visible    //nx-level-3-item//a//span[contains(text(),"server 1 name changed")]     
    Log    Reset the name to server 1
    Change server name via API    ${server auth}    server 1    ${server 1}[serverId]    https://${QA BURBANK IP}:${server 1}[port]
    Reload Page
    Wait Until Element Is Visible    //header//nx-text-editable[contains(text(),"server 1")]

2. Server name changed via API updates on cloud
    [Tags]    C70961    cloud    webadmin
    Verify on Servers Page
    Sleep    1
    Select Server By Name    server 1
    Verify Server Buttons Are Enabled
    ${loc}=   Get Location
    ${split}=   Split String    ${loc}    separator=/servers/%7B
    Change server name via API    ${server auth}    server 1 name changed    ${server 1}[serverId]    https://${QA BURBANK IP}:${server 1}[port]
    Sleep    1
    Reload Page
    Sleep   5
    Select Server By Name    server 1 name changed
    #Wait Until Element is Visible    //header//h2[contains(text(),"server 1 name changed")]/..
    Element Text Should Be    ${SYSTEM NAME}    server 1 name changed
    Log    Reset the name to server 1
    Change server name via API    ${server auth}    server 1    ${server 1}[serverId]    https://${QA BURBANK IP}:${server 1}[port]

3. Restart close button works
    [Tags]    C70968    cloud    webadmin
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog
    Click Button    ${RESTART DIALOG CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}

4. Restart cancel button works
    [Tags]    C70968    cloud    webadmin
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog
    Click Button    ${RESTART DIALOG CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}

5. Restart server as owner
    [Documentation]     Skipping cloud due to https://networkoptix.atlassian.net/browse/CLOUD-8158
    [Tags]    C70968    webadmin    # cloud
    Skip If     '''${mode}'''=='''cloud'''
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog
    Click Button    ${RESTART DIALOG RESTART BUTTON}
    Wait Until Element Has Class    ${RESTART DIALOG RESTART BUTTON}    processing
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}
    Wait Until Elements are Visible     ${RESTARTING BANNER}
    Run Keyword If    '''${mode}'''=='''cloud'''    Check For Alert    ${SERVER RESTARTED TEXT}    timeout=120
       ...    ELSE   Run Keywords
           ...    Sleep    60    AND
           ...    Close Browser    AND
           ...    Open Browser and go to URL    https://${QA BURBANK IP}:${server 1}[port]    AND
           ...    Wait Until Elements Are Visible    //input[@id="login_email"]    //input[@id="login_password"]    //button[@type="submit"]    timeout=95

6. Restart server as administrator
    [Documentation]     Skipping cloud due to https://networkoptix.atlassian.net/browse/CLOUD-8158
    [Tags]    C70968    webadmin    # cloud
    [Setup]    Server Settings Test Setup    user=${admin}
    Skip If    '''${mode}'''=='''cloud'''
    Verify on Servers Page
    Wait Until Element Is Enabled    ${RESTART SERVER BUTTON}
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog
    Click Button    ${RESTART DIALOG RESTART BUTTON}
    Wait Until Element Has Class    ${RESTART DIALOG RESTART BUTTON}    processing
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}
    Wait Until Element Is Visible    ${RESTARTING BANNER}
    Run Keyword If    '''${mode}'''=='''cloud'''    Check For Alert    ${SERVER RESTARTED TEXT}    timeout=120
        ...    ELSE    Run Keywords
            ...    Sleep    60    AND
            ...    Close Browser    AND
            ...    Open Browser and go to URL    https://${QA BURBANK IP}:${server 1['port']}    AND
            ...    Wait Until Elements Are Visible    //input[@id="login_email"]    //input[@id="login_password"]    //button[@type="submit"]    timeout=95

7. Change port is only available for owner
    [Tags]    C70927    cloud    webadmin
    [Setup]    Server Settings Test Setup    user=${admin}
    Verify on Servers Page
    Element Should Be Disabled    ${PORT INPUT}

8. Port field validation
    [Tags]    C70929    cloud    webadmin     CLOUD-8753
    Verify on Servers Page
    Verify Server Buttons Are Enabled

    Log    Step 1
    ${before port}=    Get Value    ${PORT INPUT}
    Click Element    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Wait Until Element Is Visible    ${SERVER PORT IS REQUIRED ERROR}
    Reload Page
    Wait Until Element Is Visible    ${PORT INPUT}
    Wait Until Element Is Not Visible    ${SERVER PORT IS REQUIRED ERROR}
    ${after port}=    Get Value    ${PORT INPUT}
    Should Be Equal    ${before port}    ${after port}

    Log    Step 2
    Click Element    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Press Keys    ${PORT INPUT}    0
    Sleep    1
    ${current port}=    Get Value    ${PORT INPUT}
    Should Be Equal    ${current port}    1
    Element Should Be Disabled     ${SAVE BUTTON}

    Log    Step 3
    Click Element    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Press Keys    ${PORT INPUT}    1023
    Wait Until Element Is Visible    ${PORT TOO LOW ERROR}

    Log    Step 4
    Click Element    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Press Keys    ${PORT INPUT}    77777
    Wait Until Element Is Not Visible    ${PORT TOO LOW ERROR}
    ${current port}=    Get Value    ${PORT INPUT}
    Should Be Equal    ${current port}    7777

    Log    Step 5
    Click Element    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Press Keys    ${PORT INPUT}    -1
    Wait Until Element Is Visible    ${PORT TOO LOW ERROR}
    ${current port}=    Get Value    ${PORT INPUT}
    Should Be Equal    ${current port}    1

    Log    Step 6
    Click Element    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Press Keys    ${PORT INPUT}    1024
    Wait Until Element Is Not Visible    ${PORT TOO LOW ERROR}
    ${current port}=    Get Value    ${PORT INPUT}
    Should Be Equal    ${current port}    1024

    Log    Step 7
    Click Button    //nx-cancel-button/button
    ${current port}=    Get Value    ${PORT INPUT}
    Should Be Equal    ${current port}    ${before port}

9. Change port
    [Tags]    C70975    cloud    webadmin
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Change Port To    7002
    @{auth}=    Create List    admin    ${password}
    Get Cameras    ${auth}    https://${QA BURBANK IP}:${extra port}
    Change server port via API    ${auth}    https://${QA BURBANK IP}:${extra port}    ${7001}    ${server 1}[serverId]
    Log To Console    port changed back
    Get Cameras    ${auth}    https://${QA BURBANK IP}:${server 1}[port]

# Waiting to hear back from server team about proper error code
10. Administrator cannot change port via API
    [Tags]    C70927    cloud    webadmin
    Verify on Servers Page
    ${loc}=   Get Location
    ${split}=   Split String    ${loc}    separator=/servers/
    @{auth}=    Create List    ${admin}    ${password}
    ${resp}=   Run Keyword If    '''${mode}'''=='''cloud'''    Change server port via API    ${auth}    https://${server 1}[sysId].relay.vmsproxy.hdw.mx    7777    ${split[1]}
    ...    ELSE    Change server port via API    ${auth}    https://${QA BURBANK IP}:${server 1}[port]    7777    ${split[1]}
    ${status is correct}=   Evaluate    $resp.status_code in {401, 403}
    Should Be True    ${status is correct}

11. Check status
    [Tags]    C70957    cloud    webadmin
    Verify on Servers Page
    Wait Until Element is Not Visible    ${CHECK STATUS BUTTON}
    Select Server By Name    server 2
    Verify on Servers Page
    Wait Until Element is Visible    ${CHECK STATUS BUTTON}
    Element Text Should Be    ${OFFLINE BANNER}   ${SERVER OFFLINE TEXT}
    Click Button    ${CHECK STATUS BUTTON}
    Wait Until Element is Visible    ${CHECKING BANNER}
    Wait Until Element Is Not Visible    ${CHECKING BANNER}
    Element Text Should Be    ${OFFLINE BANNER}    ${SERVER OFFLINE TEXT}
    Start Docker Server    ${server 2}[id]
    Sleep    2
    Click Button    ${CHECK STATUS BUTTON}
    Wait Until Element is Visible    ${CHECKING BANNER}
    Wait Until Element Is Not Visible    ${CHECKING BANNER}
    Wait Until Element Is Not Visible    ${CHECK STATUS BUTTON}
    Element Should Be Enabled    ${RESTART SERVER BUTTON}
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}    300
    Stop Docker Server    ${server 2}[id]  

12. Detailed info 1 server
    [Tags]   C70923    cloud    webadmin
    [Setup]    Server Settings Test Setup    server=${server 3}
    Verify on Servers Page
    Click Button    ${SERVER DETAILED INFO BUTTON}
    ${loc}=    Get Location
    log    ${loc}
    Run Keyword If    '''${mode}'''=='''cloud'''    Wait Until Location Contains    ${ENV}/systems/${server 3}[sysId]/health/servers
    ...    ELSE    Wait Until Location Contains    https://${QA BURBANK IP}:${server 3}[port]/#/health/servers
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    Page Should Not Contain Element    ${HM TABLE}

13. Detailed info 2 servers
    [Tags]    C70923    cloud    webadmin
    Execute Command Remotely   docker container start ${server 2}[id]
    Select Server By Name    server 1
    Click Button    ${SERVER DETAILED INFO BUTTON}
    Run Keyword If    '''${mode}'''=='''cloud'''    Wait Until Location Contains    ${ENV}/systems/${server 1}[sysId]/health/servers
    ...    ELSE    Wait Until Location Contains    https://${QA BURBANK IP}:${server 1}[port]/#/health/servers
    
    Wait Until Page Contains Element    ${HM TABLE}
    Page Should Not Contain Element    ${HM SINGLE ENTITY}
    Wait Until Element is Visible    //nx-block//h4[@class="panel-title"]
    Execute Command Remotely    docker container stop ${server 2}[id]

14. Offline system 1 server settings
    [Tags]    C70950    cloud
    [Setup]    Server Settings Test Setup    server=${server 3}
    Execute Command Remotely    docker container stop ${server 3}[id]
    Reload Page
    Wait Until Elements Are Visible
        ...    ${SERVER NOT ACCESIBLE IMAGE}
        ...    ${THIS PAGE CANNOT BE LOADED}
        ...    ${SYSTEM OFFLINE}
    Element Should not be Visible    ${PORT INPUT}
    Element Should not be Visible    ${RENAME SERVER BUTTON}
    Element Should not be Visible    ${RESTART SERVER BUTTON}
    Element Should not be Visible    ${SERVER DETAILED INFO BUTTON}

15. Online two servers
    [Tags]    C701205    cloud    webadmin
    Verify on Servers Page
    Select Server By Name    server 1
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    
16. Server1 is online Server2 is offline
    [Tags]    C70955    cloud    webadmin
    Select Server By Name    server 1
    Element Should be Enabled    ${PORT INPUT}
    Element Should be Enabled    ${RESTART SERVER BUTTON}
    Element Should be Visible    ${SERVER DETAILED INFO BUTTON}
    stop docker server    ${server 2}[id]
    Select Server By Name    server 2
    Wait Until Element is Visible    ${CHECK STATUS BUTTON}
    Element Should be Disabled    ${RESTART SERVER BUTTON}
    Element Should be Visible    ${SERVER DETAILED INFO BUTTON}
    Element Should be Disabled    ${PORT INPUT}
    Element Text Should Be    ${SERVER OFFLINE ALERT}    ${SERVER OFFLINE TEXT}

17. Owner/Admin has Access
    [Tags]    C69853    C70927    cloud    webadmin
    Wait Until Element is Visible    ${SERVERS LINK}
    Verify on Servers Page
    Verify Server Buttons Are Enabled

18. Administrator has Access
    [Tags]    C69853    C70927    cloud    webadmin
    [Setup]    Server Settings Test Setup    ${server 1}    ${admin}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Element Should Be Disabled    ${PORT INPUT}

19. Viewer does not have Access
    [Tags]    C69853    cloud    webadmin
    [Setup]    Server Settings Test Setup    ${server 1}    ${viewer}    verify=${False}
    Element Should not be Visible    ${SERVERS LINK}

20. Advanced Viewer does not have Access
    [Tags]    C69853    cloud    webadmin
    [Setup]    Server Settings Test Setup    ${server 1}    ${adv viewer}    verify=${False}
    Element Should not be Visible    ${SERVERS LINK}

21. Live Viewer does not have Access
    [Tags]    C69853    cloud    webadmin
    [Setup]    Server Settings Test Setup    ${server 1}    ${live viewer}    verify=${False}
    Element Should not be Visible    ${SERVERS LINK}

22. Custom User does not have Access
    [Tags]    C69853    cloud    webadmin
    [Setup]    Server Settings Test Setup    ${server 1}    ${custom}    verify=${False}
    Element Should not be Visible    ${SERVERS LINK}

# This is probably deprecated by the new left menu search.
#Tab order is correct for online system
#    [Tags]    C69882    
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