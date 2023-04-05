*** Settings ***
Resource          ../Resources/front-end-resources/system-server-resource.robot
Suite Setup       Server Settings Suite Setup
Test Setup        Run Keywords    QA Video Recording Start     Server Settings Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop      Server Settings Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Server Settings Suite Tear Down
Force Tags        system    


*** Test Cases ***
#Rename server requires a name
#    [Tags]    C70960    
#    
#    Rename System or Hardware    ${EMPTY}
#    Wait Until Element Is Visible    ${SYSTEM SAVE}
#    Click Button    ${SYSTEM SAVE}
## Temporary due to failure
#    Change server name via API    ${server auth}    server 1    ${server 1["serverId"]}    https://${QA BURBANK IP}:${server 1["port"]}
#    Element Text Should Be    ${SERVER NAME}    server 1

0.1 Verify Server Buttons Are Enabled
    [Tags]    CLOUD-10255   cloud   webadmin
    Verify on Servers Page
    Sleep    1
    Select Server By Name    server 1
    Wait Until Elements are Enabled
    ...    ${PORT INPUT}
    ...    ${RESTART SERVER BUTTON}
1. Server name can be changed
    [Tags]    C71000    cloud    webadmin  
    Verify on Servers Page
    Sleep    1 
    Select Server By Name    server 1
    Change System Name    server 1 name changed    save=True
    Wait Until Element is Visible    //header//nx-text-editable[contains(text(),"server 1 name changed")]
    Reload Page
    Wait Until Element is Visible    //header//nx-text-editable[contains(text(),"server 1 name changed")]
    Wait Until Element is Visible    //nx-level-3-item//a//span/nx-search-highlight[contains(text(),"server 1 name changed")]     
    Log    Reset the name to server 1
    Change server name via API    ${server auth}    server 1    ${servers}[0][id]    https://${QA BURBANK IP}:${servers}[0][port][0]
    Reload Page
    Wait Until Element Is Visible    //header//nx-text-editable[contains(text(),"server 1")]

2. Server name changed via API updates on cloud
    [Tags]    C70961    cloud    webadmin
    Verify on Servers Page
    Sleep    1
    Select Server By Name    server 1  
    ${loc}=   Get Location
    ${split}=   Split String    ${loc}    separator=/servers/%7B
    Change server name via API    ${server auth}    server 1 name changed    ${servers}[0][id]    https://${QA BURBANK IP}:${servers}[0][port][0]
    Sleep    1
    Reload Page
    Sleep   5
    Select Server By Name    server 1 name changed
    #Wait Until Element is Visible    //header//h2[contains(text(),"server 1 name changed")]/..
    Element Text Should Be    ${SYSTEM NAME}    server 1 name changed
    Log    Reset the name to server 1
    Change server name via API    ${server auth}    server 1    ${servers}[0][id]    https://${QA BURBANK IP}:${servers}[0][port][0]

3. Restart close button works
    [Tags]    C70968    cloud    webadmin
    Verify on Servers Page
    
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog
    Click Button    ${RESTART DIALOG CLOSE BUTTON}
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}

4. Restart cancel button works
    [Tags]    C70968    cloud    webadmin
    Verify on Servers Page
    
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog
    Click Button    ${RESTART DIALOG CANCEL BUTTON}
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}

5. Restart server as owner
    [Documentation]     Skipping cloud due to https://networkoptix.atlassian.net/browse/CLOUD-8158
    [Tags]    C70968    webadmin    # cloud
    Skip If     '''${mode}'''=='''cloud'''
    Verify on Servers Page
    
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog
    Click Button    ${RESTART DIALOG RESTART BUTTON}
    Wait Until Element Has Class    ${RESTART DIALOG RESTART BUTTON}    processing
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}
    Wait Until Elements are Visible     ${RESTARTING BANNER}
    IF    '''${mode}'''=='''cloud'''
        Check For Alert    ${SERVER RESTARTED TEXT}    timeout=120
    ELSE
        Sleep    60
        Close Browser
        Open Browser and go to URL    https://${QA BURBANK IP}:${servers}[0][port]
        Wait Until Elements Are Visible    //input[@id="login_email"]    //input[@id="login_password"]    //button[@type="submit"]    timeout=95
    END

