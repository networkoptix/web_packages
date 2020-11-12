*** Settings ***
Resource      ../smoke_check_resource.robot
Suite Setup    Relays Suite Setup
Suite Teardown    Relays Suite Teardown

*** Keywords ***
Relays Suite Setup
    ${auth}=   Create List    ${email relay}    ${password}
    Set Suite Variable    ${auth}
    FOR    ${r}    IN    @{relays.keys()}
        ${s}=   Setup Remote System    ${ssh auth}    ciqa    system_${r}    ${ssh host ip}    ${system ${r} port}
        Set Suite Variable    ${system ${r}}    ${s}
        ${cloud id}=   Connect System to Cloud    ${local auth}   https://${system ${r}}[ip]:${system ${r}}[port]    ${system ${r}}[name]    ${email relay}    ${password}    ${ENV}
        Set To Dictionary    ${system ${r}}    cloud id=${cloud id}
        Restart Server    https://${system ${r}}[ip]:${system ${r}}[port]    ${local auth}
    END
    Sleep    60

Relays Suite Teardown
    Acquire Lock    teardown_lock
    Open Connection    ${ssh host ip}
    SSHLibrary.Login    username=${ssh auth}[0]    password=${ssh auth}[1]
    FOR    ${r}    IN    @{relays.keys()}
        ${disconnected}=   Run keyword and return status    Disconnect    ${ENV}    ${email relay}    ${password}    ${system ${r}}[cloud id]
        Log    ${r} disconnected: ${disconnected}
        Execute Command    docker rm -f ${system ${r}}[cont]
    END
    Close All Connections
    Release Lock    teardown_lock

*** Test Cases ***
Frankfurt
    Create Digest Session    Ping Server session    https://${system fr}[cloud id].${relays}[fr]    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Ping Server session    /api/ping    timeout=10
    Should Be Equal As Numbers    ${resp.status_code}    200

New York
    Create Digest Session    Ping Server session    https://${system ny}[cloud id].${relays}[ny]    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Ping Server session    /api/ping    timeout=10
    Should Be Equal As Numbers    ${resp.status_code}    200

Los Angeles
    Create Digest Session    Ping Server session    https://${system la}[cloud id].${relays}[la]    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Ping Server session    /api/ping    timeout=10
    Should Be Equal As Numbers    ${resp.status_code}    200

Sydney
    Create Digest Session    Ping Server session    https://${system sy}[cloud id].${relays}[sy]    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Ping Server session    /api/ping    timeout=10
    Should Be Equal As Numbers    ${resp.status_code}    200

Singapore
    Create Digest Session    Ping Server session    https://${system si}[cloud id].${relays}[si]    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Ping Server session    /api/ping    timeout=10
    Should Be Equal As Numbers    ${resp.status_code}    200

Cheboksary
    Create Digest Session    Ping Server session    https://${system ch}[cloud id].${relays}[ch]    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Ping Server session    /api/ping    timeout=10
    Should Be Equal As Numbers    ${resp.status_code}    200

Chicago
    Create Digest Session    Ping Server session    https://${system chi}[cloud id].${relays}[chi]    auth=${auth}    disable_warnings=1
    ${resp}=   Get Request    Ping Server session    /api/ping    timeout=10
    Should Be Equal As Numbers    ${resp.status_code}    200
