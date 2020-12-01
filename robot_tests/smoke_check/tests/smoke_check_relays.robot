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
    Ping Server    https://${system fr}[cloud id].${relays}[fr]    ${auth}
    Log    relay-fr: /api/ping works

New York
    ${setting}=   Get System Settings    ${auth}    https://${system ny}[cloud id].${relays}[ny]
    Log Many    relay-ny: /ec2/getSettings works  ${setting}

Los Angeles
    ${cameras}=   Get Cameras    ${auth}    https://${system la}[cloud id].${relays}[la]
    Log Many    relay-la: /ec2/getCamerasEx works   ${cameras}

Sydney
    Disable Stat Reports    ${auth}    https://${system sy}[cloud id].${relays}[sy]
    Log    relay-sy: /api/systemSettings works

Singapore
    ${licenses}=   Get Licenses    ${auth}    https://${system si}[cloud id].${relays}[si]
    Log Many    relay-si: /ec2/getLicenses works   ${licenses}

Ch
    ${HWIDs}=   Get Server HWIDs    ${auth}    https://${system ch}[cloud id].${relays}[ch]
    Log Many    relay-ch: /api/getHardwareIds works    ${HWIDs}

Chi
    ${users}=   Get Users    ${auth}    https://${system chi}[cloud id].${relays}[chi]
    Log Many    relay-chi: /ec2/getUsers works    ${users}
