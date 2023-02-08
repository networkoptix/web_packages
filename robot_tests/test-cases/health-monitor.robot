*** Settings ***
Resource          ../Resources/front-end-resources/health-monitor-resource.robot
Suite Setup       Health Monitor Suite Setup
Test Setup        Run Keywords    QA Video Recording Start            Health Monitor Test Setup
Test Teardown     Run Keywords    QA Video Recording Stop         Health Monitor Test Teardown
Suite Teardown    Run Keyword and Ignore Error    Health Monitor Suite Teardown
Force Tags        Threaded    hm

*** Test Cases ***
1. Owner/admin Has Access to Health Monitoring
    [Tags]    cloud    webadmin
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${MERGE BUTTON SYSTEM}
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page

2. Administrator Has Access to Health Monitoring
    [Tags]    cloud    webadmin
    [Setup]    Run Keyword If    '''${mode}'''=='''cloud'''    Health Monitor Test Setup    user=${server 1}[cloudUsers][cloudAdmin]
    ...    ELSE    Health Monitor Test Setup    user=${server 1}[localUsers][cloudAdmin][login]
    Sleep    1
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page

3. Going to Health Monitor when System is Offline Shows Offline Message
    [Tags]    cloud
    [Setup]    Health Monitor Test Setup    server=${server 2}    verify=${False}
    Sleep    5
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Wait Until Elements Are Visible    ${HM SYSTEM OFFLINE}    ${HM SYSTEM CANNOT BE ACCESSED}

4. Json Upload Works
    [Tags]    cloud    webadmin
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    one-page
    # More elements need to be added here when JSON files are finalized like system name and stuff
    #Wait Until Elements Are Visible    ${HM IMPORTED REPORT RIBBON}

5. Json Upload Works on Offline System
    [Tags]    cloud
    [Setup]    Health Monitor Test Setup    server=${server 2}
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Upload Json    one-page

    # More elements need to be added here when JSON files are finalized like system name and stuff
    Validate Uploaded Alerts Page



6. Advanced Viewer Does Not Have Access To Health Monitor
    [Tags]    cloud    webadmin
    [Setup]    Run Keyword If    '''${mode}'''=='''cloud'''    Health Monitor Test Setup    user=${server 1}[cloudUsers][advancedViewer]
    ...    ELSE    Health Monitor Test Setup    user=${server 1}[local users][advancedViewer][login]
    Sleep    5
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}    10
    ${location}=   Get location
    Go To    ${location}/health/Alerts
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM ALERTS PAGE LINK}    10

7. Viewer Does Not Have Access To Health Monitor
    [Tags]    cloud    webadmin
    [Setup]    Run Keyword If    '''${mode}'''=='''cloud'''    Health Monitor Test Setup    user=${server 1}[cloudUsers][viewer]
    ...    ELSE    Health Monitor Test Setup    user=${server 1}[local users][viewer][login]
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}    10
    ${location}=   Get location
    Go To    ${location}/health/Alerts
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM ALERTS PAGE LINK}    10

8. Live Viewer Does Not Have Access To Health Monitor
    [Tags]    cloud    webadmin
    [Setup]    Run Keyword If    '''${mode}'''=='''cloud'''    Health Monitor Test Setup    user=${server 1}[cloudUsers][liveViewer]
    ...    ELSE    Health Monitor Test Setup    user=${server 1}[local users][liveViewer][login]
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}    10
    ${location}=   Get location
    Go To    ${location}/health/Alerts
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM ALERTS PAGE LINK}    10

9. No Alerts Message Shows When There Are No Alerts
    [Tags]    cloud    webadmin
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${MERGE BUTTON SYSTEM}
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    no-alerts
    Wait Until Elements Are Visible    ${HM NO ALERTS}    ${HM SYSTEM DOING WELL}

10. Can Close Out of Json Imported Mode
    [Tags]    cloud    webadmin
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    one-page
    Wait Until Element Is Visible    ${HM ALERTS TOTAL}
    ${first} =     Get Text    ${HM ALERTS TOTAL}
    Reload Page
    Validate Alerts Page
    Page Should Not Contain    ${HM IMPORTED REPORT RIBBON}
    Click Link    ${HM SYSTEM PAGE LINK}
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}

11. Errors and Warnings are Counted and Shown Correctly in the Left Pane and Header Tiles
    [Tags]    cloud    webadmin
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    one-of-each
    Validate Uploaded Alerts Page
    Count All Alerts and Validate Totals Shown
    Upload Json    one-page
    Validate Uploaded Alerts Page
    Count All Alerts and Validate Totals Shown

