*** Settings ***
Resource          ../resource.robot
Suite Setup       Health Monitor Suite Setup
Test Setup        Health Monitor Test Setup
Test Teardown     Health Monitor Test Teardown
Suite Teardown    Health Monitor Suite Teardown
Force Tags        Threaded    hm

*** Variables ***
${password}    ${BASE PASSWORD}
${url}         ${ENV}

*** Keywords ***
Health Monitor Suite Setup
    ${owner}=   Register and activate account with random email    mark    hamill    ${password}
    ${random}=   Generate Random String
    ${server 1}=   Create Base System    HM1-${random}    owner=${owner}
    ${server 2}=   Create Base System    HM2-${random}    owner=${owner}
    Set Suite Variable    ${server 1}    ${server 1}
    Set Suite Variable    ${server 2}    ${server 2}
    Stop Docker Server    ${server 2}[id]
    Open Browser and go to URL    ${ENV}
    Run Keyword If    '''${mode}'''=='''cloud'''    Set Suite Variable     ${user in charge}    ${server 1}[owner]
    ...    ELSE   Set Suite Variable     ${user in charge}    admin

Health Monitor Test Setup
    [Arguments]    ${server}=${server 1}    ${user}=${user in charge}    ${verify}=${True}
    Run Keyword If    '''${mode}'''=='''cloud'''    Cloud Test Setup    ${server}    ${user}    ${verify}
    ...    ELSE    Web Admin Test Setup    ${server}    ${user}    ${verify}

Cloud Test Setup
    [Arguments]    ${server}    ${user}    ${verify}
    Log in to system    ${server}    ${user}    validate=${True}
    Wait Until Element Is Visible    ${ACCOUNT DROPDOWN}

Web Admin Test Setup
    [Arguments]    ${server}    ${user}    ${verify}
    Skip If Irrelevant
    Log in to system    ${server}    ${user}    validate=${True}
    Wait Until Element is Visible    ${ACCOUNT DROPDOWN}
    Sleep    2

Health Monitor Test Teardown
    ${status}=   Run Keyword If    '''${mode}'''=='''cloud'''    Run Keyword and Return Status    Validate Log Out
    ...    ELSE    Run Keyword and Return Status    Validate Log Out Web Admin
    Run Keyword Unless    ${status}    Log Out

Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Click On Page Number
    [Arguments]    ${pg_number}
    Click Link    ${HM PAGE NUMBER LINK}"${EMPTY}${pg_number}${EMPTY}"]

