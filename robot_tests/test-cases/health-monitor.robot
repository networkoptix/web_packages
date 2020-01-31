*** Settings ***
Resource          ../resource.robot
Suite Setup       Open Browser and go to URL    ${url}
Test Setup        Restart
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
Json Upload works
    Go To    ${url}/systems/${AUTO TESTS SYSTEM ID}
    Log In    ${EMAIL OWNER}    ${password}    button=None
    Wait Until Elements Are Visible    ${DISCONNECT FROM NX}    ${RENAME SYSTEM}    ${MERGE BUTTON SYSTEM}
    wait until page contains element    //a[@href="/systems/014c4810-888f-4c5a-be14-aa2aaff8870b/health" and text()="Information"]
    Click Link    //a[@href="/systems/014c4810-888f-4c5a-be14-aa2aaff8870b/health" and text()="Information"]
    Wait until element is visible    ${DISCARD CHANGES BUTTON}
    click button     ${DISCARD CHANGES BUTTON}
    sleep    3
    wait until page contains element    //input[@class="ngx-file-drop__file-input"]
    Upload Json    attempt
    Wait Until Elements Are Visible    //nx-app/div/div[1]/nx-ribbon/div/div/span    //*[@id="nx-table"]/div[2]/table/tbody/tr[2]/td[3]/span[text()="Server 1039f51b5d00"]

#Can Close Out of Json Imported Mode
#Going to Health Monitor when System is Offline Shows Offline Message
#Changing Page Height and Refreshing Reduces Row Count and Increases Page Count
#Errors and Warnings are Counted, and Shown Correctly in the Left Pane and Header Tiles
#Details Panel Shows Errors
#Details Panel Shows Alerts
#Details Panel Shows Errors and Alerts