6. Restart server as administrator
    [Tags]    C70968    webadmin    cloud
    [Setup]    Server Settings Test Setup    user=${servers}[0][cloudUsers][cloudAdmin]
    Skip If    '''${mode}'''=='''cloud'''
    Verify on Servers Page
    Wait Until Element Is Enabled    ${RESTART SERVER BUTTON}
    Click Button    ${RESTART SERVER BUTTON}
    Verify Restart Dialog
    Click Button    ${RESTART DIALOG RESTART BUTTON}
    Wait Until Element Has Class    ${RESTART DIALOG RESTART BUTTON}    processing
    Wait Until Element Is Not Visible    ${RESTART SERVER FORM}
    Wait Until Element Is Visible    ${RESTARTING BANNER}
    IF    '''${mode}'''=='''cloud'''
        Check For Alert    ${SERVER RESTARTED TEXT}    timeout=120
    ELSE
        Sleep    60
        Close Browser
        Open Browser and go to URL    https://${QA BURBANK IP}:${servers}[0][port][0]
        Wait Until Elements Are Visible    //input[@id="login_email"]    //input[@id="login_password"]    //button[@type="submit"]    timeout=95
    END

7. Change port is only available for owner
    [Tags]    C70927    cloud    webadmin
    [Setup]    Server Settings Test Setup    user=${servers}[0][cloudUsers][cloudAdmin]
    Verify on Servers Page
    Element Should Be Disabled    ${PORT INPUT}

8. Port field validation
    [Tags]    C70929    cloud    webadmin     CLOUD-8753
    Verify on Servers Page
    

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
    Should Be Equal    ${current port}    65535

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
    
    Change Port To    7002
    @{auth}=    Create List    admin    ${password}
    Get Cameras    ${auth}    https://${QA BURBANK IP}:${servers}[0][port][1]
    Change server port via API    ${auth}    https://${QA BURBANK IP}:${servers}[0][port][1]    ${7001}    ${servers}[0][id]
    Log To Console    port changed back
    Get Cameras    ${auth}    https://${QA BURBANK IP}:${servers}[0][port][0]

# Waiting to hear back from server team about proper error code
10. Administrator cannot change port via API
    [Tags]    C70927    cloud    webadmin
    ${loc}=   Get Location
    ${split}=   Split String    ${loc}    separator=/servers/
    @{auth}=    Create List    ${servers}[0][localUsers][cloudAdmin]    ${password}
    ${resp}=   Run Keyword If    '''${mode}'''=='''cloud'''    Change server port via API    ${auth}    https://${env}/systems/${servers}[0][id].relay.vmsproxy.hdw.mx    7777    ${split[1]}
    ...    ELSE    Change server port via API    ${auth}    https://${QA BURBANK IP}:${servers}[0][port][0]    7777    ${split[1]}
    ${status is correct}=   Evaluate    $resp.status_code in {401, 403}
    Should Be True    ${status is correct}

11. Check status
    [Tags]    C70957    cloud    webadmin
    Wait Until Element Is Not Visible    ${CHECK STATUS BUTTON}
    Select Server By Name    server 2
    Verify On Servers Page
    Wait Until Element Is Visible    ${CHECK STATUS BUTTON}
    Element Text Should Be    ${OFFLINE BANNER}   ${SERVER OFFLINE TEXT}
    Click Button    ${CHECK STATUS BUTTON}
    Wait Until Element Is Visible    ${CHECKING BANNER}
    Wait Until Element Is Not Visible    ${CHECKING BANNER}
    Element Text Should Be    ${OFFLINE BANNER}    ${SERVER OFFLINE TEXT}
    Start container   ${server 2}[container]
    Sleep    2
    Click Button    ${CHECK STATUS BUTTON}
    Wait Until Element is Visible    ${CHECKING BANNER}
    Wait Until Element Is Not Visible    ${CHECKING BANNER}
    Wait Until Element Is Not Visible    ${CHECK STATUS BUTTON}
    Element Should Be Enabled    ${RESTART SERVER BUTTON}
    Wait Until Element Is Not Visible    ${OFFLINE BANNER}    300
    Stop container   ${server 2}[container]  