Count All Alerts and Validate Totals Shown
    Log    Looping through all table pages to count Alerts
    Page Should Contain Element    ${HM FIRST TABLE PAGE ELEMENT}
    ${pages} =    Get Element Count    //ngb-pagination//a[contains(text(), " ")]
    ${camera alerts} =    Get Element Count    ${HM CAMERA TABLE ERRORS}
    ${camera warnings} =    Get Element Count    ${HM CAMERA TABLE WARNINGS}
    ${server alerts} =    Get Element Count    ${HM SERVER TABLE OFFLINE}
    ${server warnings} =    Get Element Count    ${HM SERVER TABLE WARNINGS}
    ${storage alerts} =    Get Element Count    ${HM STORAGE TABLE ERRORS}
    ${storage warnings} =    Get Element Count    ${HM STORAGE TABLE WARNINGS}
    ${network alerts} =    Get Element Count    ${HM NETWORK INTERFACE TABLE ERRORS}
    ${network warnings} =    Get Element Count    ${HM NETWORK INTERFACE TABLE WARNINGS}
    FOR     ${i}    IN RANGE    ${pages}
        ${last page} =    Run Keyword And Return Status    Page Should Contain Element    ${HM LAST TABLE PAGE ELEMENT}
        Exit For Loop If    ${last page}
        Click Link    ${HM NEXT PAGE LINK}
        Wait Until Element Is Visible     ${HM TABLE}//*[name() = 'svg']/*[name() = 'title' and contains(text(), "Alert") or contains(text(),"Warning")]/parent::*/parent::*/parent::td/following-sibling::td
        ${camera alerts x} =    Get Element Count    ${HM CAMERA TABLE ERRORS}
        ${camera warnings x} =    Get Element Count    ${HM CAMERA TABLE WARNINGS}
        ${server alerts x} =    Get Element Count    ${HM SERVER TABLE OFFLINE}
        ${server warnings x} =    Get Element Count    ${HM SERVER TABLE WARNINGS}
        ${storage alerts x} =    Get Element Count    ${HM STORAGE TABLE ERRORS}
        ${storage warnings x} =    Get Element Count    ${HM STORAGE TABLE WARNINGS}
        ${network alerts x} =    Get Element Count    ${HM NETWORK INTERFACE TABLE ERRORS}
        ${network warnings x} =    Get Element Count    ${HM NETWORK INTERFACE TABLE WARNINGS}
        ${camera alerts} =     Evaluate    ${camera alerts} + ${camera alerts x}
        ${camera warnings} =    Evaluate    ${camera warnings} + ${camera warnings x}
        ${server alerts} =    Evaluate    ${server alerts} + ${server alerts x}
        ${server warnings} =    Evaluate    ${server warnings} + ${server warnings x}
        ${storage alerts} =    Evaluate     ${storage alerts} + ${storage alerts x}
        ${storage warnings} =    Evaluate    ${storage warnings} + ${storage warnings x}
        ${network alerts} =    Evaluate    ${network alerts} + ${network alerts x}
        ${network warnings} =    Evaluate    ${network warnings} + ${network warnings x}
    END
    Log    Comparing counted Alerts to Cards on page
    ${camera card errors} =    Get Text    ${HM CAMERA CARD ERRORS}
    ${camera card warnings} =    Get Text    ${HM CAMERA CARD WARNINGS}
    ${server card offline} =    Get Text    ${HM SERVER CARD OFFLINE}
    ${server card warnings} =    Get Text    ${HM SERVER CARD WARNINGS}
    ${storage card errors} =    Get Text    ${HM STORAGE CARD ERRORS}
    ${storage card warnings} =    Get Text    ${HM STORAGE CARD WARNINGS}
    ${network card alerts} =    Get Text    ${HM NETWORK INTERFACE CARD ERRORS}
    ${network card warnings} =    Get Text    ${HM NETWORK INTERFACE CARD WARNINGS}
    Should Be Equal As Integers     ${camera alerts}     ${camera card errors}
    Should Be Equal As Integers     ${camera warnings}    ${camera card warnings}
    Should Be Equal As Integers     ${server alerts}     ${server card offline}
    Should Be Equal As Integers     ${server warnings}    ${server card warnings}
    Should Be Equal As Integers     ${storage alerts}    ${storage card errors}
    Should Be Equal As Integers     ${storage warnings}    ${storage card warnings}
    Should Be Equal As Integers     ${network alerts}    ${network card alerts}
    Should Be Equal As Integers     ${network warnings}    ${network card warnings}
    ${alerts counted total} =    Evaluate    ${camera alerts} + ${camera warnings} + ${server alerts} + ${server warnings} + ${storage alerts} + ${storage warnings} + ${network alerts} + ${network warnings}
    ${alerts page total} =    Get Text    ${HM ALERTS TOTAL}
    Should Be Equal    ${alerts counted total} alerts    ${alerts page total}

Check Details Panel Alerts
    [Arguments]    ${type}    ${hardware}    ${name}    ${category}    ${metric}
    Wait Until Element is Visible    ${HM TABLE}//tr//td/span[contains(text(), "${name}")]
    Click Element    ${HM TABLE}//tr//td/span[contains(text(), "${name}")]
    Wait Until Elements are Visible
    ...    ${HM DETAILS PANEL}
    ...    ${HM DETAILS PANEL}//h4[contains(text(),"${category}")]/..//span[contains(text(), "${metric}")]/../../..//div[@title="${hardware} ${name} is broken"]
    ...    ${HM DETAILS PANEL}//h4[contains(text(),"${category}")]/..//span[contains(text(), "${metric}")]/../../..${HM ALERT ICON}

Health Monitor Suite Teardown
    Close All Browsers
    Delete Base System    ${server 1}
    Delete Base System    ${server 2}

*** Test Cases ***
Owner/admin Has Access to Health Monitoring
    [Tags]    cloud    webadmin
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${MERGE BUTTON SYSTEM}
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page

