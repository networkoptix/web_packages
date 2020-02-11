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

Click on page number
    [Arguments]    ${pg_number}
    Click Link    ${HM PAGE NUMBER LINK}
    
Loop through table and count all alerts
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
        ${camera alerts ${i}} =    Get Element Count    ${HM CAMERA TABLE ERRORS}
        ${camera warnings ${i}} =    Get Element Count    ${HM CAMERA TABLE WARNINGS}
        ${server alerts ${i}} =    Get Element Count    ${HM SERVER TABLE OFFLINE}
        ${server warnings ${i}} =    Get Element Count    ${HM SERVER TABLE WARNINGS} 
        ${storage alerts ${i}} =    Get Element Count    ${HM STORAGE TABLE ERRORS} 
        ${storage warnings ${i}} =    Get Element Count    ${HM STORAGE TABLE WARNINGS} 
        ${network alerts ${i}} =    Get Element Count    ${HM NETWORK INTERFACE TABLE ERRORS}
        ${network warnings ${i}} =    Get Element Count    ${HM NETWORK INTERFACE TABLE WARNINGS} 
        ${camera alerts} =     Evaluate    ${camera alerts} + ${camera alerts ${i}}
        ${camera warnings} =    Evaluate    ${camera warnings} + ${camera warnings ${i}}
        ${server alerts} =    Evaluate    ${server alerts} + ${server alerts ${i}}
        ${server warnings} =    Evaluate    ${server warnings} + ${server warnings ${i}}  
        ${storage alerts} =    Evaluate     ${storage alerts} + ${storage alerts ${i}}
        ${storage warnings} =    Evaluate    ${storage warnings} + ${storage warnings ${i}}
        ${network alerts} =    Evaluate    ${network alerts} + ${network alerts ${i}}
        ${network warnings} =    Evaluate    ${network warnings} + ${network warnings ${i}}
    END 
    [Return]     ${camera alerts}    ${camera warnings}    ${server alerts}    ${server warnings}    ${storage alerts}    ${storage warnings}    ${network alerts}    ${network warnings} 

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
        
    

#Errors and Warnings are Counted, and Shown Correctly in the Left Pane and Header Tiles




#Changing Page Height and Refreshing Reduces Row Count and Increases Page Count
#Details Panel Shows Errors
#Details Panel Shows Alerts
#Details Panel Shows Errors and Alerts