12. Detailed info 1 server
    [Tags]   C70923    cloud    webadmin
    [Setup]    Server Settings Test Setup    server=${servers}[2]
    Verify on Servers Page
    Click Button    ${SERVER DETAILED INFO BUTTON}
    ${loc}=    Get Location
    log    ${loc}
    IF    '''${mode}'''=='''cloud'''
        Wait Until Location Contains    ${ENV}/systems/${servers}[2][id]/health/servers
    ELSE
        Wait Until Location Contains    https://${QA BURBANK IP}:${servers}[2][port]/#/health/servers
    END
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    Page Should Not Contain Element    ${HM TABLE}

13. Detailed info 2 servers
    [Tags]    C70923    cloud    webadmin
    Start Container    ${servers}[1][container]
    Select Server By Name    server 1
    Click Button    ${SERVER DETAILED INFO BUTTON}
    IF    '''${mode}'''=='''cloud'''
        Wait Until Location Contains    ${ENV}/systems/${servers}[0][id]/health/servers
    ELSE
        Wait Until Location Contains    https://${QA BURBANK IP}:${servers}[0][port][0]/#/health/servers
    END
    
    Wait Until Elements Are Visible
    ...     //span[contains(text(), "Availability")]
    ...     //span[contains(text(), "Load")]
    ...     //span[contains(text(), "Info")]
    ...     //span[contains(text(), "Activity")]
#    Page Should Not Contain Element    ${HM SINGLE ENTITY}
#    Wait Until Element is Visible    //nx-block//h4[@class="panel-title"]
    Stop Container  ${servers}[1][container]

14. Offline system 1 server settings
    [Tags]    C70950    cloud
    [Setup]    Server Settings Test Setup    server=${servers}[2]
    Stop container    ${servers}[2][container]
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
    
    
16. Server1 is online Server2 is offline
    [Tags]    C70955    cloud    webadmin
    Select Server By Name    server 1
    Element Should be Enabled    ${PORT INPUT}
    Element Should be Enabled    ${RESTART SERVER BUTTON}
    Element Should be Visible    ${SERVER DETAILED INFO BUTTON}
    stop container    ${servers}[1][container]
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
    

18. Administrator has Access
    [Tags]    C69853    C70927    cloud    webadmin
    [Setup]    Server Settings Test Setup    ${servers}[0]    ${admin}
    Wait Until Element is Visible    ${SERVERS LINK}
    Click Link    ${SERVERS LINK}
    Verify on Servers Page
    Element Should Be Disabled    ${PORT INPUT}

19. Viewer does not have Access
    [Tags]    C69853    cloud    webadmin
    [Setup]    Server Settings Test Setup    ${servers}[0]    ${viewer}    verify=${False}
    Element Should not be Visible    ${SERVERS LINK}

20. Advanced Viewer does not have Access
    [Tags]    C69853    cloud    webadmin
    [Setup]    Server Settings Test Setup    ${servers}[0]    ${adv viewer}    verify=${False}
    Element Should not be Visible    ${SERVERS LINK}

21. Live Viewer does not have Access
    [Tags]    C69853    cloud    webadmin
    [Setup]    Server Settings Test Setup    ${servers}[0]    ${live viewer}    verify=${False}
    Element Should not be Visible    ${SERVERS LINK}

22. Custom User does not have Access
    [Tags]    C69853    cloud    webadmin
    [Setup]    Server Settings Test Setup    ${servers}[0]    ${custom}    verify=${False}
    Element Should not be Visible    ${SERVERS LINK}

# This is probably deprecated by the new left menu search.
#Tab order is correct for online system
#    [Tags]    C69882    
#    Verify on Servers Page
#    Press Keys    None    TAB
#    Element Should Be Focused    //nx-level-3-item/a//span[contains(text(),"server 1")]/../..
#    Press Keys    None    TAB
#    Element Should Be Focused    //nx-level-3-item/a//span[contains(text(),"server 2")]/../..
#    
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