Administrator Has Access to Health Monitoring
    [Tags]    cloud    webadmin
    [Setup]    Run Keyword If    '''${mode}'''=='''cloud'''    Health Monitor Test Setup    user=${server 1}[cloud users][cloudAdmin]
    ...    ELSE    Health Monitor Test Setup    user=${server 1}[local users][cloudAdmin][login]
    Sleep    1
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page

Going to Health Monitor when System is Offline Shows Offline Message
    [Tags]    cloud
    [Setup]    Health Monitor Test Setup    server=${server 2}    verify=${False}
    Sleep    5
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Wait Until Elements Are Visible    ${HM SYSTEM OFFLINE}    ${HM SYSTEM CANNOT BE ACCESSED}

Json Upload Works
    [Tags]    cloud    webadmin
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    one-page
    # More elements need to be added here when JSON files are finalized like system name and stuff
    #Wait Until Elements Are Visible    ${HM IMPORTED REPORT RIBBON}

Json Upload Works on Offline System
    [Tags]    cloud
    [Setup]    Health Monitor Test Setup    server=${server 2}
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Upload Json    one-page

    # More elements need to be added here when JSON files are finalized like system name and stuff
    Validate Uploaded Alerts Page



Advanced Viewer Does Not Have Access To Health Monitor
    [Tags]    cloud    webadmin
    [Setup]    Run Keyword If    '''${mode}'''=='''cloud'''    Health Monitor Test Setup    user=${server 1}[cloud users][advancedViewer]
    ...    ELSE    Health Monitor Test Setup    user=${server 1}[local users][advancedViewer][login]
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}    10
    ${location}=   Get location
    Go To    ${location}/health/Alerts
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM ALERTS PAGE LINK}    10

Viewer Does Not Have Access To Health Monitor
    [Tags]    cloud    webadmin
    [Setup]    Run Keyword If    '''${mode}'''=='''cloud'''    Health Monitor Test Setup    user=${server 1}[cloud users][viewer]
    ...    ELSE    Health Monitor Test Setup    user=${server 1}[local users][viewer][login]
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}    10
    ${location}=   Get location
    Go To    ${location}/health/Alerts
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM ALERTS PAGE LINK}    10

Live Viewer Does Not Have Access To Health Monitor
    [Tags]    cloud    webadmin
    [Setup]    Run Keyword If    '''${mode}'''=='''cloud'''    Health Monitor Test Setup    user=${server 1}[cloud users][liveViewer]
    ...    ELSE    Health Monitor Test Setup    user=${server 1}[local users][liveViewer][login]
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}    10
    ${location}=   Get location
    Go To    ${location}/health/Alerts
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM ALERTS PAGE LINK}    10

No Alerts Message Shows When There Are No Alerts
    [Tags]    cloud    webadmin
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${MERGE BUTTON SYSTEM}
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    no-alerts
    Wait Until Elements Are Visible    ${HM NO ALERTS}    ${HM SYSTEM DOING WELL}

Can Close Out of Json Imported Mode
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
    Wait Until Elements Are Visible    ${HM NO ALERTS}    ${HM SYSTEM DOING WELL}

Errors and Warnings are Counted and Shown Correctly in the Left Pane and Header Tiles
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

Changing Page Height and Refreshing Reduces Row Count and Increases Page Count
    [Tags]    C69785    cloud    webadmin
    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    one-page
    Wait Until Element Is Visible    ${HM LAST TABLE PAGE ELEMENT}
    ${pages} =    Get Element Count    //ngb-pagination//a[contains(text(), " ")]
    Should Be Equal As Integers    ${pages}    1
    Set Window Size    1920    600
    Sleep     0.5
    Page Should Not Contain    ${HM LAST TABLE PAGE ELEMENT}
    ${pages} =    Get Element Count    //ngb-pagination//a[contains(text(), " ")]
    Should Not Be Equal As Integers    ${pages}    1
    Count All Alerts and Validate Totals Shown
    Set Window Size    1920    1080

Hardware Types with Only One Item Should Show Tiles and not Show Tables
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

Hardware Types with Multiple Items Should Show Tables and Not Show Tiles
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