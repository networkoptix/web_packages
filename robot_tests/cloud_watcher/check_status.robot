*** Settings ***
Resource          ../resource.robot
Library           CloudWatcher.py
Suite Setup       Suite Setup
Suite Teardown    Close Browser

*** Variables ***
${url}            https://nxvms.com
${system ip}      https://10.1.5.192
${system port}    7070
${system name}    4.1_smoke_test_prod
${cloud owner}    cloudsmokecheck@gmail.com
${password}       qweasd 123
${cloud services}    //div[contains(@class, "card-header")]/h6[contains(text(), "Cloud Services")]
${cloud system conncetivity}    //div[contains(@class, "card-header")]/h6[contains(text(), "Cloud Systems Connectivity")]
${error record}      //div[contains(@class, "card-body nx-error")]//h6[contains(class, "alert-msg")]
@{local auth}        admin    qweasd 123
@{status error list}
@{portal error list}

*** Keywords ***
Suite Setup
    Open Browser    ${url}    headlesschrome
    Set Window Size	   1600   	1200

*** Test Cases ***
Check status.nxvms.com
    Go To    https://status.nxvms.com
    ${opened}=   Run keyword and return status    Wait until location contains    status.nxvms.com    timeout=30
    Run keyword if    not $opened    Run keywords
        ...    Append to List    ${status error list}    status.nxvms.com is not available for 30 seconds
        ...    AND    Fail
    ${content available}=   Run keyword and return status    Wait until elements are visible    ${cloud services}    ${cloud system conncetivity}    timeout=30
    Run keyword if    not $content_available    Run keywords
        ...    Append to List    ${status error list}    Content of status.nxvms.com is not available for 30 seconds
        ...    AND    Fail

    Sleep    5
    ${all errors}=   Get WebElements    ${error record}
    FOR   ${err}    IN    @{all errors}
        ${err text}=   Get Text    ${err}
        Append to List    ${status error list}    ${err text}
    END

    Run Keyword If    $status_error_list    Send Email    ${status error list}

Check Test Server
     ${available}=   Run keyword and return status   Ping Server    ${system ip}:${system port}    ${local auth}
     ${error message}=   Create List    Test Server not available
     Run keyword if    not $available    Run Keywords
     ...    Send Email    ${error message}    AND
     ...    Fatal Error    Test Server not available

Check nxvms.com
    Log    Check portal availability
    Go To    ${url}
    Wait until location contains    nxvms.com    timeout=30
    ${opened}=   Run keyword and return status   Wait until elements are visible
        ...    ${LOG IN NAV BAR}
        ...    ${CREATE ACCOUNT HEADER}
        ...    ${DOWNLOAD LINK}
        ...    timeout=30
    Run keyword if    not $opened    Append to List    ${portal error list}    Cloud Portal is down

    Log    Check connection to cloud
    ${system connected}=   Run keyword and return status
        ...    Connect system to cloud
            ...    ${local auth}
            ...    ${system ip}:${system port}
            ...    ${system name}
            ...    ${cloud owner}
            ...    ${password}
            ...    ${url}
    Run keyword if    not $system_connected    Append to List    ${portal error list}    Cannot connect system to cloud
    ${sys id}=   Get Cloud System Id    ${system ip}:${system port}    ${local auth}

    Log    Check authorization
    ${logged in}=   Run keyword and return status    Log In    ${cloud owner}    ${password}
    Run keyword if    not $logged_in    Append to List    ${portal error list}    Cannot log in to cloud

    Log    Check Disconnection
    ${disconnected}=   Run keyword and return status    Disconnect    ${url}    ${cloud owner}    ${password}    ${sys id}
    Run keyword if    not $disconnected    Append to List    ${portal error list}    Cannot disconnect system from cloud

    Run Keyword If    not $portal_error_list    Send Email    ${portal error list}


