*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Server Settings Test Setup    ${EMAIL OWNER}    ${AUTO TESTS SYSTEM ID}
Test Teardown     Common Restart Logout    ${url}
Suite Teardown    Close All Browsers
Force Tags        system    threaded file

*** Variables ***
${email}       ${EMAIL OWNER}
${password}    ${BASE PASSWORD}
@{auth}        ${email}    ${password}
${url}         ${ENV}

*** Keywords ***
Server Settings Test Setup
    [Arguments]    ${email}    ${system id}
    Log in to user and system    ${email}    ${system id}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}

*** Test Cases ***
Rename server close button works
    [Tags]    C70960
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RENAME SERVER BUTTON}
    Verify Rename Dialog
    Input Text    ${RENAME SERVER INPUT}    server 1 name changed
    Click Button    ${RENAME CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${RENAME SERVER FORM}
    Element Text Should Be    ${SERVER NAME}    server 1

Rename server cancel button works
    [Tags]    C70960
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RENAME SERVER BUTTON}
    Verify Rename Dialog
    Input Text    ${RENAME SERVER INPUT}    server 1 name changed
    Click Button    ${RENAME CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${RENAME SERVER FORM}
    Element Text Should Be    ${SERVER NAME}    server 1

Rename server pressing ESC works
    [Tags]    C70960
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RENAME SERVER BUTTON}
    Verify Rename Dialog
    Input Text    ${RENAME SERVER INPUT}    server 1 name changed
    Press Keys    None    ESC
    Wait Until Element Is Not Visible    ${RENAME SERVER FORM}
    Element Text Should Be    ${SERVER NAME}    server 1

Rename server requires a name
    [Tags]    C70960
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RENAME SERVER BUTTON}
    Verify Rename Dialog
    Delete All Text    ${RENAME SERVER INPUT}
    Click Button    ${RENAME SAVE BUTTON}
    Wait Until Element is Visible    ${RENAME ERROR TEXT}
    Element Text Should Be    ${RENAME ERROR TEXT}    ${SERVER NAME REQUIRED}

Server name can be changed
    [Tags]    C69881
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RENAME SERVER BUTTON}
    Verify Rename Dialog
    Input Text    ${RENAME SERVER INPUT}    server 1 name changed
    Click Button    ${RENAME SAVE BUTTON}
    Check for Alert    ${SERVER NAME SAVED}
    Wait Until Element is Visible    //header//h2[contains(text(),"server 1 name changed")]
    Select Server By Name    server 1 name changed
    Reload Page  
    Wait Until Element is Visible    //header//h2[contains(text(),"server 1 name changed")]

    Log    Reset the name to server 1
    Select Server By Name    server 1 name changed   
    Click Button    ${RENAME SERVER BUTTON}
    Verify Rename Dialog
    Input Text    ${RENAME SERVER INPUT}    server 1
    Click Button    ${RENAME SAVE BUTTON}
    Check for Alert    ${SERVER NAME SAVED}

Server name changed via API updates on cloud
    [Tags]    C70961
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    @{auth}=    Create List    ${EMAIL OWNER}    ${BASE PASSWORD}
    ${loc}=   Get Location
    ${split}=   Split String    ${loc}    separator=/servers/%7B
    ${split[1]}=   Replace String    ${split[1]}    %7D    ${EMPTY}
    Change server name via API    ${auth}    server 1 name changed    ${split[1]}    ${AUTO SYS IP}
    Reload Page
    Wait Until Element Contains    ${SERVER NAME}    server 1 name changed
    
    Log    Reset the name to server 1
    Change server name via API    ${auth}    server 1    ${split[1]}    ${AUTO SYS IP}
    
Restart close button works
    [Tags]    C70968
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog 
    Click Button    ${RESTART DIALOG CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}

Restart cancel button works
    [Tags]    C70968
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog 
    Click Button    ${RESTART DIALOG CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}

Restart server as owner
    [Tags]    C70968
    [Setup]    Server Settings Test Setup    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Select Server By Name    Server 2
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
    Check For Alert    ${SERVER RESTARTED TEXT}    timeout=40
      
