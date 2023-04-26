*** Settings ***
Resource          ../../resource.robot

*** Keywords ***
Validate Alerts Page
    Wait Until Elements Are Visible
    ...    ${HM ALERTS PAGE LINK}
    ...    ${HM SYSTEM PAGE LINK}
    ...    ${HM SERVERS PAGE LINK}
    #...    ${HM CAMERAS PAGE LINK}
    ...    ${HM INTERFACES PAGE LINK}
    ...    ${HM REFRESH REPORT}
    ...    ${HM DOWNLOAD FULL REPORT}

Validate Uploaded Alerts Page
    Wait Until Elements Are Visible
    ...    ${HM ALERTS PAGE LINK}
    ...    ${HM DOWNLOAD FULL REPORT}
    #...    ${HM IMPORTED REPORT RIBBON}

Upload Json
    [arguments]    ${json_name}
    Wait Until Page Contains Element    ${HM FILE DROP INPUT}
    Choose File    ${HM FILE DROP INPUT}    ${EXECDIR}${/}${json_name}.json
    Validate Uploaded Alerts Page
    Sleep    0.2

Health Monitor Suite Setup
    Open Browser and go to URL      ${url}
#    ${owner}=   Register and activate account with random email    mark    hamill    ${password}
#    ${random}=   Generate Random String      length=5
#    ${server 1}=   Create Base System    HM1-${random}    owner=${owner}
#    ${server 2}=   Create Base System    HM2-${random}    owner=${owner}
    ${random} =	   Generate Random String      length=5
    Set Suite Variable     ${random}    ${random}
    ${servers} =     Create Systems
    Set Suite Variable    ${servers}     ${servers}
    Set Suite Variable    ${server 1}    ${servers}[0]
    Set Suite Variable    ${server 2}    ${servers}[1]
    Stop Container    ${server 2}[container]
    Go to    ${ENV}
    Run Keyword If    '''${mode}'''=='''cloud'''    Set Suite Variable     ${user in charge}    ${server 1}[cloudOwner]
    ...    ELSE   Set Suite Variable     ${user in charge}    admin

Health Monitor Test Setup
    [Arguments]    ${server}=${server 1}    ${user}=${user in charge}    ${verify}=${True}
    IF    '''${mode}'''=='''cloud'''
        Cloud Test Setup    ${server}    ${user}    ${verify}
    ELSE
        Web Admin Test Setup    ${server}    ${user}    ${verify}
    END

Cloud Test Setup
    [Arguments]    ${server}    ${user}    ${verify}
    Log in to system new    ${server}    ${user}    validate=${True}
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
    IF    ${status} == ${False}
        Log Out
    END

Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Click On Page Number
    [Arguments]    ${pg_number}
    Click Link    ${HM PAGE NUMBER LINK}"${EMPTY}${pg_number}${EMPTY}"]

Count All Alerts and Validate Totals Shown
    Log    Looping through all table pages to count Alerts
    Page Should Contain Element    ${HM FIRST TABLE PAGE ELEMENT}
    ${multiple pages}    Run Keyword And Return Status    Element Should Be Visible    ${HM LAST TABLE PAGE ELEMENT}
    IF    ${multiple pages}
        ${pages} =    Get Text    ${HM LAST TABLE PAGE ELEMENT}
    ELSE
        ${pages} =    Set Variable    1
    END
    ${camera alerts} =    Get Element Count    ${HM CAMERA TABLE ERRORS}
    ${camera warnings} =    Get Element Count    ${HM CAMERA TABLE WARNINGS}
    ${server alerts} =    Get Element Count    ${HM SERVER TABLE OFFLINE}
    ${server warnings} =    Get Element Count    ${HM SERVER TABLE WARNINGS}
    ${storage alerts} =    Get Element Count    ${HM STORAGE TABLE ERRORS}
    ${storage warnings} =    Get Element Count    ${HM STORAGE TABLE WARNINGS}
    ${network alerts} =    Get Element Count    ${HM NETWORK INTERFACE TABLE ERRORS}
    ${network warnings} =    Get Element Count    ${HM NETWORK INTERFACE TABLE WARNINGS}
    FOR     ${i}    IN RANGE    ${pages}
        ${last page} =    Run Keyword And Return Status    Page Should Contain Element    ${HM LAST TABLE PAGE ELEMENT ACTIVE}
        IF    ${pages}==1 or ${last page}
            Exit For Loop
        END
        Click Link    ${HM NEXT PAGE LINK}
        sleep    5
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