12. Changing Page Height and Refreshing Reduces Row Count and Increases Page Count
    [Tags]    C69785    cloud    webadmin
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    one-page
    Wait Until Element Is Visible    ${HM FIRST TABLE PAGE ELEMENT}
    ${multiple pages}    Run Keyword And Return Status    Element Should Be Visible    ${HM LAST TABLE PAGE ELEMENT}
    IF    ${multiple pages}
        ${pages} =    Get Text    ${HM LAST TABLE PAGE ELEMENT}
    ELSE
        ${pages} =    Set Variable    1
    END
    Should Be Equal As Integers    ${pages}    1
    Set Window Size    1920    600
    Sleep     0.5
    Page Should Not Contain    ${HM LAST TABLE PAGE ELEMENT}
    ${multiple pages}    Run Keyword And Return Status    Element Should Be Visible    ${HM LAST TABLE PAGE ELEMENT}
    IF    ${multiple pages}
        ${pages} =    Get Text    ${HM LAST TABLE PAGE ELEMENT}
    ELSE
        ${pages} =    Set Variable    1
    END
    Should Not Be Equal As Integers    ${pages}    1
    Count All Alerts and Validate Totals Shown
    Set Window Size    1920    1080

13. Hardware Types with Only One Item Should Show Tiles and not Show Tables
    [Tags]    cloud    webadmin
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    solo-hardware
    Validate Uploaded Alerts Page
    Wait Until Elements are Visible
    ...    ${HM ALERTS PAGE LINK}
    ...    ${HM SYSTEM PAGE LINK}
    ...    ${HM SERVERS PAGE LINK}
    ...    ${HM ALERTS PAGE LINK}
    ...    ${HM CAMERAS PAGE LINK}
    ...    ${HM INTERFACES PAGE LINK}
    Click Link    ${HM SYSTEM PAGE LINK}
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    ${title}=   Get Text    ${FIRST CARD HEADER}
    Click Link    ${HM SERVERS PAGE LINK}
    Wait Until Element Does Not Contain    ${FIRST CARD HEADER}    ${title}
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    Page Should Not Contain Element    ${HM TABLE}
    ${title}=   Get Text    ${FIRST CARD HEADER}
    Click Link    ${HM CAMERAS PAGE LINK}
    Wait Until Element Does Not Contain    ${FIRST CARD HEADER}    ${title}
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    Page Should Not Contain Element    ${HM TABLE}
    ${title}=   Get Text    ${FIRST CARD HEADER}
    Click Link    ${HM INTERFACES PAGE LINK}
    Wait Until Element Does Not Contain    ${FIRST CARD HEADER}    ${title}
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    Page Should Not Contain Element    ${HM TABLE}
    ${title}=   Get Text    ${FIRST CARD HEADER}
    Click Link    ${HM STORAGES PAGE LINK}
    Wait Until Element Does Not Contain    ${FIRST CARD HEADER}    ${title}
    Wait Until Page Contains Element    ${HM SINGLE ENTITY}
    Page Should Not Contain Element    ${HM TABLE}

14. Hardware Types with Multiple Items Should Show Tables and Not Show Tiles
    [Tags]    cloud    webadmin
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    one-of-each
    Validate Uploaded Alerts Page
    Wait Until Elements are Visible
    ...    ${HM ALERTS PAGE LINK}
    ...    ${HM SYSTEM PAGE LINK}
    ...    ${HM SERVERS PAGE LINK}
    ...    ${HM ALERTS PAGE LINK}
    ...    ${HM CAMERAS PAGE LINK}
    ...    ${HM INTERFACES PAGE LINK}
    Click Link    ${HM SERVERS PAGE LINK}
    Wait Until Page Contains Element    ${HM TABLE}
    Page Should Not Contain Element    ${HM SINGLE ENTITY}

    Click Link    ${HM CAMERAS PAGE LINK}
    sleep    5
    Wait Until Page Contains Element    ${HM TABLE}
    Page Should Not Contain Element    ${HM SINGLE ENTITY}

    Click Link    ${HM INTERFACES PAGE LINK}
    Wait Until Page Contains Element    ${HM TABLE}
    Page Should Not Contain Element    ${HM SINGLE ENTITY}

    Click Link    ${HM STORAGES PAGE LINK}
    Wait Until Page Contains Element    ${HM TABLE}
    Page Should Not Contain Element    ${HM SINGLE ENTITY}