Restart server as admin
    [Tags]    C70968
    [Setup]    Server Settings Test Setup    ${EMAIL ADMIN}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Select Server By Name    Server 2
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
    Check For Alert    ${SERVER RESTARTED TEXT}    timeout=40
    
Change port is only available for owner
    [Tags]    C70927
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Log Out
    Validate Log Out
    Server Settings Test Setup    ${EMAIL ADMIN}    ${AUTOTESTS SYSTEM ID}
    Verify on Servers Page
    Element Should Be Disabled    ${PORT INPUT}

Port field validation
    [Tags]    C70929
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Log    Step 1
    ${before port}=    Get Value    ${PORT INPUT}
    Delete All Text    ${PORT INPUT}
    Wait Until Element is Visible    ${SYSTEM SAVE}
    Click Button    ${SYSTEM SAVE}
    Wait Until Element Is Visible    ${NO UNSAVED CHANGES}   
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
    [Setup]    Server Settings Test Setup    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Select Server By Name    Server 2
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    Change Port To    7004
    @{auth}=    Create List    ${EMAIL OWNER}    ${BASE PASSWORD}
    Get Cameras    ${auth}    http://10.1.5.126:7004
    Change Port To    7001
    @{auth}=    Create List    ${EMAIL OWNER}    ${BASE PASSWORD}
    Get Cameras    ${auth}    http://10.1.5.126:7005

# I can validate that the api fails correctly but I can't make it work either.
# It gives a 200 but does not update. It works correctly in postman.
Admin cannot change port via API
    [Tags]    C70975
    [Setup]    Server Settings Test Setup    ${EMAIL ADMIN}    ${AUTO TESTS 2 SERVER SYSTEM ID}
    Select Server By Name    Server 2
    Verify on Servers Page
    ${loc}=   Get Location
    ${split}=   Split String    ${loc}    separator=/servers/%7B
    ${split[1]}=   Replace String    ${split[1]}    %7D    ${EMPTY}
    @{auth}=    Create List    ${EMAIL ADMIN}    ${BASE PASSWORD}
    ${resp}=   Change server port via API    ${auth}    https://${AUTO TESTS 2 SERVER SYSTEM ID}.relay.vmsproxy.hdw.mx    7777    {${split[1]}}
    Should Be Equal As Strings    ${resp.status_code}    403

Check status
    [Tags]    C70956
    [Setup]    Server Settings Test Setup    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Select Server By Name    Server 2
    Verify on Servers Page
    Wait Until Element is Not Visible    ${CHECK STATUS BUTTON}    
    Select Server By Name    Server 1
    Verify on Servers Page
    Wait Until Element is Visible    ${CHECK STATUS BUTTON}
    Open Connection    10.1.5.126
    SSHLibrary.Login    docker-server-factory    qweasd 123    
    ${results}    Execute Command    docker container start 2server1
    Sleep    1
    Click Button    ${CHECK STATUS BUTTON}
    Wait Until Element is Visible    ${CHECKING BADGE}
    Wait Until Element Is Not Visible    ${CHECKING BADGE}
    Sleep    1
    Wait Until Element Is Not Visible    ${OFFLINE BADGE}
    ${results}    Execute Command    docker container stop 2server1

Detailed info 1 server
    [Tags]   C70923
    Verify on Servers Page
    Click Button    ${SERVER DETAILED INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTO TESTS SYSTEM ID}/health/servers
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    Page Should Not Contain Element    ${HM TABLE}

Detailed info 2 servers
    [Tags]    C70923
    [Setup]    Server Settings Test Setup    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Select Server By Name    Server 2
    Verify on Servers Page
    Click Button    ${SERVER DETAILED INFO BUTTON}
    Wait Until Location Contains    ${ENV}/systems/${AUTOTESTS 2 SERVER SYSTEM ID}/health/servers
    Wait Until Page Contains Element    ${HM TABLE}
    Page Should Not Contain Element    ${HM SINGLE ENTITY}
    Wait Until Element is Visible    ${HM DETAILS PANEL}/../..//div[@class="panel-title"]/span[contains(text(),"Server 2")]

