*** Settings ***
Resource          ../resource.robot
Suite Setup       Start
Test Template     Check Details Panel Alerts
#Test Teardown     Run Keyword If Test Failed    Start
Suite Teardown    Health Monitor Details Tear Down
Force Tags        email    form    Threaded    hm

*** Variables ***
${url}    ${ENV}
${password}    ${BASE PASSWORD}

*** Test Cases ***                 TYPE     HARDWARE      NAME                         CATEGORY     METRIC
#errors
One Error On Server                error    Server        testserver error         Activity     Transactions/s
Error with Warning on server       error    Server        testserver both          Activity     Active plugins list
Two Errors On Server A             error    Server        testserver 2 errors      Load         Server threads
Two Errors On Server B             error    Server        testserver 2 errors      Load         Decoding speed

One Error On Camera                error    Camera        test error                   Info         Server
Error with Warning On Camera       error    Camera        test both                    Info         Firmware
Two Errors On Camera A             error    Camera        test 2 errors                Info         IP
Two Errors On Camera B             error    Camera        test 2 errors                Info         Vendor

One Error On Storage               error    Storage       test storage error           Space        Total
Error with Warning On Storage      error    Storage       test storage both            Activity     Read Rate
Two Errors On Storage A            error    Storage       test storage 2 errors        Activity     Write Rate
Two Errors On Storage B            error    Storage       test storage 2 errors        Space        Total

One Error On Interface             error    Interface    test network error            Info         State
Error with Warning On Interface    error    Interface    test network both             Info         IP
Two Errors On Interface A          error    Interface    test network 2 errors         Info         Server
Two Errors On Interface B          error    Interface    test network 2 errors         I/O Rates    OUT Rate

#warnings
One Warning On Server              warning    Server        testserver warning         Load         CPU (VMS Server) %
Warning with Error on server       warning    Server        testserver both            Activity     API Calls/s
Two Warnings On Server A           warning    Server        testserver 2 warnings      Load         RAM %
Two Warnings On Server B           warning    Server        testserver 2 warnings      Activity     Rules Activations/s

One Warning On Camera              warning    Camera        test camera warning        Info         Type
Warning with Error On Camera       warning    Camera        test both                  Info         Model
Two Warnings On Camera A           warning    Camera        test two warnings          Info         Type
Two Warnings On Camera B           warning    Camera        test two warnings          Info         Recording

One Warning On Storage             warning    Storage       test storage warning       Activity     Read Rate
Warning with Error On Storage      warning    Storage       test storage both          Info         Type
Two Warnings On Storage A          warning    Storage       test storage 2 warnings    State        Status
Two Warnings On Storage B          warning    Storage       test storage 2 warnings    Activity     Write Rate

One Warning On Interface           warning    Interface     test network warning       I/O Rates    IN Rate
Warning with Error Interface       warning    Interface     test network both          I/O Rates    IN Rate
Two Warnings On Interface A        warning    Interface     test network 2 warnings    Info         State
Two Warnings On Interface B        warning    Interface     test network 2 warnings    I/O Rates    OUT Rate


*** Keywords ***
Health Monitor Details Setup
    ${random}=    Generate Random String
    ${owner}=    Register and activate account with random email    mark    hamill    ${BASE PASSWORD}
    ${server} =    Create Base System      hmdetails-${random}    owner=${owner}
    Set Suite Variable    &{server}    &{server}
    Run Keyword If    '''${mode}'''=='''cloud'''    Run Keywords
    ...    Open Browser and Go To URL    ${url}
    ...    AND    Log in to user and system     ${server['owner']}    ${server['cloud id']}    password=${password}
    ...    AND    Sleep    10
    ...    AND    Wait Until Element is Visible    ${SERVERS LINK}    300
    ...    AND    Sleep    5
    ...    AND    Click Link    ${SERVERS LINK}
    ...    AND    Verify on Servers Page    timeout=120
    ...    AND    Log Out
    
Health Monitor Details Tear Down
    Run Keyword If    '''${mode}'''=='''cloud'''    Disconnect Server via API    ${auth}    ${server['cloud id']}    ${password}    ${server['owner']}
    Open Connection    ${QA BURBANK IP}
    SSHLibrary.Login    ${QA BURBANK USER}    ${QA BURBANK PASS}    
    ${results}    Execute Command    docker container stop ${server}[id]
    ${results}    Execute Command    docker container rm ${server}[id]
    FOR    ${user}    IN    @{server['cloud users'].values()}
         Run Keyword If    '''${mode}'''=='''cloud'''    Delete Account    ${ENV}    ${user}          ${password}  
    END
    Close All Connections
    Close All Browsers
  
Start
    Health Monitor Details Setup
    Run Keyword If    '''${mode}'''=='''cloud'''    Run Keywords
    ...    Go To   ${url}/systems/${server['cloud id']}
    ...    AND    Log In     ${server['owner']}    ${password}    button=None
    ...    ELSE    Run Keywords
    ...    Open Browser and Go To URL    https://${QA BURBANK IP}:${server['port']}
    ...    AND    Log In     ${server['local auth'][0]}    ${server['local auth'][1]}    button=None
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