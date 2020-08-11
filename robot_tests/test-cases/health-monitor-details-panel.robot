*** Settings ***
Resource          ../resource.robot
Suite Setup       Start
Test Template     Check Details Panel Alerts
Test Teardown     Run Keyword If Test Failed    Start
Suite Teardown    Close All Browsers
Force Tags        email    form    Threaded    hm

*** Variables ***
${url}    ${ENV}
${password}    ${BASE PASSWORD}

*** Test Cases ***                 TYPE     HARDWARE      NAME                     CATEGORY     METRIC
#errors
One Error On Server                Error    Server        testserver error         Activity     transactions/s
Error with Warning on server       Error    Server        testserver both          Activity     Active plugins list
Two Errors On Server A             Error    Server        testserver 2 errors      Load         Server threads
Two Errors On Server B             Error    Server        testserver 2 errors      Load         Decoding speed

One Error On Camera                Error    Camera        test error               Info         Server
Error with Warning On Camera       Error    Camera        test both                Info         Firmware
Two Errors On Camera A             Error    Camera        test 2 errors            Info         IP
Two Errors On Camera B             Error    Camera        test 2 errors            Info         Vendor

One Error On Storage               Error    Storage       test storage error       Space        Total Space
Error with Warning On Storage      Error    Storage       test storage both        Activity     Read Rate
Two Errors On Storage A            Error    Storage       test storage 2 errors    Activity     Write Rate
Two Errors On Storage B            Error    Storage       test storage 2 errors    Space        Total Space

One Error On Interface             Error    Interface    test network error        Info         State
Error with Warning On Interface    Error    Interface    test network both         Info         IP
Two Errors On Interface A          Error    Interface    test network 2 errors     Info         Server
Two Errors On Interface B          Error    Interface    test network 2 errors     I/O Rates    OUT Rate

#warnings
One Warning On Server              Warning    Server        testserver warning         Load         CPU used by VMS Server (%)
Warning with Error on server       Warning    Server        testserver both            Activity     REST API calls per second
Two Warnings On Server A           Warning    Server        testserver 2 warnings      Load         Total RAM Usage (%)
Two Warnings On Server B           Warning    Server        testserver 2 warnings      Activity     Event Rules activations per second

One Warning On Camera              Warning    Camera        test camera warning        Info         Type
Warning with Error On Camera       Warning    Camera        test both                  Info         Model
Two Warnings On Camera A           Warning    Camera        test two warnings          Info         Type
Two Warnings On Camera B           Warning    Camera        test two warnings          Info         Recording

One Warning On Storage             Warning    Storage       test storage warning       Activity     Read Rate
Warning with Error On Storage      Warning    Storage       test storage both          Info         Type
Two Warnings On Storage A          Warning    Storage       test storage 2 warnings    State        Status
Two Warnings On Storage B          Warning    Storage       test storage 2 warnings    Activity     Write Rate

One Warning On Interface           Warning    Interface     test network warning       I/O Rates    IN Rate
Warning with Error Interface       Warning    Interface     test network both          I/O Rates     IN Rate
Two Warnings On Interface A        Warning    Interface     test network 2 warnings    Info         State
Two Warnings On Interface B        Warning    Interface     test network 2 warnings    I/O Rates    OUT Rate


*** Keywords ***
Start
    Open Browser and Go To URL   ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None
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
    ${color}=   Set Variable If    '''${type}'''=='''Error'''    ${ERROR COLOR WITH OPACITY}    ${WARNING COLOR}
    ${svg}=   Set Variable If    '''${type}'''=='''Error'''    ${HM ERROR ICON}    ${HM WARNING ICON}
    ${match}=   Get Regexp Matches    ${TEST_NAME}    with
    ${color}=   Set Variable If    ${match}    ${ERROR COLOR WITH OPACITY}    ${color}

    Click Link    ${HM ${hardware}s Page Link}
    Wait Until Element is Visible    ${HM TABLE}//tr//td/span[contains(text(), "${name}")]
    Wait Until Element has Style    ${HM TABLE}//tr//td/span[contains(text(), "${name}")]   color    ${color}
    Click Element    ${HM TABLE}//tr//td/span[contains(text(), "${name}")]
    ${color}=   Set Variable If    '''${type}'''=='''Error'''    ${ERROR COLOR WITH OPACITY}    ${WARNING COLOR}
    Wait Until Elements are Visible
    ...    ${HM DETAILS PANEL}
    ...    ${HM DETAILS PANEL}//h4[contains(text(),"${category}")]/..//span[contains(text(), "${metric}")]/../../..//div[@title="${hardware} ${name} is broken"]
    ...    ${HM DETAILS PANEL}//h4[contains(text(),"${category}")]/..//span[contains(text(), "${metric}")]/../../..${svg}
    Wait Until Element has Style    ${HM DETAILS PANEL}//h4[contains(text(),"${category}")]/..//span[contains(text(), "${metric}")]/../../following-sibling::div/span    color    ${color}
    Sleep    1
    Click Link    ${HM ALERTS PAGE LINK}