#Check Details Panel Alerts
#    [Arguments]    ${type}    ${hardware}    ${name}    ${category}    ${metric}
#    Wait Until Element is Visible    ${HM TABLE}//tr//td/span[contains(text(), "${name}")]
#    Click Element    ${HM TABLE}//tr//td/span[contains(text(), "${name}")]
#    Wait Until Elements are Visible
#    ...    ${HM DETAILS PANEL}
#    ...    ${HM DETAILS PANEL}//h4[contains(text(),"${category}")]/..//span[contains(text(), "${metric}")]/../../..//div[@title="${hardware} ${name} is broken"]
#    ...    ${HM DETAILS PANEL}//h4[contains(text(),"${category}")]/..//span[contains(text(), "${metric}")]/../../..${HM ALERT ICON}

Health Monitor Suite Teardown
    Close All Browsers
    Run Keyword and Warn on Failure    Teardown Servers    ${servers}
    Cleanup Containers    ${random}
#    Delete Base System    ${server 1}
#    Delete Base System    ${server 2}


Health Monitor Details Setup
    Open Browser and Go To URL    ${url}
    ${random} =	   Generate Random String      length=5
    Set Suite Variable     ${random}    ${random}
    ${servers} =    Create Systems
    Set Suite Variable    ${servers}   
    Set Suite Variable    ${server}    ${servers}[0]
    Run Keyword If    '''${mode}'''=='''cloud'''    Run Keywords
    ...    Go to    ${url}
    ...    AND    Log in to user and system     ${server['cloudOwner']}    ${server['id']}    password=${password}
    ...    AND    Sleep    20
    ...    AND    Wait Until Element is Visible    ${SERVERS LINK}    300
    ...    AND    Go To Servers
    ...    AND    Verify on Servers Page    timeout=120
    ...    AND    Log Out
    
Health Monitor Details Tear Down
    Run Keyword and Warn on Failure    Teardown Servers    ${servers}
    Cleanup Containers    ${random}
    Close All Connections
    Close All Browsers
  
Start
    Health Monitor Details Setup
    Run Keyword If    '''${mode}'''=='''cloud'''    Run Keywords
    ...    Go To   ${url}/systems/${server['id']}
    ...    AND    Log In     ${server['cloudOwner']}    ${password}    button=None
    ...    ELSE    Run Keywords
    ...    Open Browser and Go To URL    https://${QA BURBANK IP}:${server}[port][0]
    ...    AND    Log In     ${server['localAuth'][0]}    ${server['localAuth'][1]}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Wait Until Page Contains Element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    one-of-each
    Validate Uploaded Alerts Page
    Wait Until Elements are Visible
    ...    ${HM ALERTS PAGE LINK}
    ...    ${HM SYSTEM PAGE LINK}
    ...    ${HM SERVERS PAGE LINK}
    ...    ${HM CAMERAS PAGE LINK}
    ...    ${HM STORAGES PAGE LINK}
    ...    ${HM INTERFACES PAGE LINK}

Check Details Panel Alerts
    [Arguments]    ${type}    ${hardware}    ${name}    ${category}    ${metric}
    ${color}=   Set Variable If    '''${type}'''=='''error'''    ${ERROR COLOR WITH OPACITY}    ${WARNING COLOR}
    ${svg}=   Set Variable If    '''${type}'''=='''error'''    ${HM ERROR ICON}    ${HM WARNING ICON}
    ${match}=   Get Regexp Matches    ${TEST_NAME}    with
    ${color}=   Set Variable If    ${match}    ${ERROR COLOR WITH OPACITY}    ${color}

    Click Link    ${HM ${hardware}s Page Link}
    Wait Until Element is Visible    ${HM TABLE}//tr//td/span[contains(text(), "${name}")]
    Wait Until Element has Style    ${HM TABLE}//tr//td/span[contains(text(), "${name}")]   color    ${color}
    Click Element    ${HM TABLE}//tr//td/span[contains(text(), "${name}")]
    ${color}=   Set Variable If    '''${type}'''=='''error'''    ${ERROR COLOR WITH OPACITY}    ${WARNING COLOR}
    Wait Until Elements are Visible
    ...    ${HM DETAILS PANEL}
    ...    ${HM DETAILS PANEL}//h6[contains(text(),"${category}")]/..//p[contains(text(), "${metric}")]/../../..//p[@title="${hardware} ${name} is broken"]
    ...    ${HM DETAILS PANEL}//h6[contains(text(),"${category}")]/..//p[contains(text(), "${metric}")]/../../..${svg}
    Wait Until Element has Style    ${HM DETAILS PANEL}//h6[contains(text(),"${category}")]/..//p[contains(text(), "${metric}")]/../following-sibling::div/p[@title="${hardware} ${name} is broken" and contains(@class,"${type}")]    color    ${color}
    Sleep    1
    Click Link    ${HM ALERTS PAGE LINK}