Offline system server settings
    [Tags]    C70950
    [Setup]    Server Settings Test Setup    ${EMAIL OWNER}    ${AUTO TESTS OFFLINE SYSTEM ID}
    Wait Until Element is Visible    ${SERVER NOT ACCESIBLE IMAGE}
    Element Should not be Visible    ${PORT INPUT}
    Element Should not be Visible    ${RENAME SERVER BUTTON}
    Element Should not be Visible    ${RESTART SERVER BUTTON}
    Element Should not be Visible    ${SERVER DETAILED INFO BUTTON}

Online two servers
    [Tags]    C70955
    [Setup]    Server Settings Test Setup    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Select Server By Name    Server 2
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    
Offline two servers
    [Tags]    C70955
    [Setup]    Server Settings Test Setup    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Select Server By Name    Server 1
    Verify on Servers Page
    Wait Until Elements are Visible    ${CHECK STATUS BUTTON}    ${OFFLINE BADGE}
    Wait Until Element has Style    ${OFFLINE BADGE}    text-transform    uppercase
    Element Should be Disabled    ${PORT INPUT}
    Element Should be Disabled    ${RENAME SERVER BUTTON}
    Element Should be Disabled    ${RESTART SERVER BUTTON}
    Element Should Not be Visible    ${SYSTEM NAME OFFLINE}

Owner has Access
    [Tags]    C69853    C70927
    Wait Until Element is Visible    ${SERVERS LINK}
    Verify on Servers Page
    Verify Server Buttons Are Enabled

Admin has Access
    [Tags]    C69853    C70927
    [Setup]    Server Settings Test Setup    ${EMAIL ADMIN}    ${AUTOTESTS SYSTEM ID}
    Wait Until Element is Visible    ${SERVERS LINK}
    Verify on Servers Page
    Element Should Be Disabled    ${PORT INPUT}
    Element Should Be Disabled    ${RENAME SERVER BUTTON}

Viewer does not have Access
    [Tags]    C69853
    [Setup]    Log in to Auto Tests System    ${EMAIL VIEWER} 
    Element Should not be Visible    ${SERVERS LINK}

Advanced Viewer does not have Access
    [Tags]    C69853
    [Setup]    Log in to Auto Tests System    ${EMAIL ADVVIEWER}    
    Element Should not be Visible    ${SERVERS LINK}

Live Viewer does not have Access
    [Tags]    C69853
    [Setup]    Log in to Auto Tests System    ${EMAIL LIVE VIEWER}    
    Element Should not be Visible    ${SERVERS LINK}

Custom User does not have Access
    [Tags]    C69853
    [Setup]    Log in to Auto Tests System    ${EMAIL CUSTOM}    
    Element Should not be Visible    ${SERVERS LINK}

Tab order is correct for online system
    [Tags]    C69882
    [Setup]    Server Settings Test Setup    ${EMAIL OWNER}    ${AUTOTESTS 2 SERVER SYSTEM ID}
    Verify on Servers Page
    Press Keys    None    TAB
    Element Should Be Focused    //nx-level-3-item/a//span[contains(text(),"Server 1")]/../..
    Press Keys    None    TAB
    Element Should Be Focused    //nx-level-3-item/a//span[contains(text(),"Server 2")]/../..
    Press Keys    None    ENTER
    Verify on Servers Page
    Verify Server Buttons Are Enabled
    @{tab items}=   Create List
    ...    ${SERVER DETAILED INFO BUTTON}
    ...    ${RENAME SERVER BUTTON}
    ...    ${RESTART SERVER BUTTON} 
    ...    ${PORT INPUT}
    ...    ${FOOTER ABOUT LINK}
    ...    ${DOWNLOAD LINK}
    ...    ${FOOTER INTEGRATIONS LINK}
    ...    ${FOOTER SUPPORT LINK} 
    ...    ${FOOTER TERMS LINK}
    ...    ${FOOTER PRIVACY LINK} 
    ...    ${FOOTER SUPPORTED DEVICES LINK}  

    FOR    ${element}    IN    @{tab items}
        Press Keys    None    TAB
        Element Should Be Focused    ${element}
    END
