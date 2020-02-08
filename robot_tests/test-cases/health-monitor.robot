*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup
Test Teardown     Restart
Suite Teardown    Close All Browsers


*** Variables ***
${password}    ${BASE PASSWORD}
${url}         ${ENV}

*** Keywords ***
Restart
    Common Restart Logout    ${url}

Open New Browser On Failure
    Close Browser
    Open Browser and go to URL    ${url}

Upload Json
    [arguments]    ${json_name}
    Wait Until Page Contains Element    //input[@class="ngx-file-drop__file-input"]
    Choose File    //input[@class="ngx-file-drop__file-input"]    ${EXECDIR}${/}${json_name}.json

*** Test Cases ***
Going to Health Monitor when System is Offline Shows Offline Message
    Go To    ${url}/systems/${AUTO TESTS OFFLINE SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None
    wait until page contains element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    Wait Until Elements Are Visible    ${HM SYSTEM OFFLINE}    ${HM SYSTEM CANNOT BE ACCESSED}

Json Upload Works
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Wait Until Page Contains Element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    wait until page contains element    ${HM FILE DROP INPUT}
    Upload Json    attempt


    # More elements need to be added here when JSON files are finalized like system name and stuff
    Wait Until Elements Are Visible    ${HM IMPORTED REPORT RIBBON}

Json Upload Works on Offline System
    Go To    ${url}/systems/${AUTO TESTS OFFLINE SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    Wait Until Page Contains Element    ${HM INFORMATION TAB LINK}
    Click Link    ${HM INFORMATION TAB LINK}
    wait until page contains element    ${HM FILE DROP INPUT}
    Upload Json    attempt


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



#Can Close Out of Json Imported Mode





#Changing Page Height and Refreshing Reduces Row Count and Increases Page Count
#Errors and Warnings are Counted, and Shown Correctly in the Left Pane and Header Tiles
#Details Panel Shows Errors
#Details Panel Shows Alerts
#Details Panel Shows Errors and Alerts