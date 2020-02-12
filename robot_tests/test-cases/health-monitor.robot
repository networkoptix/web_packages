*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Common Restart Logout    ${url}
Test Teardown     Run Keyword If Test Failed    Open New Browser On Failure
Suite Teardown    Close All Browsers


*** Variables ***
${password}    ${BASE PASSWORD}
${url}         ${ENV}

*** Keywords ***
Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Upload Json
    [arguments]    ${json_name}
    Wait Until Page Contains Element    ${HM FILE DROP INPUT}
    Choose File    ${HM FILE DROP INPUT}    ${EXECDIR}${/}${json_name}.json
    Validate Uploaded Alerts Page
    Sleep    0.2

Validate Alerts Page
    Wait Until Elements Are Visible
    ...    ${HM ALERTS PAGE LINK}
    ...    ${HM SYSTEM PAGE LINK}
    ...    ${HM SERVERS PAGE LINK}
    ...    ${HM CAMERAS PAGE LINK}
    ...    ${HM NETWORK INTERFACES PAGE LINK}
    ...    ${HM REFRESH REPORT}
    ...    ${HM DOWNLOAD FULL REPORT}

Validate Uploaded Alerts Page
    Wait Until Elements Are Visible
    ...    ${HM ALERTS PAGE LINK}
    ...    ${HM DOWNLOAD FULL REPORT}
    ...    ${HM IMPORTED REPORT RIBBON}

Click On Page Number
    [Arguments]    ${pg_number}
    Click Link    ${HM PAGE NUMBER LINK}
    
*** Test Cases ***
Onwer Has Access to Health Monitoring
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Wait Until Page Contains Element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page

Admin Has Access to Health Monitoring
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL ADMIN}    ${password}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM MY ACCOUNT}    ${RENAME SYSTEM}
    Wait Until Page Contains Element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page

Going to Health Monitor when System is Offline Shows Offline Message
    Go To    ${url}/systems/${AUTO TESTS OFFLINE SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None
    Wait Until Page Contains Element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Wait Until Elements Are Visible    ${HM SYSTEM OFFLINE}    ${HM SYSTEM CANNOT BE ACCESSED}

Json Upload Works
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Wait Until Page Contains Element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Upload Json    one-page


    # More elements need to be added here when JSON files are finalized like system name and stuff
    Wait Until Elements Are Visible    ${HM IMPORTED REPORT RIBBON}

Json Upload Works on Offline System
    Go To    ${url}/systems/${AUTO TESTS OFFLINE SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Wait Until Page Contains Element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Upload Json    one-page


    # More elements need to be added here when JSON files are finalized like system name and stuff
    Wait Until Elements Are Visible    ${HM IMPORTED REPORT RIBBON}



Advanced Viewer Does Not Have Access To Health Monitor
    # Advanced Viewer
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL ADVVIEWER}    ${password}    button=None
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}    10
    ${location}=   Get location
    Go To    ${location}/health/Alerts
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM ALERTS PAGE LINK}    10

Viewer Does Not Have Access To Health Monitor
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL ADVVIEWER}    ${password}    button=None
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}    10
    ${location}=   Get location
    Go To    ${location}/health/Alerts
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM ALERTS PAGE LINK}    10

Live Viewer Does Not Have Access To Health Monitor
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL LIVE VIEWER}    ${password}    button=None
    Wait Until Element Is Visible    ${DISCONNECT FROM MY ACCOUNT}
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM INFORMATION TAB LINK}    10
    ${location}=   Get location
    Go To    ${location}/health/Alerts
    Run Keyword and Expect Error    *    Wait Until Element Is Visible    ${HM ALERTS PAGE LINK}    10

No Alerts Message Shows When There Are No Alerts
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Wait Until Page Contains Element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Upload Json    no-alerts
    Wait Until Elements Are Visible    ${HM NO ALERTS}    ${HM SYSTEM DOING WELL}

Can Close Out of Json Imported Mode
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Wait Until Page Contains Element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Upload Json    one-page
    ${first} =     Get Text    ${HM ALERTS TOTAL}
    Reload Page
    Validate Alerts Page
    Page Should Not Contain    ${HM IMPORTED REPORT RIBBON}
    Element Text Should Not Be     ${HM ALERTS TOTAL}    ${first}
        
Errors and Warnings are Counted, and Shown Correctly in the Left Pane and Header Tiles
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None 
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Wait Until Page Contains Element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Validate Alerts Page
    Log    Looping through all table pages to count Alerts 
    Page Should Contain Element    ${HM FIRST TABLE PAGE ELEMENT}
    ${pages} =    Get Element Count    //ngb-pagination//a[contains(text(), "${EMPTY}")]
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
        Wait Until Element Is Visible     ${HM CAMERA TABLE ERRORS}
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
    


#Changing Page Height and Refreshing Reduces Row Count and Increases Page Count
#Details Panel Shows Errors
#Details Panel Shows Alerts
#Details Panel Shows Errors and Alerts